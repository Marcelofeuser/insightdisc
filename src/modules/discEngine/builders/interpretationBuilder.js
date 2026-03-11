import {
  DEFAULT_OPTIONS,
  DETAIL_LEVEL,
  FACTOR_LABELS,
  uniqueList,
} from '../constants.js';
import { getCombinationProfile } from '../combinations/combinationProfiles.js';
import { buildIntensityLayer } from '../rules/intensityRules.js';
import { buildComparisonLayer } from '../rules/comparisonRules.js';
import {
  getPrimarySecondary,
  resolveProfileCode,
  validateProfileCode,
} from './scoreResolver.js';

function appendText(baseText = '', additions = []) {
  const base = String(baseText || '').trim();
  const cleanAdditions = uniqueList(additions.map((item) => String(item || '').trim())).filter(Boolean);
  if (!cleanAdditions.length) return base;
  return `${base} ${cleanAdditions.join(' ')}`.trim();
}

export function getProfileArchetype(profileCode = 'DISC') {
  const code = validateProfileCode(profileCode);
  return getCombinationProfile(code);
}

export function getProfileSummary(profileCode = 'DISC', detailLevel = DETAIL_LEVEL.SHORT) {
  const archetype = getProfileArchetype(profileCode);

  if (detailLevel === DETAIL_LEVEL.LONG) {
    return archetype.summaryLong;
  }

  if (detailLevel === DETAIL_LEVEL.MEDIUM) {
    return archetype.summaryMedium;
  }

  return archetype.summaryShort;
}

export function getDevelopmentRecommendations(profileCode = 'DISC', scores = {}, options = {}) {
  const ranking = getPrimarySecondary(scores, options);
  const archetype = getProfileArchetype(profileCode || ranking.profileCode);
  const intensity = buildIntensityLayer(ranking.scores.normalized, ranking.ranking);

  return uniqueList([
    ...(archetype.developmentRecommendations || []),
    ...(intensity.developmentRecommendations || []),
  ]);
}

export function buildDiscInterpretation(scores = {}, options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const ranking = getPrimarySecondary(scores, settings);
  const resolvedCode = settings.profileCode
    ? validateProfileCode(settings.profileCode)
    : resolveProfileCode(scores, settings);
  const archetype = getProfileArchetype(resolvedCode || ranking.profileCode);

  const intensityLayer = buildIntensityLayer(ranking.scores.normalized, ranking.ranking);
  const comparisonLayer = buildComparisonLayer(ranking.scores.normalized, settings.comparisonScores);

  const summaryShort = appendText(archetype.summaryShort, intensityLayer.summaryShortAddons);
  const summaryMedium = appendText(archetype.summaryMedium, intensityLayer.summaryMediumAddons);
  const summaryLong = appendText(
    archetype.summaryLong,
    [...intensityLayer.summaryLongAddons, ...comparisonLayer.adaptationNotes]
  );

  const attentionPoints = uniqueList([
    ...(archetype.attentionPoints || []),
    ...(intensityLayer.attentionPoints || []),
    ...(comparisonLayer.attentionPoints || []),
  ]);

  const developmentRecommendations = uniqueList([
    ...(archetype.developmentRecommendations || []),
    ...(intensityLayer.developmentRecommendations || []),
    ...(comparisonLayer.developmentRecommendations || []),
  ]);

  const result = {
    profileCode: archetype.profileCode,
    primaryFactor: ranking.primaryFactor,
    secondaryFactor: ranking.secondaryFactor,
    styleLabel: archetype.styleLabel,
    summaryShort,
    summaryMedium,
    summaryLong,
    strengths: uniqueList([...(archetype.strengths || []), ...(intensityLayer.strengths || [])]),
    attentionPoints,
    communicationStyle: archetype.communicationStyle,
    decisionMaking: archetype.decisionMaking,
    leadershipStyle: archetype.leadershipStyle,
    pressureResponse: archetype.pressureResponse,
    idealEnvironment: archetype.idealEnvironment,
    motivators: uniqueList([...(archetype.motivators || []), ...(intensityLayer.motivators || [])]),
    potentialChallenges: uniqueList([
      ...(archetype.potentialChallenges || []),
      ...(intensityLayer.potentialChallenges || []),
    ]),
    developmentRecommendations,
    workStyle: archetype.workStyle,
    relationshipStyle: archetype.relationshipStyle,
    learningStyle: archetype.learningStyle,
    adaptationNotes: uniqueList([
      ...(intensityLayer.adaptationNotes || []),
      ...(comparisonLayer.adaptationNotes || []),
    ]),
    context: settings.context || 'individual',
    detailLevel: settings.detailLevel,
    scoreSummary: {
      normalized: ranking.scores.normalized,
      raw: ranking.scores.raw,
      topGap: ranking.topGap,
      isPure: ranking.isPure,
      ranking: ranking.ranking,
      hasValidInput: ranking.scores.hasValidInput,
      comparisonDeltas: comparisonLayer.deltas,
    },
  };

  if (!ranking.scores.hasValidInput) {
    result.adaptationNotes = uniqueList([
      ...result.adaptationNotes,
      'Leitura baseada em amostra insuficiente. Recomenda-se concluir nova avaliação para consolidar o perfil.',
    ]);
  }

  if (settings.detailLevel === DETAIL_LEVEL.SHORT) {
    result.summaryMedium = result.summaryShort;
    result.summaryLong = result.summaryMedium;
  } else if (settings.detailLevel === DETAIL_LEVEL.MEDIUM) {
    result.summaryLong = appendText(result.summaryMedium, [
      'Para aprofundar a leitura, combine este resultado com histórico de contexto e feedback observável.',
    ]);
  }

  return result;
}

export function buildCompatibilityPreview(scoresA = {}, scoresB = {}) {
  const left = buildDiscInterpretation(scoresA, { context: 'comparison-left' });
  const right = buildDiscInterpretation(scoresB, { context: 'comparison-right' });

  return {
    leftProfileCode: left.profileCode,
    rightProfileCode: right.profileCode,
    leftPrimary: left.primaryFactor,
    rightPrimary: right.primaryFactor,
    summary: `Comparativo inicial entre ${left.styleLabel} e ${right.styleLabel}, com foco em comunicação, decisão e ritmo de execução.`,
    notes: uniqueList([
      left.communicationStyle,
      right.communicationStyle,
      left.pressureResponse,
      right.pressureResponse,
    ]).slice(0, 4),
  };
}

export function buildLegacyProfilePayload(scores = {}, options = {}) {
  const interpretation = buildDiscInterpretation(scores, options);
  return {
    profile: {
      primary: interpretation.primaryFactor,
      secondary: interpretation.secondaryFactor,
      combination: interpretation.profileCode,
      styleLabel: interpretation.styleLabel,
    },
    summary: interpretation.summaryMedium,
    leadership: interpretation.leadershipStyle,
    communication: interpretation.communicationStyle,
    strengths: interpretation.strengths,
    risks: interpretation.attentionPoints,
    environment: interpretation.idealEnvironment,
    decisionMaking: interpretation.decisionMaking,
    pressureResponse: interpretation.pressureResponse,
    adaptationNotes: interpretation.adaptationNotes,
  };
}

export function resolveFactorLabel(factor = '') {
  return FACTOR_LABELS[String(factor || '').toUpperCase()] || 'Fator DISC';
}
