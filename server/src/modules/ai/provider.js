import { env } from '../../config/env.js';
import { generateStructuredDiscInsights as generateStructuredDiscInsightsWithGemini } from './gemini-provider.js';
import { generateGeminiCoachAnswer } from './gemini-provider.js';
import { generateGroqDiscInsights as generateStructuredDiscInsightsWithGroq } from './groq-provider.js';
import { generateGroqCoachAnswer } from './groq-provider.js';

const PROVIDERS = {
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
  providerNames = [env.aiProvider, env.aiFallback1, env.aiFallback2].filter(Boolean),
) {
  const uniqueNames = [...new Set(providerNames.map((value) => String(value || '').trim().toLowerCase()))];

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
