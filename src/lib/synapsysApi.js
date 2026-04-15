import { apiRequest } from '@/lib/apiClient';

export const SYNAPSYS_API_URL = String(
  import.meta.env.VITE_SYNAPSYS_API_URL || 'https://api.synapsys.insightdisc.com',
)
  .trim()
  .replace(/\/$/, '');

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
  return {
    baseUrl: SYNAPSYS_API_URL,
    runtimeOrigin: SYNAPSYS_API_URL,
    ...options,
  };
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
    const payload = await apiRequest(
      '/synapsys/access',
      buildSynapsysApiOptions({
        method: 'GET',
        requireAuth: true,
      }),
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
    const payload = await apiRequest(
      '/synapsys/access/free',
      buildSynapsysApiOptions({
        method: 'POST',
        requireAuth: true,
      }),
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
    const parsed = await apiRequest(
      '/synapsys/analyze',
      buildSynapsysApiOptions({
        method: 'POST',
        requireAuth: true,
        body: {
          input,
          mode,
        },
      }),
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
