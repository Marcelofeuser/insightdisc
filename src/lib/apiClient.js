const API_TOKEN_KEYS = [
  'insightdisc_token',
  'insightdisc_api_token',
  'insight_api_token',
  'server_api_token',
];

const SUPER_ADMIN_TOKEN_KEY = 'insightdisc_super_admin_token';
const SUPER_ADMIN_EMAIL_KEY = 'insightdisc_super_admin_email';

const CANONICAL_PRODUCTION_API_URL = 'https://insightdisc-production.up.railway.app';
const LOCAL_DEV_API_URL = 'http://localhost:4000';
const DEFAULT_API_TIMEOUT_MS = 10_000;
const DEFAULT_API_RETRY_DELAY_MS = 350;
const DEFAULT_HEALTHCHECK_TIMEOUT_MS = 2_500;
const DEFAULT_RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const API_HEALTHCHECK_PATH = '/health';

const metaEnv =
  typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {};

const ENABLE_DEV_LOGIN_SHORTCUTS =
  Boolean(metaEnv.DEV) &&
  String(metaEnv.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';

const API_EMAIL_KEYS = ENABLE_DEV_LOGIN_SHORTCUTS
  ? ['insightdisc_api_email', 'disc_mock_user_email']
  : ['insightdisc_api_email'];

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

function isLocalRuntimeHost(hostname = '') {
  const normalized = String(hostname || '').trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]';
}

function isInsightDiscFrontendHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  if (!normalized || normalized === 'insightdisc-production.up.railway.app') return false;

  return (
    normalized === 'app.insightdisc.com' ||
    normalized === 'insightdisc.com' ||
    normalized.endsWith('.insightdisc.com')
  );
}

function isInsightDiscBackendHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  return (
    normalized === 'insightdisc-production.up.railway.app' ||
    normalized === 'insightdisc-api.vercel.app'
  );
}

function getRuntimeOrigin(value = '') {
  const explicit = normalizeBaseUrl(value);
  if (explicit) return explicit;
  if (typeof window === 'undefined') return '';
  return normalizeBaseUrl(window.location?.origin || '');
}

function isProductionRuntime(value = undefined) {
  if (typeof value === 'boolean') return value;

  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  return Boolean(metaEnv.PROD);
}

function isLocalServerlessApiPath(pathname = '') {
  const normalized = normalizeRelativePath(pathname);
  if (!normalized.startsWith('/api/')) return false;

  return (
    normalized === '/api/pdf' ||
    normalized.startsWith('/api/credits/') ||
    normalized.startsWith('/api/proxy') ||
    normalized.startsWith('/api/report/') ||
    normalized.startsWith('/api/stripe/')
  );
}

function shouldProxyViaSameOrigin({
  requestUrl = '',
  pathname = '',
  baseUrl = '',
  runtimeOrigin = '',
  prod = false,
} = {}) {
  if (!isProductionRuntime(prod)) return false;

  const normalizedRuntimeOrigin = getRuntimeOrigin(runtimeOrigin);
  const runtimeHost = getHostname(normalizedRuntimeOrigin);
  if (!normalizedRuntimeOrigin || !isInsightDiscFrontendHost(runtimeHost)) {
    return false;
  }

  const normalizedPath = normalizeRelativePath(pathname);
  if (!normalizedPath || isLocalServerlessApiPath(normalizedPath)) {
    return false;
  }

  if (/^https?:\/\//i.test(String(requestUrl || '').trim())) {
    return isInsightDiscBackendHost(getHostname(requestUrl));
  }

  return isInsightDiscBackendHost(getHostname(baseUrl));
}

function normalizeTimeout(value, fallback = DEFAULT_API_TIMEOUT_MS) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeRetryCount(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : fallback;
}

function normalizeDelay(value, fallback = DEFAULT_API_RETRY_DELAY_MS) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function toMethod(value = 'GET') {
  return String(value || 'GET').trim().toUpperCase() || 'GET';
}

function shouldUseVerboseLogs() {
  return Boolean(metaEnv.DEV);
}

function logApiDebug(label, payload = {}) {
  if (!shouldUseVerboseLogs()) return;
  // eslint-disable-next-line no-console
  console.info(`[apiClient] ${label}`, payload);
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

function createApiError({
  code = 'API_REQUEST_FAILED',
  message = '',
  status = 0,
  payload = null,
  requestUrl = '',
  method = 'GET',
  cause = null,
  responseText = '',
} = {}) {
  const error = new Error(message || code);
  error.code = String(code || 'API_REQUEST_FAILED');
  error.status = Number(status || 0);
  error.payload = payload || { ok: false, error: error.code, message: message || error.code };
  error.requestUrl = String(requestUrl || '').trim();
  error.method = toMethod(method);
  error.responseText = String(responseText || '').slice(0, 512);
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function mergeAbortSignals(signalA, signalB) {
  if (!signalA) return signalB || null;
  if (!signalB) return signalA;

  const controller = new AbortController();

  const abort = () => {
    controller.abort(signalA.reason || signalB.reason || 'aborted');
  };

  if (signalA.aborted || signalB.aborted) {
    abort();
    return controller.signal;
  }

  signalA.addEventListener('abort', abort, { once: true });
  signalB.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

function isJsonLikeResponse(response, rawText = '') {
  const contentType = String(response?.headers?.get?.('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) return true;

  const trimmed = String(rawText || '').trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

async function parseResponsePayload(response) {
  const rawText = await response.text();
  if (!rawText) {
    return { rawText: '', payload: {} };
  }

  if (!isJsonLikeResponse(response, rawText)) {
    return {
      rawText,
      payload: {
        ok: response.ok,
        message: rawText,
      },
    };
  }

  try {
    return {
      rawText,
      payload: JSON.parse(rawText),
    };
  } catch (cause) {
    throw createApiError({
      code: 'INVALID_JSON_RESPONSE',
      message: 'A API respondeu com JSON inválido.',
      status: response.status,
      payload: {
        ok: false,
        error: 'INVALID_JSON_RESPONSE',
        message: 'A API respondeu com JSON inválido.',
      },
      responseText: rawText,
      cause,
    });
  }
}

function isAbortError(error) {
  return error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('abort');
}

function isTimeoutError(error) {
  return (
    String(error?.code || '').toUpperCase() === 'REQUEST_TIMEOUT' ||
    String(error?.payload?.error || '').toUpperCase() === 'REQUEST_TIMEOUT'
  );
}

function isNormalizedApiError(error) {
  return (
    Boolean(error?.payload) ||
    typeof error?.code === 'string' ||
    Number(error?.status || 0) > 0
  );
}

function normalizeNetworkError(cause, { requestUrl = '', method = 'GET', timeoutMs = DEFAULT_API_TIMEOUT_MS } = {}) {
  if (isAbortError(cause)) {
    return createApiError({
      code: 'REQUEST_TIMEOUT',
      message: `Tempo de resposta excedido após ${timeoutMs}ms.`,
      requestUrl,
      method,
      cause,
      payload: {
        ok: false,
        error: 'REQUEST_TIMEOUT',
        message: `Tempo de resposta excedido após ${timeoutMs}ms.`,
        requestUrl,
      },
    });
  }

  return createApiError({
    code: 'NETWORK_ERROR',
    message: `Não foi possível conectar com a API em ${requestUrl}.`,
    requestUrl,
    method,
    cause,
    payload: {
      ok: false,
      error: 'NETWORK_ERROR',
      message: cause?.message || 'Failed to fetch',
      requestUrl,
    },
  });
}

function toStatusSet(values = []) {
  const source = Array.isArray(values) ? values : Array.from(values || []);
  return new Set(source.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0));
}

export function isRetryableApiError(error, options = {}) {
  const retryOnStatuses = toStatusSet(options.retryOnStatuses || DEFAULT_RETRYABLE_STATUS_CODES);
  const status = Number(error?.status || 0);
  const code = String(error?.code || error?.payload?.error || error?.message || '').toUpperCase();

  if (code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT') {
    return true;
  }

  if (retryOnStatuses.has(status)) {
    return true;
  }

  return (
    code.includes('TEMPORARILY_UNAVAILABLE') ||
    code.includes('SERVER_BUSY') ||
    code.includes('ECONNRESET') ||
    code.includes('EPIPE')
  );
}

export function getApiErrorMessage(error, { apiBaseUrl = '', fallback = '' } = {}) {
  const code = String(error?.code || error?.payload?.error || error?.message || '').toUpperCase();
  const status = Number(error?.status || 0);
  const requestUrl = error?.requestUrl || apiBaseUrl || '';
  const serverMessage = String(error?.payload?.message || '').trim();

  if (code === 'API_BASE_URL_NOT_CONFIGURED') {
    return 'API não configurada para este ambiente.';
  }

  if (code === 'API_AUTH_MISSING') {
    return 'Sessão ausente para esta requisição autenticada.';
  }

  if (code === 'REQUEST_TIMEOUT') {
    return 'Tempo de resposta excedido.';
  }

  if (code === 'NETWORK_ERROR') {
    return requestUrl
      ? `Não foi possível conectar com a API em ${requestUrl}.`
      : 'Não foi possível conectar com a API.';
  }

  if (code === 'INVALID_JSON_RESPONSE') {
    return 'A API respondeu com um payload inválido.';
  }

  if (code.includes('CORS')) {
    return 'A API recusou a origem da requisição (CORS).';
  }

  if (status >= 500) {
    return serverMessage || 'Servidor respondeu com erro interno.';
  }

  return serverMessage || fallback || error?.message || 'Falha ao comunicar com a API.';
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

  if (prod && isInsightDiscFrontendHost(runtimeHost)) {
    return CANONICAL_PRODUCTION_API_URL;
  }

  if (runtimeMode === 'e2e-core') {
    return '';
  }

  const devShortcutsEnabled = Boolean(dev && enableDevLoginShortcuts);
  if (devShortcutsEnabled && runtimeMode !== 'e2e-api') {
    return '';
  }

  const configured = normalizeBaseUrl(configuredApiUrl || configuredApiBaseUrl || '');
  if (configured) {
    if (configured.startsWith('/') && normalizedRuntimeOrigin) {
      return normalizeBaseUrl(`${normalizedRuntimeOrigin}${configured}`);
    }

    return configured;
  }

  if (isLocalRuntimeHost(runtimeHost)) {
    return LOCAL_DEV_API_URL;
  }

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

export function resolveApiRequestUrl(path, { baseUrl = '', runtimeOrigin = '', prod } = {}) {
  const raw = String(path || '').trim();
  if (!raw) return '';
  const normalizedRuntimeOrigin = getRuntimeOrigin(runtimeOrigin);
  const effectiveProd = isProductionRuntime(prod);

  if (/^https?:\/\//i.test(raw)) {
    const absoluteUrl = new URL(raw);
    const proxiedPath = `${absoluteUrl.pathname}${absoluteUrl.search}`;

    if (
      effectiveProd &&
      normalizedRuntimeOrigin &&
      isInsightDiscFrontendHost(getHostname(normalizedRuntimeOrigin)) &&
      isInsightDiscBackendHost(getHostname(raw)) &&
      isLocalServerlessApiPath(absoluteUrl.pathname)
    ) {
      return `${normalizedRuntimeOrigin}${proxiedPath}`;
    }

    if (
      shouldProxyViaSameOrigin({
        requestUrl: raw,
        pathname: absoluteUrl.pathname,
        baseUrl,
        runtimeOrigin,
        prod: effectiveProd,
      })
    ) {
      return `${normalizedRuntimeOrigin}/api/proxy${proxiedPath}`;
    }

    return raw;
  }

  const relativePath = normalizeRelativePath(raw);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (
    effectiveProd &&
    normalizedRuntimeOrigin &&
    isInsightDiscFrontendHost(getHostname(normalizedRuntimeOrigin)) &&
    isLocalServerlessApiPath(relativePath)
  ) {
    return `${normalizedRuntimeOrigin}${relativePath}`;
  }

  if (
    shouldProxyViaSameOrigin({
      requestUrl: raw,
      pathname: relativePath,
      baseUrl: normalizedBaseUrl,
      runtimeOrigin,
      prod: effectiveProd,
    })
  ) {
    return `${normalizedRuntimeOrigin}/api/proxy${relativePath}`;
  }

  if (normalizedBaseUrl) {
    return `${normalizedBaseUrl}${relativePath}`;
  }

  return relativePath;
}

export function getApiToken() {
  return getFromStorage(API_TOKEN_KEYS);
}

export function getSuperAdminToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY) || '';
}

export function getSuperAdminEmail() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SUPER_ADMIN_EMAIL_KEY) || '';
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

export function setSuperAdminSession({ token = '', email = '' } = {}) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, token);
  }
  if (email) {
    window.localStorage.setItem(SUPER_ADMIN_EMAIL_KEY, String(email).toLowerCase());
  }
}

export function clearApiSession() {
  if (typeof window === 'undefined') return;

  [...API_TOKEN_KEYS, ...API_EMAIL_KEYS].forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
}

export function clearSuperAdminSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(SUPER_ADMIN_EMAIL_KEY);
}

export function getApiAuthHeaders({
  token = getApiToken(),
  userEmail = getApiUserEmail(),
} = {}) {
  const headers = {
    };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (userEmail) {
    headers['x-insight-user-email'] = userEmail;
  }

  return headers;
}

function isSuperAdminProtectedRoute(url = '') {
  // Detecta rotas que exigem auth de super admin (exclui o login)
  // Ex: /auth/super-admin/me, /super-admin/overview
  return (
    (url.includes('/super-admin/') || url.includes('/auth/super-admin/')) &&
    !url.endsWith('/super-admin-login')
  );
}

async function performFetchRequest(url, options = {}) {
  const method = toMethod(options.method || 'GET');
  const timeoutMs = normalizeTimeout(options.timeoutMs, DEFAULT_API_TIMEOUT_MS);
  const baseHeaders = {
    ...(options.headers || {}),
  };

  // Lógica inteligente para Super Admin:
  // Se for rota protegida de super admin, usa o token específico se não foi passado outro.
  const isSuperAdminContext = isSuperAdminProtectedRoute(url);
  
  const includeAuthHeaders = options.includeAuthHeaders !== false;
  const token = options.token || (isSuperAdminContext ? getSuperAdminToken() : getApiToken());
  const userEmail = options.userEmail || (isSuperAdminContext ? getSuperAdminEmail() : getApiUserEmail());

  if (options.requireAuth && !token && !userEmail) {
    throw createApiError({
      code: 'API_AUTH_MISSING',
      message: 'Autenticação ausente para esta requisição.',
      requestUrl: url,
      method,
      payload: {
        ok: false,
        error: 'API_AUTH_MISSING',
        message: 'Autenticação ausente para esta requisição.',
      },
    });
  }

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && options.body !== undefined && !baseHeaders['Content-Type']) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  if (includeAuthHeaders) {
    Object.assign(baseHeaders, getApiAuthHeaders({ token, userEmail }));
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort('timeout');
  }, timeoutMs);
  const signal = mergeAbortSignals(options.signal, timeoutController.signal);
  const startedAt = Date.now();

  try {
    logApiDebug('request.start', {
      method,
      url,
      timeoutMs,
      includeAuthHeaders,
    });

    const response = await fetch(url, {
      method,
      headers: baseHeaders,
      body:
        options.body === undefined
          ? undefined
          : isFormData || typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body),
      signal,
    });

    const { payload, rawText } = await parseResponsePayload(response);
    const durationMs = Date.now() - startedAt;

    logApiDebug('request.finish', {
      method,
      url,
      status: response.status,
      durationMs,
      ok: response.ok,
    });

    // Intercepta login de Super Admin com sucesso para salvar sessão automaticamente
    if (response.ok && url.endsWith('/auth/super-admin-login') && method === 'POST') {
      setSuperAdminSession({
        token: payload?.token,
        email: payload?.user?.email,
      });
    }

    if (!response.ok) {
      throw createApiError({
        code: payload?.error || payload?.reason || `HTTP_${response.status}`,
        message:
          payload?.message ||
          payload?.error ||
          payload?.reason ||
          response.statusText ||
          `HTTP_${response.status}`,
        status: response.status,
        payload,
        requestUrl: url,
        method,
        responseText: rawText,
      });
    }

    return payload;
  } catch (error) {
    // Intercepta erro 401 em rotas de Super Admin para limpar sessão
    if (isSuperAdminContext && Number(error?.status) === 401) {
      clearSuperAdminSession();
    }

    const normalizedError = isNormalizedApiError(error)
      ? error
      : normalizeNetworkError(error, { requestUrl: url, method, timeoutMs });

    if (!normalizedError.requestUrl) {
      normalizedError.requestUrl = url;
    }
    if (!normalizedError.method) {
      normalizedError.method = method;
    }

    logApiDebug('request.error', {
      method,
      url,
      code: normalizedError?.code || normalizedError?.payload?.error || 'UNKNOWN',
      status: normalizedError?.status || 0,
      message: normalizedError?.message || '',
    });

    throw normalizedError;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest(path, options = {}) {
  const baseUrl = options.baseUrl || getApiBaseUrl();
  const url = resolveApiRequestUrl(path, {
    baseUrl,
    runtimeOrigin: options.runtimeOrigin,
    prod: options.prod,
  });

  if (!url) {
    throw createApiError({
      code: 'API_BASE_URL_NOT_CONFIGURED',
      message: 'API base URL não configurada.',
      requestUrl: '',
      method: options.method || 'GET',
      payload: {
        ok: false,
        error: 'API_BASE_URL_NOT_CONFIGURED',
        message: 'API base URL não configurada.',
      },
    });
  }

  const retryCount = normalizeRetryCount(options.retry, 0);
  const retryDelayMs = normalizeDelay(options.retryDelayMs, DEFAULT_API_RETRY_DELAY_MS);
  const retryOnStatuses = toStatusSet(options.retryOnStatuses || DEFAULT_RETRYABLE_STATUS_CODES);

  let attempt = 0;
  while (attempt <= retryCount) {
    try {
      return await performFetchRequest(url, options);
    } catch (error) {
      const method = toMethod(options.method || 'GET');
      const shouldRetry =
        attempt < retryCount &&
        isRetryableApiError(error, {
          method,
          retryOnStatuses,
        });

      if (!shouldRetry) {
        throw error;
      }

      attempt += 1;
      logApiDebug('request.retry', {
        method,
        url,
        nextAttempt: attempt + 1,
        delayMs: retryDelayMs,
        code: error?.code || error?.payload?.error || 'UNKNOWN',
        status: error?.status || 0,
      });
      await sleep(retryDelayMs);
    }
  }

  throw createApiError({
    code: 'API_REQUEST_FAILED',
    message: 'Falha ao concluir a requisição.',
    requestUrl: url,
    method: options.method || 'GET',
  });
}

export async function checkApiHealth(options = {}) {
  const baseUrl = options.baseUrl || getApiBaseUrl();
  const url = resolveApiRequestUrl(API_HEALTHCHECK_PATH, {
    baseUrl,
    runtimeOrigin: options.runtimeOrigin,
    prod: options.prod,
  });

  if (!url) {
    throw createApiError({
      code: 'API_BASE_URL_NOT_CONFIGURED',
      message: 'API base URL não configurada.',
      requestUrl: '',
      method: 'GET',
    });
  }

  try {
    const payload = await apiRequest(API_HEALTHCHECK_PATH, {
      method: 'GET',
      baseUrl,
      timeoutMs: options.timeoutMs || DEFAULT_HEALTHCHECK_TIMEOUT_MS,
      retry: normalizeRetryCount(options.retry, 1),
      retryDelayMs: options.retryDelayMs || 200,
      includeAuthHeaders: false,
      retryOnStatuses: options.retryOnStatuses || [502, 503, 504],
    });

    return {
      ok: Boolean(payload?.ok),
      url,
      payload,
    };
  } catch (error) {
    const normalized =
      error?.code || error?.status || error?.payload
        ? error
        : createApiError({
            code: 'API_HEALTHCHECK_FAILED',
            message: 'Servidor backend não está acessível no momento.',
            requestUrl: url,
            method: 'GET',
            cause: error,
          });

    if (!normalized.code || normalized.code === 'NETWORK_ERROR' || normalized.code === 'REQUEST_TIMEOUT') {
      normalized.code = 'API_HEALTHCHECK_FAILED';
      normalized.message = 'Servidor backend não está acessível no momento.';
      normalized.payload = {
        ...(normalized.payload || {}),
        ok: false,
        error: 'API_HEALTHCHECK_FAILED',
        message: 'Servidor backend não está acessível no momento.',
        requestUrl: url,
      };
    }

    throw normalized;
  }
}
