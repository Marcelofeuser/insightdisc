import {
  DISC_FACTORS,
  DEFAULT_OPTIONS,
  clamp,
  toNumber,
  VALID_COMBINATIONS,
} from '../constants.js';

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

export function normalizeDiscScores(scores = {}) {
  const raw = DISC_FACTORS.reduce((acc, factor) => {
    const value = toNumber(scores?.[factor], NaN);
    acc[factor] = Number.isFinite(value) ? clamp(value) : 0;
    return acc;
  }, {});

  const hasValidInput = DISC_FACTORS.some((factor) => Number.isFinite(toNumber(scores?.[factor], NaN)));
  const total = DISC_FACTORS.reduce((sum, factor) => sum + raw[factor], 0);

  if (!hasValidInput || total <= 0) {
    return {
      raw,
      normalized: { D: 25, I: 25, S: 25, C: 25 },
      hasValidInput,
      total,
      normalizedTotal: 100,
    };
  }

  const normalized = {};
  let accumulator = 0;

  DISC_FACTORS.forEach((factor, index) => {
    if (index === DISC_FACTORS.length - 1) {
      normalized[factor] = round1(100 - accumulator);
      return;
    }

    const value = round1((raw[factor] / total) * 100);
    normalized[factor] = value;
    accumulator += value;
  });

  return {
    raw,
    normalized,
    hasValidInput,
    total,
    normalizedTotal: DISC_FACTORS.reduce((sum, factor) => sum + normalized[factor], 0),
  };
}

function resolveRanking(normalized = {}) {
  return [...DISC_FACTORS]
    .map((factor, index) => ({
      factor,
      value: round1(normalized?.[factor]),
      index,
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.index - b.index;
    });
}

export function getPrimarySecondary(scores = {}, options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const parsed = normalizeDiscScores(scores);
  const ranking = resolveRanking(parsed.normalized);

  if (!parsed.hasValidInput) {
    return {
      primaryFactor: '',
      secondaryFactor: '',
      profileCode: 'DISC',
      isPure: false,
      topGap: 0,
      ranking,
      scores: parsed,
    };
  }

  const primary = ranking[0]?.factor || 'D';
  const secondary = ranking[1]?.factor || 'I';
  const primaryValue = round1(ranking[0]?.value || 0);
  const secondaryValue = round1(ranking[1]?.value || 0);
  const topGap = round1(primaryValue - secondaryValue);

  const isPure = topGap >= settings.pureThreshold;
  const profileCode = isPure ? primary : `${primary}${secondary}`;

  return {
    primaryFactor: primary,
    secondaryFactor: secondary,
    profileCode,
    isPure,
    topGap,
    ranking,
    scores: parsed,
  };
}

export function resolveProfileCode(scores = {}, options = {}) {
  const resolved = getPrimarySecondary(scores, options);
  return resolved.profileCode;
}

export function validateProfileCode(profileCode = '') {
  const code = String(profileCode || '').trim().toUpperCase();
  return VALID_COMBINATIONS.includes(code) ? code : 'DISC';
}
