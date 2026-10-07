import { useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Search, MessageCircle, Wifi, WifiOff } from 'lucide-react';
import { api, isDemo } from './api';
import { Empty } from './ui';
export default function LiveChat({ user, socket, notify }) {
  const navigate = useNavigate(),
    { roomId } = useParams();
  const [rooms, setRooms] = useState([]),
    [selected, setSelected] = useState(null),
    [messages, setMessages] = useState([]),
    [query, setQuery] = useState(''),
    [users, setUsers] = useState([]),
    [draft, setDraft] = useState(''),
    [typing, setTyping] = useState(''),
    [connected, setConnected] = useState(socket?.connected || false),
    [sending, setSending] = useState(false),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(false);
  const bottom = useRef(null),
    timer = useRef(null),
    selectedRef = useRef(null),
    typingAt = useRef(0);
  selectedRef.current = selected;
  useEffect(() => {
    api('/chat/rooms')
      .then(setRooms)
      .catch((err) => notify(err.message, true));
  }, [notify]);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (query.trim().length >= 2)
        api('/chat/users?q=' + encodeURIComponent(query))
          .then((u) => active && setUsers(u))
          .catch((err) => notify(err.message, true));
      else setUsers([]);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, notify]);
  useEffect(() => {
    if (!socket) return;
    const receive = (m) => {
      if (selectedRef.current?._id === m.room)
        setMessages((old) => (old.some((x) => x._id === m._id) ? old : [...old, m]));
      api('/chat/rooms')
        .then(setRooms)
        .catch(() => {});
    };
    const roomUpdated = () =>
      api('/chat/rooms')
        .then(setRooms)
        .catch(() => {});
    const onTyping = (data) => {
      if (data.roomId === selectedRef.current?._id) {
        setTyping(data.name);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setTyping(''), 2000);
      }
    };
    const online = () => {
      setConnected(true);
      roomUpdated();
      if (selectedRef.current)
        api('/chat/rooms/' + selectedRef.current._id + '/messages')
          .then(setMessages)
          .catch(() => {});
    };
    const offline = () => setConnected(false);
    socket.on('message:new', receive);
    socket.on('typing', onTyping);
    socket.on('room:updated', roomUpdated);
    socket.on('connect', online);
    socket.on('disconnect', offline);
    return () => {
      socket.off('message:new', receive);
      socket.off('typing', onTyping);
      socket.off('room:updated', roomUpdated);
      socket.off('connect', online);
      socket.off('disconnect', offline);
      clearTimeout(timer.current);
    };
  }, [socket]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing]);
  const select = useCallback(
    async (room) => {
      selectedRef.current = room;
      setSelected(room);
      setTyping('');
      setMessages([]);
      setLoading(true);
      try {
        const m = await api('/chat/rooms/' + room._id + '/messages');
        if (selectedRef.current?._id === room._id) {
          setMessages((old) =>
            [...new Map([...m, ...old].map((x) => [x._id, x])).values()].sort((a, b) =>
              a._id.localeCompare(b._id),
            ),
          );
          setMore(m.length === 50);
        }
      } catch (err) {
        notify(err.message, true);
      } finally {
        if (selectedRef.current?._id === room._id) setLoading(false);
      }
    },
    [notify],
  );
  useEffect(() => {
    if (!roomId) {
      setSelected(null);
      selectedRef.current = null;
      return;
    }
    const room = rooms.find((r) => r._id === roomId);
    if (room && selectedRef.current?._id !== roomId) {
      setDraft('');
      select(room);
    }
  }, [roomId, rooms, select]);
  async function start(person) {
    try {
      const room = await api('/chat/rooms', { method: 'POST', body: { userId: person._id } });
      setQuery('');
      navigate('/messages/' + room._id);
      setRooms(await api('/chat/rooms'));
    } catch (err) {
      notify(err.message, true);
    }
  }
  async function older() {
    const roomId = selected._id;
    setLoading(true);
    try {
      const m = await api('/chat/rooms/' + roomId + '/messages?before=' + messages[0]._id);
      if (selectedRef.current?._id === roomId) {
        setMessages((old) =>
          [...new Map([...m, ...old].map((x) => [x._id, x])).values()].sort((a, b) =>
            a._id.localeCompare(b._id),
          ),
        );
        setMore(m.length === 50);
      }
    } catch (err) {
      notify(err.message, true);
    } finally {
      if (selectedRef.current?._id === roomId) setLoading(false);
    }
  }
  function send(e) {
    e.preventDefault();
    if (!draft.trim() || !socket?.connected || sending) return;
    setSending(true);
    const content = draft,
      roomId = selected._id;
    socket
      .timeout(8000)
      .emit('message:send', { roomId, content, clientId: crypto.randomUUID() }, (err, result) => {
        setSending(false);
        if (err || result?.error)
          return notify(
            result?.error || 'Delivery wasn’t confirmed. Check the conversation before resending.',
            true,
          );
        setDraft('');
        if (selectedRef.current?._id === roomId)
          setMessages((old) =>
            old.some((m) => m._id === result.message._id) ? old : [...old, result.message],
          );
      });
  }
  const name = (room) =>
    room.participants.find((p) => p._id !== user._id)?.fullName || 'Conversation';
  return (
    <section className="live-chat">
      <aside className="people-panel">
        <h2>A conversation, together.</h2>
        <p className="muted">Real people. A little shared thinking.</p>
        <label className="search-input">
          <Search size={16} />
          <input
            aria-label="Find people"
            placeholder="Find someone by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {query.length >= 2 && (
          <div className="people-results">
            {users.length ? (
              users.map((p) => (
                <button key={p._id} onClick={() => start(p)}>
                  <span className="avatar">{p.fullName[0]}</span>
                  {p.fullName}
                </button>
              ))
            ) : (
              <p className="muted">No matching people.</p>
            )}
          </div>
        )}
        <div className="room-list">
          {rooms.map((r) => (
            <button
              key={r._id}
              className={selected?._id === r._id ? 'active' : ''}
              onClick={() => navigate('/messages/' + r._id)}
              disabled={sending}
            >
              <span className="avatar">{name(r)[0]}</span>
              <span>
                <strong>{name(r)}</strong>
                <small>{r.lastMessage || 'Say hello'}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="connection">
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}{' '}
          {connected
            ? 'Connected'
            : isDemo()
              ? 'Sample mode · sign in for live chat'
              : 'Reconnecting…'}
        </div>
      </aside>
      <div className="live-main">
        {selected ? (
          <>
            <header>
              <span className="avatar">{name(selected)[0]}</span>
              <div>
                <strong>{name(selected)}</strong>
                <small>Private conversation</small>
              </div>
            </header>
            <div className="live-messages" aria-live="polite">
              {more && (
                <button className="subtle" disabled={loading} onClick={older}>
                  Load earlier messages
                </button>
              )}
              {loading && <p className="muted">Loading conversation…</p>}
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={'live-message ' + (m.sender._id === user._id ? 'mine' : '')}
                >
                  <p>{m.content}</p>
                  <small>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </div>
              ))}
              {typing && <div className="muted typing">{typing} is typing…</div>}
              <div ref={bottom} />
            </div>
            <form className="message-form" onSubmit={send}>
              <input
                aria-label="Message"
                placeholder="Say what’s on your mind…"
                value={draft}
                maxLength={4000}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (Date.now() - typingAt.current > 1200) {
                    socket?.emit('typing', { roomId: selected._id });
                    typingAt.current = Date.now();
                  }
                }}
              />
              <button
                className="send-button"
                aria-label="Send message"
                disabled={!draft.trim() || !connected || sending}
              >
                <ArrowUp size={20} />
              </button>
            </form>
          </>
        ) : (
          <Empty
            title="Good ideas love company."
            text={
              isDemo()
                ? 'Sign in to start a real-time conversation with another registered user.'
                : 'Find someone by name or email to start a private conversation.'
            }
            action={<MessageCircle size={24} />}
          />
        )}
      </div>
    </section>
  );
}
