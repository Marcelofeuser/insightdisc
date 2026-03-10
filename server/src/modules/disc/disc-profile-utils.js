const DISC_FACTORS = ['D', 'I', 'S', 'C'];

const FACTOR_LABELS = Object.freeze({
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
});

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function readRawScores(...candidates) {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;

    let hasAny = false;
    const picked = {};

    for (const factor of DISC_FACTORS) {
      const parsed = toFiniteNumber(candidate?.[factor]);
      if (parsed === null) {
        picked[factor] = 0;
        continue;
      }

      picked[factor] = clamp(parsed, 0, 100);
      hasAny = true;
    }

    if (hasAny) {
      return picked;
    }
  }

  return null;
}

function normalizeScores(rawScores = null) {
  if (!rawScores || typeof rawScores !== 'object') return null;

  const total = DISC_FACTORS.reduce((accumulator, factor) => {
    const parsed = toFiniteNumber(rawScores?.[factor]);
    if (parsed === null) return accumulator;
    return accumulator + clamp(parsed, 0, 100);
  }, 0);

  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const normalized = {};
  let running = 0;

  DISC_FACTORS.forEach((factor, index) => {
    const parsed = toFiniteNumber(rawScores?.[factor]);
    const value = parsed === null ? 0 : clamp(parsed, 0, 100);

    if (index === DISC_FACTORS.length - 1) {
      normalized[factor] = Number(clamp(100 - running, 0, 100).toFixed(2));
      return;
    }

    const normalizedFactor = Number(((value / total) * 100).toFixed(2));
    normalized[factor] = normalizedFactor;
    running += normalizedFactor;
  });

  return normalized;
}

export function extractDiscScoresFromReport(discProfile = {}) {
  if (!discProfile || typeof discProfile !== 'object') {
    return null;
  }

  const rawScores = readRawScores(
    discProfile?.normalized,
    discProfile?.natural,
    discProfile?.scores?.natural,
    discProfile?.scores?.summary,
    discProfile?.scores,
    discProfile?.charts?.natural,
    discProfile?.summary,
    discProfile,
  );

  return normalizeScores(rawScores);
}

export function resolveProfileKey(discProfile = {}, normalizedScores = null) {
  const profileKey = String(
    discProfile?.profile?.key ||
      discProfile?.profileKey ||
      discProfile?.profile?.title ||
      '',
  )
    .trim()
    .toUpperCase();

  if (profileKey) return profileKey;

  if (!normalizedScores) return 'DISC';

  const dominant = [...DISC_FACTORS].sort(
    (factorA, factorB) => Number(normalizedScores[factorB] || 0) - Number(normalizedScores[factorA] || 0),
  )[0];

  return dominant || 'DISC';
}

export function resolveAssessmentParticipantLabel(assessment = {}) {
  const reportParticipant = assessment?.report?.discProfile?.participant || {};

  const picked =
    assessment?.candidateName ||
    assessment?.candidateEmail ||
    reportParticipant?.name ||
    reportParticipant?.candidateName ||
    reportParticipant?.email ||
    '';

  return String(picked || '').trim() || 'Participante';
}

export function resolveDominantFactor(scores = {}) {
  return [...DISC_FACTORS].sort(
    (factorA, factorB) => Number(scores[factorB] || 0) - Number(scores[factorA] || 0),
  )[0] || 'D';
}

export { DISC_FACTORS, FACTOR_LABELS };
