import base64
import io
import math
from types import SimpleNamespace
import chromadb
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
import main
from processing import chunk_pages, extract

A = 'a' * 24
B = 'b' * 24
D = '1' * 24
TOKEN = 'test-service-token-with-at-least-32-characters'

@pytest.fixture
def service(tmp_path, monkeypatch):
    monkeypatch.setenv('RAG_SERVICE_TOKEN', TOKEN)
    chroma = chromadb.PersistentClient(path=str(tmp_path / 'chroma'))
    monkeypatch.setattr(main, 'db', lambda: chroma)
    calls = []
    def embeddings(**kwargs):
        calls.append(('embedding', kwargs))
        rows = []
        for text in kwargs['input']:
            vector = [1.0, float('JWT' in text), float('RAG' in text), float('private' in text)]
            norm = math.sqrt(sum(v*v for v in vector))
            rows.append(SimpleNamespace(embedding=[v/norm for v in vector]))
        return SimpleNamespace(data=rows)
    def completions(**kwargs):
        calls.append(('completion', kwargs))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='Your note says JWT [1]. Invalid citation [999].'))])
    fake = SimpleNamespace(embeddings=SimpleNamespace(create=embeddings), chat=SimpleNamespace(completions=SimpleNamespace(create=completions)))
    monkeypatch.setattr(main, 'client', lambda: fake)
    return TestClient(main.app, headers={'X-Service-Token': TOKEN}), calls

def test_chunk_locations_and_overlap():
    chunks = chunk_pages([(12, 'one\ntwo\nthree\nfour\nfive\nsix\n')], size=15, overlap=4)
    assert len(chunks) > 1
    assert chunks[0]['page'] == 12
    assert chunks[0]['lineStart'] == 1
    assert chunks[-1]['lineEnd'] == 6
    assert all(len(c['text']) <= 15 for c in chunks)
    with pytest.raises(ValueError):
        chunk_pages([(1, 'text')], size=4, overlap=4)

def test_extraction_errors_are_actionable():
    with pytest.raises(ValueError, match='no text'):
        extract('', None, 'note')
    with pytest.raises(ValueError, match='binary'):
        extract('bad\x00file', None, 'code')
    writer = PdfWriter(); writer.add_blank_page(width=100, height=100)
    stream = io.BytesIO(); writer.write(stream)
    with pytest.raises(ValueError, match='OCR'):
        extract('', base64.b64encode(stream.getvalue()).decode(), 'pdf')

def test_private_ingestion_retrieval_and_deletion(service):
    client, calls = service
    payload = {'owner': A, 'document_id': D, 'title': 'JWT field notes', 'kind': 'note', 'text': 'JWT private cookies require HttpOnly.'}
    assert client.post('/ingest', json=payload).json()['chunks'] == 1
    assert client.post('/ingest', json=payload).json()['chunks'] == 1
    assert main.collection(A).count() == 1
    result = client.post('/search', json={'owner': A, 'query': 'JWT'}).json()
    assert result['sources'][0]['documentId'] == D
    assert client.post('/search', json={'owner': B, 'query': 'JWT'}).json()['sources'] == []
    assert all(c[1]['model'] == 'text-embedding-3-large' for c in calls if c[0] == 'embedding')
    assert any('JWT' == t for c in calls if c[0] == 'embedding' for t in c[1]['input'])
    assert client.post('/delete', json={'owner': B, 'document_id': D}).status_code == 200
    assert main.collection(A).count() == 1
    assert client.post('/delete', json={'owner': A, 'document_id': D}).status_code == 200
    assert main.collection(A).count() == 0

def test_grounded_answer_model_citations_and_project_scope(service):
    client, calls = service
    client.post('/ingest', json={'owner': A, 'document_id': D, 'title': 'JWT', 'kind': 'code', 'text': 'JWT cookies are private.', 'project': '3'*24})
    assert client.post('/search', json={'owner': A, 'query': 'JWT', 'project': '4'*24}).json()['sources'] == []
    answer = client.post('/ask', json={'owner': A, 'query': 'JWT', 'project': '3'*24}).json()
    assert '[1]' in answer['answer'] and '[999]' not in answer['answer']
    completion = [c for c in calls if c[0] == 'completion'][-1][1]
    assert completion['model'] == 'gpt-4o-mini'
    assert 'untrusted data' in completion['messages'][0]['content']
    assert client.post('/ask', json={'owner': B, 'query': 'JWT'}).json()['sources'] == []

def test_service_auth_and_validation(service):
    client, _ = service
    assert client.get('/health', headers={'X-Service-Token': 'wrong'}).status_code == 401
    assert client.post('/search', json={'owner': '../../other-user', 'query': 'secret'}).status_code == 422
    assert client.post('/ingest', json={'owner': A, 'document_id': D, 'title': 'Empty', 'kind': 'note'}).status_code == 400

def test_keyword_search_needs_no_embedding_call(service):
    client, calls = service
    client.post('/ingest', json={'owner': A, 'document_id': D, 'title': 'JWT', 'kind': 'note', 'text': 'JWT cookies stay private.'})
    count = len(calls)
    assert client.post('/search', json={'owner': A, 'query': 'JWT', 'mode': 'keyword'}).json()['sources']
    assert len(calls) == count
