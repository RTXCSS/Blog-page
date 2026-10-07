"""Bounded extraction and overlapping chunks with source locations."""
import base64
import io
from pypdf import PdfReader

MAX_CHARS = 200_000

def extract(text: str, data: str | None, kind: str):
    if data:
        raw = base64.b64decode(data, validate=True)
        if len(raw) > 10 * 1024 * 1024:
            raise ValueError('Files must be smaller than 10 MB.')
        if kind == 'pdf':
            reader = PdfReader(io.BytesIO(raw))
            if reader.is_encrypted:
                raise ValueError('Upload an unlocked PDF.')
            if len(reader.pages) > 300:
                raise ValueError('Split PDFs longer than 300 pages before uploading.')
            pages, total = [], 0
            for number, page in enumerate(reader.pages, 1):
                content = page.extract_text() or ''
                total += len(content)
                if total > MAX_CHARS:
                    raise ValueError('Split this document into files under 200,000 characters.')
                pages.append((number, content))
            if not any(t.strip() for _, t in pages):
                raise ValueError('This PDF has no selectable text. OCR scanned pages before uploading.')
            return pages
        text = raw.decode('utf-8-sig')
    if not text.strip():
        raise ValueError('The document contains no text.')
    if len(text) > MAX_CHARS:
        raise ValueError('Split this document into files under 200,000 characters.')
    if '\x00' in text:
        raise ValueError('Upload UTF-8 text, not a binary file.')
    return [(0, text)]

def chunk_pages(pages, size=1800, overlap=240):
    if size <= overlap or overlap < 0:
        raise ValueError('Invalid chunk overlap.')
    chunks = []
    for page, text in pages:
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):
                boundary = text.rfind('\n', start + size // 2, end)
                if boundary > start:
                    end = boundary + 1
            content = text[start:end]
            if content.strip():
                chunks.append({'text': content, 'page': page, 'lineStart': text.count('\n', 0, start) + 1,
                               'lineEnd': text.count('\n', 0, end - 1) + 1})
            if end == len(text):
                break
            start = max(start + 1, end - overlap)
    return chunks
