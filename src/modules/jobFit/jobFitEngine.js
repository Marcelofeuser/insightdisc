import {
  buildDiscInterpretation,
  DISC_FACTORS,
  FACTOR_LABELS,
  normalizeDiscScores,
} from '../discEngine/index.js';
import { normalizeJobIdealProfile } from '../jobProfiles/jobProfilesLibrary.js';

const JOB_FIT_LEVEL = Object.freeze({
  HIGH: 'Alta aderência',
  MODERATE: 'Aderência moderada',
  LOW: 'Baixa aderência',
});

const HIRING_RECOMMENDATION = Object.freeze({
  RECOMMENDED: 'recomendada',
  CONDITIONAL: 'avaliar_com_ressalvas',
  NOT_RECOMMENDED: 'nao_recomendada',
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, toNumber(value)));
}

function safeText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function resolveCompatibilityLevel(score = 0) {
  if (score >= 75) return JOB_FIT_LEVEL.HIGH;
  if (score >= 50) return JOB_FIT_LEVEL.MODERATE;
  return JOB_FIT_LEVEL.LOW;
}

function resolveHiringRecommendation(score = 0) {
  if (score >= 75) return HIRING_RECOMMENDATION.RECOMMENDED;
  if (score >= 50) return HIRING_RECOMMENDATION.CONDITIONAL;
  return HIRING_RECOMMENDATION.NOT_RECOMMENDED;
}

function mapRecommendationLabel(recommendation = '') {
  if (recommendation === HIRING_RECOMMENDATION.RECOMMENDED) {
    return 'Recomendação positiva';
  }
  if (recommendation === HIRING_RECOMMENDATION.CONDITIONAL) {
    return 'Recomendação com ressalvas';
  }
  return 'Não recomendada para a função atual';
}

function buildScoreDifferences(candidateScores = {}, jobScores = {}) {
  const byFactor = DISC_FACTORS.reduce((acc, factor) => {
    const candidate = toNumber(candidateScores?.[factor]);
    const ideal = toNumber(jobScores?.[factor]);
    const delta = round1(candidate - ideal);
    acc[factor] = {
      factor,
      candidate,
      ideal,
      delta,
      absDelta: Math.abs(delta),
    };
    return acc;
  }, {});

  const totalAbsDelta = round1(
    DISC_FACTORS.reduce((sum, factor) => sum + toNumber(byFactor?.[factor]?.absDelta), 0),
  );

  return {
    ...byFactor,
    totalAbsDelta,
    meanAbsDelta: round1(totalAbsDelta / DISC_FACTORS.length),
  };
}

function calculateJobFitScore(scoreDifferences = {}) {
  const meanAbsDelta = toNumber(scoreDifferences?.meanAbsDelta);
  const totalAbsDelta = toNumber(scoreDifferences?.totalAbsDelta);
  let score = 100 - meanAbsDelta * 1.6 - totalAbsDelta * 0.12;

  const strongAlignmentCount = DISC_FACTORS.filter(
    (factor) => toNumber(scoreDifferences?.[factor]?.absDelta) <= 10,
  ).length;
  const highGapCount = DISC_FACTORS.filter(
    (factor) => toNumber(scoreDifferences?.[factor]?.absDelta) >= 24,
  ).length;

  score += strongAlignmentCount * 3;
  score -= highGapCount * 6;

  return clamp(round1(score), 0, 100);
}

function buildStrengths(scoreDifferences = {}) {
  const strengths = DISC_FACTORS
    .filter((factor) => toNumber(scoreDifferences?.[factor]?.absDelta) <= 12)
    .map((factor) => {
      const label = FACTOR_LABELS[factor] || factor;
      const delta = round1(scoreDifferences?.[factor]?.delta);
      if (Math.abs(delta) <= 4) {
        return `Boa aderência em ${label} (${factor}), com proximidade direta ao perfil ideal da vaga.`;
      }
      if (delta > 0) {
        return `${label} (${factor}) acima do alvo ideal, podendo acelerar entregas nesse eixo.`;
      }
      return `${label} (${factor}) levemente abaixo do alvo ideal, mas dentro de faixa funcional para a vaga.`;
    });

  return strengths.length
    ? strengths
    : ['Não há alinhamentos fortes por fator neste momento; recomenda-se avaliar plano de adaptação.'];
}

function buildRiskPoints(scoreDifferences = {}) {
  const risks = DISC_FACTORS
    .filter((factor) => toNumber(scoreDifferences?.[factor]?.absDelta) >= 18)
    .map((factor) => {
      const label = FACTOR_LABELS[factor] || factor;
      const delta = round1(scoreDifferences?.[factor]?.delta);
      if (delta > 0) {
        return `Excesso relativo em ${label} (${factor}) pode gerar descompasso com a demanda comportamental da função.`;
      }
      return `Baixa relativa em ${label} (${factor}) pode limitar performance no contexto esperado para a vaga.`;
    });

  return risks.length
    ? risks
    : ['Não foram identificados riscos críticos de aderência por fator.'];
}

function buildPracticalRecommendations(scoreDifferences = {}, recommendation = '') {
  const notes = [
    'Alinhar expectativa de performance comportamental já no onboarding dos primeiros 30 dias.',
  ];

  if (toNumber(scoreDifferences?.D?.absDelta) >= 18) {
    notes.push('Definir claramente o grau de autonomia e velocidade de decisão esperado para a função.');
  }
  if (toNumber(scoreDifferences?.I?.absDelta) >= 18) {
    notes.push('Ajustar rituais de comunicação (cadência, formalidade e nível de exposição) de acordo com a vaga.');
  }
  if (toNumber(scoreDifferences?.S?.absDelta) >= 18) {
    notes.push('Planejar curva de adaptação ao ritmo da equipe para reduzir fricção operacional.');
  }
  if (toNumber(scoreDifferences?.C?.absDelta) >= 18) {
    notes.push('Formalizar critérios de qualidade e padrão de entrega para reduzir risco de retrabalho.');
  }

  if (recommendation === HIRING_RECOMMENDATION.CONDITIONAL) {
    notes.push('Validar aderência com um período de acompanhamento estruturado e feedback quinzenal.');
  }
  if (recommendation === HIRING_RECOMMENDATION.NOT_RECOMMENDED) {
    notes.push('Reavaliar o fit com outra função ou ajustar o perfil ideal da vaga antes de avançar.');
  }

  return Array.from(new Set(notes)).slice(0, 8);
}

function buildSummary({
  score = 0,
  level = JOB_FIT_LEVEL.MODERATE,
  candidateLabel = 'Pessoa',
  jobLabel = 'Cargo',
  strongestFactor = 'D',
}) {
  const factorLabel = FACTOR_LABELS[strongestFactor] || strongestFactor;
  const scoreText = `${round1(score).toFixed(1)}%`;

  const summaryShort = `${candidateLabel} x ${jobLabel}: aderência ${scoreText} (${level}).`;

  let summaryMedium = `${summaryShort} O principal desvio está em ${factorLabel} (${strongestFactor}), fator que merece ajuste de contexto e expectativa.`;
  if (score >= 75) {
    summaryMedium = `${summaryShort} A leitura indica boa compatibilidade comportamental para a função, com onboarding focado em aceleração de performance.`;
  } else if (score < 50) {
    summaryMedium = `${summaryShort} A distância comportamental atual sugere cautela na contratação e necessidade de plano de adaptação mais robusto.`;
  }

  return { summaryShort, summaryMedium };
}

export function calculateJobFit(rawCandidate = {}, rawJobProfile = {}, options = {}) {
  const candidateScores = normalizeDiscScores(rawCandidate?.scores || rawCandidate?.disc || rawCandidate).normalized;
  const candidateInterpretation = buildDiscInterpretation(candidateScores, {
    context: options?.context || 'job_fit_candidate',
    detailLevel: options?.detailLevel || 'medium',
  });

  const jobNormalized = normalizeJobIdealProfile(rawJobProfile || {});
  const jobScores = jobNormalized.scores;
  const jobInterpretation = buildDiscInterpretation(jobScores, {
    context: 'job_fit_ideal_role',
    detailLevel: 'short',
  });

  const scoreDifferences = buildScoreDifferences(candidateScores, jobScores);
  const jobFitScore = calculateJobFitScore(scoreDifferences);
  const compatibilityLevel = resolveCompatibilityLevel(jobFitScore);
  const recommendation = resolveHiringRecommendation(jobFitScore);
  const strongestGapFactor = DISC_FACTORS.sort(
    (left, right) =>
      toNumber(scoreDifferences?.[right]?.absDelta) - toNumber(scoreDifferences?.[left]?.absDelta),
  )[0];
  const summaries = buildSummary({
    score: jobFitScore,
    level: compatibilityLevel,
    candidateLabel: safeText(rawCandidate?.name || rawCandidate?.candidateName, 'Pessoa'),
    jobLabel: safeText(rawJobProfile?.label || rawJobProfile?.title, 'Cargo'),
    strongestFactor: strongestGapFactor,
  });

  const strengths = buildStrengths(scoreDifferences);
  const riskPoints = buildRiskPoints(scoreDifferences);
  const practicalRecommendations = buildPracticalRecommendations(scoreDifferences, recommendation);

  return {
    candidate: {
      id: safeText(rawCandidate?.id || rawCandidate?.assessmentId),
      name: safeText(rawCandidate?.name || rawCandidate?.candidateName, 'Pessoa'),
      profileCode: candidateInterpretation?.profileCode || 'DISC',
      styleLabel: candidateInterpretation?.styleLabel || 'Perfil DISC',
      scores: candidateScores,
      interpretation: candidateInterpretation,
    },
    jobProfile: {
      key: safeText(rawJobProfile?.key || rawJobProfile?.id),
      label: safeText(rawJobProfile?.label || rawJobProfile?.title, 'Cargo'),
      description: safeText(rawJobProfile?.description),
      profileCode: jobInterpretation?.profileCode || 'DISC',
      styleLabel: jobInterpretation?.styleLabel || 'Perfil ideal DISC',
      scores: jobScores,
      idealProfile: jobNormalized.idealProfile,
      interpretation: jobInterpretation,
    },
    jobFitScore,
    compatibilityLevel,
    hiringRecommendation: recommendation,
    hiringRecommendationLabel: mapRecommendationLabel(recommendation),
    scoreDifferences,
    alignedFactors: DISC_FACTORS.filter(
      (factor) => toNumber(scoreDifferences?.[factor]?.absDelta) <= 12,
    ),
    riskFactors: DISC_FACTORS.filter(
      (factor) => toNumber(scoreDifferences?.[factor]?.absDelta) >= 18,
    ),
    strengths,
    riskPoints,
    practicalRecommendations,
    summaryShort: summaries.summaryShort,
    summaryMedium: summaries.summaryMedium,
    generatedAt: new Date().toISOString(),
  };
}

export function rankCandidatesByJobFit(candidates = [], rawJobProfile = {}, options = {}) {
  const list = Array.isArray(candidates) ? candidates : [];
  return list
    .map((candidate) => calculateJobFit(candidate, rawJobProfile, options))
    .sort((left, right) => toNumber(right?.jobFitScore) - toNumber(left?.jobFitScore));
}

export { HIRING_RECOMMENDATION, JOB_FIT_LEVEL };
