const DISC_FACTOR_KEYS = Object.freeze(['D', 'I', 'S', 'C']);

const PROFILE_NAMES = Object.freeze({
  DD: 'Dominante Puro',
  DI: 'Dominante Influente',
  DS: 'Dominante Estável',
  DC: 'Dominante Analítico',
  ID: 'Influente Dominante',
  II: 'Influente Puro',
  IS: 'Influente Estável',
  IC: 'Influente Analítico',
  SD: 'Estável Dominante',
  SI: 'Estável Influente',
  SS: 'Estável Puro',
  SC: 'Estável Analítico',
  CD: 'Analítico Dominante',
  CI: 'Analítico Influente',
  CS: 'Analítico Estável',
  CC: 'Analítico Puro',
});

const FACTOR_META = Object.freeze({
  D: Object.freeze({ name: 'Dominância' }),
  I: Object.freeze({ name: 'Influência' }),
  S: Object.freeze({ name: 'Estabilidade' }),
  C: Object.freeze({ name: 'Conformidade' }),
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value, 0))));
}

export function buildOrderedDiscFactors(scores = {}) {
  return DISC_FACTOR_KEYS
    .map((key, index) => ({
      key,
      value: clampPercentage(scores?.[key]),
      index,
    }))
    .sort((left, right) => right.value - left.value || left.index - right.index);
}

export function resolveDiscProfile(scores = {}) {
  const orderedFactors = buildOrderedDiscFactors(scores);
  const [primary, secondary, tertiary, quaternary] = orderedFactors;
  const code = `${primary?.key || 'D'}${secondary?.key || 'I'}`;

  return {
    factors: orderedFactors,
    primary: primary || { key: 'D', value: 0, index: 0 },
    secondary: secondary || { key: 'I', value: 0, index: 1 },
    tertiary: tertiary || { key: 'S', value: 0, index: 2 },
    quaternary: quaternary || { key: 'C', value: 0, index: 3 },
    code,
    compactCode: code,
    slashCode: `${primary?.key || 'D'}/${secondary?.key || 'I'}`,
    name:
      PROFILE_NAMES[code] ||
      `${FACTOR_META[primary?.key || 'D']?.name || primary?.key || 'D'} / ${FACTOR_META[secondary?.key || 'I']?.name || secondary?.key || 'I'}`,
    primaryGap: Math.max(0, (primary?.value || 0) - (secondary?.value || 0)),
    isBalanced: Math.abs((primary?.value || 0) - (secondary?.value || 0)) < 10,
  };
}

export { DISC_FACTOR_KEYS, FACTOR_META, PROFILE_NAMES };
