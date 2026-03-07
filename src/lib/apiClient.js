const API_TOKEN_KEYS = ['insightdisc_api_token', 'insight_api_token', 'server_api_token'];
const ENABLE_DEV_LOGIN_SHORTCUTS =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';
const API_EMAIL_KEYS = ENABLE_DEV_LOGIN_SHORTCUTS
  ? ['insightdisc_api_email', 'disc_mock_user_email']
  : ['insightdisc_api_email'];
const PRIMARY_API_TOKEN_KEY = API_TOKEN_KEYS[0];
const PRIMARY_API_EMAIL_KEY = API_EMAIL_KEYS[0];

export function getApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL || '').trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

function getFromStorage(keys = []) {
  if (typeof window === 'undefined') return '';

  for (const key of keys) {
    const value =
      window.localStorage.getItem(key) ||
      window.sessionStorage.getItem(key) ||
      '';
    if (value) return value;
  }

  return '';
}

export function getApiToken() {
  return getFromStorage(API_TOKEN_KEYS);
}

export function getApiUserEmail() {
  return getFromStorage(API_EMAIL_KEYS);
}

export function setApiSession({ token = '', email = '' } = {}) {
  if (typeof window === 'undefined') return;

  if (token) {
    window.localStorage.setItem(PRIMARY_API_TOKEN_KEY, token);
  }

  if (email) {
    window.localStorage.setItem(PRIMARY_API_EMAIL_KEY, String(email).toLowerCase());
  }
}

export function clearApiSession() {
  if (typeof window === 'undefined') return;

  [...API_TOKEN_KEYS, ...API_EMAIL_KEYS].forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
}

export function getApiAuthHeaders({
  token = getApiToken(),
  userEmail = getApiUserEmail(),
} = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (userEmail) {
    headers['x-insight-user-email'] = userEmail;
  }
  return headers;
}

export async function apiRequest(path, options = {}) {
  const baseUrl = options.baseUrl || getApiBaseUrl();
  if (!baseUrl && !String(path || '').startsWith('http')) {
    throw new Error('API_BASE_URL_NOT_CONFIGURED');
  }

  const url = String(path || '').startsWith('http')
    ? String(path)
    : `${baseUrl}${String(path || '').startsWith('/') ? '' : '/'}${String(path || '')}`;

  const token = options.token || getApiToken();
  const userEmail = options.userEmail || getApiUserEmail();
  if (options.requireAuth && !token && !userEmail) {
    throw new Error('API_AUTH_MISSING');
  }

  const headers = {
    ...(options.headers || {}),
  };

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  Object.assign(headers, getApiAuthHeaders({ token, userEmail }));

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : isFormData || typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.reason || `HTTP_${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
