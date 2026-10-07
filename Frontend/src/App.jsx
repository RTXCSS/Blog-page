import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useSession } from './Session';
import { MyBlogs } from './Blogs';
import { io } from 'socket.io-client';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Search,
  LibraryBig,
  Folder,
  MessageCircle,
  PenLine,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Settings2,
  Menu,
  X,
  LogOut,
  Copy,
  Check,
  Leaf,
  Compass,
  Lightbulb,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { api, isDemo } from './api';
import { Logo, DocIcon, Composer, Thinking } from './ui';
import { Library, Projects, SearchPage, AddKnowledge, DocumentDetail } from './Library';
import LiveChat from './LiveChat';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';

const navigation = [
  ['chat', Sparkles, 'Second Brain'],
  ['search', Search, 'Search'],
  ['library', LibraryBig, 'My knowledge'],
  ['projects', Folder, 'Projects'],
  ['journal', PenLine, 'My stories'],
  ['blogs', BookOpen, 'Explore stories'],
  ['messages', MessageCircle, 'Messages'],
];
const prompts = [
  {
    icon: Compass,
    title: 'Connect the dots',
    text: 'How does RAG fit into my blog project?',
    color: 'sage',
  },
  {
    icon: Lightbulb,
    title: 'A little clarity',
    text: 'Explain my authentication notes simply.',
    color: 'peach',
  },
  {
    icon: BookOpen,
    title: 'Pick up a thread',
    text: 'What have I learned about ChromaDB?',
    color: 'lavender',
  },
];
function Garden() {
  return (
    <div className="garden" aria-hidden="true">
      <div className="orbit one" />
      <div className="orbit two" />
      <span className="garden-dot a" />
      <span className="garden-dot b" />
      <span className="garden-dot c" />
      <div className="garden-center">
        <Logo />
      </div>
      <span className="garden-leaf">
        <Leaf size={19} />
      </span>
      <span className="garden-spark">
        <Sparkles size={15} />
      </span>
    </div>
  );
}
export default function App() {
  const { user, logout: endSession } = useSession();
  const route = useLocation(),
    go = useNavigate(),
    params = useParams();
  const paths = {
    chat: '/workspace',
    search: '/search',
    library: '/knowledge',
    projects: '/projects',
    journal: '/my-blogs',
    messages: '/messages',
    blogs: '/blogs',
    settings: '/settings',
  };
  const page =
    Object.keys(paths).find(
      (key) => route.pathname === paths[key] || route.pathname.startsWith(paths[key] + '/'),
    ) || 'chat';
  const [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(null);
  const [documents, setDocuments] = useState([]),
    [projects, setProjects] = useState([]),
    [conversations, setConversations] = useState([]),
    [blogs, setBlogs] = useState([]),
    [status, setStatus] = useState({ ready: false });
  const [conversation, setConversation] = useState(null),
    [question, setQuestion] = useState(''),
    [project, setProject] = useState(''),
    [filterProject, setFilterProject] = useState(''),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState('');
  const [adding, setAdding] = useState(false),
    [detail, setDetail] = useState(null),
    [socket, setSocket] = useState(null),
    [copied, setCopied] = useState(null);
  const end = useRef(null),
    toastTimer = useRef(null);
  const notify = useCallback((message, error = false) => {
    clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);
  const refresh = useCallback(async () => {
    const [d, p, c, b] = await Promise.all([
      api('/documents'),
      api('/projects'),
      api('/conversations'),
      api('/blogs'),
    ]);
    setDocuments(d);
    setProjects(p);
    setConversations(c);
    setBlogs(b);
  }, []);
  useEffect(() => {
    if (!user) return;
    refresh().catch((err) => notify(err.message, true));
    api('/status')
      .then(setStatus)
      .catch(() => {});
    if (isDemo()) return;
    const s = io({ withCredentials: true });
    setSocket(s);
    s.on('document:updated', () => refresh().catch(() => {}));
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user, refresh, notify]);
  useEffect(() => {
    if (page === 'chat') end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation, pending, page]);
  function navigate(next) {
    go(paths[next] || '/workspace');
    setMobile(false);
  }
  function newChat() {
    if (busy) return;
    setConversation(null);
    setPending('');
    setQuestion('');
    setProject('');
    navigate('chat');
  }
  function loadConversation(id) {
    if (!busy) {
      go('/workspace/' + id);
      setMobile(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (params.conversationId)
      api('/conversations/' + params.conversationId)
        .then((c) => {
          if (active) {
            setConversation(c);
            setProject(c.project || '');
          }
        })
        .catch((err) => notify(err.message, true));
    else if (route.pathname === '/workspace') {
      setConversation(null);
      setProject('');
    }
    return () => {
      active = false;
    };
  }, [params.conversationId, route.pathname, notify]);
  async function ask(text) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setPending(text);
    setQuestion('');
    if (page !== 'chat') navigate('chat');
    try {
      const c = await api('/ask', {
        method: 'POST',
        body: {
          question: text.trim(),
          conversationId: conversation?._id || null,
          project: project || null,
        },
      });
      setConversation(c);
      go('/workspace/' + c._id, { replace: true });
      setConversations(await api('/conversations'));
    } catch (err) {
      notify(err.message, true);
      setQuestion(text);
    } finally {
      setBusy(false);
      setPending('');
    }
  }
  async function openDocument(id, source) {
    try {
      const doc = await api('/documents/' + id);
      setDetail({
        ...doc,
        ...(source
          ? {
              excerpt: source.excerpt,
              page: source.page,
              lineStart: source.lineStart,
              lineEnd: source.lineEnd,
            }
          : {}),
      });
    } catch (err) {
      notify(err.message, true);
    }
  }
  async function logout() {
    try {
      await endSession();
      setConversation(null);
      setDocuments([]);
      setProjects([]);
      setConversations([]);
      setBlogs([]);
      go('/login', { replace: true });
    } catch (err) {
      notify(err.message, true);
    }
  }
  async function removeConversation() {
    if (busy || !window.confirm('Delete this conversation?')) return;
    try {
      await api('/conversations/' + conversation._id, { method: 'DELETE' });
      newChat();
      await refresh();
    } catch (err) {
      notify(err.message, true);
    }
  }
  async function copy(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      notify('Your browser could not copy this text.', true);
    }
  }
  const hasMessages = conversation?.messages.length || pending;
  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const activeLabel = navigation.find((n) => n[0] === page)?.[2];
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={'sidebar ' + (mobile ? 'open' : '')}>
        <button className="brand" onClick={newChat}>
          <Logo />
          <span>
            second brain<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="workspace-pill">
          <span className="workspace-avatar">M</span>
          <span>
            My workspace<small>A space to think</small>
          </span>
          <ShieldCheck size={15} />
        </div>
        <button className="new-chat" onClick={newChat} disabled={busy}>
          <Plus size={17} />
          New conversation<span>↗</span>
        </button>
        <nav aria-label="Main navigation">
          {navigation.map(([id, Icon, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {id === 'library' && <small>{documents.length}</small>}
              {id === 'chat' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-history">
          <div className="eyebrow">RECENT CONVERSATIONS</div>
          {conversations.slice(0, 6).map((c) => (
            <button
              key={c._id}
              title={c.title}
              onClick={() => loadConversation(c._id)}
              disabled={busy}
            >
              <MessageCircle size={14} />
              <span>{c.title}</span>
            </button>
          ))}
          {!conversations.length && (
            <p>
              Your next good question
              <br />
              belongs here.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="growth-card">
            <span>
              <Leaf size={16} />A growing mind
            </span>
            <p>
              {readyCount
                ? readyCount + ' sources, ready to connect.'
                : 'Start small. Add one good thought.'}
            </p>
            <div className="growth-track">
              <i style={{ width: Math.max(8, Math.min(100, readyCount * 8)) + '%' }} />
            </div>
            <button onClick={() => setAdding(true)}>
              Plant another idea
              <Plus size={14} />
            </button>
          </div>
          <button className="profile-button" onClick={() => navigate('settings')}>
            <span className="avatar">{user.fullName[0].toUpperCase()}</span>
            <span>
              <strong>{user.fullName}</strong>
              <small>{isDemo() ? 'Sample workspace' : 'Personal workspace'}</small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>{activeLabel}</strong>
          </div>
          <div className="topbar-right">
            {isDemo() && (
              <button className="demo-badge" onClick={logout}>
                Sample workspace <ArrowUpRight size={12} />
              </button>
            )}
            <span className="privacy">
              <ShieldCheck size={14} />
              Just for you
            </span>
            <button
              className="icon-button"
              aria-label="Workspace settings"
              onClick={() => navigate('settings')}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>
        {page === 'chat' && (
          <div className={'brain-page ' + (hasMessages ? 'has-messages' : '')}>
            <div className="brain-main">
              {!hasMessages ? (
                <>
                  <div className="welcome">
                    <div className="eyebrow">
                      <span className="little-dot" />
                      YOUR PERSONAL THINKING SPACE
                    </div>
                    <Garden />
                    <h1>
                      Your mind, a little
                      <br />
                      <em>more connected.</em>
                    </h1>
                    <p>
                      All the things you’ve saved. All the things you’re wondering.
                      <br />
                      Let’s make something of them, together.
                    </p>
                  </div>
                  <div className="welcome-composer">
                    <Composer
                      value={question}
                      setValue={setQuestion}
                      onSend={ask}
                      busy={busy}
                      project={project}
                      setProject={setProject}
                      projects={projects}
                      onAttach={() => setAdding(true)}
                    />
                    <p className="composer-caption">
                      <ShieldCheck size={12} />
                      {isDemo()
                        ? 'Sample preview · answers are local excerpts, not generated by AI'
                        : 'Grounded in your knowledge. Always with sources.'}
                    </p>
                  </div>
                  <div className="suggestions">
                    <div className="section-label">
                      A FEW PLACES TO START<span>A little nudge for your curiosity</span>
                    </div>
                    <div className="prompt-grid">
                      {prompts.map(({ icon: Icon, title, text, color }) => (
                        <button className="prompt-card" key={title} onClick={() => ask(text)}>
                          <span className={'prompt-icon ' + color}>
                            <Icon size={17} />
                          </span>
                          <strong>{title}</strong>
                          <p>{text}</p>
                          <ArrowUpRight className="prompt-arrow" size={15} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="recent-knowledge">
                    <div className="section-header">
                      <h2>Fresh in your mind</h2>
                      <button className="subtle" onClick={() => navigate('library')}>
                        All knowledge
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {documents.length ? (
                      documents.slice(0, 3).map((d) => (
                        <button
                          className="recent-row"
                          key={d._id}
                          onClick={() => openDocument(d._id)}
                        >
                          <DocIcon kind={d.kind} />
                          <span>
                            <strong>{d.title}</strong>
                            <small>
                              {projects.find((p) => p._id === d.project)?.name || 'My knowledge'} ·{' '}
                              {d.kind}
                            </small>
                          </span>
                          <span className={'status ' + d.status}>
                            {d.status === 'ready' ? 'Ready' : d.status}
                          </span>
                          <ArrowUpRight size={15} />
                        </button>
                      ))
                    ) : (
                      <button className="first-source" onClick={() => setAdding(true)}>
                        <Plus size={20} />
                        <span>
                          <strong>Every connection starts with a thought.</strong>
                          <small>Add your first note or document.</small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="conversation-heading">
                    <div>
                      <span className="eyebrow">A THREAD WORTH FOLLOWING</span>
                      <h2>{conversation?.title || 'Let’s think about that.'}</h2>
                    </div>
                    {conversation && (
                      <button
                        className="icon-button"
                        aria-label="Delete conversation"
                        disabled={busy}
                        onClick={removeConversation}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="ai-messages" aria-live="polite">
                    {[
                      ...(conversation?.messages || []),
                      ...(pending ? [{ role: 'user', content: pending }] : []),
                    ].map((m, i) => (
                      <article key={i} className={'ai-message ' + m.role}>
                        {m.role === 'assistant' && (
                          <div className="assistant-label">
                            <Logo small />
                            <strong>Second Brain</strong>
                            <span>{isDemo() ? 'Sample excerpt' : 'From your knowledge'}</span>
                          </div>
                        )}
                        <div className="markdown">
                          <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                        </div>
                        {m.sources?.length > 0 && (
                          <div className="answer-sources">
                            <div className="eyebrow">A LOOK AT THE SOURCES</div>
                            <div>
                              {m.sources.map((s, j) => (
                                <button key={j} onClick={() => openDocument(s.documentId, s)}>
                                  <span className="citation-number">{s.citation}</span>
                                  <span>
                                    <strong>{s.title}</strong>
                                    <small>
                                      {s.page
                                        ? 'Page ' + s.page
                                        : 'Lines ' + s.lineStart + '–' + s.lineEnd}
                                    </small>
                                  </span>
                                  <ArrowUpRight size={14} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.role === 'assistant' && (
                          <button className="copy-button" onClick={() => copy(m.content, i)}>
                            {copied === i ? <Check size={14} /> : <Copy size={14} />}{' '}
                            {copied === i ? 'Copied' : 'Copy answer'}
                          </button>
                        )}
                      </article>
                    ))}
                    {busy && <Thinking />}
                    <div ref={end} />
                  </div>
                  <div className="conversation-composer">
                    <Composer
                      value={question}
                      setValue={setQuestion}
                      onSend={ask}
                      busy={busy}
                      project={project}
                      setProject={conversation ? () => {} : setProject}
                      projects={projects}
                      onAttach={() => setAdding(true)}
                    />
                    <p className="composer-caption">
                      {isDemo()
                        ? 'Sample preview · local excerpts only'
                        : 'AI can make mistakes. Follow the sources, trust your judgment.'}
                    </p>
                  </div>
                </>
              )}
            </div>
            <aside className="context-panel">
              <div className="context-heading">
                <Leaf size={17} />
                <span>A little perspective</span>
              </div>
              <h3>
                Knowledge grows
                <br />
                when it connects.
              </h3>
              <p>Think of this as a conversation with everything you’ve learned.</p>
              <div className="context-stat">
                <span>{readyCount.toString().padStart(2, '0')}</span>
                <div>
                  sources to explore<small>A few seeds. Endless possibilities.</small>
                </div>
              </div>
              <div className="context-stat">
                <span>{projects.length.toString().padStart(2, '0')}</span>
                <div>
                  spaces for ideas<small>Your projects, coming together.</small>
                </div>
              </div>
              <div className="context-divider" />
              <div className="eyebrow">MAKE YOURSELF AT HOME</div>
              <button className="context-action" onClick={() => setAdding(true)}>
                <Plus size={17} />
                <span>
                  Add a little knowledge<small>Notes, PDFs, and code</small>
                </span>
                <ChevronRight size={14} />
              </button>
              <button className="context-action" onClick={() => navigate('projects')}>
                <Folder size={17} />
                <span>
                  Follow a project<small>Give your ideas a space</small>
                </span>
                <ChevronRight size={14} />
              </button>
              <blockquote>
                “The art of knowing is knowing what to connect.”
                <span>A thought to take with you</span>
              </blockquote>
              <div className="service-status">
                <span className={'little-dot ' + (!status.ready ? 'amber' : '')} />
                {isDemo()
                  ? 'You’re exploring a sample'
                  : status.ready
                    ? 'Your brain is ready'
                    : 'AI service needs setup'}
                {!isDemo() && !status.ready && (
                  <button onClick={() => navigate('settings')}>View setup</button>
                )}
              </div>
            </aside>
          </div>
        )}
        {page === 'library' && (
          <Library
            documents={documents}
            projects={projects}
            add={() => setAdding(true)}
            open={openDocument}
            selectedProject={filterProject}
            setSelectedProject={setFilterProject}
          />
        )}
        {page === 'projects' && (
          <Projects
            projects={projects}
            documents={documents}
            onOpen={(id) => {
              setFilterProject(id);
              navigate('library');
            }}
            onRefresh={refresh}
            notify={notify}
          />
        )}
        {page === 'search' && (
          <SearchPage projects={projects} open={openDocument} notify={notify} />
        )}
        {page === 'journal' && <MyBlogs blogs={blogs} refresh={refresh} notify={notify} />}
        {page === 'settings' && (
          <section className="page-content account-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">YOUR ACCOUNT</div>
                <h1>Your little corner.</h1>
                <p>Your profile, your session, and your knowledge workspace.</p>
              </div>
            </div>
            <div className="account-surface">
              <div className="settings-profile">
                <span className="avatar large">{user.fullName[0]}</span>
                <div>
                  <h3>{user.fullName}</h3>
                  <p className="muted">{user.email}</p>
                </div>
              </div>
              <div className="notice">
                {isDemo()
                  ? 'You’re in a sample workspace. Notes and conversations are stored only in this browser. Live user chat and AI generation require a real account and connected services.'
                  : status.ready
                    ? 'Your knowledge service is connected. Documents and AI chats are private to your account.'
                    : 'Your account is ready. Start the Python knowledge service with an OpenAI API key to enable document indexing and AI answers. See the project README for setup.'}
              </div>
              <dl className="settings-list">
                <div>
                  <dt>Answer model</dt>
                  <dd>GPT-4o-mini</dd>
                </div>
                <div>
                  <dt>Embeddings</dt>
                  <dd>text-embedding-3-large</dd>
                </div>
                <div>
                  <dt>Knowledge store</dt>
                  <dd>ChromaDB</dd>
                </div>
                <div>
                  <dt>Your library</dt>
                  <dd>{documents.length} sources</dd>
                </div>
              </dl>
              <button className="secondary full" onClick={logout}>
                <LogOut size={16} />
                {isDemo() ? 'Leave sample & sign in' : 'Sign out of all sessions'}
              </button>
            </div>
          </section>
        )}
        {page === 'messages' && <LiveChat user={user} socket={socket} notify={notify} />}
      </main>
      {adding && (
        <AddKnowledge
          projects={projects}
          onClose={() => setAdding(false)}
          onSaved={refresh}
          notify={notify}
        />
      )}
      {detail && (
        <DocumentDetail
          doc={detail}
          onClose={() => setDetail(null)}
          onChanged={refresh}
          notify={notify}
        />
      )}
      {toast && (
        <div className={'toast ' + (toast.error ? 'error' : '')} role="status">
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
