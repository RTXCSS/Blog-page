import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  EyeOff,
  LibraryBig,
  Sparkles,
  Check,
} from 'lucide-react';
import { useSession, LoadingPage } from './Session';
import { api } from './api';
import { Logo } from './ui';
export default function AuthPage({ register = false }) {
  const { user, setUser, loading } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [visible, setVisible] = useState(false),
    [password, setPassword] = useState('');
  const next = params.get('next');
  const destination =
    next?.startsWith('/') && !next.startsWith('//') && !/^\/(login|signup)/.test(next)
      ? next
      : '/workspace';
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    if (register && form.password !== form.confirmPassword) {
      setError('Your passwords don’t match yet.');
      setBusy(false);
      return;
    }
    delete form.confirmPassword;
    try {
      const data = await api('/auth/' + (register ? 'register' : 'login'), {
        method: 'POST',
        body: form,
      });
      setUser(data.user);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function explore() {
    sessionStorage.setItem('second-brain-demo', 'true');
    setUser((await api('/auth/me')).user);
    navigate('/workspace');
  }
  if (loading) return <LoadingPage />;
  if (user) return <Navigate to={destination} replace />;
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link className="brand" to="/blogs">
          <Logo />
          <span>
            second brain<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="auth-story-content">
          <div className="auth-orbit" aria-hidden="true">
            <span />
            <span />
            <Logo />
            <i className="orbit-spark">
              <Sparkles size={22} />
            </i>
            <i className="orbit-book">
              <LibraryBig size={22} />
            </i>
          </div>
          <div className="eyebrow">THINK. WRITE. CONNECT.</div>
          <h1>
            Good ideas deserve
            <br />
            <em>a place to grow.</em>
          </h1>
          <p>
            Keep what you learn. Share what you discover.
            <br />
            Find your people along the way.
          </p>
          <div className="auth-feature-list">
            <span>
              <Check size={16} />
              Your own knowledge workspace
            </span>
            <span>
              <Check size={16} />
              Stories that start conversations
            </span>
            <span>
              <Check size={16} />
              Answers connected to your sources
            </span>
          </div>
        </div>
        <footer>One curious mind is a beginning. Together, we go further.</footer>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form">
          <Link className="auth-back" to="/blogs">
            ← Back to stories
          </Link>
          <div className="eyebrow">{register ? 'A NEW CHAPTER' : 'YOUR THINKING SPACE AWAITS'}</div>
          <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'Start your own corner of the internet. Make it yours.'
              : 'Pick up a thought, a story, or a conversation.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Your name
                <input
                  name="fullName"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'At least 10 characters' : 'Your password'}
                  minLength={register ? 10 : 1}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {register && (
              <>
                <p className="password-hint">
                  Use at least 10 characters. A few memorable words work well.
                </p>
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="One more time"
                    required
                    minLength={10}
                    maxLength={72}
                  />
                </label>
              </>
            )}
            {error && (
              <div role="alert" className="notice error">
                {error}
              </div>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have a space here?' : 'New around here?'}{' '}
            <Link
              to={
                (register ? '/login' : '/signup') +
                (next ? '?next=' + encodeURIComponent(next) : '')
              }
            >
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <div className="or-divider">
            <span>just looking around?</span>
          </div>
          <button className="secondary full" onClick={explore}>
            Explore the sample workspace
            <ArrowUpRight size={17} />
          </button>
          <p className="auth-note">
            <ShieldCheck size={14} />
            Your notes are private. You choose what to publish.
          </p>
        </div>
      </section>
    </div>
  );
}
