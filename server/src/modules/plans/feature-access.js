import { getUserCreditsBalance } from '../auth/user-credits.js';

export const PLAN_FEATURE_ACCESS_MAP = Object.freeze({
  personal: Object.freeze([]),
  professional: Object.freeze(['ai_lab', 'coach']),
  business: Object.freeze(['ai_lab', 'coach', 'team_map', 'jobs', 'insights']),
});

const PERSONAL_PLAN_ALIASES = new Set(['personal', 'free', 'starter']);
const PROFESSIONAL_PLAN_ALIASES = new Set(['professional', 'pro', 'premium']);
const BUSINESS_PLAN_ALIASES = new Set(['business', 'enterprise']);

function normalizePlanValue(value = '') {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '';
  if (PERSONAL_PLAN_ALIASES.has(key)) return 'personal';
  if (PROFESSIONAL_PLAN_ALIASES.has(key)) return 'professional';
  if (BUSINESS_PLAN_ALIASES.has(key)) return 'business';
  return '';
}

function normalizeRole(value = '') {
  return String(value || '').trim().toUpperCase();
}

function resolveRoleBasedPlan(role = '') {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') return 'business';
  if (normalizedRole === 'PRO' || normalizedRole === 'PROFESSIONAL') return 'professional';
  if (normalizedRole === 'CANDIDATE' || normalizedRole === 'USER') return 'personal';
  return '';
}

function hasPaidPayment(user = {}) {
  const payments = Array.isArray(user?.payments) ? user.payments : [];
  return payments.some((payment) => String(payment?.status || '').trim().toUpperCase() === 'PAID');
}

export function resolveUserPlan(user = {}) {
  const explicitPlan = normalizePlanValue(
    user?.plan || user?.workspace_plan || user?.subscription_plan,
  );
  if (explicitPlan) return explicitPlan;

  const rolePlan = resolveRoleBasedPlan(user?.role);
  if (rolePlan) return rolePlan;

  const hasPaidPurchase = hasPaidPayment(user) || getUserCreditsBalance(user) > 0;
  if (hasPaidPurchase) return 'professional';

  return 'personal';
}

export function hasFeatureAccess(plan = 'personal', feature = '') {
  const normalizedPlan = normalizePlanValue(plan) || 'personal';
  const normalizedFeature = String(feature || '').trim().toLowerCase();
  if (!normalizedFeature) return false;

  const features = PLAN_FEATURE_ACCESS_MAP[normalizedPlan] || PLAN_FEATURE_ACCESS_MAP.personal;
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
