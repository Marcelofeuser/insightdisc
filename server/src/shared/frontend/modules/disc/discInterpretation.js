import {
  buildLegacyProfilePayload,
  getPrimarySecondary,
  normalizeDiscScores,
} from '@/modules/discEngine';

export function getDiscProfile(scores) {
  const resolved = getPrimarySecondary(scores);

  return {
    primary: resolved.primaryFactor,
    secondary: resolved.secondaryFactor,
    combination: resolved.profileCode,
    mode: resolved.isPure ? 'pure' : 'combo',
    topGap: resolved.topGap,
  };
}

export function generateDiscInterpretation(scores) {
  const parsed = normalizeDiscScores(scores);
  if (!parsed.hasValidInput) {
    return null;
  }

  return buildLegacyProfilePayload(scores, { context: 'legacy-report' });
}
