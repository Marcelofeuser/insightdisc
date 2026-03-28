export const PLAN_LIMITS = Object.freeze({
  personal: Object.freeze({
    assessmentsPerMonth: 10,
    teamMap: false,
    jobMatching: false,
    advancedComparison: false,
    premiumReports: false,
    reportPdf: false,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: true,
    organizationalReport: false,
  }),
  professional: Object.freeze({
    assessmentsPerMonth: 100,
    teamMap: false,
    jobMatching: true,
    advancedComparison: true,
    premiumReports: true,
    reportPdf: true,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: true,
    organizationalReport: false,
  }),
  business: Object.freeze({
    assessmentsPerMonth: Number.POSITIVE_INFINITY,
    teamMap: true,
    jobMatching: true,
    advancedComparison: true,
    premiumReports: true,
    reportPdf: true,
    behaviorAnalytics: true,
    benchmark: true,
    historyEvolution: true,
    organizationalReport: true,
  }),
});

const DEFAULT_PLAN = 'personal';

export function getPlanLimits(plan = DEFAULT_PLAN) {
  const key = String(plan || '').trim().toLowerCase();
  return PLAN_LIMITS[key] || PLAN_LIMITS[DEFAULT_PLAN];
}

export function hasPlanFeature(plan, featureKey) {
  const limits = getPlanLimits(plan);
  return Boolean(limits?.[featureKey]);
}

export function getPlanQuota(plan, quotaKey, fallback = 0) {
  const limits = getPlanLimits(plan);
  if (!Object.prototype.hasOwnProperty.call(limits, quotaKey)) return fallback;
  return limits[quotaKey];
}
