const API_TOKEN_KEYS = [
  'insightdisc_token',
  'insightdisc_api_token',
  'insight_api_token',
  'server_api_token',
];

const CANONICAL_PRODUCTION_API_URL = 'https://api.insightdisc.com';

const metaEnv =
  typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {};

const ENABLE_DEV_LOGIN_SHORTCUTS =
  Boolean(metaEnv.DEV) &&
  String(metaEnv.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';

const API_EMAIL_KEYS = ENABLE_DEV_LOGIN_SHORTCUTS
  ? ['insightdisc_api_email', 'disc_mock_user_email']
  : ['insightdisc_api_email'];

const PRIMARY_API_TOKEN_KEY = API_TOKEN_KEYS[0];
const PRIMARY_API_EMAIL_KEY = API_EMAIL_KEYS[0];

function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/$/, '');
}

function normalizeRelativePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function getHostname(value = '') {
  const normalized = normalizeBaseUrl(value);
  if (!normalized || normalized.startsWith('/')) return '';

  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isInsightDiscFrontendHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  if (!normalized || normalized === 'api.insightdisc.com') return false;

  return (
    normalized === 'app.insightdisc.com' ||
    normalized === 'insightdisc.com' ||
    normalized.endsWith('.insightdisc.com')
  );
}

export function resolveApiBaseUrl({
  mode = '',
  dev = false,
  prod = false,
  enableDevLoginShortcuts = false,
  configuredApiUrl = '',
  configuredApiBaseUrl = '',
  runtimeOrigin = '',
} = {}) {
  const runtimeMode = String(mode || '').trim().toLowerCase();
  const normalizedRuntimeOrigin = normalizeBaseUrl(runtimeOrigin);
  const runtimeHost = getHostname(normalizedRuntimeOrigin);

  // Regra principal:
  // Em produção, no domínio oficial do frontend, SEMPRE usar a API canônica.
  if (prod && isInsightDiscFrontendHost(runtimeHost)) {
    return CANONICAL_PRODUCTION_API_URL;
  }

  // Ambiente de testes E2E sem backend real.
  if (runtimeMode === 'e2e-core') {
    return '';
  }

  // Em dev com atalhos/mock habilitados, não usar API real,
  // exceto quando estiver explicitamente em modo e2e-api.
  const devShortcutsEnabled = Boolean(dev && enableDevLoginShortcuts);
  if (devShortcutsEnabled && runtimeMode !== 'e2e-api') {
    return '';
  }

  // URL configurada explicitamente tem prioridade fora do caso canônico de produção.
  const configured = normalizeBaseUrl(configuredApiUrl || configuredApiBaseUrl || '');
  if (configured) {
    // Permite usar algo como "/api" em dev/local
    if (configured.startsWith('/') && normalizedRuntimeOrigin) {
      return normalizeBaseUrl(`${normalizedRuntimeOrigin}${configured}`);
    }

    return configured;
  }

  // Sem fallback para runtimeOrigin em produção.
  // Se não há URL configurada e não caiu na regra canônica, retorna vazio.
  return '';
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    mode: metaEnv.MODE || '',
    dev: Boolean(metaEnv.DEV),
    prod: Boolean(metaEnv.PROD),
    enableDevLoginShortcuts:
      String(metaEnv.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true',
    configuredApiUrl: metaEnv.VITE_API_URL,
    configuredApiBaseUrl: metaEnv.VITE_API_BASE_URL,
    runtimeOrigin: typeof window !== 'undefined' ? window.location.origin : '',
  });
}

export function resolveApiRequestUrl(path, { baseUrl = '' } = {}) {
  const raw = String(path || '').trim();
  if (!raw) return '';

  // Se já vier absoluto, mantém.
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const relativePath = normalizeRelativePath(raw);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  // Com base configurada, monta URL absoluta.
  if (normalizedBaseUrl) {
    return `${normalizedBaseUrl}${relativePath}`;
  }

  // Sem base, retorna relativo.
  // Útil em cenários locais/mock/E2E específicos.
  return relativePath;
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
    API_TOKEN_KEYS.forEach((key) => {
      window.localStorage.setItem(key, token);
    });
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
  const url = resolveApiRequestUrl(path, { baseUrl });

  if (!url) {
    throw new Error('API_BASE_URL_NOT_CONFIGURED');
  }

  const token = options.token || getApiToken();
  const userEmail = options.userEmail || getApiUserEmail();

  if (options.requireAuth && !token && !userEmail) {
    throw new Error('API_AUTH_MISSING');
  }

  const headers = {
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

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