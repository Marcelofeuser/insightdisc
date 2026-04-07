import { env } from '../../config/env.js';
import { requestDiscInsights } from './ai-http-client.js';
import { buildDiscInsightsPrompt } from './prompt-builder.js';
import { parseProviderJsonSafely } from './json-utils.js';

const MAX_RAW_RESPONSE_LENGTH = 50_000;

function toText(value) {
  return String(value || '').trim();
}

function safeProviderName(value) {
  return toText(value).toLowerCase() || 'ai_api_url';
}

function safeModelName(value) {
  return toText(value) || 'unknown';
}

function normalizeDiscInsightsResponse(payload, response) {
  const provider = safeProviderName(response?.provider || 'ai_api_url');
  const model = safeModelName(response?.model || env.groqModel || env.geminiModel || 'unknown');

  if (response?.content && typeof response.content === 'object' && !Array.isArray(response.content)) {
    return {
      provider,
      model,
      raw: JSON.stringify(response.content),
      parsed: response.content,
    };
  }

  if (response?.parsed && typeof response.parsed === 'object' && !Array.isArray(response.parsed)) {
    return {
      provider,
      model,
      raw: JSON.stringify(response.parsed),
      parsed: response.parsed,
    };
  }

  const raw = toText(response?.text || response?.raw || '');
  if (!raw) {
    throw new Error('AI_HTTP_EMPTY_RESPONSE');
  }

  if (raw.length > MAX_RAW_RESPONSE_LENGTH) {
    throw new Error('AI_HTTP_RESPONSE_TOO_LONG');
  }

  return {
    provider,
    model,
    raw,
    parsed: parseProviderJsonSafely(raw, { provider, model }),
  };
}

export async function generateHttpDiscInsights(payload = {}, options = {}) {
  const prompt = buildDiscInsightsPrompt(payload, options);
  const temperature = prompt.mode === 'business' ? 0.45 : 0.6;

  const response = await requestDiscInsights({
    systemPrompt: prompt.systemInstruction,
    userPrompt: prompt.userPrompt,
    temperature,
    topP: 0.9,
    maxTokens: 1400,
    responseFormat: 'json_object',
    mode: prompt.mode,
    attemptNumber: Number(options?.attemptNumber || 1),
    strictJsonRetry: Boolean(options?.strictJsonRetry),
  });

  return normalizeDiscInsightsResponse(payload, response);
}

