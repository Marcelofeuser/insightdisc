/**
 * InsightDISC V3.0 — Feature flags e configuração de planos
 *
 * Ativar V3 em teste: VITE_V3_PLAN_DIFFERENTIATION=true no .env.local
 * Em produção: mantenha false até validar todos os planos
 */

const V3_PLAN_DIFF_ENABLED =
  String(import.meta.env.VITE_V3_PLAN_DIFFERENTIATION || '').trim().toLowerCase() === 'true';

export const V3_FLAGS = Object.freeze({
  /** Liga diferenciação real de painel por plano (V3.0). */
  PLAN_DIFFERENTIATION: V3_PLAN_DIFF_ENABLED,
});

// ---------------------------------------------------------------------------
// Chaves canônicas de plano (V3.0)
// ---------------------------------------------------------------------------
export const V3_PLAN_KEYS = Object.freeze({
  DISC_INDIVIDUAL: 'disc_individual',
  PERSONAL: 'personal',
  INSIDER: 'insider',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  CORPORATION: 'corporation',
  DIAMOND_CONSULTING: 'diamond_consulting',
});

/**
 * Hierarquia ordenada de planos (menor → maior).
 * Use para comparações de tier.
 */
export const V3_PLAN_ORDER = Object.freeze([
  V3_PLAN_KEYS.DISC_INDIVIDUAL,
  V3_PLAN_KEYS.PERSONAL,
  V3_PLAN_KEYS.INSIDER,
  V3_PLAN_KEYS.PROFESSIONAL,
  V3_PLAN_KEYS.BUSINESS,
  V3_PLAN_KEYS.CORPORATION,
  V3_PLAN_KEYS.DIAMOND_CONSULTING,
]);

/**
 * Mapa de aliases — todos os strings legados/variantes → chave canônica V3.
 * Nunca mais colapsamos corporation/diamond em business.
 */
export const V3_PLAN_ALIASES = Object.freeze({
  disc: V3_PLAN_KEYS.DISC_INDIVIDUAL,
  disc_individual: V3_PLAN_KEYS.DISC_INDIVIDUAL,
  personal: V3_PLAN_KEYS.PERSONAL,
  free: V3_PLAN_KEYS.PERSONAL,
  starter: V3_PLAN_KEYS.PERSONAL,
  user: V3_PLAN_KEYS.PERSONAL,
  insider: V3_PLAN_KEYS.INSIDER,
  professional: V3_PLAN_KEYS.PROFESSIONAL,
  pro: V3_PLAN_KEYS.PROFESSIONAL,
  premium: V3_PLAN_KEYS.PROFESSIONAL,
  business: V3_PLAN_KEYS.BUSINESS,
  enterprise: V3_PLAN_KEYS.BUSINESS,
  corporation: V3_PLAN_KEYS.CORPORATION,
  business_corporation: V3_PLAN_KEYS.CORPORATION,
  diamond: V3_PLAN_KEYS.DIAMOND_CONSULTING,
  diamond_consulting: V3_PLAN_KEYS.DIAMOND_CONSULTING,
});

// ---------------------------------------------------------------------------
// Metadados por plano
// ---------------------------------------------------------------------------
export const V3_PLAN_META = Object.freeze({
  [V3_PLAN_KEYS.DISC_INDIVIDUAL]: {
    label: 'Disc Individual',
    badge: 'DISC',
    color: 'slate',
    description: 'Acesso ao relatório DISC individual.',
  },
  [V3_PLAN_KEYS.PERSONAL]: {
    label: 'Personal',
    badge: 'PERSONAL',
    color: 'sky',
    description: 'Uso individual com continuidade e acompanhamento básico.',
  },
  [V3_PLAN_KEYS.INSIDER]: {
    label: 'Insider',
    badge: 'INSIDER',
    color: 'teal',
    description: 'Entendimento guiado, leitura complementar e comparação básica.',
  },
  [V3_PLAN_KEYS.PROFESSIONAL]: {
    label: 'Professional',
    badge: 'PRO',
    color: 'indigo',
    description: 'Profundidade, IA aplicada e recursos avançados individuais.',
  },
  [V3_PLAN_KEYS.BUSINESS]: {
    label: 'Business',
    badge: 'BUSINESS',
    color: 'violet',
    description: 'Uso técnico/profissional com profundidade operacional.',
  },
  [V3_PLAN_KEYS.CORPORATION]: {
    label: 'Business Corporation',
    badge: 'CORP',
    color: 'blue',
    description: 'Plano empresarial com equipe, RH, analytics e White Label incluso.',
  },
  [V3_PLAN_KEYS.DIAMOND_CONSULTING]: {
    label: 'Diamond Consulting',
    badge: 'DIAMOND',
    color: 'amber',
    description: 'Premium consultivo com Consultório, Estratégia Executiva e White Label avançado.',
  },
});

// ---------------------------------------------------------------------------
// Funções utilitárias
// ---------------------------------------------------------------------------

/** Normaliza qualquer string de plano para a chave canônica V3. */
export function v3NormalizePlan(raw = '') {
  const key = String(raw || '').trim().toLowerCase();
  return V3_PLAN_ALIASES[key] || V3_PLAN_KEYS.PERSONAL;
}

/** Compara dois planos. Retorna negativo, 0 ou positivo (como sort). */
export function v3ComparePlans(a, b) {
  const ai = V3_PLAN_ORDER.indexOf(v3NormalizePlan(a));
  const bi = V3_PLAN_ORDER.indexOf(v3NormalizePlan(b));
  return ai - bi;
}

/** Retorna true se currentPlan >= minimumPlan na hierarquia. */
export function v3IsPlanAtLeast(currentPlan, minimumPlan) {
  return v3ComparePlans(currentPlan, minimumPlan) >= 0;
}

/** Retorna o próximo plano acima do atual. */
export function v3NextPlan(plan) {
  const normalized = v3NormalizePlan(plan);
  const idx = V3_PLAN_ORDER.indexOf(normalized);
  if (idx < 0 || idx >= V3_PLAN_ORDER.length - 1) return normalized;
  return V3_PLAN_ORDER[idx + 1];
}

/**
 * Resolve o plano V3 a partir do objeto de acesso do usuário.
 * Prioridade: lifecycleStatus super_admin → plan direto → lifecycle premium → entitlement.
 */
export function v3ResolvePlanFromAccess(access = {}) {
  const lifecycle = String(
    access?.lifecycleStatus || access?.user?.lifecycle_status || ''
  ).trim();

  if (lifecycle === 'super_admin') return V3_PLAN_KEYS.DIAMOND_CONSULTING;

  const raw =
    access?.plan ||
    access?.user?.plan ||
    access?.user?.workspace_plan ||
    access?.user?.subscription_plan ||
    '';

  const directPlan = raw ? v3NormalizePlan(raw) : null;
  if (directPlan && directPlan !== V3_PLAN_KEYS.PERSONAL) return directPlan;
  // PERSONAL pode ser correto também — mas só confia se tinha algo explícito
  if (directPlan === V3_PLAN_KEYS.PERSONAL && raw) return directPlan;

  const hasPremiumLifecycle = lifecycle === 'customer_active';
  if (hasPremiumLifecycle) return V3_PLAN_KEYS.PROFESSIONAL;

  const hasProEntitlement =
    Array.isArray(access?.entitlements) &&
    access.entitlements.some((item) =>
      String(item || '').toLowerCase().includes('report.pro')
    );
  if (hasProEntitlement) return V3_PLAN_KEYS.PROFESSIONAL;

  return V3_PLAN_KEYS.PERSONAL;
}

/**
 * Retorna true se o plano inclui White Label (incluso, não como add-on).
 */
export function v3HasWhiteLabelIncluded(plan, user = {}) {
  const normalized = v3NormalizePlan(plan);
  return (
    normalized === V3_PLAN_KEYS.CORPORATION ||
    normalized === V3_PLAN_KEYS.DIAMOND_CONSULTING ||
    user?.whiteLabelAddon === true
  );
}
