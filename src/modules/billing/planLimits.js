/**
 * planLimits.js — Limites e features por plano
 *
 * V3.0: Adicionados disc_individual, insider, corporation e diamond_consulting.
 */

export const PLAN_LIMITS = Object.freeze({
  disc_individual: Object.freeze({
    assessmentsPerMonth: 1,
    ai_lab: false,
    coach: false,
    jobs: false,
    insights: false,
    teamMap: false,
    jobMatching: false,
    advancedComparison: false,
    premiumReports: false,
    reportPdf: true,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: false,
    organizationalReport: false,
    dossier: false,
    archetypes: false,
    library: false,
    whiteLabel: false,
    whiteLabelAddon: false,
    rhGestao: false,
    users: false,
    analytics: false,
    consultorio: false,
    estrategiaExecutiva: false,
  }),

  personal: Object.freeze({
    assessmentsPerMonth: 10,
    ai_lab: false,
    coach: false,
    jobs: false,
    insights: false,
    teamMap: false,
    jobMatching: false,
    advancedComparison: false,
    premiumReports: false,
    reportPdf: false,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: true,
    organizationalReport: false,
    dossier: false,
    archetypes: false,
    library: false,
    whiteLabel: false,
    whiteLabelAddon: false,
    rhGestao: false,
    users: false,
    analytics: false,
    consultorio: false,
    estrategiaExecutiva: false,
  }),

  insider: Object.freeze({
    assessmentsPerMonth: 30,
    ai_lab: false,
    coach: false,
    jobs: false,
    insights: false,
    teamMap: false,
    jobMatching: false,
    advancedComparison: true,    // comparação básica
    premiumReports: false,
    reportPdf: false,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: true,
    organizationalReport: false,
    dossier: false,
    archetypes: false,
    library: true,
    whiteLabel: false,
    whiteLabelAddon: false,
    rhGestao: false,
    users: false,
    analytics: false,
    consultorio: false,
    estrategiaExecutiva: false,
  }),

  professional: Object.freeze({
    assessmentsPerMonth: 100,
    ai_lab: true,
    coach: true,
    jobs: false,
    insights: false,
    teamMap: false,
    jobMatching: false,
    advancedComparison: true,
    premiumReports: true,
    reportPdf: true,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: true,
    organizationalReport: false,
    dossier: true,
    archetypes: true,
    library: true,
    whiteLabel: false,
    whiteLabelAddon: true,       // disponível como add-on
    rhGestao: false,
    users: false,
    analytics: false,
    consultorio: false,
    estrategiaExecutiva: false,
  }),

  business: Object.freeze({
    assessmentsPerMonth: Number.POSITIVE_INFINITY,
    ai_lab: true,
    coach: true,
    jobs: true,
    insights: true,
    teamMap: false,              // disponível no Corporation+
    jobMatching: true,
    advancedComparison: true,
    premiumReports: true,
    reportPdf: true,
    behaviorAnalytics: false,
    benchmark: false,
    historyEvolution: true,
    organizationalReport: false,
    dossier: true,
    archetypes: true,
    library: true,
    whiteLabel: false,
    whiteLabelAddon: true,       // disponível como add-on
    rhGestao: false,
    users: false,
    analytics: false,
    consultorio: false,
    estrategiaExecutiva: false,
  }),

  corporation: Object.freeze({
    assessmentsPerMonth: Number.POSITIVE_INFINITY,
    ai_lab: true,
    coach: true,
    jobs: true,
    insights: true,
    teamMap: true,
    jobMatching: true,
    advancedComparison: true,
    premiumReports: true,
    reportPdf: true,
    behaviorAnalytics: true,
    benchmark: true,
    historyEvolution: true,
    organizationalReport: true,
    dossier: true,
    archetypes: true,
    library: true,
    whiteLabel: true,            // incluso
    whiteLabelAddon: false,
    rhGestao: true,
    users: true,
    analytics: true,
    consultorio: false,
    estrategiaExecutiva: false,
  }),

  diamond_consulting: Object.freeze({
    assessmentsPerMonth: Number.POSITIVE_INFINITY,
    ai_lab: true,
    coach: true,
    jobs: true,
    insights: true,
    teamMap: true,
    jobMatching: true,
    advancedComparison: true,
    premiumReports: true,
    reportPdf: true,
    behaviorAnalytics: true,
    benchmark: true,
    historyEvolution: true,
    organizationalReport: true,
    dossier: true,
    archetypes: true,
    library: true,
    whiteLabel: true,            // incluso (avançado)
    whiteLabelAddon: false,
    rhGestao: true,
    users: true,
    analytics: true,
    consultorio: true,
    estrategiaExecutiva: true,
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
