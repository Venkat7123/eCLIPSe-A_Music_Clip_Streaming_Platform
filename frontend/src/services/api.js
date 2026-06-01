const BACKEND_URL = 'http://localhost:5000/api';

let _getToken = null;

// Called by AppContext to provide the token getter
export function setTokenGetter(fn) {
  _getToken = fn;
}

async function request(method, path, body = null, isUpload = false) {
  const headers = {};
  const token = _getToken?.();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method };

  if (isUpload) {
    // FormData — let browser set Content-Type with boundary
    options.body = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  options.headers = headers;

  const response = await fetch(`${BACKEND_URL}${path}`, options);

  // Handle 401 — token expired
  if (response.status === 401) {
    console.warn('[API] 401 — token may be expired');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    const error = new Error(err.error || 'API request failed');
    error.status = response.status;
    error.details = err.details;
    throw error;
  }

  return response.json();
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, true),
};

export default api;
