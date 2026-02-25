/**
 * API client with auth token support.
 * Sends credentials (cookies) and Authorization header when token is available.
 */
export async function apiFetch(url, options = {}) {
  const auth = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
  let token = null;
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      token = parsed?.token;
    } catch {
      // ignore
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}
