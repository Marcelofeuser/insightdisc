const API_TOKEN_KEYS = ['insightdisc_token', 'insightdisc_api_token', 'insight_api_token', 'server_api_token'];
const CANONICAL_PRODUCTION_API_URL = 'https://api.insightdisc.com';
const FRONTEND_PROXY_PATH = '/api/proxy';
const BACKEND_ROUTE_PREFIXES = Object.freeze([
  '/auth',
  '/super-admin',
  '/payments',
  '/assessment',
  '/assessments',
  '/report',
  '/candidate',
  '/branding',
  '/jobs',
  '/admin',
  '/health',
  '/billing',
  '/api/leads',
  '/api/dossier',
  '/api/campaigns',
  '/api/anamnesis',
  '/api/profile-comparison',
  '/api/team-map',
  '/api/checkout',
]);
const metaEnv = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : {};
const ENABLE_DEV_LOGIN_SHORTCUTS =
  metaEnv.DEV &&
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

function getHostname(value = '') {
  const normalized = normalizeBaseUrl(value);
  if (!normalized || normalized.startsWith('/')) return '';

  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isLoopbackHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  );
}

function isInsightDiscFrontendHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  if (!normalized || normalized === 'api.insightdisc.com') return false;
  return normalized === 'app.insightdisc.com' || normalized === 'insightdisc.com' || normalized.endsWith('.insightdisc.com');
}

function isKnownInsightDiscBackendHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  return normalized === 'api.insightdisc.com' || normalized === 'insightdisc-api.vercel.app';
}

function shouldUseFrontendApiProxy({ runtimeOrigin = '', prod = false } = {}) {
  if (!prod) return false;

  const runtimeHost = getHostname(runtimeOrigin);
  if (!runtimeHost || isLoopbackHost(runtimeHost)) return false;

  return isInsightDiscFrontendHost(runtimeHost);
}

function normalizeRelativePath(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function parseRelativeUrl(value = '', runtimeOrigin = '') {
  const normalized = normalizeRelativePath(value);
  if (!normalized) return null;

  const fallbackOrigin = normalizeBaseUrl(runtimeOrigin) || 'https://app.insightdisc.com';
  try {
    return new URL(normalized, fallbackOrigin);
  } catch {
    return null;
  }
}

function isBackendRequestPathname(pathname = '') {
  const normalized = normalizeRelativePath(pathname).split('?')[0].split('#')[0];
  if (!normalized) return false;

  return BACKEND_ROUTE_PREFIXES.some((prefix) => (
    normalized === prefix || normalized.startsWith(`${prefix}/`)
  ));
}

function isFrontendServerlessPath(pathname = '') {
  const normalized = normalizeRelativePath(pathname).split('?')[0].split('#')[0];
  return normalized.startsWith('/api/') && !isBackendRequestPathname(normalized);
}

function buildFrontendProxyUrl(rawPath = '', runtimeOrigin = '') {
  const parsed = parseRelativeUrl(rawPath, runtimeOrigin);
  const normalizedRuntimeOrigin = normalizeBaseUrl(runtimeOrigin);
  if (!parsed || !normalizedRuntimeOrigin) return '';

  const forwardPath = parsed.pathname.replace(/^\/+/, '');
  return `${normalizedRuntimeOrigin}${FRONTEND_PROXY_PATH}/${forwardPath}${parsed.search}`;
}

export function resolveApiRequestUrl(
  path,
  {
    baseUrl = '',
    runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '',
    prod = Boolean(metaEnv.PROD),
  } = {},
) {
  const raw = String(path || '').trim();
  if (!raw) return '';

  const normalizedRuntimeOrigin = normalizeBaseUrl(runtimeOrigin);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const proxyEnabled = shouldUseFrontendApiProxy({
    runtimeOrigin: normalizedRuntimeOrigin,
    prod,
  });

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const parsedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      const parsedHost = String(parsed.hostname || '').toLowerCase();
      const baseHost = getHostname(normalizedBaseUrl);

      if (
        proxyEnabled &&
        isBackendRequestPathname(parsed.pathname) &&
        (
          isKnownInsightDiscBackendHost(parsedHost) ||
          (baseHost && parsedHost === baseHost)
        )
      ) {
        return buildFrontendProxyUrl(parsedPath, normalizedRuntimeOrigin);
      }
    } catch {
      return raw;
    }

    return raw;
  }

  const parsed = parseRelativeUrl(raw, normalizedRuntimeOrigin);
  const relativePath = parsed
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : normalizeRelativePath(raw);
  const pathname = parsed?.pathname || normalizeRelativePath(raw);

  if (proxyEnabled && isBackendRequestPathname(pathname)) {
    return buildFrontendProxyUrl(relativePath, normalizedRuntimeOrigin);
  }

  if (isFrontendServerlessPath(pathname)) {
    return normalizedRuntimeOrigin ? `${normalizedRuntimeOrigin}${relativePath}` : relativePath;
  }

  if (normalizedBaseUrl) {
    return `${normalizedBaseUrl}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
  }

  return '';
}

function shouldUseCanonicalProductionApiUrl({ configured = '', runtimeOrigin = '', prod = false } = {}) {
  if (!prod) return false;

  const runtimeHost = getHostname(runtimeOrigin);
  if (!runtimeHost || isLoopbackHost(runtimeHost) || !isInsightDiscFrontendHost(runtimeHost)) {
    return false;
  }

  if (!configured) return true;
  if (configured.startsWith('/')) return true;

  const configuredHost = getHostname(configured);
  if (!configuredHost) return true;
  if (configuredHost === runtimeHost) return true;
  if (isLoopbackHost(configuredHost)) return true;
  if (configuredHost === 'insightdisc-api.vercel.app') return true;
  if (configuredHost.endsWith('.vercel.app')) return true;

  return false;
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
  const devShortcutsEnabled = Boolean(dev && enableDevLoginShortcuts);

  if (runtimeMode === 'e2e-core') {
    return '';
  }

  // In dev with mock login shortcuts, force local/mock mode unless explicitly running API E2E mode.
  if (devShortcutsEnabled && runtimeMode !== 'e2e-api') {
    return '';
  }

  const configured = normalizeBaseUrl(
    configuredApiUrl || configuredApiBaseUrl || ''
  );
  const normalizedRuntimeOrigin = normalizeBaseUrl(runtimeOrigin);

  if (
    shouldUseCanonicalProductionApiUrl({
      configured,
      runtimeOrigin: normalizedRuntimeOrigin,
      prod,
    })
  ) {
    return CANONICAL_PRODUCTION_API_URL;
  }

  if (configured) {
    if (configured.startsWith('/') && normalizedRuntimeOrigin) {
      return normalizeBaseUrl(`${normalizedRuntimeOrigin}${configured}`);
    }

    if (
      prod &&
      normalizedRuntimeOrigin &&
      /^https?:\/\//i.test(configured)
    ) {
      try {
        const configuredUrl = new URL(configured);
        const runtimeUrl = new URL(normalizedRuntimeOrigin);
        if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(runtimeUrl.hostname)) {
          return normalizedRuntimeOrigin;
        }
      } catch {
        // Ignore URL parsing issues and return configured value below.
      }
    }

    return configured;
  }

  if (prod && normalizedRuntimeOrigin) {
    return normalizedRuntimeOrigin;
  }

  return '';
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    mode: metaEnv.MODE,
    dev: metaEnv.DEV,
    prod: metaEnv.PROD,
    enableDevLoginShortcuts:
      String(metaEnv.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true',
    configuredApiUrl: metaEnv.VITE_API_URL,
    configuredApiBaseUrl: metaEnv.VITE_API_BASE_URL,
    runtimeOrigin:
      typeof window !== 'undefined' ? window.location.origin : '',
  });
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
