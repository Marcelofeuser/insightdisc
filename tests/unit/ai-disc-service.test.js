import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackDiscContent,
  generateAiDiscContent,
} from '../../server/src/modules/ai/ai-report.service.js';
import { parseProviderJsonSafely } from '../../server/src/modules/ai/json-utils.js';

const baseInput = {
  mode: 'professional',
  nome: 'João Silva',
  cargo: 'Gerente Comercial',
  empresa: 'Empresa XYZ',
  scores: {
    D: 34,
    I: 32,
    S: 23,
    C: 11,
  },
};

test('generateAiDiscContent usa fallback seguro quando o provider retorna JSON inválido', async () => {
  const result = await generateAiDiscContent(baseInput, {
    providerOverride: {
      name: 'stub-invalid',
      model: 'stub-invalid-model',
      async generateStructuredDiscInsights() {
        return { summary: 'curto demais' };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'deterministic_engine');
  assert.equal(result.model, 'deterministic_engine');
  assert.equal(result.source, 'fallback');
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.attempts, [
    {
      provider: 'stub-invalid',
      model: 'stub-invalid-model',
      attempt: 1,
      status: 'invalid_response',
      error: 'NO_MEANINGFUL_AI_FIELDS',
    },
  ]);
  assert.equal(result.content.tone, 'professional');
  assert.deepEqual(result.rawContent, {});
  assert.ok(result.content.summary.length > 40);
  assert.ok(result.content.strengths.length >= 2);
});

test('generateAiDiscContent preserva saída estruturada quando o provider retorna conteúdo válido', async () => {
  const providerSummary =
    'Profissional com energia alta para mobilizar decisões, criar movimento comercial e influenciar interlocutores, desde que mantenha método e consistência na execução.';

  const result = await generateAiDiscContent(baseInput, {
    providerOverride: {
      name: 'stub-valid',
      model: 'stub-valid-model',
      async generateStructuredDiscInsights() {
        return {
          summary: providerSummary,
          strengths: ['Comunica direção com energia.', 'Gera tração em ambientes dinâmicos.'],
          developmentRecommendations: [
            'Criar checkpoints de qualidade antes de acelerar decisões.',
            'Transformar feedback em ajustes visíveis de comunicação.',
          ],
          tone: 'professional',
        };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'stub-valid');
  assert.equal(result.model, 'stub-valid-model');
  assert.equal(result.source, 'ai');
  assert.equal(result.usedFallback, false);
  assert.equal(result.content.summary, providerSummary);
  assert.equal(result.content.tone, 'professional');
  assert.ok(result.content.strengths.includes('Comunica direção com energia.'));
  assert.ok(result.content.developmentRecommendations.length >= 2);
  assert.deepEqual(result.rawContent, {
    summary: providerSummary,
    strengths: ['Comunica direção com energia.', 'Gera tração em ambientes dinâmicos.'],
    developmentRecommendations: [
      'Criar checkpoints de qualidade antes de acelerar decisões.',
      'Transformar feedback em ajustes visíveis de comunicação.',
    ],
    tone: 'professional',
  });
  assert.equal(typeof result.content.executiveSummary, 'string');
  assert.ok(result.content.executiveSummary.length > 40);
});

test('generateAiDiscContent aceita aliases do contrato JSON externo e normaliza para o schema canônico', async () => {
  const summary =
    'Executa com ritmo alto, influência relacional e boa capacidade de mobilização, mas precisa sustentar método para preservar consistência na entrega.';
  const communicationStyle =
    'Comunica com energia, foco em adesão e resposta rápida, ganhando qualidade quando explicita critério e próximo passo.';
  const workStyle =
    'Atua melhor em contextos com autonomia, metas claras e espaço para ajustar rota sem perder ritmo operacional.';
  const leadership =
    'Lidera por presença, direção e mobilização, sendo mais efetivo quando combina pressão por resultado com escuta ativa.';
  const decisionMaking =
    'Decide com velocidade e impacto, mas precisa adicionar checagem de risco e contraditório proporcional ao tema.';
  const riskProfile =
    'O risco principal está em acelerar demais a decisão e reduzir o espaço para análise de consequência e alinhamento.';
  const strategicProfile =
    'Em nível business, gera mais valor quando converte energia comercial em prioridade clara, governança simples e cadência de acompanhamento.';

  const result = await generateAiDiscContent(baseInput, {
    providerOverride: {
      name: 'stub-aliases',
      model: 'stub-aliases-model',
      async generateStructuredDiscInsights() {
        return {
          summary,
          strengths: ['Mobiliza pessoas com rapidez.', 'Gera tração em frentes de mudança.'],
          weaknesses: ['Pode subestimar detalhe operacional.', 'Pode atropelar escuta em ciclos curtos.'],
          communication_style: communicationStyle,
          work_style: workStyle,
          leadership,
          decision_making: decisionMaking,
          risk_profile: riskProfile,
          strategic_profile: strategicProfile,
          tone: 'business',
        };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'ai');
  assert.equal(result.content.communicationStyle, communicationStyle);
  assert.equal(result.content.workStyle, workStyle);
  assert.equal(result.content.leadershipStyle, leadership);
  assert.equal(result.content.decisionMaking, decisionMaking);
  assert.equal(result.content.riskProfile, riskProfile);
  assert.equal(result.content.strategicProfile, strategicProfile);
  assert.ok(result.content.limitations.includes('Pode subestimar detalhe operacional.'));
  assert.deepEqual(result.rawContent, {
    summary,
    strengths: ['Mobiliza pessoas com rapidez.', 'Gera tração em frentes de mudança.'],
    limitations: ['Pode subestimar detalhe operacional.', 'Pode atropelar escuta em ciclos curtos.'],
    communicationStyle,
    leadershipStyle: leadership,
    decisionMaking,
    workStyle,
    riskProfile,
    strategicProfile,
    tone: 'business',
  });
});

test('generateAiDiscContent faz retry estrito no mesmo provider após falha de parse', async () => {
  const fallback = buildFallbackDiscContent(baseInput);
  let callCount = 0;
  let lastStrictFlag = false;

  const result = await generateAiDiscContent(baseInput, {
    providerOverride: {
      name: 'stub-parse-retry',
      model: 'stub-parse-model',
      async generateStructuredDiscInsights(_input, options = {}) {
        callCount += 1;
        lastStrictFlag = options.strictJsonRetry === true;

        if (callCount === 1) {
          return {
            provider: 'stub-parse-retry',
            model: 'stub-parse-model',
            raw: 'Resposta: não é um json válido',
            parsed: parseProviderJsonSafely('Resposta: não é um json válido', {
              provider: 'stub-parse-retry',
              model: 'stub-parse-model',
            }),
          };
        }

        return {
          provider: 'stub-parse-retry',
          model: 'stub-parse-model',
          raw: JSON.stringify({
            ...fallback,
            summary:
              'O perfil combina energia de execução com influência interpessoal e tende a ganhar força quando traduz impulso comercial em método contínuo.',
            tone: 'professional',
          }),
          parsed: {
            ...fallback,
            summary:
              'O perfil combina energia de execução com influência interpessoal e tende a ganhar força quando traduz impulso comercial em método contínuo.',
            tone: 'professional',
          },
        };
      },
    },
  });

  assert.equal(callCount, 2);
  assert.equal(lastStrictFlag, true);
  assert.equal(result.ok, true);
  assert.equal(result.provider, 'stub-parse-retry');
  assert.equal(result.model, 'stub-parse-model');
  assert.equal(result.source, 'ai');
  assert.equal(result.usedFallback, false);
  assert.equal(result.attempts.length, 1);
  assert.deepEqual(
    {
      provider: result.attempts[0].provider,
      model: result.attempts[0].model,
      attempt: result.attempts[0].attempt,
      status: result.attempts[0].status,
    },
    {
      provider: 'stub-parse-retry',
      model: 'stub-parse-model',
      attempt: 1,
      status: 'parse_error',
    },
  );
  assert.ok(String(result.attempts[0].error || '').length > 0);
});

test('generateAiDiscContent usa Gemini como fallback quando o provider primário falha', async () => {
  const fallback = buildFallbackDiscContent(baseInput);

  const result = await generateAiDiscContent(baseInput, {
    providerChainOverride: [
      {
        name: 'groq',
        model: 'llama3-70b-8192',
        async generateStructuredDiscInsights() {
          throw new Error('GROQ_TIMEOUT');
        },
      },
      {
        name: 'gemini',
        model: 'gemini-1.5-pro',
        async generateStructuredDiscInsights() {
          return {
            ...fallback,
            summary:
              'O perfil mostra tração para atuar com energia comercial, comunicação de direção e influência situacional, desde que mantenha disciplina de acompanhamento e clareza de prioridade.',
            tone: 'professional',
          };
        },
      },
    ],
    providerName: 'groq',
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-1.5-pro');
  assert.equal(result.source, 'ai');
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.attempts, [
    {
      provider: 'groq',
      model: 'llama3-70b-8192',
      attempt: 1,
      status: 'error',
      error: 'GROQ_TIMEOUT',
    },
  ]);
  assert.equal(result.content.tone, 'professional');
});
