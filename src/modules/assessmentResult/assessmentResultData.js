import { DISC_FACTORS } from '../discEngine/constants.js';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function normalizeFactorMap(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const map = {};
  let total = 0;

  DISC_FACTORS.forEach((factor) => {
    const value = Math.max(0, toNumber(raw?.[factor]));
    map[factor] = value;
    total += value;
  });

  if (total <= 0) return null;

  const normalized = {};
  let accumulator = 0;

  DISC_FACTORS.forEach((factor, index) => {
    if (index === DISC_FACTORS.length - 1) {
      normalized[factor] = round1(100 - accumulator);
      return;
    }

    const value = round1((map[factor] / total) * 100);
    normalized[factor] = value;
    accumulator += value;
  });

  return normalized;
}

function firstValidMap(candidates = []) {
  for (const candidate of candidates) {
    const normalized = normalizeFactorMap(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function resolveRanking(scores = {}) {
  return [...DISC_FACTORS]
    .map((factor, index) => ({
      factor,
      value: round1(scores?.[factor]),
      index,
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.index - b.index;
    });
}

function resolvePrimarySecondary(scores = {}, assessment = {}) {
  const ranking = resolveRanking(scores);
  const explicitPrimary = String(
    assessment?.results?.dominant_factor ||
      assessment?.disc_results?.dominant_factor ||
      assessment?.disc_profile?.dominant ||
      assessment?.discProfile?.dominant ||
      ''
  )
    .trim()
    .toUpperCase();
  const explicitSecondary = String(
    assessment?.results?.secondary_factor ||
      assessment?.disc_results?.secondary_factor ||
      assessment?.disc_profile?.secondary ||
      assessment?.discProfile?.secondary ||
      ''
  )
    .trim()
    .toUpperCase();

  const primaryFactor = DISC_FACTORS.includes(explicitPrimary)
    ? explicitPrimary
    : ranking[0]?.factor || 'D';
  const secondaryFactor = DISC_FACTORS.includes(explicitSecondary)
    ? explicitSecondary
    : ranking.find((entry) => entry.factor !== primaryFactor)?.factor || 'I';

  return {
    primaryFactor,
    secondaryFactor,
    ranking,
  };
}

export function resolveAssessmentDiscSnapshot(assessment = {}) {
  const summary = firstValidMap([
    assessment?.results?.summary_profile,
    assessment?.disc_results?.summary,
    assessment?.disc_profile?.summary,
    assessment?.disc_profile?.charts?.summary,
    assessment?.discProfile?.summary,
    assessment?.discProfile?.charts?.summary,
    assessment?.scores?.summary,
    assessment?.summary,
  ]);

  const natural = firstValidMap([
    assessment?.results?.natural_profile,
    assessment?.disc_results?.natural,
    assessment?.disc_profile?.natural,
    assessment?.disc_profile?.charts?.natural,
    assessment?.discProfile?.natural,
    assessment?.discProfile?.charts?.natural,
    assessment?.natural_profile,
    summary,
  ]);

  const adapted = firstValidMap([
    assessment?.results?.adapted_profile,
    assessment?.disc_results?.adapted,
    assessment?.disc_profile?.adapted,
    assessment?.disc_profile?.charts?.adapted,
    assessment?.discProfile?.adapted,
    assessment?.discProfile?.charts?.adapted,
    assessment?.adapted_profile,
    summary,
    natural,
  ]);

  const baseSummary = summary || natural || adapted;
  const hasValidScores = Boolean(baseSummary);

  if (!hasValidScores) {
    return {
      summary: null,
      natural: null,
      adapted: null,
      hasValidScores: false,
      primaryFactor: '',
      secondaryFactor: '',
      ranking: [],
    };
  }

  const { primaryFactor, secondaryFactor, ranking } = resolvePrimarySecondary(baseSummary, assessment);

  return {
    summary: baseSummary,
    natural: natural || baseSummary,
    adapted: adapted || baseSummary,
    hasValidScores: true,
    primaryFactor,
    secondaryFactor,
    ranking,
  };
}

export function resolveAssessmentIdentity(assessment = {}, fallbackId = '') {
  const id = String(assessment?.assessmentId || assessment?.id || fallbackId || '').trim();
  const respondentName =
    assessment?.respondent_name ||
    assessment?.candidate_name ||
    assessment?.candidateName ||
    assessment?.lead_name ||
    assessment?.user_name ||
    assessment?.lead_email ||
    'Participante';
  const respondentEmail =
    assessment?.lead_email ||
    assessment?.candidateEmail ||
    assessment?.user_email ||
    assessment?.email ||
    '';
  const completedAt =
    assessment?.completed_at ||
    assessment?.completedAt ||
    assessment?.created_at ||
    assessment?.createdAt ||
    assessment?.created_date ||
    '';

  return {
    id,
    respondentName,
    respondentEmail,
    completedAt,
  };
}

export function buildScoreBalanceNote(scoreSummary = {}) {
  const hasValidInput = Boolean(scoreSummary?.hasValidInput);
  const topGap = round1(scoreSummary?.topGap || 0);

  if (!hasValidInput) {
    return 'Amostra DISC em consolidação: conclua nova avaliação para elevar a precisão interpretativa.';
  }

  if (topGap >= 18) {
    return 'Predominância clara do fator primário com assinatura comportamental mais concentrada.';
  }

  if (topGap <= 8) {
    return 'Distribuição equilibrada entre fatores com boa adaptabilidade situacional.';
  }

  return 'Perfil com combinação intermediária entre fator primário e secundário.';
}
