import { apiRequest, getApiBaseUrl } from './apiClient.js';

const CANONICAL_SYNAPSYS_API_URL = 'https://insightdisc-production.up.railway.app';
const metaEnv =
  typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {};

function normalizeBaseUrl(value = '') {
  return String(value || '')
    .trim()
    .replace(/\/$/, '');
}

function appendUniqueUrl(target, value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized || target.includes(normalized)) return;
  target.push(normalized);
}

export function resolveSynapsysApiBaseCandidates({
  apiBaseUrl = '',
  configuredSynapsysApiUrl = '',
} = {}) {
  const candidates = [];
  appendUniqueUrl(candidates, apiBaseUrl);
  appendUniqueUrl(candidates, configuredSynapsysApiUrl);
  appendUniqueUrl(candidates, CANONICAL_SYNAPSYS_API_URL);
  return candidates;
}

export function getSynapsysApiBaseCandidates() {
  return resolveSynapsysApiBaseCandidates({
    apiBaseUrl: getApiBaseUrl(),
    configuredSynapsysApiUrl: metaEnv.VITE_SYNAPSYS_API_URL || '',
  });
}

export const SYNAPSYS_API_URL = getSynapsysApiBaseCandidates()[0] || CANONICAL_SYNAPSYS_API_URL;

function toText(value = '') {
  return String(value || '').trim();
}

function extractJsonMessage(payload = null) {
  if (!payload || typeof payload !== 'object') return '';

  const candidates = [
    payload.message,
    payload.error,
    payload.response,
    payload.answer,
    payload.details,
  ];

  return candidates.map((value) => toText(value)).find(Boolean) || '';
}

function extractResponseText(payload = null, fallbackText = '') {
  if (payload && typeof payload === 'object') {
    const candidates = [
      payload.response,
      payload.answer,
      payload.output,
      payload.result,
      payload.content,
      payload.data?.response,
      payload.data?.answer,
      payload.data?.output,
      payload.data?.result,
    ];

    const resolved = candidates.map((value) => toText(value)).find(Boolean);
    if (resolved) return resolved;
  }

  return toText(fallbackText);
}

function buildSynapsysApiOptions(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl || SYNAPSYS_API_URL) || CANONICAL_SYNAPSYS_API_URL;
  return {
    baseUrl,
    runtimeOrigin: baseUrl,
    retry: options.retry ?? 1,
    retryDelayMs: options.retryDelayMs ?? 200,
    ...options,
  };
}

function shouldRetryOnAlternateBase(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || error?.payload?.error || '').trim().toUpperCase();

  if (status === 404 || status >= 500) return true;

  return (
    code === 'NETWORK_ERROR' ||
    code === 'REQUEST_TIMEOUT' ||
    code === 'INVALID_JSON_RESPONSE'
  );
}

export async function requestSynapsysApi(path, options = {}) {
  const candidates = Array.isArray(options.baseUrls) && options.baseUrls.length > 0
    ? options.baseUrls.map((value) => normalizeBaseUrl(value)).filter(Boolean)
    : getSynapsysApiBaseCandidates();

  let lastError = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const baseUrl = candidates[index];

    try {
      return await apiRequest(path, buildSynapsysApiOptions({ ...options, baseUrl }));
    } catch (error) {
      lastError = error;

      if (index >= candidates.length - 1 || !shouldRetryOnAlternateBase(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Synapsys indisponível no momento.');
}

function createSynapsysApiError(error, fallbackMessage = '') {
  const message =
    toText(error?.payload?.message) ||
    toText(error?.message) ||
    toText(fallbackMessage) ||
    'Synapsys indisponível no momento.';
  const normalized = new Error(message);
  normalized.code = toText(error?.code || error?.payload?.error || 'SYNAPSYS_REQUEST_FAILED');
  normalized.status = Number(error?.status || 0);
  normalized.payload = error?.payload || null;
  normalized.synapsysAccess = error?.payload?.access || null;
  return normalized;
}

export async function getSynapsysAccessState() {
  try {
    const payload = await requestSynapsysApi(
      '/synapsys/access',
      {
        method: 'GET',
        requireAuth: true,
      },
    );

    return {
      ok: payload?.ok !== false,
      synapsysAccess: payload?.access || null,
      raw: payload,
    };
  } catch (error) {
    throw createSynapsysApiError(error, 'Não foi possível carregar o acesso da Synapsys.');
  }
}

export async function provisionSynapsysFreeAccess() {
  try {
    const payload = await requestSynapsysApi(
      '/synapsys/access/free',
      {
        method: 'POST',
        requireAuth: true,
      },
    );

    return {
      ok: payload?.ok !== false,
      synapsysAccess: payload?.access || null,
      raw: payload,
    };
  } catch (error) {
    throw createSynapsysApiError(error, 'Não foi possível liberar o acesso gratuito da Synapsys.');
  }
}

export async function analyzeWithSynapsys(payload = {}) {
  const input = toText(payload?.input);
  const mode = toText(payload?.mode || 'builder') || 'builder';

  if (!input) {
    throw new Error('Synapsys exige um texto de entrada para análise.');
  }

  try {
    const parsed = await requestSynapsysApi(
      '/synapsys/analyze',
      {
        method: 'POST',
        requireAuth: true,
        body: {
          input,
          mode,
        },
      },
    );

    if (parsed && parsed.success === false) {
      throw new Error(extractJsonMessage(parsed) || 'Synapsys retornou uma falha na análise.');
    }

    const resultText = extractResponseText(parsed, '');
    if (!resultText) {
      throw new Error('Synapsys não retornou conteúdo utilizável.');
    }

    return {
      ok: true,
      provider: toText(parsed?.provider || 'synapsys'),
      source: toText(parsed?.source || 'synapsys'),
      mode: toText(parsed?.mode || mode) || mode,
      model: toText(parsed?.model),
      response: resultText,
      synapsysAccess: parsed?.access || null,
      raw: parsed,
    };
  } catch (error) {
    throw createSynapsysApiError(error, 'Synapsys indisponível no momento.');
  }
}
