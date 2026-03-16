export const PLANS = Object.freeze({
  PERSONAL: 'personal',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
});

const PLAN_ALIASES = Object.freeze({
  free: PLANS.PERSONAL,
  starter: PLANS.PERSONAL,
  personal: PLANS.PERSONAL,
  user: PLANS.PERSONAL,
  premium: PLANS.PROFESSIONAL,
  pro: PLANS.PROFESSIONAL,
  professional: PLANS.PROFESSIONAL,
  business: PLANS.BUSINESS,
  enterprise: PLANS.BUSINESS,
});

export const PLAN_META = Object.freeze({
  [PLANS.PERSONAL]: Object.freeze({
    key: PLANS.PERSONAL,
    label: 'Personal',
    description: 'Plano individual para autoconhecimento e evolução pessoal.',
  }),
  [PLANS.PROFESSIONAL]: Object.freeze({
    key: PLANS.PROFESSIONAL,
    label: 'Professional',
    description: 'Plano para consultores, analistas e operação técnica DISC.',
  }),
  [PLANS.BUSINESS]: Object.freeze({
    key: PLANS.BUSINESS,
    label: 'Business',
    description: 'Plano para empresas com escala, equipe e inteligência organizacional.',
  }),
});

const PLAN_ORDER = Object.freeze([PLANS.PERSONAL, PLANS.PROFESSIONAL, PLANS.BUSINESS]);

function normalizePlanValue(value = '') {
  const key = String(value || '').trim().toLowerCase();
  return PLAN_ALIASES[key] || null;
}

export function normalizePlan(plan = '') {
  return normalizePlanValue(plan) || PLANS.PERSONAL;
}

export function resolvePlanFromAccess(access = {}) {
  const lifecycle = String(access?.lifecycleStatus || access?.user?.lifecycle_status || '').trim();
  if (lifecycle === 'super_admin') return PLANS.BUSINESS;

  const directPlan = normalizePlanValue(
    access?.plan ||
      access?.user?.plan ||
      access?.user?.workspace_plan ||
      access?.user?.subscription_plan
  );
  if (directPlan) return directPlan;

  const hasPremiumLifecycle = lifecycle === 'customer_active';
  if (hasPremiumLifecycle) return PLANS.PROFESSIONAL;

  const hasProEntitlement = Array.isArray(access?.entitlements)
    && access.entitlements.some((item) => String(item || '').toLowerCase().includes('report.pro'));
  if (hasProEntitlement) return PLANS.PROFESSIONAL;

  return PLANS.PERSONAL;
}

export function comparePlans(left, right) {
  const leftIndex = PLAN_ORDER.indexOf(normalizePlan(left));
  const rightIndex = PLAN_ORDER.indexOf(normalizePlan(right));
  return leftIndex - rightIndex;
}

export function isPlanAtLeast(currentPlan, minimumPlan) {
  return comparePlans(currentPlan, minimumPlan) >= 0;
}

export function nextPlan(plan = PLANS.PERSONAL) {
  const normalized = normalizePlan(plan);
  const index = PLAN_ORDER.indexOf(normalized);
  if (index < 0 || index >= PLAN_ORDER.length - 1) return normalized;
  return PLAN_ORDER[index + 1];
}
