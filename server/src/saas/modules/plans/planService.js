// Serviço de planos SaaS isolado
import { getMockPlanById } from './mockPlans.js';

function getAccountPlan(account) {
  // Simula plano por propriedade ou default FREE
  return getMockPlanById(account?.planId || account?.plan_id || 'personal');
}

export { getAccountPlan };
