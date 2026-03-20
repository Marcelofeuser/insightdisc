import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackDiscContent } from '../../server/src/modules/ai/ai-report.service.js';
import { buildPremiumReportModel } from '../../server/src/modules/report/build-report.js';
import { renderReportHtml } from '../../server/src/shared/reporting/renderReportHtml.js';

function createAssessment() {
  return {
    id: 'assessment-ai-complement',
    candidateName: 'Mariana Souza',
    candidateEmail: 'mariana@example.com',
    candidateRole: 'Gerente Comercial',
    candidateCompany: 'Acme Corp',
    organizationId: 'org-acme',
    organization: {
      id: 'org-acme',
      name: 'Acme Corp',
      companyName: 'Acme Corp',
      owner: {
        name: 'Diretoria Acme',
        email: 'owner@acme.example',
      },
    },
    creator: {
      name: 'Analista InsightDISC',
      email: 'analista@insightdisc.app',
    },
  };
}

function createDiscResult() {
  return {
    normalized: { D: 41, I: 29, S: 18, C: 12 },
    adapted: { D: 38, I: 31, S: 19, C: 12 },
    summary: { D: 41, I: 29, S: 18, C: 12 },
  };
}

function createProvider(mode = 'business') {
  const fallback = buildFallbackDiscContent({
    mode,
    nome: 'Mariana Souza',
    cargo: 'Gerente Comercial',
    empresa: 'Acme Corp',
    profileCode: 'DI',
    profileName: 'Dominante Influente',
    scores: { D: 41, I: 29, S: 18, C: 12 },
  });

  return {
    name: `stub-ai-${mode}`,
    model: `stub-ai-model-${mode}`,
    async generateStructuredDiscInsights() {
      return {
        ...fallback,
        summary:
          'Perfil com presença, velocidade e boa capacidade de mobilização, ganhando mais consistência quando transforma impulso em método observável.',
        executiveSummary:
          'A leitura sugere potencial elevado para gerar tração e influência, desde que o contexto de decisão preserve critério, alinhamento e qualidade de execução.',
        strengths: [
          'Mobiliza pessoas com rapidez em contextos de mudança.',
          'Conecta direção com energia comercial e senso de urgência.',
          'Sustenta presença forte em interações de alto impacto.',
        ],
        limitations: [
          'Pode acelerar decisões antes de consolidar critério suficiente.',
          'Pode reduzir a escuta quando a pressão por resultado aumenta.',
          'Precisa cuidar da consistência de follow-up em ciclos intensos.',
        ],
        communicationStyle:
          'Comunica com energia, clareza de direção e boa capacidade de adesão, sendo mais efetiva quando explicita contexto, critério e próximo passo.',
        leadershipStyle:
          'Tende a liderar por presença, direcionamento e ritmo, com melhor resultado quando combina cobrança por entrega com escuta qualificada.',
        decisionMaking:
          'Decide com foco em impacto e velocidade, mas eleva a qualidade das escolhas quando adiciona contraditório técnico e checagem proporcional ao risco.',
        workStyle:
          'Opera melhor com autonomia, desafio claro e margem para ajustar rota com rapidez, desde que existam prioridades explícitas e cadência de acompanhamento.',
        riskProfile:
          'O principal risco aparece quando o estilo dominante acelera demais o processo e comprime análise de consequência, alinhamento e qualidade relacional.',
        developmentRecommendations: [
          'Criar checkpoints curtos antes de decisões de maior impacto.',
          'Reforçar disciplina de follow-up e fechamento de acordos.',
          'Adicionar escuta ativa em conversas de tensão elevada.',
        ],
        careerRecommendations: [
          'Assumir contextos com espaço para influência, decisão e tração comercial.',
          'Buscar ambientes com critério claro e autonomia proporcional.',
          'Usar feedback estruturado para calibrar senioridade relacional.',
        ],
        businessRecommendations: [
          'Definir contrapesos de governança para decisões rápidas.',
          'Ajustar rito de acompanhamento para preservar execução com qualidade.',
          'Compor time com perfis complementares em detalhe e estabilidade.',
        ],
        professionalPositioning:
          'Profissionalmente, tende a ser percebida como alguém que gera movimento, direção e presença, com melhor efeito quando torna seu método mais legível para o time.',
        strategicProfile:
          mode === 'business'
            ? 'Em contexto business, o perfil gera mais valor quando converte velocidade de ação em prioridade clara, governança simples e previsibilidade de acompanhamento.'
            : fallback.professionalPositioning,
        tone: mode,
      };
    },
  };
}

function extractAiSection(html) {
  const marker = 'Análise Complementar por IA';
  const start = html.indexOf(marker);
  return start >= 0 ? html.slice(start) : '';
}

test('renderReportHtml anexa seção complementar de IA para business', async () => {
  const assessment = createAssessment();
  const reportModel = await buildPremiumReportModel({
    assessment,
    discResult: createDiscResult(),
    currentUser: assessment.creator,
    reportType: 'business',
    aiOptions: {
      providerOverride: createProvider('business'),
    },
  });

  assert.ok(reportModel.aiComplement.ai_summary.length > 40);
  assert.ok(reportModel.aiComplement.ai_leadership.length > 40);
  assert.ok(reportModel.aiComplement.ai_decision_making.length > 40);
  assert.ok(reportModel.aiComplement.ai_risk_profile.length > 40);

  const html = renderReportHtml({ assessment, reportModel });
  const aiSection = extractAiSection(html);

  assert.ok(aiSection.includes('Leitura Estratégica do Perfil'));
  assert.ok(aiSection.includes('Pontos Fortes em Evidência'));
  assert.ok(aiSection.includes('Tomada de Decisão'));
  assert.ok(aiSection.includes('Perfil de Risco'));
  assert.ok(aiSection.includes('Definir contrapesos de governança para decisões rápidas.'));
  assert.equal(/\{\{\s*[a-z_]+\s*\}\}/i.test(aiSection), false);
});

test('renderReportHtml anexa seção complementar reduzida para personal', async () => {
  const assessment = createAssessment();
  const reportModel = await buildPremiumReportModel({
    assessment,
    discResult: createDiscResult(),
    currentUser: assessment.creator,
    reportType: 'personal',
    aiOptions: {
      providerOverride: createProvider('personal'),
    },
  });

  const html = renderReportHtml({ assessment, reportModel });
  const aiSection = extractAiSection(html);

  assert.ok(aiSection.includes('Análise Complementar por IA'));
  assert.ok(aiSection.includes('Estilo de Comunicação'));
  assert.ok(aiSection.includes('Forma de Atuação no Trabalho'));
  assert.equal(aiSection.includes('Perfil de Risco'), false);
  assert.equal(aiSection.includes('Tomada de Decisão'), false);
});

test('fallback de IA não quebra o relatório e omite a seção complementar', async () => {
  const assessment = createAssessment();
  const reportModel = await buildPremiumReportModel({
    assessment,
    discResult: createDiscResult(),
    currentUser: assessment.creator,
    reportType: 'professional',
    aiOptions: {
      providerOverride: {
        name: 'stub-invalid',
        model: 'stub-invalid-model',
        async generateStructuredDiscInsights() {
          return { summary: 'curto demais' };
        },
      },
    },
  });

  assert.deepEqual(reportModel.aiComplement, {
    ai_summary: '',
    ai_strengths: '',
    ai_development: '',
    ai_communication: '',
    ai_workstyle: '',
    ai_recommendations: '',
    ai_leadership: '',
    ai_decision_making: '',
    ai_risk_profile: '',
  });

  const html = renderReportHtml({ assessment, reportModel });
  assert.equal(html.includes('Análise Complementar por IA'), false);
});

test('renderReportHtml permite desligar a seção complementar por flag', async () => {
  const assessment = createAssessment();
  const reportModel = await buildPremiumReportModel({
    assessment,
    discResult: createDiscResult(),
    currentUser: assessment.creator,
    reportType: 'business',
    aiOptions: {
      providerOverride: createProvider('business'),
    },
  });

  const html = renderReportHtml({
    assessment,
    reportModel,
    includeAiComplement: false,
  });

  assert.equal(html.includes('Análise Complementar por IA'), false);
});
