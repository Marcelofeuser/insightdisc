import { PLANS, resolvePlanFromAccess } from '../billing/planConfig.js';

export function resolvePanelModeFromPlan(access) {
  const plan = resolvePlanFromAccess(access);

  if (
    plan === PLANS.BUSINESS ||
    plan === PLANS.CORPORATION ||
    plan === PLANS.DIAMOND_CONSULTING
  ) {
    return 'business';
  }

  if (plan === PLANS.INSIDER || plan === PLANS.PROFESSIONAL) {
    return 'professional';
  }

  return 'personal';
}
