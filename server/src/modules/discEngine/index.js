import {
  buildDiscInterpretation,
  buildCompatibilityPreview,
  buildLegacyProfilePayload,
  getDevelopmentRecommendations,
  getProfileArchetype,
  getProfileSummary,
  resolveFactorLabel,
} from './builders/interpretationBuilder.js';
import {
  getPrimarySecondary,
  normalizeDiscScores,
  resolveProfileCode,
  validateProfileCode,
} from './builders/scoreResolver.js';
import { DETAIL_LEVEL, DISC_FACTORS, FACTOR_LABELS, VALID_COMBINATIONS } from './constants.js';

export {
  buildCompatibilityPreview,
  buildDiscInterpretation,
  buildLegacyProfilePayload,
  DETAIL_LEVEL,
  DISC_FACTORS,
  FACTOR_LABELS,
  getDevelopmentRecommendations,
  getPrimarySecondary,
  getProfileArchetype,
  getProfileSummary,
  normalizeDiscScores,
  resolveFactorLabel,
  resolveProfileCode,
  validateProfileCode,
  VALID_COMBINATIONS,
};
