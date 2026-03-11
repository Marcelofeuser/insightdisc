export const DISC_FACTORS = ['D', 'I', 'S', 'C'];

export const FACTOR_LABELS = Object.freeze({
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
});

export const DETAIL_LEVEL = Object.freeze({
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
});

export const DEFAULT_OPTIONS = Object.freeze({
  pureThreshold: 18,
  detailLevel: DETAIL_LEVEL.MEDIUM,
  context: 'individual',
});

export const VALID_COMBINATIONS = Object.freeze([
  'D', 'I', 'S', 'C',
  'DI', 'ID', 'DC', 'CD', 'DS', 'SD',
  'IS', 'SI', 'IC', 'CI', 'SC', 'CS',
]);

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, toNumber(value, min)));
}

export function uniqueList(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
