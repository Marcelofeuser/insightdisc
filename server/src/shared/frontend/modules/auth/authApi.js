import {
  apiRequest,
  checkApiHealth,
  getApiErrorMessage,
  resolveApiRequestUrl,
} from '../../lib/apiClient.js';

const AUTH_HEALTHCHECK_TIMEOUT_MS = 2_500;
const AUTH_REQUEST_TIMEOUT_MS = 8_000;

export function resolveAuthRequestUrl(path, apiBaseUrl = '') {
  return resolveApiRequestUrl(path, { baseUrl: apiBaseUrl });
}

export function mapAuthRequestError(error, { apiBaseUrl = '', path = '' } = {}) {
  const code = String(error?.code || error?.payload?.error || error?.message || '').toUpperCase();
  const status = Number(error?.status || 0);
  const targetUrl = error?.requestUrl || resolveAuthRequestUrl(path, apiBaseUrl) || apiBaseUrl;

  if (code === 'API_BASE_URL_NOT_CONFIGURED') {
    return 'API não configurada para este ambiente.';
  }

  if (code === 'API_HEALTHCHECK_FAILED') {
    return targetUrl
      ? `Servidor backend não está acessível no momento em ${apiBaseUrl || targetUrl}.`
      : 'Servidor backend não está acessível no momento.';
  }

  if (code === 'NETWORK_ERROR') {
    return targetUrl
      ? `Não foi possível conectar com a API em ${targetUrl}.`
      : 'API não está acessível.';
  }

  if (code === 'REQUEST_TIMEOUT') {
    return 'Tempo de resposta excedido.';
  }

  if (code === 'INVALID_CREDENTIALS') {
    return 'Credenciais inválidas.';
  }

  if (code === 'INVALID_MASTER_KEY') {
    return 'Chave administrativa incorreta.';
  }

  if (code === 'INVALID_LOGIN_PAYLOAD') {
    return 'Preencha os campos obrigatórios antes de continuar.';
  }

  if (code === 'SUPER_ADMIN_NOT_FOUND') {
    return 'Usuário super admin não encontrado. Execute o seed inicial no backend.';
  }

  if (code === 'SUPER_ADMIN_DISABLED') {
    return 'Login de super admin indisponível: SUPER_ADMIN_MASTER_KEY não configurada.';
  }

  if (code === 'TOO_MANY_ATTEMPTS') {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }

  if (code.includes('CORS')) {
    return 'A API bloqueou a requisição por CORS.';
  }

  if (status >= 500) {
    return 'Servidor respondeu com erro interno.';
  }

  return getApiErrorMessage(error, {
    apiBaseUrl: targetUrl,
    fallback: 'Não foi possível concluir a autenticação agora.',
  });
}

export async function ensureAuthApiAvailable({
  apiBaseUrl = '',
  timeoutMs = AUTH_HEALTHCHECK_TIMEOUT_MS,
  retry = 1,
} = {}) {
  return checkApiHealth({
    baseUrl: apiBaseUrl,
    timeoutMs,
    retry,
    retryDelayMs: 200,
  });
}

export async function submitAuthRequest({
  path,
  apiBaseUrl = '',
  body,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
  retry = 1,
} = {}) {
  await ensureAuthApiAvailable({ apiBaseUrl });

  return apiRequest(path, {
    method: 'POST',
    baseUrl: apiBaseUrl,
    body,
    timeoutMs,
    retry,
    retryDelayMs: 300,
    retryOnStatuses: [502, 503, 504],
    includeAuthHeaders: false,
  });
}
