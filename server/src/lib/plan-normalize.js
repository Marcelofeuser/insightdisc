// Centraliza normalização e mapeamento de planos para o backend
/**
 * Mapeamento de Tiers (Baseado em README_TESTES.md):
 * personal     -> standard
 * professional -> premium
 * business     -> professional
 */

const KNOWN_PLANS = ['personal', 'insider', 'professional', 'business', 'diamond', 'enterprise', 'standard', 'premium'];

function normalizePlan(value = '') {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '';

  // Common aliases and Portuguese variants
  if (['personal', 'free', 'starter', 'pessoa'].includes(key)) return 'personal';
  if (['insider', 'personal-pro', 'personalpro'].includes(key)) return 'insider';
  if (['professional', 'profissional', 'pro'].includes(key)) return 'professional';
  // legacy 'premium' historically treated like business in frontend/server
  if (['premium'].includes(key)) return 'premium';
  if (['business', 'empresa'].includes(key)) return 'business';
  if (['diamond'].includes(key)) return 'diamond';
  if (['enterprise'].includes(key)) return 'enterprise';

  if (KNOWN_PLANS.includes(key)) return key;
  return '';
}

function mapPlanForFeatures(plan = '') {
  const normalized = normalizePlan(plan);
  if (!normalized) return 'personal';
  if (normalized === 'personal' || normalized === 'standard') return 'standard';
  if (normalized === 'professional' || normalized === 'premium' || normalized === 'insider') return 'premium';
  if (['business', 'diamond', 'enterprise', 'professional_tier'].includes(normalized)) return 'professional';
  return 'standard';
}

function isPaidPlan(plan = '') {
  const normalized = normalizePlan(plan);
  return ['insider', 'professional', 'business', 'diamond', 'enterprise'].includes(normalized);
}

function normalizePlanToDbEnum(plan = '') {
  const mapped = mapPlanForFeatures(plan);
  if (mapped === 'professional') return 'BUSINESS';
  if (mapped === 'premium') return 'PROFESSIONAL';
  if (mapped === 'standard') return 'PERSONAL';
  return 'PERSONAL';
}

export { KNOWN_PLANS, normalizePlan, mapPlanForFeatures, isPaidPlan, normalizePlanToDbEnum };
