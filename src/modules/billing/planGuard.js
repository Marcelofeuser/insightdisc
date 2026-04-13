import { getPlanLimits, hasPlanFeature } from './planLimits.js';
import { nextPlan, normalizePlan, resolvePlanFromAccess, PLANS, PLAN_ORDER } from './planConfig.js';

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
  if (permission === PERMISSIONS.REPORT_EXPORT) return hasEntitlement(access, 'report.export.pdf');
  if (permission === PERMISSIONS.REPORT_VIEW_PRO) return hasEntitlement(access, 'report.pro');
  return false;
}

export const FEATURE_KEYS = Object.freeze({
  AI_LAB: 'ai_lab',
  COACH: 'coach',
  TEAM_MAP: 'team_map',
  JOB_MATCHING: 'jobs',
  ADVANCED_COMPARISON: 'profile_comparison',
  PREMIUM_REPORTS: 'advanced_reports',
  REPORT_PDF: 'export_pdf_professional',
  BEHAVIOR_ANALYTICS: 'ai_insights',
  BENCHMARK: 'insights',
  HISTORY_EVOLUTION: 'history_tracking',
  ORGANIZATIONAL_REPORT: 'team_analysis',
  DOSSIER: 'dossier_completo',
  WHITE_LABEL: 'white_label',
  ARCHETYPES: 'archetype_reading',
});

// Matriz oficial de features por plano (hierárquica)
const PLAN_FEATURE_ACCESS_MAP = Object.freeze({
  [PLANS.DISC_INDIVIDUAL]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
  ]),
  [PLANS.PERSONAL]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
    'continuous_profile_tracking', 'disc_management', 'development_guidance',
    'history_tracking', 'operational_history',
  ]),
  [PLANS.INSIDER]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
    'continuous_profile_tracking', 'disc_management', 'development_guidance',
    'history_tracking', 'operational_history',
    'profile_comparison', 'ai_insights', 'advanced_reports',
    'archetype_reading', 'archetype_evolution',
    'ai_lab', 'coach',
  ]),
  [PLANS.PROFESSIONAL]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
    'continuous_profile_tracking', 'disc_management', 'development_guidance',
    'history_tracking', 'operational_history',
    'profile_comparison', 'ai_insights', 'advanced_reports',
    'archetype_reading', 'archetype_evolution',
    'dossier_completo', 'credit_system',
    'ai_lab', 'coach',
  ]),
  [PLANS.BUSINESS]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
    'continuous_profile_tracking', 'disc_management', 'development_guidance',
    'history_tracking', 'operational_history',
    'profile_comparison', 'ai_insights', 'advanced_reports',
    'archetype_reading', 'archetype_evolution',
    'dossier_completo', 'credit_system',
    'team_map', 'team_analysis', 'employee_comparison',
    'leadership_support', 'strategic_team_view',
    'internal_process_application', 'hr_structure', 'multi_user_management',
    'ai_lab', 'coach', 'jobs', 'insights',
  ]),
  [PLANS.CORPORATION]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
    'continuous_profile_tracking', 'disc_management', 'development_guidance',
    'history_tracking', 'operational_history',
    'profile_comparison', 'ai_insights', 'advanced_reports',
    'archetype_reading', 'archetype_evolution',
    'dossier_completo', 'credit_system',
    'team_map', 'team_analysis', 'employee_comparison',
    'leadership_support', 'strategic_team_view',
    'internal_process_application', 'hr_structure', 'multi_user_management',
    'scale_operation', 'unlimited_usage', 'white_label',
    'ai_lab', 'coach', 'jobs', 'insights', 'api_access', 'advanced_analytics',
  ]),
  [PLANS.DIAMOND_CONSULTING]: Object.freeze([
    'disc_individual', 'pdf_download', 'export_pdf_professional',
    'continuous_profile_tracking', 'disc_management', 'development_guidance',
    'history_tracking', 'operational_history',
    'profile_comparison', 'ai_insights', 'advanced_reports',
    'archetype_reading', 'archetype_evolution',
    'dossier_completo', 'credit_system',
    'team_map', 'team_analysis', 'employee_comparison',
    'leadership_support', 'strategic_team_view',
    'internal_process_application', 'hr_structure', 'multi_user_management',
    'scale_operation', 'unlimited_usage', 'white_label',
    'specialist_support_psychoanalyst', 'executive_feedback',
    'ai_lab', 'coach', 'jobs', 'insights', 'api_access', 'advanced_analytics', 'consulting_suite',
  ]),
});

const FEATURE_META = Object.freeze({
  ai_lab:               { label: 'AI Lab',                    minPlan: PLANS.INSIDER },
  coach:                { label: 'Coach',                     minPlan: PLANS.INSIDER },
  team_map:             { label: 'Mapa de Equipe',            minPlan: PLANS.BUSINESS },
  jobs:                 { label: 'Vagas',                     minPlan: PLANS.BUSINESS },
  insights:             { label: 'Insights',                  minPlan: PLANS.BUSINESS },
  profile_comparison:   { label: 'Comparação de Perfis',      minPlan: PLANS.INSIDER },
  ai_insights:          { label: 'Insights com IA',           minPlan: PLANS.INSIDER },
  advanced_reports:     { label: 'Relatórios Avançados',      minPlan: PLANS.INSIDER },
  archetype_reading:    { label: 'Leitura de Arquétipos',     minPlan: PLANS.INSIDER },
  archetype_evolution:  { label: 'Evolução de Arquétipos',    minPlan: PLANS.INSIDER },
  dossier_completo:     { label: 'Dossiê Completo',           minPlan: PLANS.PROFESSIONAL },
  white_label:          { label: 'White Label',               minPlan: PLANS.CORPORATION },
  export_pdf_professional: { label: 'Exportação PDF',         minPlan: PLANS.DISC_INDIVIDUAL },
  history_tracking:     { label: 'Histórico',                 minPlan: PLANS.PERSONAL },
  credit_system:        { label: 'Sistema de Créditos',       minPlan: PLANS.PROFESSIONAL },
});

export function hasFeatureAccessByPlan(plan = PLANS.PERSONAL, feature = '') {
  const normalizedPlan = normalizePlan(plan);
  const features = PLAN_FEATURE_ACCESS_MAP[normalizedPlan] || PLAN_FEATURE_ACCESS_MAP[PLANS.PERSONAL];
  return features.includes(feature);
}

export function evaluateFeatureAccess(access = {}, feature = '', options = {}) {
  if (!feature) {
    return { allowed: true, reason: 'feature_not_informed' };
  }

  const plan = normalizePlan(options?.plan || resolvePlanFromAccess(access));
  const limits = getPlanLimits(plan);
  const featureEnabled = hasFeatureAccessByPlan(plan, feature);
  const meta = FEATURE_META[feature];
  const featureLabel = meta?.label || 'Recurso premium';

  if (!featureEnabled) {
    return {
      allowed: false,
      reason: 'plan_limit',
      feature,
      featureLabel,
      plan,
      limits,
      requiredPlan: meta?.minPlan || nextPlan(plan),
      upgradeTo: meta?.minPlan || nextPlan(plan),
      message: `${featureLabel} não está disponível no plano atual.`,
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
