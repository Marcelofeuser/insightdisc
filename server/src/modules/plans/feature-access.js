const PLAN_ORDER = Object.freeze([
  'disc_individual',
  'personal',
  'insider',
  'professional',
  'business',
  'corporation',
  'diamond_consulting',
]);

const LEGACY_PLAN_ALIASES = Object.freeze({
  // disc_individual
  disc: 'disc_individual',
  disc_individual: 'disc_individual',
  'disc-individual': 'disc_individual',

  // personal
  free: 'personal',
  standard: 'personal',
  starter: 'personal',
  personal: 'personal',

  // insider
  insider: 'insider',

  // professional
  premium: 'professional',
  pro: 'professional',
  professional: 'professional',

  // business
  business: 'business',

  // corporation
  enterprise: 'corporation',
  corporation: 'corporation',
  corp: 'corporation',
  business_corporation: 'corporation',
  businesscorporation: 'corporation',
  'business-corporation': 'corporation',

  // diamond
  diamond: 'diamond_consulting',
  diamondconsulting: 'diamond_consulting',
  diamond_consulting: 'diamond_consulting',
  'diamond-consulting': 'diamond_consulting',
});

// Créditos mensais por plano
export const PLAN_CREDITS = Object.freeze({
  disc_individual: 1,
  personal: null,       // uso individual sem créditos
  insider: null,        // uso individual avançado sem créditos
  professional: 10,
  business: 25,
  corporation: Infinity,
  diamond_consulting: Infinity,
});

// Recorrência por plano
export const PLAN_RECURRENCE = Object.freeze({
  disc_individual: 'one_time',
  personal: 'monthly',
  insider: 'monthly',
  professional: 'monthly',
  business: 'monthly',
  corporation: 'monthly',
  diamond_consulting: 'monthly',
});

// Matriz oficial de features por plano
export const PLAN_FEATURE_ACCESS_MAP = Object.freeze({
  disc_individual: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
  ]),
  personal: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
    'continuous_profile_tracking',
    'disc_management',
    'development_guidance',
    'history_tracking',
    'operational_history',
  ]),
  insider: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
    'continuous_profile_tracking',
    'disc_management',
    'development_guidance',
    'profile_comparison',
    'ai_insights',
    'advanced_reports',
    'archetype_reading',
    'archetype_evolution',
    'history_tracking',
    'operational_history',
    // painel
    'ai_lab',
    'coach',
  ]),
  professional: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
    'continuous_profile_tracking',
    'disc_management',
    'development_guidance',
    'profile_comparison',
    'ai_insights',
    'advanced_reports',
    'archetype_reading',
    'archetype_evolution',
    'history_tracking',
    'operational_history',
    'dossier_completo',
    'credit_system',
    // painel
    'ai_lab',
    'coach',
  ]),
  business: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
    'continuous_profile_tracking',
    'disc_management',
    'development_guidance',
    'profile_comparison',
    'ai_insights',
    'advanced_reports',
    'archetype_reading',
    'archetype_evolution',
    'history_tracking',
    'operational_history',
    'dossier_completo',
    'credit_system',
    'team_map',
    'team_analysis',
    'employee_comparison',
    'leadership_support',
    'strategic_team_view',
    'internal_process_application',
    'hr_structure',
    'multi_user_management',
    // painel
    'ai_lab',
    'coach',
    'jobs',
    'insights',
  ]),
  corporation: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
    'continuous_profile_tracking',
    'disc_management',
    'development_guidance',
    'profile_comparison',
    'ai_insights',
    'advanced_reports',
    'archetype_reading',
    'archetype_evolution',
    'history_tracking',
    'operational_history',
    'dossier_completo',
    'credit_system',
    'team_map',
    'team_analysis',
    'employee_comparison',
    'leadership_support',
    'strategic_team_view',
    'internal_process_application',
    'hr_structure',
    'multi_user_management',
    'scale_operation',
    'unlimited_usage',
    'white_label',
    // painel
    'ai_lab',
    'coach',
    'team_map',
    'jobs',
    'insights',
    'api_access',
    'advanced_analytics',
  ]),
  diamond_consulting: Object.freeze([
    'disc_individual',
    'pdf_download',
    'export_pdf_professional',
    'continuous_profile_tracking',
    'disc_management',
    'development_guidance',
    'profile_comparison',
    'ai_insights',
    'advanced_reports',
    'archetype_reading',
    'archetype_evolution',
    'history_tracking',
    'operational_history',
    'dossier_completo',
    'credit_system',
    'team_map',
    'team_analysis',
    'employee_comparison',
    'leadership_support',
    'strategic_team_view',
    'internal_process_application',
    'hr_structure',
    'multi_user_management',
    'scale_operation',
    'unlimited_usage',
    'white_label',
    'specialist_support_psychoanalyst',
    'executive_feedback',
    // painel
    'ai_lab',
    'coach',
    'team_map',
    'jobs',
    'insights',
    'api_access',
    'advanced_analytics',
    'consulting_suite',
  ]),
});

function normalizeRole(value = '') {
  return String(value || '').trim().toUpperCase();
}

export function normalizePlan(value = '') {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');

  if (!raw) return '';
  return LEGACY_PLAN_ALIASES[raw] || raw;
}

export function mapPlanForFeatures(plan = '') {
  const normalized = normalizePlan(plan);
  return PLAN_ORDER.includes(normalized) ? normalized : 'personal';
}

function resolveRoleBasedPlan(role = '') {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'SUPER_ADMIN') return 'diamond_consulting';
  if (normalizedRole === 'ADMIN') return 'business';
  if (normalizedRole === 'CORPORATION') return 'corporation';
  if (normalizedRole === 'PRO' || normalizedRole === 'PROFESSIONAL') return 'professional';
  if (normalizedRole === 'CANDIDATE' || normalizedRole === 'USER') return 'personal';

  return '';
}

function getPlanRank(plan = '') {
  return PLAN_ORDER.indexOf(mapPlanForFeatures(plan));
}

function isPlanAtLeast(currentPlan = '', minimumPlan = 'personal') {
  return getPlanRank(currentPlan) >= getPlanRank(minimumPlan);
}

function getUserCreditsBalance(user = {}) {
  const directBalance = Number(user?.credits_balance ?? user?.credit_balance ?? user?.available_credits ?? NaN);
  if (Number.isFinite(directBalance)) return directBalance;

  const credits = user?.credits;
  if (Array.isArray(credits)) {
    const firstWithBalance = credits.find((entry) => Number.isFinite(Number(entry?.balance)));
    return Number(firstWithBalance?.balance || 0);
  }

  if (typeof credits === 'number') return Number(credits || 0);
  return Number(credits?.balance || user?.creditBalance || user?.credit_balance || 0);
}

function hasPaidPayment(user = {}) {
  if (
    Boolean(user?.has_paid_purchase) ||
    Boolean(user?.hasPaidPurchase) ||
    Boolean(user?.paid_purchase) ||
    Boolean(user?.paidPurchase) ||
    Boolean(user?.payment_active) ||
    Boolean(user?.paymentActive) ||
    Boolean(user?.subscription_active) ||
    Boolean(user?.subscriptionActive) ||
    Boolean(user?.active_subscription) ||
    Boolean(user?.activeSubscription)
  ) {
    return true;
  }

  const paymentStatus = String(user?.payment_status ?? user?.paymentStatus ?? '').trim().toLowerCase();
  if (paymentStatus === 'paid') return true;

  const subscriptionStatus = String(user?.subscription_status ?? user?.subscriptionStatus ?? '').trim().toLowerCase();
  if (subscriptionStatus === 'active') return true;

  const payments = Array.isArray(user?.payments) ? user.payments : [];
  return payments.some((payment) => String(payment?.status || '').trim().toLowerCase() === 'paid');
}

export function resolveUserPlan(user = {}) {
  const rawExplicitPlan =
    user?.plan ||
    user?.workspace_plan ||
    user?.subscription_plan;

  const explicitPlan = normalizePlan(rawExplicitPlan);

  // REGRA 1: plano explícito sempre vence
  if (explicitPlan) {
    return mapPlanForFeatures(explicitPlan);
  }

  // REGRA 2: fallback por role
  const rolePlan = resolveRoleBasedPlan(user?.role);
  if (rolePlan) {
    return rolePlan;
  }

  // REGRA 3: fallback por pagamento/crédito
  const hasPaidPurchase =
    hasPaidPayment(user) ||
    getUserCreditsBalance(user) > 0;

  if (hasPaidPurchase) {
    return 'professional';
  }

  // REGRA 4: default
  return 'personal';
}

export function resolveFeatureMinimumPlan(feature = '') {
  const normalizedFeature = String(feature || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!normalizedFeature) return 'personal';

  for (const plan of PLAN_ORDER) {
    const features = PLAN_FEATURE_ACCESS_MAP[plan] || [];
    if (features.includes(normalizedFeature)) return plan;
  }

  return 'personal';
}

export function hasFeatureAccess(plan = 'personal', feature = '') {
  const currentPlan = mapPlanForFeatures(plan);
  const features = PLAN_FEATURE_ACCESS_MAP[currentPlan] || [];
  return features.includes(feature);
}

export function hasUserFeatureAccess(user = {}, feature = '') {
  const plan = resolveUserPlan(user);
  return hasFeatureAccess(plan, feature);
}
