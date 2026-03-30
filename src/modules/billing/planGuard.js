import { getPlanLimits, hasPlanFeature } from './planLimits.js';
import { nextPlan, normalizePlan, resolvePlanFromAccess } from './planConfig.js';

const PERMISSIONS = Object.freeze({
  REPORT_EXPORT: 'report.export',
  REPORT_VIEW_PRO: 'report.view.pro',
  REPORT_VIEW_TENANT: 'report.view.tenant',
  REPORT_VIEW_SELF: 'report.view.self',
});

function hasEntitlement(access = {}, key = '') {
  return Array.isArray(access?.entitlements)
    && access.entitlements.some((item) => String(item || '').trim().toLowerCase() === key);
}

function hasPermission(access = {}, permission = '') {
  const granted = Array.isArray(access?.permissions) ? access.permissions : [];
  if (granted.includes('*') || granted.includes(permission)) return true;

  if (permission === PERMISSIONS.REPORT_EXPORT) {
    return hasEntitlement(access, 'report.export.pdf');
  }
  if (permission === PERMISSIONS.REPORT_VIEW_PRO) {
    return hasEntitlement(access, 'report.pro');
  }
  return false;
}

export const FEATURE_KEYS = Object.freeze({
  AI_LAB: 'ai_lab',
  COACH: 'coach',
  TEAM_MAP: 'teamMap',
  JOB_MATCHING: 'jobMatching',
  ADVANCED_COMPARISON: 'advancedComparison',
  PREMIUM_REPORTS: 'premiumReports',
  REPORT_PDF: 'reportPdf',
  BEHAVIOR_ANALYTICS: 'behaviorAnalytics',
  BENCHMARK: 'benchmark',
  HISTORY_EVOLUTION: 'historyEvolution',
  ORGANIZATIONAL_REPORT: 'organizationalReport',
});

export const PRODUCT_FEATURES = Object.freeze({
  AI_LAB: 'ai_lab',
  COACH: 'coach',
  TEAM_MAP: 'team_map',
  JOBS: 'jobs',
  INSIGHTS: 'insights',
});

const PLAN_FEATURE_ACCESS_MAP = Object.freeze({
  personal: Object.freeze([]),
  professional: Object.freeze([
    PRODUCT_FEATURES.AI_LAB,
    PRODUCT_FEATURES.COACH,
  ]),
  business: Object.freeze([
    PRODUCT_FEATURES.AI_LAB,
    PRODUCT_FEATURES.COACH,
    PRODUCT_FEATURES.TEAM_MAP,
    PRODUCT_FEATURES.JOBS,
    PRODUCT_FEATURES.INSIGHTS,
  ]),
});

const FEATURE_ALIASES = Object.freeze({
  [FEATURE_KEYS.AI_LAB]: PRODUCT_FEATURES.AI_LAB,
  [FEATURE_KEYS.COACH]: PRODUCT_FEATURES.COACH,
  [FEATURE_KEYS.TEAM_MAP]: PRODUCT_FEATURES.TEAM_MAP,
  team_map: PRODUCT_FEATURES.TEAM_MAP,
  [FEATURE_KEYS.JOB_MATCHING]: PRODUCT_FEATURES.JOBS,
  job_matching: PRODUCT_FEATURES.JOBS,
  jobs: PRODUCT_FEATURES.JOBS,
  [FEATURE_KEYS.BEHAVIOR_ANALYTICS]: PRODUCT_FEATURES.INSIGHTS,
  [FEATURE_KEYS.BENCHMARK]: PRODUCT_FEATURES.INSIGHTS,
  [FEATURE_KEYS.ORGANIZATIONAL_REPORT]: PRODUCT_FEATURES.INSIGHTS,
  insights: PRODUCT_FEATURES.INSIGHTS,
});

const FEATURE_META = Object.freeze({
  [FEATURE_KEYS.AI_LAB]: { label: 'AI Lab', minPlan: 'professional' },
  [FEATURE_KEYS.COACH]: { label: 'Coach', minPlan: 'professional' },
  [FEATURE_KEYS.TEAM_MAP]: { label: 'Mapa Organizacional', minPlan: 'business' },
  [FEATURE_KEYS.JOB_MATCHING]: { label: 'Criador de Vagas', minPlan: 'business' },
  [FEATURE_KEYS.ADVANCED_COMPARISON]: { label: 'Comparação Avançada', minPlan: 'professional' },
  [FEATURE_KEYS.PREMIUM_REPORTS]: { label: 'Relatórios Premium', minPlan: 'professional' },
  [FEATURE_KEYS.REPORT_PDF]: { label: 'Exportação PDF', minPlan: 'professional' },
  [FEATURE_KEYS.BEHAVIOR_ANALYTICS]: { label: 'Analytics Comportamental', minPlan: 'business' },
  [FEATURE_KEYS.BENCHMARK]: { label: 'Benchmark Organizacional', minPlan: 'business' },
  [FEATURE_KEYS.HISTORY_EVOLUTION]: { label: 'Histórico Comportamental', minPlan: 'personal' },
  [FEATURE_KEYS.ORGANIZATIONAL_REPORT]: { label: 'Relatório Executivo', minPlan: 'business' },
});

function hasPermissionByFeature(access, feature) {
  if (feature === FEATURE_KEYS.REPORT_PDF) {
    return hasPermission(access, PERMISSIONS.REPORT_EXPORT)
      || hasEntitlement(access, 'report.pro')
      || hasEntitlement(access, 'report.export.pdf');
  }
  if (feature === FEATURE_KEYS.PREMIUM_REPORTS) {
    return true;
  }
  return true;
}

function resolveFeatureLabel(feature) {
  return FEATURE_META?.[feature]?.label || 'Recurso premium';
}

function normalizeFeatureKey(feature = '') {
  const raw = String(feature || '').trim();
  if (!raw) return '';
  return FEATURE_ALIASES[raw] || FEATURE_ALIASES[raw.toLowerCase()] || '';
}

export function hasFeatureAccessByPlan(plan = 'personal', feature = '') {
  const normalizedPlan = normalizePlan(plan);
  const normalizedFeature = normalizeFeatureKey(feature);
  if (!normalizedFeature) return false;

  const available = PLAN_FEATURE_ACCESS_MAP[normalizedPlan] || PLAN_FEATURE_ACCESS_MAP.personal;
  return available.includes(normalizedFeature);
}

export function evaluateFeatureAccess(access = {}, feature = '', options = {}) {
  if (!feature) {
    return {
      allowed: true,
      reason: 'feature_not_informed',
      plan: normalizePlan(options?.plan || resolvePlanFromAccess(access)),
    };
  }

  const plan = normalizePlan(options?.plan || resolvePlanFromAccess(access));
  const limits = getPlanLimits(plan);
  const mappedFeature = normalizeFeatureKey(feature);
  const featureEnabledByPlan = mappedFeature
    ? hasFeatureAccessByPlan(plan, mappedFeature)
    : hasPlanFeature(plan, feature);
  const featureLabel = resolveFeatureLabel(feature);

  if (!featureEnabledByPlan) {
    return {
      allowed: false,
      reason: 'plan_limit',
      feature,
      featureLabel,
      plan,
      limits,
      requiredPlan: FEATURE_META?.[feature]?.minPlan || nextPlan(plan),
      upgradeTo: FEATURE_META?.[feature]?.minPlan || nextPlan(plan),
      message: `${featureLabel} não está disponível no plano atual.`,
    };
  }

  if (!hasPermissionByFeature(access, feature)) {
    return {
      allowed: false,
      reason: 'permission',
      feature,
      featureLabel,
      plan,
      limits,
      requiredPlan: plan,
      upgradeTo: nextPlan(plan),
      message: `Sua conta não possui permissão para ${featureLabel}.`,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    feature,
    featureLabel,
    plan,
    limits,
    requiredPlan: plan,
  };
}

export function hasFeatureAccess(access = {}, feature = '', options = {}) {
  if (typeof access === 'string') {
    return hasFeatureAccessByPlan(access, feature);
  }

  return evaluateFeatureAccess(access, feature, options).allowed;
}
