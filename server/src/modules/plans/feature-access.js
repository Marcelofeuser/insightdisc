import { getUserCreditsBalance } from '../auth/user-credits.js';
import { normalizePlan, mapPlanForFeatures, isPaidPlan } from '../../lib/plan-normalize.js';

export const PLAN_FEATURE_ACCESS_MAP = Object.freeze({
  standard: Object.freeze([]),
  premium: Object.freeze(['ai_lab', 'coach']),
  professional: Object.freeze(['ai_lab', 'coach', 'team_map', 'jobs', 'insights']),
});

function normalizeRole(value = '') {
  return String(value || '').trim().toUpperCase();
}

function resolveRoleBasedPlan(role = '') {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') return 'professional';
  if (normalizedRole === 'PRO' || normalizedRole === 'PROFESSIONAL') return 'premium';
  if (normalizedRole === 'CANDIDATE' || normalizedRole === 'USER') return 'standard';
  return '';
}

function hasPaidPayment(user = {}) {
  const payments = Array.isArray(user?.payments) ? user.payments : [];
  return payments.some((payment) => String(payment?.status || '').trim().toUpperCase() === 'PAID');
}

export function resolveUserPlan(user = {}) {
  const explicitPlan = normalizePlan(user?.plan || user?.workspace_plan || user?.subscription_plan);
  if (explicitPlan) return explicitPlan;

  const rolePlan = resolveRoleBasedPlan(user?.role);
  if (rolePlan) return rolePlan;

  const hasPaidPurchase = hasPaidPayment(user) || getUserCreditsBalance(user) > 0;
  if (hasPaidPurchase) return 'premium';

  return 'standard';
}

export function hasFeatureAccess(plan = 'personal', feature = '') {
  const featurePlanKey = mapPlanForFeatures(plan) || 'personal';
  const normalizedFeature = String(feature || '').trim().toLowerCase();
  if (!normalizedFeature) return false;

  const features = PLAN_FEATURE_ACCESS_MAP[featurePlanKey] || PLAN_FEATURE_ACCESS_MAP.personal;
  return features.includes(normalizedFeature);
}

export function resolveFeatureMinimumPlan(feature = '') {
  const normalizedFeature = String(feature || '').trim().toLowerCase();
  if (!normalizedFeature) return 'personal';

  if ((PLAN_FEATURE_ACCESS_MAP.professional || []).includes(normalizedFeature)) {
    return 'professional';
  }
  if ((PLAN_FEATURE_ACCESS_MAP.business || []).includes(normalizedFeature)) {
    return 'business';
  }
  return 'personal';
}

export function hasUserFeatureAccess(user = {}, feature = '') {
  const plan = resolveUserPlan(user);
  return hasFeatureAccess(plan, feature);
}
