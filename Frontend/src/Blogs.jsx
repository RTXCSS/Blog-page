import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  PenLine,
  BookOpen,
  Clock3,
  MessageCircle,
  Sparkles,
  Plus,
  Check,
  Eye,
  Save,
  Send,
  Trash2,
  ArrowDownToLine,
  Copy,
  FileText,
  Globe2,
  LockKeyhole,
  Leaf,
  X,
  Menu,
} from 'lucide-react';
import { useSession } from './Session';
import { api, isDemo } from './api';
import { Logo, Empty, Modal, dateLabel } from './ui';
import './blogs.css';

export function PublicHeader() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false),
    [error, setError] = useState('');
  async function leave() {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <header className="public-header">
        <Link className="brand" to="/blogs">
          <Logo />
          <span>
            second brain<span className="brand-dot">.</span>
          </span>
        </Link>
        <button
          className="icon-button public-menu"
          aria-label="Toggle site menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={'public-nav ' + (open ? 'open' : '')} aria-label="Site navigation">
          <Link className={pathname === '/blogs' ? 'current' : ''} to="/blogs">
            Discover
          </Link>
          <Link to="/workspace">My workspace</Link>
          <Link to="/messages">Conversations</Link>
        </nav>
        <div className="public-account">
          {user ? (
            <>
              <Link className="write-link" to="/write">
                <PenLine size={16} />
                Write a story
              </Link>
              {isDemo() ? (
                <button className="demo-badge" onClick={leave}>
                  Leave sample
                </button>
              ) : (
                <Link className="avatar" aria-label="Account settings" to="/settings">
                  {user.fullName[0]}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link className="header-login" to="/login">
                Sign in
              </Link>
              <Link className="primary" to="/signup">
                Get started
                <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {isDemo() && (
        <div className="sample-strip">
          <Sparkles size={13} />
          Sample mode · stories and changes stay in this browser.
        </div>
      )}
    </>
  );
}
export function CoverArt({ theme = 'sage', tag, large = false }) {
  return (
    <div className={'cover-art cover-' + theme + (large ? ' large' : '')} aria-hidden="true">
      <div className="cover-grid" />
      <div className="cover-ring r1" />
      <div className="cover-ring r2" />
      <div className="cover-ring r3" />
      <div className="cover-center">
        <Leaf strokeWidth={1.15} />
      </div>
      <span className="cover-star s1">✦</span>
      <span className="cover-star s2">✧</span>
      <span className="cover-label">{tag || 'A THOUGHT WORTH SHARING'}</span>
      <span className="cover-index">second brain.</span>
    </div>
  );
}
function Author({ post, showDate = true }) {
  const name = post.createdBy?.fullName || 'A curious mind';
  return (
    <div className="author-line">
      <span className="avatar">{name[0]}</span>
      <span>
        <strong>{name}</strong>
        {showDate && (
          <small>
            {dateLabel(post.publishedAt || post.createdAt)}
            <span>·</span>
            {post.readingMinutes ||
              Math.max(1, Math.ceil((post.body || '').split(/\s+/).length / 220))}{' '}
            min read
          </small>
        )}
      </span>
    </div>
  );
}
function StoryCard({ post, featured = false }) {
  return (
    <article className={'story-card ' + (featured ? 'featured-story' : '')}>
      <Link className="story-cover-link" to={'/blogs/' + post._id} tabIndex={-1}>
        <CoverArt theme={post.coverTheme} tag={post.tags[0]} large={featured} />
      </Link>
      <div className="story-card-copy">
        <div className="story-category">
          {post.tags[0] || 'Field notes'}
          <span>·</span>
          <Clock3 size={12} />
          {post.readingMinutes} min read
        </div>
        <h2>
          <Link to={'/blogs/' + post._id}>{post.title}</Link>
        </h2>
        <p>{post.summary}</p>
        <footer>
          <Author post={post} showDate={!featured} />
          <Link className="story-arrow" aria-label={'Read ' + post.title} to={'/blogs/' + post._id}>
            <ArrowUpRight size={20} />
          </Link>
        </footer>
      </div>
    </article>
  );
}
export function BlogFeed() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '',
    tag = params.get('tag') || '',
    page = Number(params.get('page')) || 1;
  const [query, setQuery] = useState(q),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api('/public/blogs?' + new URLSearchParams({ q, tag, page }))
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, tag, page, retry]);
  useEffect(() => setQuery(q), [q]);
  function filter(nextTag) {
    setParams({ ...(q ? { q } : {}), ...(nextTag ? { tag: nextTag } : {}) });
  }
  const posts = data?.posts || [],
    featured = !q && !tag && page === 1 ? posts[0] : null;
  return (
    <div className="public-site">
      <PublicHeader />
      <main className="feed-page">
        <section className="feed-hero">
          <div>
            <div className="eyebrow">
              <span className="little-dot" />
              THE COLLECTIVE NOTEBOOK
            </div>
            <h1>
              Good ideas grow
              <br />
              <em>when they’re shared.</em>
            </h1>
            <p>
              Field notes, fresh perspectives, and things learned along the way.
              <br />A little inspiration for your next big thought.
            </p>
            <Link className="text-link" to="/write">
              Add your voice
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="notebook-art" aria-hidden="true">
            <div className="notebook-back" />
            <div className="notebook-front">
              <span>NOTES TO SELF</span>
              <Logo />
              <strong>
                Stay curious.
                <br />
                Keep connecting.
              </strong>
              <div className="notebook-lines" />
              <small>one thought at a time.</small>
            </div>
            <span className="notebook-sticker">
              <Sparkles size={20} />
            </span>
            <span className="notebook-caption">There’s a story in what you know.</span>
          </div>
        </section>
        <section className="feed-discovery">
          <div className="feed-toolbar">
            <div className="feed-tags" aria-label="Story topics">
              {['', 'Technology', 'Learning', 'Design', 'Personal'].map((t) => (
                <button key={t} className={tag === t ? 'selected' : ''} onClick={() => filter(t)}>
                  {t || 'All stories'}
                </button>
              ))}
            </div>
            <form
              className="story-search"
              onSubmit={(e) => {
                e.preventDefault();
                setParams({
                  ...(query.trim() ? { q: query.trim() } : {}),
                  ...(tag ? { tag } : {}),
                });
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search stories"
                placeholder="Find a good read…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button aria-label="Search blog posts">
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
          {error ? (
            <div className="page-error" role="alert">
              <h2>The notebook is taking a moment.</h2>
              <p>{error}</p>
              <button className="secondary" onClick={() => setRetry((r) => r + 1)}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="story-skeletons" role="status" aria-label="Loading stories">
              {[1, 2, 3].map((i) => (
                <div key={i} />
              ))}
            </div>
          ) : (
            <>
              {featured && (
                <>
                  <div className="section-label">
                    IN THE SPOTLIGHT<span>A thought to spend a little time with</span>
                  </div>
                  <StoryCard post={featured} featured />
                </>
              )}
              <div className="feed-section-title">
                <h2>
                  {q ? 'Finding your next read' : tag ? tag + ' stories' : 'From curious minds'}
                </h2>
                <span>
                  {data.total} {data.total === 1 ? 'story' : 'stories'}
                </span>
              </div>
              <div className="story-grid">
                {(featured ? posts.slice(1) : posts).map((post) => (
                  <StoryCard post={post} key={post._id} />
                ))}
              </div>
              {!posts.length && (
                <Empty
                  title={q || tag ? 'A new direction, perhaps?' : 'The first page is yours.'}
                  text={
                    q || tag
                      ? 'Try another search or explore all stories.'
                      : 'No published stories yet. Write something you’ve learned and start the conversation.'
                  }
                  action={
                    <Link className="primary" to={q || tag ? '/blogs' : '/write'}>
                      {q || tag ? 'Explore all stories' : 'Write the first story'}
                      <ArrowUpRight size={16} />
                    </Link>
                  }
                />
              )}
              <div className="pagination">
                {page > 1 && (
                  <button
                    className="secondary"
                    onClick={() => setParams({ q, tag, page: page - 1 })}
                  >
                    <ArrowLeft size={15} />
                    Previous
                  </button>
                )}
                {data.pages > 1 && (
                  <span>
                    Page {page} of {data.pages}
                  </span>
                )}
                {page < data.pages && (
                  <button
                    className="secondary"
                    onClick={() => setParams({ q, tag, page: page + 1 })}
                  >
                    Next
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </>
          )}
        </section>
        <section className="write-invitation">
          <div>
            <span className="eyebrow">YOUR PERSPECTIVE MATTERS</span>
            <h2>
              Someone could use
              <br />
              <em>what you’ve learned.</em>
            </h2>
            <p>A small discovery. A useful lesson. A story only you can tell.</p>
          </div>
          <Link className="primary" to="/write">
            <PenLine size={17} />
            Put it into words
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Link className="brand" to="/blogs">
          <Logo />
          <span>second brain.</span>
        </Link>
        <p>A space for your thoughts. A place to find your people.</p>
        <Link to="/workspace">
          Explore your workspace
          <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
export function BlogArticle() {
  const { id } = useParams();
  const { user } = useSession();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const [post, setPost] = useState(null),
    [comments, setComments] = useState([]),
    [error, setError] = useState(''),
    [comment, setComment] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [more, setMore] = useState(false),
    [progress, setProgress] = useState(0),
    [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setPost(null);
    setError('');
    setComments([]);
    api((preview ? '/blogs/' : '/public/blogs/') + id)
      .then(async (p) => {
        if (!active) return;
        setPost(p);
        document.title = p.title + ' · Second Brain';
        if (p.status === 'published') {
          const c = await api('/public/blogs/' + id + '/comments');
          if (active) {
            setComments(c);
            setMore(c.length === 30);
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, preview]);
  useEffect(() => {
    const scroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? Math.min(100, (scrollY / max) * 100) : 100);
    };
    addEventListener('scroll', scroll, { passive: true });
    scroll();
    return () => removeEventListener('scroll', scroll);
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const c = await api('/blogs/' + id + '/comments', {
        method: 'POST',
        body: { content: comment },
      });
      setComments((old) => [c, ...old]);
      setComment('');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(c) {
    if (!confirm('Remove this comment?')) return;
    try {
      await api('/blogs/' + id + '/comments/' + c._id, { method: 'DELETE' });
      setComments((old) => old.filter((x) => x._id !== c._id));
    } catch (err) {
      setNotice(err.message);
    }
  }
  async function older() {
    setBusy(true);
    try {
      const c = await api('/public/blogs/' + id + '/comments?before=' + comments.at(-1)._id);
      setComments((old) => [...old, ...c]);
      setMore(c.length === 30);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('Your browser could not copy the link. Copy it from the address bar.');
    }
  }
  return (
    <div className="public-site">
      <PublicHeader />
      <div className="reading-progress" style={{ width: progress + '%' }} />
      {error ? (
        <main className="article-page">
          <Empty
            title="This page has turned."
            text={error}
            action={
              <Link to="/blogs" className="secondary">
                Back to stories
              </Link>
            }
          />
        </main>
      ) : !post ? (
        <div className="story-skeletons" role="status" aria-label="Loading story">
          <div />
        </div>
      ) : (
        <main className="article-page">
          <Link to="/blogs" className="back-link">
            <ArrowLeft size={15} />
            Back to the notebook
          </Link>
          {post.status !== 'published' && (
            <div className="draft-banner">
              <LockKeyhole size={16} />
              Private draft · only you can read this.
              <Link to={'/blogs/' + id + '/edit'}>
                Keep writing
                <PenLine size={14} />
              </Link>
            </div>
          )}
          <header className="article-heading">
            <div className="article-tags">
              {post.tags.map((t) => (
                <Link key={t} to={'/blogs?tag=' + encodeURIComponent(t)}>
                  {t}
                </Link>
              ))}
            </div>
            <h1>{post.title}</h1>
            {post.summary && <p>{post.summary}</p>}
            <div className="article-byline">
              <Author post={post} />
              <div className="row">
                <button className="icon-button" aria-label="Copy story link" onClick={copy}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                {user?._id === post.createdBy?._id && (
                  <Link className="secondary" to={'/blogs/' + id + '/edit'}>
                    <PenLine size={15} />
                    Edit story
                  </Link>
                )}
              </div>
            </div>
          </header>
          <CoverArt theme={post.coverTheme} tag={post.tags[0]} large />
          <article className="article-body markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{post.body}</Markdown>
          </article>
          <div className="article-end">
            <Logo />
            <p>Every good thought starts another.</p>
            <Link to="/write">
              What’s yours?
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {post.status === 'published' && (
            <section className="comments-section">
              <div className="section-header">
                <h2>Keep the conversation going.</h2>
                <MessageCircle size={21} />
              </div>
              <p className="muted">A question, a connection, a different perspective.</p>
              {user ? (
                <form onSubmit={submit} className="comment-form">
                  <label htmlFor="comment">Your response</label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    maxLength={2000}
                    rows={3}
                    placeholder="What did this bring to mind?"
                  />
                  <button className="primary" disabled={busy || !comment.trim()}>
                    <Send size={15} />
                    Post response
                  </button>
                </form>
              ) : (
                <div className="comment-signin">
                  <Link to={'/login?next=' + encodeURIComponent('/blogs/' + id)}>Sign in</Link> to
                  share your thoughts.
                </div>
              )}
              {notice && (
                <div className="notice error" role="alert">
                  {notice}
                </div>
              )}
              <div className="comments-list">
                {comments.map((c) => (
                  <article key={c._id} className="reader-comment">
                    <div className="comment-top">
                      <span className="avatar">{c.createdBy?.fullName?.[0] || '?'}</span>
                      <strong>{c.createdBy?.fullName || 'Former reader'}</strong>
                      <time>{dateLabel(c.createdAt)}</time>
                      {user &&
                        (user._id === c.createdBy?._id || user._id === post.createdBy?._id) && (
                          <button
                            className="icon-button"
                            aria-label="Delete response"
                            onClick={() => remove(c)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                    </div>
                    <p>{c.content}</p>
                  </article>
                ))}
                {!comments.length && (
                  <p className="first-comment">Be the first to leave a little thought.</p>
                )}
                {more && (
                  <button className="secondary" disabled={busy} onClick={older}>
                    Earlier responses
                  </button>
                )}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
const blank = {
  title: '',
  body: '',
  summary: '',
  tags: [],
  coverTheme: 'sage',
  status: 'draft',
  __v: 0,
};
export function BlogEditor() {
  const { id } = useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [post, setPost] = useState(blank),
    [loading, setLoading] = useState(!!id),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [publish, setPublish] = useState(false),
    [dirty, setDirty] = useState(false),
    [tagText, setTagText] = useState('');
  const key = 'second-brain-draft:' + user._id + ':' + (id || 'new'),
    editRef = useRef(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setNotice('');
    const load = async () => {
      const server = id ? await api('/blogs/' + id) : { ...blank };
      let recovered;
      try {
        recovered = JSON.parse(sessionStorage.getItem(key));
      } catch {
        /* An unreadable recovery record can be discarded. */
      }
      if (!active) return;
      const value = recovered?.post || server;
      setPost(value);
      setTagText(recovered?.tagText ?? value.tags.join(', '));
      setDirty(!!recovered);
      if (recovered) setNotice('Recovered your unsaved changes from this tab.');
      setLoading(false);
    };
    load().catch((err) => {
      if (active) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id, key]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    addEventListener('beforeunload', warn);
    try {
      sessionStorage.setItem(key, JSON.stringify({ post, tagText }));
    } catch {
      /* Save to the server remains available if browser storage is full. */
    }
    return () => removeEventListener('beforeunload', warn);
  }, [dirty, key, post, tagText]);
  function update(field, value) {
    setDirty(true);
    setPost((old) => ({ ...old, [field]: value }));
    setNotice('');
  }
  function insert(before, after = '') {
    const input = editRef.current;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd;
    const content =
      post.body.slice(0, start) +
      before +
      (post.body.slice(start, end) || 'your text') +
      after +
      post.body.slice(end);
    update('body', content);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, start + before.length + (end - start || 9));
    });
  }
  async function save(status) {
    setBusy(true);
    setError('');
    try {
      const tags = [
        ...new Set(
          tagText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ];
      if (tags.length > 5) throw new Error('Choose up to 5 tags.');
      const body = {
        title: post.title,
        body: post.body,
        summary: post.summary,
        coverTheme: post.coverTheme,
        tags,
        status,
        ...(id ? { version: post.__v } : {}),
      };
      const saved = await api('/blogs' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        body,
      });
      sessionStorage.removeItem(key);
      setPost(saved);
      setDirty(false);
      setPublish(false);
      setNotice(
        status === 'published'
          ? 'Your story is out in the world.'
          : 'Draft saved. Come back whenever inspiration strikes.',
      );
      if (!id) navigate('/blogs/' + saved._id + '/edit', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function discardRecovery() {
    if (!confirm('Discard unsaved changes and return to the last saved version?')) return;
    sessionStorage.removeItem(key);
    try {
      const value = id ? await api('/blogs/' + id) : { ...blank };
      setPost(value);
      setTagText(value.tags.join(', '));
      setDirty(false);
      setNotice('Unsaved changes discarded.');
    } catch (err) {
      setError(err.message);
    }
  }
  const words = post.body.trim() ? post.body.trim().split(/\s+/).length : 0,
    valid = post.title.trim() && post.body.trim();
  return (
    <div className="editor-page">
      <PublicHeader />
      <main>
        <div className="editor-topbar">
          <Link className="back-link" to="/my-blogs">
            <ArrowLeft size={15} />
            My stories
          </Link>
          <div className="editor-actions">
            <span className="save-state">
              {busy
                ? 'Saving…'
                : dirty
                  ? 'Unsaved changes · recovery is on'
                  : post.status === 'published'
                    ? 'Published'
                    : 'Private draft'}
            </span>
            <button
              className="secondary"
              disabled={!valid || busy || loading}
              onClick={() => save('draft')}
            >
              <Save size={15} />
              {post.status === 'published' ? 'Unpublish & save' : 'Save draft'}
            </button>
            <button
              className="primary"
              disabled={!valid || busy || loading}
              onClick={() => setPublish(true)}
            >
              <Globe2 size={15} />
              {post.status === 'published' ? 'Publish changes' : 'Publish story'}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="empty" role="status">
            Opening your notebook…
          </div>
        ) : (
          <>
            <div className="editor-heading">
              <div className="eyebrow">YOUR WORDS. YOUR PERSPECTIVE.</div>
              <h1>{id ? 'Make a good thought better.' : 'Start with a little thought.'}</h1>
              <p>No perfect first sentences required.</p>
            </div>
            {error && (
              <div className="notice error editor-notice" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="notice editor-notice" role="status">
                {notice}
                {dirty && (
                  <button className="subtle" onClick={discardRecovery}>
                    Discard recovered changes
                  </button>
                )}
              </div>
            )}
            <div className="editor-layout">
              <section className="writing-surface">
                <label className="sr-only" htmlFor="story-title">
                  Story title
                </label>
                <input
                  id="story-title"
                  className="story-title-input"
                  placeholder="Give your story a title…"
                  value={post.title}
                  onChange={(e) => update('title', e.target.value)}
                  maxLength={160}
                />
                <div className="editor-toolbar">
                  <div className="format-tools">
                    <button type="button" title="Heading" onClick={() => insert('\n## ')}>
                      H₂
                    </button>
                    <button type="button" title="Bold" onClick={() => insert('**', '**')}>
                      <b>B</b>
                    </button>
                    <button type="button" title="Italic" onClick={() => insert('*', '*')}>
                      <em>I</em>
                    </button>
                    <button type="button" title="Quote" onClick={() => insert('\n> ')}>
                      “
                    </button>
                    <button
                      type="button"
                      title="Code block"
                      onClick={() => insert('\n```\n', '\n```')}
                    >
                      {'</>'}
                    </button>
                  </div>
                  <div className="editor-mode">
                    <button className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
                      <PenLine size={14} />
                      Write
                    </button>
                    <button className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
                      <Eye size={14} />
                      Preview
                    </button>
                  </div>
                </div>
                {preview ? (
                  <div className="markdown editor-preview">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {post.body || '*Your story will take shape here.*'}
                    </Markdown>
                  </div>
                ) : (
                  <textarea
                    ref={editRef}
                    className="story-body-input"
                    aria-label="Story body"
                    placeholder="What have you been thinking about?\n\nShare a discovery. Unpack an idea. Tell a story.\nThis is your space."
                    value={post.body}
                    onChange={(e) => update('body', e.target.value)}
                    maxLength={100000}
                  />
                )}
                <footer className="editor-wordcount">
                  <span>{words} words</span>
                  <span>{Math.max(1, Math.ceil(words / 220))} min read</span>
                  <span>Markdown supported</span>
                </footer>
              </section>
              <aside className="story-settings">
                <h2>The finishing touches</h2>
                <p>Help your story find the right readers.</p>
                <label>
                  A little introduction
                  <textarea
                    rows={4}
                    placeholder="A sentence or two to invite someone in…"
                    value={post.summary}
                    maxLength={280}
                    onChange={(e) => update('summary', e.target.value)}
                  />
                  <small>{post.summary.length}/280</small>
                </label>
                <label>
                  Topics
                  <input
                    placeholder="Technology, Learning"
                    value={tagText}
                    onChange={(e) => {
                      setTagText(e.target.value);
                      setDirty(true);
                    }}
                  />
                  <small>Up to 5 tags, separated by commas.</small>
                </label>
                <fieldset>
                  <legend>A color for your story</legend>
                  <div className="cover-options">
                    {['sage', 'peach', 'lavender', 'ink'].map((t) => (
                      <button
                        key={t}
                        className={'cover-option ' + t + (post.coverTheme === t ? ' selected' : '')}
                        aria-label={t + ' cover'}
                        aria-pressed={post.coverTheme === t}
                        onClick={() => update('coverTheme', t)}
                      >
                        {post.coverTheme === t && <Check size={17} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <CoverArt theme={post.coverTheme} tag={tagText.split(',')[0]} />
                <div className="editor-tip">
                  <Leaf size={18} />
                  <p>
                    Your draft is private. Publishing makes it visible to everyone on the Stories
                    page.
                  </p>
                </div>
                {id && (
                  <Link
                    className="text-link"
                    to={'/blogs/' + id + (post.status === 'published' ? '' : '?preview=1')}
                  >
                    Read saved version
                    <ArrowUpRight size={15} />
                  </Link>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
      {publish && (
        <Modal
          title={post.status === 'published' ? 'Share these changes?' : 'Ready to let it grow?'}
          onClose={() => !busy && setPublish(false)}
        >
          <p className="muted">
            Your story will be publicly readable. Your knowledge library and private notes stay
            private.
          </p>
          <div className="publish-summary">
            <Globe2 size={22} />
            <h3>{post.title}</h3>
            <p>{post.summary || post.body.slice(0, 150)}</p>
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="form-footer">
            <button className="secondary" disabled={busy} onClick={() => setPublish(false)}>
              Keep writing
            </button>
            <button className="primary" disabled={busy} onClick={() => save('published')}>
              {busy ? 'Publishing…' : 'Publish now'}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function MyBlogs({ blogs, refresh, notify }) {
  const [filter, setFilter] = useState('all'),
    [busy, setBusy] = useState(null);
  const visible = blogs.filter((b) => filter === 'all' || (b.status || 'draft') === filter);
  async function action(post, type) {
    if (
      type === 'delete' &&
      !confirm('Delete this story and its responses? This cannot be undone.')
    )
      return;
    setBusy(post._id);
    try {
      const result = await api('/blogs/' + post._id + (type === 'import' ? '/import' : ''), {
        method: type === 'delete' ? 'DELETE' : 'POST',
      });
      await refresh();
      notify(
        type === 'delete'
          ? 'Story removed.'
          : result.status === 'failed'
            ? 'Copied to your library. Indexing needs attention.'
            : 'Your story is now part of your knowledge.',
      );
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="page-content my-stories">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR OWN LITTLE NOTEBOOK</div>
          <h1>Every story starts with you.</h1>
          <p>Your drafts, your published thoughts, your next good idea.</p>
        </div>
        <Link className="primary" to="/write">
          <Plus size={17} />
          Write a story
        </Link>
      </div>
      <div className="writing-stats">
        <div>
          <FileText size={18} />
          <strong>{blogs.length}</strong>
          <span>stories in your notebook</span>
        </div>
        <div>
          <Globe2 size={18} />
          <strong>{blogs.filter((b) => b.status === 'published').length}</strong>
          <span>out in the world</span>
        </div>
        <div>
          <LockKeyhole size={18} />
          <strong>{blogs.filter((b) => b.status !== 'published').length}</strong>
          <span>still taking shape</span>
        </div>
      </div>
      <div className="tabs">
        {[
          ['all', 'All stories'],
          ['draft', 'Drafts'],
          ['published', 'Published'],
        ].map(([value, label]) => (
          <button
            className={filter === value ? 'active' : ''}
            key={value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="my-story-list">
          {visible.map((b) => (
            <article key={b._id}>
              <Link className="my-story-art" to={'/blogs/' + b._id + '/edit'} tabIndex={-1}>
                <CoverArt theme={b.coverTheme} />
              </Link>
              <div className="my-story-info">
                <div className={'publication-status ' + b.status}>
                  {b.status === 'published' ? <Globe2 size={12} /> : <LockKeyhole size={12} />}{' '}
                  {b.status === 'published' ? 'Published' : 'Private draft'}
                </div>
                <h2>
                  <Link to={'/blogs/' + b._id + '/edit'}>{b.title}</Link>
                </h2>
                <p>{b.summary || b.body.slice(0, 110)}</p>
                <small>
                  Updated {dateLabel(b.updatedAt || b.createdAt)} · {b.readingMinutes || 1} min read
                </small>
                <div className="my-story-actions">
                  <Link to={'/blogs/' + b._id + '/edit'}>
                    <PenLine size={14} />
                    Edit
                  </Link>
                  <Link to={'/blogs/' + b._id + (b.status === 'published' ? '' : '?preview=1')}>
                    <Eye size={14} />
                    Read
                  </Link>
                  <button disabled={busy === b._id} onClick={() => action(b, 'import')}>
                    <ArrowDownToLine size={14} />
                    Add to knowledge
                  </button>
                  <button
                    className="delete-story"
                    aria-label={'Delete ' + b.title}
                    disabled={busy === b._id}
                    onClick={() => action(b, 'delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            filter === 'published'
              ? 'Let your next idea find its people.'
              : 'A blank page is a beginning.'
          }
          text="Start a story, save it as a draft, and share it when you’re ready."
          action={
            <Link className="primary" to="/write">
              Write your first story
              <PenLine size={15} />
            </Link>
          }
        />
      )}
    </section>
  );
}
export function NotFound() {
  return (
    <div className="public-site">
      <PublicHeader />
      <Empty
        title="A little off the page."
        text="We couldn’t find that page. There are plenty of good ideas back in the notebook."
        action={
          <Link className="primary" to="/blogs">
            Back to stories
            <ArrowRight size={15} />
          </Link>
        }
      />
    </div>
  );
}
