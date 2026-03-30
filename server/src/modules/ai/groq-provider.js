import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { parseProviderJsonSafely } from './json-utils.js';
import { buildDiscInsightsPrompt } from './prompt-builder.js';

const MAX_RAW_RESPONSE_LENGTH = 50_000;
const GROQ_TIMEOUT_MS = 20_000;
const GROQ_DEFAULT_MODEL = 'llama3-70b-8192';

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

function resolveGroqModel() {
  const configured = String(env.groqModel || '').trim();
  return configured || GROQ_DEFAULT_MODEL;
}

export async function generateWithGroq(
  {
    userPrompt = '',
    systemPrompt = '',
    maxTokens = 1200,
    temperature = 0.35,
    responseFormat = '',
    logLabel = 'generic',
  } = {},
) {
  const client = getGroqClient();
  const model = resolveGroqModel();
  const startedAt = Date.now();
  let timeoutId = null;

  console.info('[ai/groq] request:start', {
    label: String(logLabel || 'generic'),
    model,
    maxTokens: Number(maxTokens),
    temperature: Number(temperature),
    responseFormat: String(responseFormat || 'text'),
    userPromptChars: String(userPrompt || '').length,
    hasSystemPrompt: Boolean(String(systemPrompt || '').trim()),
  });

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        ...(responseFormat === 'json_object'
          ? {
              response_format: {
                type: 'json_object',
              },
            }
          : {}),
        messages: [
          {
            role: 'system',
            content: String(systemPrompt || ''),
          },
          {
            role: 'user',
            content: String(userPrompt || ''),
          },
        ],
      }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('GROQ_TIMEOUT')), GROQ_TIMEOUT_MS);
      }),
    ]);

    const text = String(completion?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error('GROQ_EMPTY_RESPONSE');
    }

    if (text.length > MAX_RAW_RESPONSE_LENGTH) {
      throw new Error('GROQ_RESPONSE_TOO_LONG');
    }

    const usage = completion?.usage || {};
    console.info('[ai/groq] request:success', {
      label: String(logLabel || 'generic'),
      model,
      durationMs: Date.now() - startedAt,
      promptTokens: Number(usage?.prompt_tokens || 0),
      completionTokens: Number(usage?.completion_tokens || 0),
      totalTokens: Number(usage?.total_tokens || 0),
    });

    return {
      provider: 'groq',
      model,
      text,
      usage: {
        promptTokens: Number(usage?.prompt_tokens || 0),
        completionTokens: Number(usage?.completion_tokens || 0),
        totalTokens: Number(usage?.total_tokens || 0),
      },
    };
  } catch (error) {
    console.warn('[ai/groq] request:failed', {
      label: String(logLabel || 'generic'),
      model,
      durationMs: Date.now() - startedAt,
      error: String(error?.message || error || 'GROQ_REQUEST_FAILED').slice(0, 240),
    });
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function generateGroqDiscInsights(payload = {}, options = {}) {
  const prompt = buildDiscInsightsPrompt(payload, options);
  const result = await generateWithGroq({
    userPrompt: prompt.userPrompt,
    systemPrompt: prompt.systemInstruction,
    maxTokens: 1400,
    temperature: prompt.mode === 'business' ? 0.45 : 0.6,
    responseFormat: 'json_object',
    logLabel: 'disc_insights',
  });

  return {
    provider: 'groq',
    model: result.model,
    raw: result.text,
    parsed: parseProviderJsonSafely(result.text, {
      provider: 'groq',
      model: result.model,
    }),
  };
}

export { generateGroqDiscInsights as generateStructuredDiscInsights };

export async function generateGroqCoachAnswer(
  {
    systemInstruction = '',
    userPrompt = '',
    temperature = 0.45,
    maxTokens = 900,
    responseFormat = '',
    logLabel = 'coach',
  } = {},
) {
  const result = await generateWithGroq({
    userPrompt,
    systemPrompt: systemInstruction,
    temperature,
    maxTokens,
    responseFormat,
    logLabel,
  });

  return {
    provider: 'groq',
    model: result.model,
    text: result.text,
    usage: result.usage,
  };
}
