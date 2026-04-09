const PLAN_ORDER = Object.freeze([
  'personal',
  'professional',
  'business',
  'corporation',
  'diamond_consulting',
]);

const LEGACY_PLAN_ALIASES = Object.freeze({
  free: 'personal',
  standard: 'personal',
  starter: 'personal',
  personal: 'personal',

  premium: 'professional',
  pro: 'professional',
  professional: 'professional',

  business: 'business',

  enterprise: 'corporation',
  corporation: 'corporation',
  corp: 'corporation',
  business_corporation: 'corporation',
  businesscorporation: 'corporation',
  'business-corporation': 'corporation',

  diamond: 'diamond_consulting',
  diamondconsulting: 'diamond_consulting',
  diamond_consulting: 'diamond_consulting',
  'diamond-consulting': 'diamond_consulting',
});

export const PLAN_FEATURE_ACCESS_MAP = Object.freeze({
  personal: Object.freeze(['report_view', 'report_download', 'basic_dashboard']),
  professional: Object.freeze(['report_view', 'report_download', 'basic_dashboard', 'ai_lab', 'coach']),
  business: Object.freeze([
    'report_view',
    'report_download',
    'basic_dashboard',
    'ai_lab',
    'coach',
    'team_map',
    'jobs',
    'insights',
  ]),
  corporation: Object.freeze([
    'report_view',
    'report_download',
    'basic_dashboard',
    'ai_lab',
    'coach',
    'team_map',
    'jobs',
    'insights',
    'api_access',
    'advanced_analytics',
  ]),
  diamond_consulting: Object.freeze([
    'report_view',
    'report_download',
    'basic_dashboard',
    'ai_lab',
    'coach',
    'team_map',
    'jobs',
    'insights',
    'api_access',
    'advanced_analytics',
    'white_label',
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

  // REGRA 1: plano explícito sempre vence (inclusive personal)
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

  if (['ai_lab', 'coach'].includes(normalizedFeature)) {
    return 'professional';
  }

  if (['team_map', 'jobs', 'insights'].includes(normalizedFeature)) {
    return 'business';
  }

  if (['api_access', 'advanced_analytics'].includes(normalizedFeature)) {
    return 'corporation';
  }

  if (['white_label', 'consulting_suite'].includes(normalizedFeature)) {
    return 'diamond_consulting';
  }

  return 'personal';
}

export function hasFeatureAccess(plan = 'personal', feature = '') {
  const currentPlan = mapPlanForFeatures(plan);
  const minimumPlan = resolveFeatureMinimumPlan(feature);
  return isPlanAtLeast(currentPlan, minimumPlan);
}

export function hasUserFeatureAccess(user = {}, feature = '') {
  const plan = resolveUserPlan(user);
  return hasFeatureAccess(plan, feature);
}
