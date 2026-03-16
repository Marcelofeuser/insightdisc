import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { parseProviderJsonSafely } from './json-utils.js';
import { buildDiscInsightsPrompt } from './prompt-builder.js';

const MAX_RAW_RESPONSE_LENGTH = 50_000;

let groqClient = null;

function getGroqClient() {
  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY_MISSING');
  }

  if (!groqClient) {
    groqClient = new Groq({
      apiKey: env.groqApiKey,
    });
  }

  return groqClient;
}

export async function generateGroqDiscInsights(payload = {}, options = {}) {
  const client = getGroqClient();
  const prompt = buildDiscInsightsPrompt(payload, options);
  const timeoutMs = 12_000;
  let timeoutId = null;

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: env.groqModel,
        temperature: prompt.mode === 'business' ? 0.45 : 0.6,
        max_tokens: 1400,
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content: prompt.systemInstruction,
          },
          {
            role: 'user',
            content: prompt.userPrompt,
          },
        ],
      }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('GROQ_TIMEOUT')), timeoutMs);
      }),
    ]);

    const raw = String(completion?.choices?.[0]?.message?.content || '').trim();
    if (!raw) {
      throw new Error('GROQ_EMPTY_RESPONSE');
    }

    if (raw.length > MAX_RAW_RESPONSE_LENGTH) {
      throw new Error('GROQ_RESPONSE_TOO_LONG');
    }

    return {
      provider: 'groq',
      model: env.groqModel,
      raw,
      parsed: parseProviderJsonSafely(raw, {
        provider: 'groq',
        model: env.groqModel,
      }),
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export { generateGroqDiscInsights as generateStructuredDiscInsights };
