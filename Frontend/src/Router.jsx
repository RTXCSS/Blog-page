import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { SessionProvider, RequireAuth } from './Session';
import Workspace from './App';
import AuthPage from './AuthPage';
import { BlogFeed, BlogArticle, BlogEditor, NotFound } from './Blogs';
function PageBehavior() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const label = pathname.startsWith('/login')
      ? 'Sign in'
      : pathname.startsWith('/signup')
        ? 'Create account'
        : pathname.startsWith('/write')
          ? 'Write a story'
          : pathname.includes('/edit')
            ? 'Edit story'
            : pathname.startsWith('/messages')
              ? 'Messages'
              : pathname.startsWith('/blogs')
                ? 'Stories'
                : 'Your workspace';
    document.title = label + ' · Second Brain';
  }, [pathname]);
  return null;
}
function Home() {
  return (
    <Navigate
      to={
        new URLSearchParams(window.location.search).get('demo') === 'true'
          ? '/workspace?demo=true'
          : '/blogs'
      }
      replace
    />
  );
}
export default function AppRouter() {
  return (
    <SessionProvider>
      <PageBehavior />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage key="login" />} />
        <Route path="/signup" element={<AuthPage key="signup" register />} />
        <Route path="/blogs" element={<BlogFeed />} />
        <Route path="/blogs/:id" element={<BlogArticle />} />
        <Route
          path="/write"
          element={
            <RequireAuth>
              <BlogEditor key="new" />
            </RequireAuth>
          }
        />
        <Route
          path="/blogs/:id/edit"
          element={
            <RequireAuth>
              <BlogEditor />
            </RequireAuth>
          }
        />
        {[
          '/workspace',
          '/workspace/:conversationId',
          '/knowledge',
          '/projects',
          '/search',
          '/my-blogs',
          '/messages',
          '/messages/:roomId',
          '/settings',
        ].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireAuth>
                <Workspace />
              </RequireAuth>
            }
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SessionProvider>
  );
}
