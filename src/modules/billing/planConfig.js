/**
 * planConfig.js — Configuração central de planos InsightDISC
 *
 * V3.0: Adicionados DISC_INDIVIDUAL, INSIDER, CORPORATION e DIAMOND_CONSULTING
 * como tiers próprios. PLAN_ALIASES não colapsa mais corporation/diamond → business.
 *
 * Backward-compat: PLANS.PERSONAL, PROFESSIONAL e BUSINESS continuam existindo.
 * Todo código legado continua funcionando. Novo código deve usar v3Config.js.
 */

export const PLANS = Object.freeze({
  // Tiers legados (V2) — mantidos para compatibilidade
  PERSONAL: 'personal',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  // Tiers próprios V3.0
  DISC_INDIVIDUAL: 'disc_individual',
  INSIDER: 'insider',
  CORPORATION: 'corporation',
  DIAMOND_CONSULTING: 'diamond_consulting',
});

/**
 * Aliases de entrada → chave canônica.
 * IMPORTANTE V3.0: corporation e diamond_consulting NÃO colapsam mais em business.
 */
const PLAN_ALIASES = Object.freeze({
  free: PLANS.PERSONAL,
  starter: PLANS.PERSONAL,
  personal: PLANS.PERSONAL,
  user: PLANS.PERSONAL,
  disc: PLANS.DISC_INDIVIDUAL,
  disc_individual: PLANS.DISC_INDIVIDUAL,
  insider: PLANS.INSIDER,
  premium: PLANS.PROFESSIONAL,
  pro: PLANS.PROFESSIONAL,
  professional: PLANS.PROFESSIONAL,
  business: PLANS.BUSINESS,
  enterprise: PLANS.BUSINESS,
  // V3.0: agora resolvem para seus próprios tiers
  corporation: PLANS.CORPORATION,
  business_corporation: PLANS.CORPORATION,
  diamond: PLANS.DIAMOND_CONSULTING,
  diamond_consulting: PLANS.DIAMOND_CONSULTING,
});

export const PLAN_META = Object.freeze({
  [PLANS.DISC_INDIVIDUAL]: Object.freeze({
    key: PLANS.DISC_INDIVIDUAL,
    label: 'Disc Individual',
    description: 'Acesso ao relatório DISC individual com visualização e exportação.',
  }),
  [PLANS.PERSONAL]: Object.freeze({
    key: PLANS.PERSONAL,
    label: 'Personal',
    description: 'Plano individual para autoconhecimento e evolução pessoal.',
  }),
  [PLANS.INSIDER]: Object.freeze({
    key: PLANS.INSIDER,
    label: 'Insider',
    description: 'Entendimento guiado, leitura complementar e comparação básica.',
  }),
  [PLANS.PROFESSIONAL]: Object.freeze({
    key: PLANS.PROFESSIONAL,
    label: 'Professional',
    description: 'Plano para consultores, analistas e operação técnica DISC.',
  }),
  [PLANS.BUSINESS]: Object.freeze({
    key: PLANS.BUSINESS,
    label: 'Business',
    description: 'Uso técnico/profissional com profundidade operacional.',
  }),
  [PLANS.CORPORATION]: Object.freeze({
    key: PLANS.CORPORATION,
    label: 'Business Corporation',
    description: 'Plano empresarial com equipe, RH, analytics e White Label incluso.',
  }),
  [PLANS.DIAMOND_CONSULTING]: Object.freeze({
    key: PLANS.DIAMOND_CONSULTING,
    label: 'Diamond Consulting',
    description: 'Premium consultivo com Consultório, Estratégia Executiva e White Label avançado.',
  }),
});

/**
 * Ordem hierárquica de planos (menor → maior tier).
 * Usada por comparePlans, isPlanAtLeast e nextPlan.
 */
const PLAN_ORDER = Object.freeze([
  PLANS.DISC_INDIVIDUAL,
  PLANS.PERSONAL,
  PLANS.INSIDER,
  PLANS.PROFESSIONAL,
  PLANS.BUSINESS,
  PLANS.CORPORATION,
  PLANS.DIAMOND_CONSULTING,
]);

function normalizePlanValue(value = '') {
  const key = String(value || '').trim().toLowerCase();
  return PLAN_ALIASES[key] || null;
}

/** Normaliza um plano para a chave canônica. Fallback: PERSONAL. */
export function normalizePlan(plan = '') {
  return normalizePlanValue(plan) || PLANS.PERSONAL;
}

/** Resolve o plano a partir do objeto de acesso do usuário. */
export function resolvePlanFromAccess(access = {}) {
  const lifecycle = String(
    access?.lifecycleStatus || access?.user?.lifecycle_status || ''
  ).trim();

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

  const hasProEntitlement =
    Array.isArray(access?.entitlements) &&
    access.entitlements.some((item) =>
      String(item || '').toLowerCase().includes('report.pro')
    );
  if (hasProEntitlement) return PLANS.PROFESSIONAL;

  return PLANS.PERSONAL;
}

/** Compara dois planos na hierarquia. Retorna negativo, 0 ou positivo. */
export function comparePlans(left, right) {
  const leftIndex = PLAN_ORDER.indexOf(normalizePlan(left));
  const rightIndex = PLAN_ORDER.indexOf(normalizePlan(right));
  return leftIndex - rightIndex;
}

/** Retorna true se currentPlan é pelo menos minimumPlan na hierarquia. */
export function isPlanAtLeast(currentPlan, minimumPlan) {
  return comparePlans(currentPlan, minimumPlan) >= 0;
}

/** Retorna o próximo plano acima do atual na hierarquia. */
export function nextPlan(plan = PLANS.PERSONAL) {
  const normalized = normalizePlan(plan);
  const index = PLAN_ORDER.indexOf(normalized);
  if (index < 0 || index >= PLAN_ORDER.length - 1) return normalized;
  return PLAN_ORDER[index + 1];
}
