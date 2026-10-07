import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { Logo } from './ui';
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    let active = true;
    if (new URLSearchParams(window.location.search).get('demo') === 'true')
      sessionStorage.setItem('second-brain-demo', 'true');
    api('/auth/me')
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const expire = () => {
      setSignedOut(false);
      setUser(null);
    };
    window.addEventListener('session-expired', expire);
    return () => {
      active = false;
      window.removeEventListener('session-expired', expire);
    };
  }, []);
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith('second-brain-draft:')) sessionStorage.removeItem(key);
    navigate('/login', { replace: true });
    setSignedOut(true);
    setUser(null);
  }
  return (
    <SessionContext.Provider value={{ user, setUser, loading, logout, signedOut }}>
      {loading ? <LoadingPage /> : children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
export function LoadingPage() {
  return (
    <div className="loading-screen" role="status">
      <Logo />
      <span>Making a little room for your thoughts…</span>
    </div>
  );
}
export function RequireAuth({ children }) {
  const { user, loading, signedOut } = useSession();
  const location = useLocation();
  if (loading) return <LoadingPage />;
  if (!user)
    return (
      <Navigate
        to={
          signedOut
            ? '/login'
            : '/login?next=' + encodeURIComponent(location.pathname + location.search)
        }
        replace
      />
    );
  return children;
}
