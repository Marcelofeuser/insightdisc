import { buildDiscInterpretation, normalizeDiscScores } from '../discEngine/index.js';

const PRIMARY_FACTOR_RULES = Object.freeze({
  D: {
    leadershipStyle:
      'Liderança direta e orientada a resultado, com forte tendência a decidir rápido e assumir frente em cenários críticos.',
    decisionStyle:
      'Decide com agilidade, priorizando impacto e velocidade. Funciona melhor com critérios objetivos de risco.',
    conflictManagement:
      'Enfrenta conflitos de forma frontal; tende a resolver rapidamente, mas pode reduzir espaço para escuta se não calibrar a abordagem.',
    pressureManagement:
      'Sob pressão, aumenta ritmo e assertividade. Pode ganhar performance com checkpoints curtos de alinhamento.',
    teamManagement:
      'Conduz time por metas claras e senso de urgência, com foco em performance e responsabilidade individual.',
    strengths: [
      'Direção clara em cenários de ambiguidade.',
      'Capacidade de mobilizar execução com velocidade.',
      'Tomada de decisão objetiva em contexto de pressão.',
    ],
    risks: [
      'Risco de impor ritmo acima da maturidade do time.',
      'Possível redução de escuta em contextos de alta urgência.',
    ],
  },
  I: {
    leadershipStyle:
      'Liderança inspiradora e mobilizadora, com foco em engajamento, influência e construção de adesão.',
    decisionStyle:
      'Decide com base em oportunidades e impacto relacional, beneficiando-se de critérios objetivos para priorização.',
    conflictManagement:
      'Busca mediação por diálogo e conexão, podendo evitar conflitos duros por tempo excessivo.',
    pressureManagement:
      'Sob pressão, tende a ampliar comunicação e mobilização. Ganha consistência com estrutura de acompanhamento.',
    teamManagement:
      'Conduz por proximidade, reconhecimento e energia coletiva, favorecendo cultura de colaboração.',
    strengths: [
      'Alta capacidade de engajar pessoas em torno de objetivos.',
      'Comunicação persuasiva com boa leitura de audiência.',
      'Facilidade para formar alianças e conexões entre áreas.',
    ],
    risks: [
      'Risco de dispersão por excesso de estímulos.',
      'Pode postergar decisões impopulares em busca de harmonia.',
    ],
  },
  S: {
    leadershipStyle:
      'Liderança estável, confiável e orientada a continuidade, com foco em previsibilidade e sustentação do time.',
    decisionStyle:
      'Decide com cautela e consistência, favorecendo segurança e impacto de longo prazo.',
    conflictManagement:
      'Prefere reduzir atrito e manter clima colaborativo; pode adiar confrontos necessários se faltar estrutura de feedback.',
    pressureManagement:
      'Sob pressão, busca preservar estabilidade do grupo e continuidade operacional.',
    teamManagement:
      'Conduz por escuta, suporte e clareza de rotina, fortalecendo confiança e cooperação.',
    strengths: [
      'Constância de gestão e confiabilidade no dia a dia.',
      'Boa capacidade de sustentar clima saudável no time.',
      'Facilidade para consolidar rituais e processos.',
    ],
    risks: [
      'Risco de lentidão em mudanças abruptas.',
      'Pode evitar conversas difíceis por tempo excessivo.',
    ],
  },
  C: {
    leadershipStyle:
      'Liderança analítica e criteriosa, com foco em qualidade, padrão e consistência técnica.',
    decisionStyle:
      'Decide com base em dados, evidências e critérios de qualidade, priorizando segurança de execução.',
    conflictManagement:
      'Gerencia conflitos por lógica e clareza de critério; pode soar rígido se não ajustar linguagem.',
    pressureManagement:
      'Sob pressão, eleva controle e detalhamento para reduzir erro e manter previsibilidade.',
    teamManagement:
      'Conduz time por método, governança e padrão de entrega, valorizando precisão e responsabilidade técnica.',
    strengths: [
      'Elevado rigor técnico para tomada de decisão.',
      'Consistência de qualidade em contextos complexos.',
      'Boa estruturação de processos e critérios.',
    ],
    risks: [
      'Risco de excesso de análise antes da ação.',
      'Pode elevar criticidade e reduzir percepção de acolhimento no time.',
    ],
  },
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function unique(values = [], limit = 8) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))].slice(0, limit);
}

function hasHigh(scores = {}, factor = '', threshold = 34) {
  return toNumber(scores?.[factor]) >= threshold;
}

function hasLow(scores = {}, factor = '', threshold = 18) {
  return toNumber(scores?.[factor]) <= threshold;
}

function buildCrossRecommendations(scores = {}, interpretation = {}) {
  const recommendations = [];

  if (hasHigh(scores, 'D') && hasHigh(scores, 'C')) {
    recommendations.push('Combinar velocidade e critério: defina janelas curtas de decisão com critérios mínimos de qualidade.');
  }
  if (hasHigh(scores, 'I') && hasHigh(scores, 'S')) {
    recommendations.push('Usar sua força relacional para sustentar engajamento constante em ciclos longos de execução.');
  }
  if (hasHigh(scores, 'D') && hasLow(scores, 'S')) {
    recommendations.push('Calibrar urgência com previsibilidade para reduzir desgaste e preservar adesão do time.');
  }
  if (hasHigh(scores, 'C') && hasLow(scores, 'I')) {
    recommendations.push('Ajustar comunicação para públicos não técnicos, mantendo objetividade sem perder conexão.');
  }

  recommendations.push(
    'Realizar 1:1s quinzenais com foco em comportamento observável, contexto e ação prática.',
  );
  recommendations.push(
    'Distribuir responsabilidades por complementaridade DISC para equilibrar execução, relacionamento e qualidade.',
  );
  recommendations.push(
    'Definir acordos explícitos de decisão: quem decide, quem contribui e qual critério orienta o fechamento.',
  );

  if (Array.isArray(interpretation?.attentionPoints) && interpretation.attentionPoints.length) {
    recommendations.push(`Monitorar especialmente: ${interpretation.attentionPoints[0]}`);
  }

  return unique(recommendations, 10);
}

function buildDifferentProfilesGuidance(scores = {}) {
  const guidance = [];

  if (hasHigh(scores, 'D')) {
    guidance.push('Com perfis S/C altos, explicite contexto e prazo para reduzir percepção de pressão excessiva.');
  } else if (hasHigh(scores, 'S')) {
    guidance.push('Com perfis D altos, alinhe urgência e priorização para evitar lentidão decisória.');
  }

  if (hasHigh(scores, 'I')) {
    guidance.push('Com perfis C altos, complemente discurso inspirador com estrutura, dados e critérios claros.');
  } else if (hasHigh(scores, 'C')) {
    guidance.push('Com perfis I altos, traduza análise técnica em mensagens diretas e mobilizadoras.');
  }

  guidance.push('Adapte a forma de feedback ao fator dominante do interlocutor para elevar adesão e clareza.');

  return unique(guidance, 6);
}

export function buildLeadershipInsights(rawScores = {}, options = {}) {
  const normalized = normalizeDiscScores(rawScores?.scores || rawScores?.disc || rawScores);
  const interpretation = buildDiscInterpretation(normalized.normalized, {
    context: options?.context || 'leadership_insights',
    detailLevel: options?.detailLevel || 'long',
  });

  const primaryFactor = safeText(interpretation?.primaryFactor, 'D');
  const primaryRules = PRIMARY_FACTOR_RULES[primaryFactor] || PRIMARY_FACTOR_RULES.D;
  const recommendations = buildCrossRecommendations(normalized.normalized, interpretation);
  const differentProfilesGuidance = buildDifferentProfilesGuidance(normalized.normalized);
  const leadershipRisks = unique([
    ...(primaryRules?.risks || []),
    ...(interpretation?.attentionPoints || []),
  ]);
  const leadershipStrengths = unique([
    ...(primaryRules?.strengths || []),
    ...(interpretation?.strengths || []),
  ]);

  const summaryShort = `Liderança ${primaryFactor}: ${safeText(primaryRules?.leadershipStyle, interpretation?.leadershipStyle)}`;
  const summaryMedium = `${summaryShort} ${safeText(
    primaryRules?.teamManagement,
    'Ajuste a liderança ao nível de maturidade da equipe para ampliar consistência.',
  )}`;

  return {
    profileCode: interpretation?.profileCode || 'DISC',
    styleLabel: interpretation?.styleLabel || 'Perfil DISC',
    primaryFactor,
    secondaryFactor: interpretation?.secondaryFactor || '',
    summaryShort,
    summaryMedium,
    leadershipStyle: safeText(primaryRules?.leadershipStyle, interpretation?.leadershipStyle),
    decisionStyle: safeText(primaryRules?.decisionStyle, interpretation?.decisionMaking),
    conflictManagement: safeText(primaryRules?.conflictManagement, interpretation?.relationshipStyle),
    pressureManagement: safeText(primaryRules?.pressureManagement, interpretation?.pressureResponse),
    teamManagement: safeText(primaryRules?.teamManagement, interpretation?.workStyle),
    leadershipStrengths,
    leadershipRisks,
    recommendations,
    differentProfilesGuidance,
    baseInterpretation: interpretation,
    hasValidScores: Boolean(normalized?.hasValidInput),
    generatedAt: new Date().toISOString(),
  };
}
