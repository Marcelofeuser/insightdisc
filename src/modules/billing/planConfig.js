export const PLANS = Object.freeze({
  DISC_INDIVIDUAL: 'disc_individual',
  PERSONAL: 'personal',
  INSIDER: 'insider',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  CORPORATION: 'corporation',
  DIAMOND_CONSULTING: 'diamond_consulting',
});

const PLAN_ALIASES = Object.freeze({
  disc: PLANS.DISC_INDIVIDUAL,
  disc_individual: PLANS.DISC_INDIVIDUAL,

  free: PLANS.PERSONAL,
  starter: PLANS.PERSONAL,
  personal: PLANS.PERSONAL,
  user: PLANS.PERSONAL,

  insider: PLANS.INSIDER,

  premium: PLANS.PROFESSIONAL,
  pro: PLANS.PROFESSIONAL,
  professional: PLANS.PROFESSIONAL,

  business: PLANS.BUSINESS,

  enterprise: PLANS.CORPORATION,
  corporation: PLANS.CORPORATION,
  corp: PLANS.CORPORATION,
  business_corporation: PLANS.CORPORATION,
  businesscorporation: PLANS.CORPORATION,

  diamond: PLANS.DIAMOND_CONSULTING,
  diamond_consulting: PLANS.DIAMOND_CONSULTING,
  diamondconsulting: PLANS.DIAMOND_CONSULTING,
});

export const PLAN_META = Object.freeze({
  [PLANS.DISC_INDIVIDUAL]: Object.freeze({
    key: PLANS.DISC_INDIVIDUAL,
    label: 'DISC Individual',
    description: 'Avaliação pontual e imediata.',
    recurrence: 'one_time',
    price: 59.90,
    credits: 1,
  }),
  [PLANS.PERSONAL]: Object.freeze({
    key: PLANS.PERSONAL,
    label: 'Personal',
    description: 'Autoconhecimento com acompanhamento.',
    recurrence: 'monthly',
    price: 99.90,
    credits: null,
  }),
  [PLANS.INSIDER]: Object.freeze({
    key: PLANS.INSIDER,
    label: 'Insider',
    description: 'Uso individual avançado com foco em profundidade.',
    recurrence: 'monthly',
    price: 129.90,
    credits: null,
  }),
  [PLANS.PROFESSIONAL]: Object.freeze({
    key: PLANS.PROFESSIONAL,
    label: 'Professional',
    description: 'RH, consultores e gestores de pessoas.',
    recurrence: 'monthly',
    price: 199.90,
    credits: 10,
  }),
  [PLANS.BUSINESS]: Object.freeze({
    key: PLANS.BUSINESS,
    label: 'Business',
    description: 'Empresas com equipes a desenvolver.',
    recurrence: 'monthly',
    price: 399.90,
    credits: 25,
  }),
  [PLANS.CORPORATION]: Object.freeze({
    key: PLANS.CORPORATION,
    label: 'Business Corporation',
    description: 'Empresas estruturadas e operação em escala.',
    recurrence: 'monthly',
    price: 999.90,
    credits: Infinity,
  }),
  [PLANS.DIAMOND_CONSULTING]: Object.freeze({
    key: PLANS.DIAMOND_CONSULTING,
    label: 'Diamond Consulting',
    description: 'Operação executiva e consultiva premium.',
    recurrence: 'monthly',
    price: 9990.00,
    credits: Infinity,
  }),
});

export const PLAN_ORDER = Object.freeze([
  PLANS.DISC_INDIVIDUAL,
  PLANS.PERSONAL,
  PLANS.INSIDER,
  PLANS.PROFESSIONAL,
  PLANS.BUSINESS,
  PLANS.CORPORATION,
  PLANS.DIAMOND_CONSULTING,
]);

function normalizePlanValue(value = '') {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return PLAN_ALIASES[key] || null;
}

export function normalizePlan(plan = '') {
  return normalizePlanValue(plan) || PLANS.PERSONAL;
}

export function resolvePlanFromAccess(access = {}) {
  const lifecycle = String(access?.lifecycleStatus || access?.user?.lifecycle_status || '').trim();
  if (lifecycle === 'super_admin') return PLANS.DIAMOND_CONSULTING;

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
