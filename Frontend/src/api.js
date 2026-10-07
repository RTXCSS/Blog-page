import { demoRequest } from './demo';
export const isDemo = () => sessionStorage.getItem('second-brain-demo') === 'true';
export async function api(path, options = {}) {
  if (isDemo()) return demoRequest(path, options);
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch('/api' + path, {
      ...options,
      credentials: 'include',
      headers: {
        'X-Requested-With': 'SecondBrain',
        ...(!isForm ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      ...(options.body && !isForm ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const data = await response
    .json()
    .catch(() => ({ error: 'The server is unavailable. Please try again.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}
