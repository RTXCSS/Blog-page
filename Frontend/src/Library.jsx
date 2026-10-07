import { useState } from 'react';
import {
  Search,
  Plus,
  Upload,
  ArrowUpRight,
  Folder,
  Trash2,
  RefreshCw,
  Download,
  PenLine,
  ArrowDownToLine,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { api, isDemo } from './api';
import { Modal, DocIcon, Empty, dateLabel } from './ui';

export function AddKnowledge({ projects, onClose, onSaved, notify }) {
  const [tab, setTab] = useState('upload'),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      let result;
      if (tab === 'upload') {
        if (!file) throw new Error('Choose a file first.');
        const data = new FormData();
        data.append('file', file);
        data.append('project', form.get('project'));
        result = await api('/documents/upload', { method: 'POST', body: data });
      } else
        result = await api('/documents/note', {
          method: 'POST',
          body: {
            title: form.get('title'),
            content: form.get('content'),
            project: form.get('project') || null,
            tags: form
              .get('tags')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          },
        });
      await onSaved();
      notify(
        result.status === 'failed'
          ? 'Saved, but indexing needs attention. Open the document to retry.'
          : 'A new thought, safely tucked away.',
      );
      onClose();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Make room for a new idea" onClose={() => !busy && onClose()}>
      <p className="muted">Add something worth remembering. Find it again in your own words.</p>
      <div className="segmented">
        <button
          className={tab === 'upload' ? 'active' : ''}
          onClick={() => setTab('upload')}
          disabled={busy}
        >
          <Upload size={16} />
          Upload a file
        </button>
        <button
          className={tab === 'note' ? 'active' : ''}
          onClick={() => setTab('note')}
          disabled={busy}
        >
          <PenLine size={16} />
          Write a note
        </button>
      </div>
      <form onSubmit={submit}>
        {tab === 'upload' ? (
          <label
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) setFile(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={27} />
            <strong>{file ? file.name : 'Drop a little knowledge here'}</strong>
            <span>or click to browse your files</span>
            <small>PDF, Markdown, text & code · up to 10 MB</small>
            <input
              type="file"
              aria-label="Choose knowledge file"
              accept=".pdf,.md,.txt,.js,.ts,.jsx,.tsx,.py,.json,.css,.html"
              onChange={(e) => setFile(e.target.files[0])}
              disabled={busy}
            />
          </label>
        ) : (
          <>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={160}
                placeholder="Give this thought a home…"
              />
            </label>
            <label>
              Your note
              <textarea
                name="content"
                required
                maxLength={200000}
                rows={7}
                placeholder="What would you like to remember? Markdown is welcome."
              />
            </label>
            <label>
              Tags
              <input name="tags" placeholder="ideas, research, learning" />
            </label>
          </>
        )}
        <label>
          Project
          <select name="project">
            <option value="">No project — just a thought</option>
            {projects.map((p) => (
              <option value={p._id} key={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-footer">
          <span className="muted">Only you can access your knowledge.</span>
          <button className="primary" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" />
                Saving & indexing…
              </>
            ) : (
              'Add to my knowledge'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function DocumentDetail({ doc, onClose, onChanged, notify }) {
  const [busy, setBusy] = useState(false);
  async function action(type) {
    if (type === 'delete' && !window.confirm('Remove this document and its search index?')) return;
    setBusy(true);
    try {
      await api('/documents/' + doc._id + (type === 'retry' ? '/retry' : ''), {
        method: type === 'retry' ? 'POST' : 'DELETE',
      });
      await onChanged();
      onClose();
      notify(
        type === 'retry'
          ? 'Indexing attempt finished. Check the document status.'
          : 'Document removed.',
      );
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={doc.title} onClose={onClose} wide>
      <div className="detail-meta">
        <DocIcon kind={doc.kind} />
        <span>
          {doc.kind} · {doc.chunks || 0} passages · {dateLabel(doc.createdAt)}
        </span>
        <span className={'status ' + doc.status}>{doc.status}</span>
      </div>
      {doc.error && <div className="notice error">{doc.error}</div>}
      {doc.excerpt && (
        <>
          <div className="eyebrow">
            Referenced passage{' '}
            {doc.page
              ? '· Page ' + doc.page
              : doc.lineStart
                ? '· Lines ' + doc.lineStart + '–' + doc.lineEnd
                : ''}
          </div>
          <blockquote>{doc.excerpt}</blockquote>
        </>
      )}
      {doc.content ? (
        <div className="markdown document-body">
          <Markdown>{doc.content}</Markdown>
        </div>
      ) : (
        !doc.excerpt && (
          <p className="muted">
            Your original file is stored privately. Download it to read the full document.
          </p>
        )
      )}
      <div className="form-footer">
        <button className="danger subtle" disabled={busy} onClick={() => action('delete')}>
          <Trash2 size={16} />
          Remove
        </button>
        <div className="row">
          {doc.status === 'failed' && (
            <button className="secondary" disabled={busy} onClick={() => action('retry')}>
              <RefreshCw size={16} />
              Retry indexing
            </button>
          )}
          {!isDemo() && (
            <a className="primary" href={'/api/documents/' + doc._id + '/download'} download>
              <Download size={16} />
              Original
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
export function Library({
  documents,
  projects,
  add,
  open,
  selectedProject = '',
  setSelectedProject,
}) {
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState('all');
  const visible = documents.filter(
    (d) =>
      (!selectedProject || d.project === selectedProject) &&
      (kind === 'all' || d.kind === kind) &&
      (d.title + ' ' + d.tags.join(' ')).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR PERSONAL LIBRARY</div>
          <h1>A home for what you know.</h1>
          <p>Ideas, discoveries, and the things you want to come back to.</p>
        </div>
        <button className="primary" onClick={add}>
          <Plus size={17} />
          Add knowledge
        </button>
      </div>
      <div className="filter-bar">
        <label className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a title or tag…"
            aria-label="Filter knowledge"
          />
        </label>
        <select
          aria-label="Filter project"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="tabs">
        {[
          ['all', 'Everything'],
          ['note', 'Notes'],
          ['pdf', 'PDFs'],
          ['markdown', 'Markdown'],
          ['code', 'Code'],
        ].map(([id, label]) => (
          <button key={id} className={kind === id ? 'active' : ''} onClick={() => setKind(id)}>
            {label}
            {id === 'all' && <span>{documents.length}</span>}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="knowledge-grid">
          {visible.map((d) => (
            <button className="knowledge-card" key={d._id} onClick={() => open(d._id)}>
              <div className="card-top">
                <DocIcon kind={d.kind} />
                <ArrowUpRight size={17} />
              </div>
              <h3>{d.title}</h3>
              <p>{projects.find((p) => p._id === d.project)?.name || 'My knowledge'}</p>
              <div className="tags">
                {d.tags.slice(0, 3).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="card-meta">
                <span>{dateLabel(d.createdAt)}</span>
                <span className={'status ' + d.status}>
                  {d.status === 'ready' ? 'Ready to explore' : d.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title="A little room for discovery"
          text={
            documents.length
              ? 'Try another filter or search.'
              : 'Start with a note, a PDF, or a project you’re proud of.'
          }
          action={
            <button className="secondary" onClick={add}>
              Add your first source
            </button>
          }
        />
      )}
    </section>
  );
}
export function Projects({ projects, documents, onOpen, onRefresh, notify }) {
  const [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api('/projects', { method: 'POST', body: Object.fromEntries(f) });
      await onRefresh();
      setCreating(false);
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONNECT YOUR IDEAS</div>
          <h1>Good things come together.</h1>
          <p>Give each curiosity a space of its own.</p>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          <Plus size={17} />
          New project
        </button>
      </div>
      <div className="project-grid">
        {projects.map((p) => (
          <button className={'project-card ' + p.color} key={p._id} onClick={() => onOpen(p._id)}>
            <Folder size={28} />
            <h2>{p.name}</h2>
            <p>{p.description || 'A new space for ideas.'}</p>
            <footer>
              {documents.filter((d) => d.project === p._id).length} sources
              <ArrowUpRight size={19} />
            </footer>
          </button>
        ))}
      </div>
      {!projects.length && (
        <Empty
          title="What are you working on?"
          text="Create a project to keep related knowledge together."
        />
      )}
      {creating && (
        <Modal title="Start something new" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <label>
              Project name
              <input name="name" required maxLength={80} placeholder="A new curiosity…" />
            </label>
            <label>
              A few words about it
              <textarea name="description" maxLength={500} rows={3} />
            </label>
            <label>
              Color
              <select name="color">
                <option value="sage">Sage</option>
                <option value="peach">Terracotta</option>
                <option value="lavender">Lavender</option>
              </select>
            </label>
            <button className="primary full" disabled={busy}>
              {busy ? 'Creating…' : 'Create project'}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
export function SearchPage({ projects, open, notify }) {
  const [query, setQuery] = useState(''),
    [mode, setMode] = useState('hybrid'),
    [project, setProject] = useState(''),
    [results, setResults] = useState(null),
    [busy, setBusy] = useState(false);
  async function search(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/search', {
        method: 'POST',
        body: { query, mode, project: project || null },
      });
      setResults(r.sources);
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-content search-page">
      <div className="eyebrow">FOLLOW A THREAD</div>
      <h1>It’s in here somewhere.</h1>
      <p className="muted">Find an exact phrase, or just describe what’s on your mind.</p>
      <form className="search-form" onSubmit={search}>
        <label className="search-input">
          <Search size={20} />
          <input
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={2000}
            placeholder="What are you looking for?"
            aria-label="Search your knowledge"
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? 'Searching…' : 'Find it'}
        </button>
        <div className="row">
          <select aria-label="Search mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="hybrid">Hybrid search</option>
            <option value="semantic">By meaning</option>
            <option value="keyword">Exact keywords</option>
          </select>
          <select
            aria-label="Search project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">Every project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </form>
      {results && (
        <div className="search-results">
          <div className="eyebrow">{results.length} MATCHING PASSAGES</div>
          {results.map((s, i) => (
            <button className="search-result" key={i} onClick={() => open(s.documentId, s)}>
              <div className="row">
                <DocIcon kind="text" />
                <strong>{s.title}</strong>
                <ArrowUpRight size={17} />
              </div>
              <p>{s.excerpt}</p>
              <small>{s.page ? 'Page ' + s.page : 'Lines ' + s.lineStart + '–' + s.lineEnd}</small>
            </button>
          ))}
          {!results.length && (
            <Empty
              title="No thread to follow just yet"
              text="Try a different phrase or add a relevant document."
            />
          )}
        </div>
      )}
    </section>
  );
}
export function Journal({ blogs, refresh, notify }) {
  const [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api('/blogs' + (editing._id ? '/' + editing._id : ''), {
        method: editing._id ? 'PUT' : 'POST',
        body: Object.fromEntries(form),
      });
      await refresh();
      setEditing(null);
      notify('Your words are saved.');
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  async function action(blog, type) {
    if (type === 'delete' && !window.confirm('Delete this journal entry?')) return;
    setBusy(true);
    try {
      await api('/blogs/' + blog._id + (type === 'import' ? '/import' : ''), {
        method: type === 'import' ? 'POST' : 'DELETE',
      });
      await refresh();
      notify(
        type === 'import'
          ? 'Copied to your library. Check its indexing status there.'
          : 'Entry removed.',
      );
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-content journal">
      <div className="page-heading">
        <div>
          <div className="eyebrow">FROM YOUR ORIGINAL BLOG</div>
          <h1>A thought worth keeping.</h1>
          <p>Your writing, with room to grow into knowledge.</p>
        </div>
        <button className="primary" onClick={() => setEditing({})}>
          <PenLine size={17} />
          Write an entry
        </button>
      </div>
      {blogs.length ? (
        blogs.map((b) => (
          <article className="journal-entry" key={b._id}>
            <div className="eyebrow">{dateLabel(b.createdAt)}</div>
            <h2>{b.title}</h2>
            <div className="markdown">
              <Markdown>{b.body}</Markdown>
            </div>
            <footer>
              <button className="subtle" onClick={() => setEditing(b)}>
                <PenLine size={15} />
                Edit
              </button>
              <button className="subtle" disabled={busy} onClick={() => action(b, 'import')}>
                <ArrowDownToLine size={15} />
                Add to knowledge
              </button>
              <button
                className="icon-button danger"
                aria-label={'Delete ' + b.title}
                disabled={busy}
                onClick={() => action(b, 'delete')}
              >
                <Trash2 size={16} />
              </button>
            </footer>
          </article>
        ))
      ) : (
        <Empty
          title="Every idea starts somewhere"
          text="Write your first entry. You can add it to your knowledge library whenever you’re ready."
        />
      )}
      {editing && (
        <Modal
          title={editing._id ? 'A little more to say' : 'Put a thought into words'}
          onClose={() => !busy && setEditing(null)}
          wide
        >
          <form onSubmit={save}>
            <label>
              Title
              <input name="title" defaultValue={editing.title} required maxLength={160} />
            </label>
            <label>
              Your story
              <textarea
                name="body"
                rows={12}
                defaultValue={editing.body}
                required
                maxLength={200000}
                placeholder="Start anywhere. Markdown is welcome."
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save entry'}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
