const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1';
let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => { accessToken = token || null; };
export const getAccessToken = () => accessToken;
export const apiUrl = API_URL;

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(payload?.message || `Yêu cầu thất bại (${response.status}).`);
    error.status = response.status;
    error.errors = payload?.errors || [];
    throw error;
  }
  return payload;
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(parseResponse)
      .then((payload) => {
        setAccessToken(payload.data.accessToken);
        return payload.data;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

export const request = async (path, options = {}) => {
  const { auth = false, retry = true, body, headers = {}, ...rest } = options;
  const requestHeaders = { Accept: 'application/json', ...headers };
  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }
  if (auth && accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: requestHeaders,
      body: requestBody,
      ...rest,
    });
    if (response.status === 401 && auth && retry) {
      await refreshAccessToken();
      return request(path, { ...options, retry: false });
    }
    return await parseResponse(response);
  } catch (error) {
    if (error.status === 401 && auth && retry) {
      await refreshAccessToken();
      return request(path, { ...options, retry: false });
    }
    throw error;
  }
};

export const api = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
};

export const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('/assets/')) return path;
  const origin = API_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};
