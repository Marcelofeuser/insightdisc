import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { buildDiscInsightsPrompt } from './prompt-builder.js';
import { parseProviderJsonSafely } from './json-utils.js';
import { aiDiscResponseJsonSchema } from './schema.js';

const MAX_RAW_RESPONSE_LENGTH = 50_000;
const GEMINI_TIMEOUT_MS = 12_000;

let geminiClient = null;

function getGeminiClient() {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }

  return geminiClient;
}

export async function generateStructuredDiscInsights(payload = {}, options = {}) {
  const client = getGeminiClient();
  const prompt = buildDiscInsightsPrompt(payload, options);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: env.geminiModel,
      contents: prompt.userPrompt,
      config: {
        abortSignal: abortController.signal,
        systemInstruction: prompt.systemInstruction,
        temperature: prompt.mode === 'business' ? 0.45 : 0.6,
        topP: 0.9,
        maxOutputTokens: 1400,
        responseMimeType: 'application/json',
        responseJsonSchema: aiDiscResponseJsonSchema,
      },
    });

    const raw = String(response?.text || '').trim();
    if (!raw) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    if (raw.length > MAX_RAW_RESPONSE_LENGTH) {
      throw new Error('GEMINI_RESPONSE_TOO_LONG');
    }

    return {
      provider: 'gemini',
      model: env.geminiModel,
      raw,
      parsed: parseProviderJsonSafely(raw, {
        provider: 'gemini',
        model: env.geminiModel,
      }),
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('GEMINI_TIMEOUT');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateGeminiCoachAnswer(
  options = {},
) {
  const result = await generateWithGemini({
    ...options,
    maxTokens: Number(options?.maxOutputTokens || options?.maxTokens || 900),
    logLabel: String(options?.logLabel || 'coach'),
  });

  return {
    provider: 'gemini',
    model: result.model,
    text: result.text,
  };
}

export async function generateWithGemini(
  {
    systemInstruction = '',
    systemPrompt = '',
    userPrompt = '',
    temperature = 0.45,
    maxTokens = 900,
    responseFormat = '',
    logLabel = 'generic',
  } = {},
) {
  const client = getGeminiClient();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model: env.geminiModel,
      contents: String(userPrompt || ''),
      config: {
        abortSignal: abortController.signal,
        systemInstruction: String(systemPrompt || systemInstruction || ''),
        temperature,
        topP: 0.9,
        maxOutputTokens: maxTokens,
        ...(responseFormat === 'json_object'
          ? {
              responseMimeType: 'application/json',
            }
          : {}),
      },
    });

    const text = String(response?.text || '').trim();
    if (!text) {
      throw new Error(
        responseFormat === 'json_object' ? 'GEMINI_EMPTY_JSON_RESPONSE' : 'GEMINI_EMPTY_RESPONSE',
      );
    }

    if (text.length > MAX_RAW_RESPONSE_LENGTH) {
      throw new Error(
        responseFormat === 'json_object'
          ? 'GEMINI_JSON_RESPONSE_TOO_LONG'
          : 'GEMINI_RESPONSE_TOO_LONG',
      );
    }

    return {
      provider: 'gemini',
      model: env.geminiModel,
      text,
      meta: {
        logLabel: String(logLabel || 'generic'),
        responseFormat: responseFormat === 'json_object' ? 'json_object' : 'text',
      },
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(responseFormat === 'json_object' ? 'GEMINI_JSON_TIMEOUT' : 'GEMINI_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
