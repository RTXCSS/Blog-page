import { useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Code2,
  BookOpen,
  StickyNote,
  ArrowUp,
  Plus,
  ChevronDown,
} from 'lucide-react';
export function Logo({ small = false }) {
  return (
    <span className={'brand-mark ' + (small ? 'small' : '')}>
      <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M18 29V14M18 23C8 24 5 17 7 10c8-1 12 4 11 13ZM18 19c0-8 4-12 12-12 1 8-4 13-12 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
export function DocIcon({ kind }) {
  const Icon =
    kind === 'code'
      ? Code2
      : kind === 'note'
        ? StickyNote
        : kind === 'markdown'
          ? BookOpen
          : FileText;
  return (
    <span className={'doc-icon ' + (kind || 'text')}>
      <Icon size={19} />
    </span>
  );
}
export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={27} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={'modal ' + (wide ? 'wide' : '')}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Composer({
  onSend,
  busy,
  project,
  setProject,
  projects,
  onAttach,
  value,
  setValue,
}) {
  return (
    <form
      className={'composer ' + (busy ? 'is-busy' : '')}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !busy) onSend(value);
      }}
    >
      <textarea
        aria-label="Ask your Second Brain"
        placeholder="Ask a question, find a connection, follow a thought…"
        value={value}
        maxLength={4000}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (value.trim() && !busy) onSend(value);
          }
        }}
      />
      <div className="composer-bottom">
        <div className="composer-tools">
          <button
            type="button"
            className="icon-button"
            title="Add knowledge"
            aria-label="Add knowledge"
            onClick={onAttach}
          >
            <Plus size={20} />
          </button>
          <span className="tool-divider" />
          <label className="scope-select">
            <BookOpen size={14} />
            <select
              aria-label="Knowledge scope"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              disabled={busy}
            >
              <option value="">All my knowledge</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
        </div>
        <button
          type="submit"
          className="send-button"
          aria-label="Send question"
          disabled={!value.trim() || busy}
        >
          {busy ? <span className="spinner" /> : <ArrowUp size={20} />}
        </button>
      </div>
    </form>
  );
}
export function Thinking() {
  return (
    <div className="thinking" role="status">
      <Sparkles size={17} />
      <span>Connecting the dots</span>
      <i />
      <i />
      <i />
    </div>
  );
}
export const dateLabel = (date) =>
  date
    ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Just now';
