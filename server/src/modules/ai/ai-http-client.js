import { env } from '../../config/env.js';

const DEFAULT_TIMEOUT_MS = 18_000;

function toText(value) {
  return String(value || '').trim();
}

function resolveAiApiBaseUrl() {
  const baseUrl = toText(env.aiApiUrl);
  if (!baseUrl) {
    const error = new Error('AI_API_URL_MISSING');
    error.code = 'AI_API_URL_MISSING';
    throw error;
  }

  return baseUrl.replace(/\/+$/, '');
}

async function readResponseBody(response) {
  const contentType = String(response?.headers?.get?.('content-type') || '').toLowerCase();
  const rawText = toText(await response.text());

  if (!rawText) {
    return { rawText: '', json: null };
  }

  if (contentType.includes('application/json')) {
    try {
      return { rawText, json: JSON.parse(rawText) };
    } catch {
      return { rawText, json: null };
    }
  }

  try {
    return { rawText, json: JSON.parse(rawText) };
  } catch {
    return { rawText, json: null };
  }
}

function buildHttpError({
  code,
  message,
  status = 500,
  url = '',
  payload = null,
  rawText = '',
}) {
  const error = new Error(message || code || 'AI_HTTP_REQUEST_FAILED');
  error.code = code || 'AI_HTTP_REQUEST_FAILED';
  error.status = status;
  error.url = url;
  error.payload = payload;
  error.rawTextPreview = toText(rawText).slice(0, 500);
  return error;
}

async function postJson(path, payload, options = {}) {
  const baseUrl = resolveAiApiBaseUrl();
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  const url = `${baseUrl}${normalizedPath}`;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(payload ?? {}),
      signal: abortController.signal,
    });

    const { rawText, json } = await readResponseBody(response);

    if (!response.ok) {
      const providerMessage =
        toText(json?.message) ||
        toText(json?.error?.message) ||
        toText(json?.error) ||
        rawText ||
        `HTTP_${response.status}`;

      throw buildHttpError({
        code: 'AI_HTTP_BAD_RESPONSE',
        message: providerMessage,
        status: response.status,
        url,
        payload: json,
        rawText,
      });
    }

    if (json !== null) {
      return json;
    }

    return rawText ? { ok: true, text: rawText } : { ok: true };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw buildHttpError({
        code: 'AI_HTTP_TIMEOUT',
        message: 'Timeout ao chamar serviço de IA.',
        status: 504,
        url,
      });
    }

    if (error?.code && String(error.code).startsWith('AI_HTTP_')) {
      throw error;
    }

    throw buildHttpError({
      code: 'AI_HTTP_REQUEST_FAILED',
      message: toText(error?.message) || 'Falha ao chamar serviço de IA.',
      status: Number(error?.status) || 502,
      url,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function isAiApiUrlConfigured() {
  return Boolean(toText(env.aiApiUrl));
}

export async function requestDiscInsights(payload, options) {
  return postJson('/ai/disc-insights', payload, options);
}

export async function requestReportPreview(payload, options) {
  return postJson('/ai/report-preview', payload, options);
}

export async function requestCoach(payload, options) {
  return postJson('/ai/coach', payload, options);
}

export async function requestStrategicInsights(payload, options) {
  return postJson('/ai/strategic-insights', payload, options);
}

