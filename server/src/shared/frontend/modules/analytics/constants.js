export const DISC_FACTORS = ['D', 'I', 'S', 'C'];

export const DISC_FACTOR_LABELS = Object.freeze({
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
});

export const DISC_FACTOR_COLORS = Object.freeze({
  D: '#EF4444',
  I: '#F59E0B',
  S: '#22C55E',
  C: '#3B82F6',
});

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}
