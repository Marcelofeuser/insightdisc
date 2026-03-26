import { buildDiscInterpretation, normalizeDiscScores } from '../discEngine/index.js';

const INTENT_RULES = Object.freeze([
  {
    id: 'lead_sc',
    keywords: ['liderar', 'lideranca', 'sc'],
    response:
      'Para liderar perfil SC, combine previsibilidade com acolhimento: estabeleça acordos claros, mantenha constância de ritmo e valide contribuições com feedback respeitoso.',
    actions: [
      'Inicie reuniões com contexto e objetivo para reduzir ambiguidade.',
      'Defina prioridades semanais com critérios de qualidade explícitos.',
      'Evite mudanças abruptas sem explicar impacto e plano de transição.',
    ],
  },
  {
    id: 'motivate_c',
    keywords: ['motivar', 'perfil c', 'conformidade', 'c alto'],
    response:
      'Para motivar um perfil C alto, ofereça clareza, critério e autonomia técnica: mostre o padrão esperado, explique o porquê das decisões e evite improviso desnecessário.',
    actions: [
      'Defina objetivos com métricas, prazo e critérios de qualidade explícitos.',
      'Compartilhe contexto e lógica da decisão antes de cobrar velocidade.',
      'Reconheça precisão, consistência e melhoria contínua com feedback objetivo.',
    ],
  },
  {
    id: 'conflict_d_s',
    keywords: ['conflito', 'd x s', 'd versus s', 'urgencia e estabilidade'],
    response:
      'Conflitos D × S normalmente surgem entre velocidade e previsibilidade. O acordo de cadência e checkpoints reduz atrito sem perder execução.',
    actions: [
      'Defina marcos curtos para o perfil D e rotinas mínimas para o perfil S.',
      'Separe decisões urgentes de decisões de sustentação.',
      'Use linguagem de resultado + segurança operacional no mesmo plano.',
    ],
  },
]);

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function matchIntent(question = '') {
  const normalized = normalizeText(question);
  if (!normalized) return null;
  return (
    INTENT_RULES.find((rule) =>
      rule.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
    ) || null
  );
}

function genericCoachResponse(interpretation = {}) {
  const primary = interpretation?.primaryFactor || 'D';
  const summary = interpretation?.summaryShort || 'Perfil em leitura inicial.';
  return {
    response: `Com base no fator predominante ${primary}, foque em comunicação adaptativa, acordos de decisão e rituais de alinhamento. ${summary}`,
    actions: [
      'Ajuste seu estilo de comunicação ao perfil do interlocutor antes de negociar prioridades.',
      'Defina critérios de decisão explícitos para reduzir ruído sob pressão.',
      'Revise semanalmente pontos de força e atenção do time para calibrar delegação.',
    ],
  };
}

export function answerDiscCoachQuestion({
  question = '',
  scores = {},
  detailLevel = 'short',
} = {}) {
  const normalizedScores = normalizeDiscScores(scores).normalized;
  const interpretation = buildDiscInterpretation(normalizedScores, {
    context: 'disc_coach',
    detailLevel,
  });

  const intent = matchIntent(question);
  const selected = intent
    ? {
        response: intent.response,
        actions: intent.actions,
      }
    : genericCoachResponse(interpretation);

  return {
    question: String(question || '').trim(),
    profileCode: interpretation?.profileCode || '',
    styleLabel: interpretation?.styleLabel || '',
    summary: interpretation?.summaryMedium || interpretation?.summaryShort || '',
    response: selected.response,
    recommendedActions: selected.actions,
    interpretation,
  };
}
