const API_TOKEN_KEYS = ['insightdisc_api_token', 'insight_api_token', 'server_api_token'];
const API_EMAIL_KEYS = ['insightdisc_api_email', 'disc_mock_user_email'];

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

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (userEmail) {
    headers['x-insight-user-email'] = userEmail;
  }

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
