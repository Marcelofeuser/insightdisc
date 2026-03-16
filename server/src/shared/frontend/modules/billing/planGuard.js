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

function isSuperAdminAccess(access = {}) {
  const role = String(access?.role || access?.user?.role || '').trim().toUpperCase();
  const globalRole = String(access?.globalRole || access?.user?.global_role || '').trim().toUpperCase();
  const lifecycle = String(access?.lifecycleStatus || access?.user?.lifecycle_status || '').trim().toLowerCase();
  return role === 'SUPER_ADMIN' || globalRole === 'SUPER_ADMIN' || lifecycle === 'super_admin';
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
  TEAM_MAP: 'teamMap',
  JOB_MATCHING: 'jobMatching',
  ADVANCED_COMPARISON: 'advancedComparison',
  PREMIUM_REPORTS: 'premiumReports',
  REPORT_PDF: 'reportPdf',
  BEHAVIOR_ANALYTICS: 'behaviorAnalytics',
  BENCHMARK: 'benchmark',
  HISTORY_EVOLUTION: 'historyEvolution',
  COACH: 'coach',
  ORGANIZATIONAL_REPORT: 'organizationalReport',
});

const FEATURE_META = Object.freeze({
  [FEATURE_KEYS.TEAM_MAP]: { label: 'Mapa Organizacional', minPlan: 'business' },
  [FEATURE_KEYS.JOB_MATCHING]: { label: 'Candidato x Cargo', minPlan: 'professional' },
  [FEATURE_KEYS.ADVANCED_COMPARISON]: { label: 'Comparação Avançada', minPlan: 'professional' },
  [FEATURE_KEYS.PREMIUM_REPORTS]: { label: 'Relatórios Premium', minPlan: 'professional' },
  [FEATURE_KEYS.REPORT_PDF]: { label: 'Exportação PDF', minPlan: 'professional' },
  [FEATURE_KEYS.BEHAVIOR_ANALYTICS]: { label: 'Analytics Comportamental', minPlan: 'business' },
  [FEATURE_KEYS.BENCHMARK]: { label: 'Benchmark Organizacional', minPlan: 'business' },
  [FEATURE_KEYS.HISTORY_EVOLUTION]: { label: 'Histórico Comportamental', minPlan: 'personal' },
  [FEATURE_KEYS.COACH]: { label: 'Coach Comportamental', minPlan: 'personal' },
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

export function evaluateFeatureAccess(access = {}, feature = '', options = {}) {
  if (!feature) {
    return {
      allowed: true,
      reason: 'feature_not_informed',
      plan: normalizePlan(options?.plan || resolvePlanFromAccess(access)),
    };
  }

  if (isSuperAdminAccess(access)) {
    return {
      allowed: true,
      reason: 'super_admin',
      plan: normalizePlan(options?.plan || resolvePlanFromAccess(access)),
      feature,
    };
  }

  const plan = normalizePlan(options?.plan || resolvePlanFromAccess(access));
  const limits = getPlanLimits(plan);
  const featureEnabledByPlan = hasPlanFeature(plan, feature);
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
  return evaluateFeatureAccess(access, feature, options).allowed;
}
