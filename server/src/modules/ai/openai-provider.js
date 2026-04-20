import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { buildDiscInsightsPrompt } from './prompt-builder.js';
import { parseProviderJsonSafely } from './json-utils.js';

const MAX_RAW_RESPONSE_LENGTH = 50_000;
const OPENAI_TIMEOUT_MS = 20_000;
const OPENAI_DEFAULT_MODEL = 'gpt-4.1-mini';

let openaiClient = null;

function getOpenAiClient() {
  if (!env.openaiApiKey) {
    throw new Error('OPENAI_API_KEY_MISSING');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.openaiApiKey,
    });
  }

  return openaiClient;
}

function resolveOpenAiModel() {
  const configured = String(env.openaiModel || '').trim();
  return configured || OPENAI_DEFAULT_MODEL;
}

export async function generateWithOpenAI(
  {
    userPrompt = '',
    systemPrompt = '',
    maxTokens = 1200,
    temperature = 0.35,
    responseFormat = '',
    logLabel = 'generic',
  } = {},
) {
  const client = getOpenAiClient();
  const model = resolveOpenAiModel();
  const startedAt = Date.now();
  let timeoutId = null;

  console.info('[ai/openai] request:start', {
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
        max_completion_tokens: maxTokens,
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
        timeoutId = setTimeout(() => reject(new Error('OPENAI_TIMEOUT')), OPENAI_TIMEOUT_MS);
      }),
    ]);

    const text = String(completion?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error('OPENAI_EMPTY_RESPONSE');
    }

    if (text.length > MAX_RAW_RESPONSE_LENGTH) {
      throw new Error('OPENAI_RESPONSE_TOO_LONG');
    }

    const usage = completion?.usage || {};
    console.info('[ai/openai] request:success', {
      label: String(logLabel || 'generic'),
      model,
      durationMs: Date.now() - startedAt,
      promptTokens: Number(usage?.prompt_tokens || 0),
      completionTokens: Number(
        usage?.completion_tokens || usage?.output_tokens || 0,
      ),
      totalTokens: Number(usage?.total_tokens || 0),
    });

    return {
      provider: 'openai',
      model,
      text,
      usage: {
        promptTokens: Number(usage?.prompt_tokens || 0),
        completionTokens: Number(
          usage?.completion_tokens || usage?.output_tokens || 0,
        ),
        totalTokens: Number(usage?.total_tokens || 0),
      },
    };
  } catch (error) {
    console.warn('[ai/openai] request:failed', {
      label: String(logLabel || 'generic'),
      model,
      durationMs: Date.now() - startedAt,
      error: String(error?.message || error || 'OPENAI_REQUEST_FAILED').slice(0, 240),
    });
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function generateOpenAiDiscInsights(payload = {}, options = {}) {
  const prompt = buildDiscInsightsPrompt(payload, options);
  const result = await generateWithOpenAI({
    userPrompt: prompt.userPrompt,
    systemPrompt: prompt.systemInstruction,
    maxTokens: 1400,
    temperature: prompt.mode === 'business' ? 0.45 : 0.6,
    responseFormat: 'json_object',
    logLabel: 'disc_insights',
  });

  return {
    provider: 'openai',
    model: result.model,
    raw: result.text,
    parsed: parseProviderJsonSafely(result.text, {
      provider: 'openai',
      model: result.model,
    }),
  };
}

export { generateOpenAiDiscInsights as generateStructuredDiscInsights };

export async function generateOpenAiCoachAnswer(
  {
    systemInstruction = '',
    userPrompt = '',
    temperature = 0.45,
    maxTokens = 900,
    responseFormat = '',
    logLabel = 'coach',
  } = {},
) {
  const result = await generateWithOpenAI({
    userPrompt,
    systemPrompt: systemInstruction,
    temperature,
    maxTokens,
    responseFormat,
    logLabel,
  });

  return {
    provider: 'openai',
    model: result.model,
    text: result.text,
    usage: result.usage,
  };
}
