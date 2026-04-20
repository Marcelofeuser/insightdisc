import { env } from '../../config/env.js';
import { generateHttpDiscInsights } from './ai-http-provider.js';
import {
  generateOpenAiDiscInsights as generateStructuredDiscInsightsWithOpenAI,
  generateOpenAiCoachAnswer,
} from './openai-provider.js';
import { generateGroqDiscInsights as generateStructuredDiscInsightsWithGroq } from './groq-provider.js';
import { generateGroqCoachAnswer } from './groq-provider.js';
import {
  generateStructuredDiscInsights as generateStructuredDiscInsightsWithGemini,
  generateGeminiCoachAnswer,
} from './gemini-provider.js';

const httpProvider = {
  name: 'ai_api_url',
  getModel() {
    return 'ai_api_url';
  },
  generateStructuredDiscInsights: generateHttpDiscInsights,
};

const PROVIDERS = {
  ai_api_url: httpProvider,
  ai_http: httpProvider,
  openai: {
    name: 'openai',
    getModel() {
      return env.openaiModel;
    },
    generateStructuredDiscInsights: generateStructuredDiscInsightsWithOpenAI,
    generateCoachAnswer: generateOpenAiCoachAnswer,
  },
  groq: {
    name: 'groq',
    getModel() {
      return env.groqModel;
    },
    generateStructuredDiscInsights: generateStructuredDiscInsightsWithGroq,
    generateCoachAnswer: generateGroqCoachAnswer,
  },
  gemini: {
    name: 'gemini',
    getModel() {
      return env.geminiModel;
    },
    generateStructuredDiscInsights: generateStructuredDiscInsightsWithGemini,
    generateCoachAnswer: generateGeminiCoachAnswer,
  },
};

function isProviderConfigured(providerName = '') {
  const normalized = String(providerName || '')
    .trim()
    .toLowerCase();

  if (normalized === 'ai_api_url' || normalized === 'ai_http') {
    return Boolean(env.aiApiUrl);
  }

  if (normalized === 'openai') {
    return Boolean(env.openaiApiKey);
  }

  if (normalized === 'groq') {
    return Boolean(env.groqApiKey);
  }

  if (normalized === 'gemini') {
    return Boolean(env.geminiApiKey);
  }

  return false;
}

export function resolveAiProvider(providerName = env.aiProvider) {
  const normalized = String(providerName || '')
    .trim()
    .toLowerCase();

  const provider = PROVIDERS[normalized];
  if (!provider) {
    throw new Error(`AI_PROVIDER_UNSUPPORTED:${normalized || 'unknown'}`);
  }

  return provider;
}

export function buildAiProviderChain(
  providerNames = [env.aiProvider].filter(Boolean),
) {
  const uniqueNames = [
    ...new Set([
      ...providerNames,
      ...Object.keys(PROVIDERS).filter((name) => name !== 'ai_api_url' && isProviderConfigured(name)),
    ].map((value) => String(value || '').trim().toLowerCase())),
  ];

  return uniqueNames
    .filter((name) => name && name !== 'deterministic_engine')
    .flatMap((name) => {
      try {
        return [resolveAiProvider(name)];
      } catch (error) {
        console.warn('[ai/disc] provider ignorado por configuração inválida:', {
          provider: name,
          error: error?.message || error,
        });
        return [];
      }
    });
}

export function listAiProviders() {
  return Object.keys(PROVIDERS);
}

export function listConfiguredAiProviders() {
  return Object.keys(PROVIDERS).filter((name) => isProviderConfigured(name));
}
