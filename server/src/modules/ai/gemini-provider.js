import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { buildDiscInsightsPrompt } from './prompt-builder.js';
import { parseProviderJsonSafely } from './json-utils.js';
import { aiDiscResponseJsonSchema } from './schema.js';

const MAX_RAW_RESPONSE_LENGTH = 50_000;

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
  const timeoutMs = 12_000;
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

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
  {
    systemInstruction = '',
    userPrompt = '',
    temperature = 0.45,
    maxOutputTokens = 900,
  } = {},
) {
  const client = getGeminiClient();
  const abortController = new AbortController();
  const timeoutMs = 12_000;
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await client.models.generateContent({
      model: env.geminiModel,
      contents: String(userPrompt || ''),
      config: {
        abortSignal: abortController.signal,
        systemInstruction: String(systemInstruction || ''),
        temperature,
        topP: 0.9,
        maxOutputTokens,
      },
    });

    const text = String(response?.text || '').trim();
    if (!text) {
      throw new Error('GEMINI_EMPTY_COACH_RESPONSE');
    }

    if (text.length > MAX_RAW_RESPONSE_LENGTH) {
      throw new Error('GEMINI_COACH_RESPONSE_TOO_LONG');
    }

    return {
      provider: 'gemini',
      model: env.geminiModel,
      text,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('GEMINI_COACH_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
