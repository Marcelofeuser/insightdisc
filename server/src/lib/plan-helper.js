/**
 * Mapeamento central de planos do InsightDISC
 * 
 * Nomes comerciais -> Chaves de permissão/tier
 * Personal     -> standard
 * Professional -> premium
 * Business     -> professional
 */

export const PLAN_TIERS = {
  PERSONAL: 'standard',
  PROFESSIONAL: 'premium',
  BUSINESS: 'professional',
};

/**
 * Normaliza uma string de plano para a chave interna do sistema.
 * @param {string} planName 
 * @returns {string}
 */
export function normalizePlan(planName) {
  if (!planName) return PLAN_TIERS.PERSONAL;
  const normalized = planName.toLowerCase().trim();
  
  if (normalized === 'personal' || normalized === 'standard') return PLAN_TIERS.PERSONAL;
  if (normalized === 'professional' || normalized === 'premium') return PLAN_TIERS.PROFESSIONAL;
  if (normalized === 'business') return PLAN_TIERS.BUSINESS;
  
  return PLAN_TIERS.PERSONAL;
}