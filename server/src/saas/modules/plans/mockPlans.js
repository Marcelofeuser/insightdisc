// Mock de planos SaaS isolado

const PLANS = {
  PERSONAL: {
    id: 'personal',
    name: 'Personal',
    limits: { assessments: 3 },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    limits: { assessments: 50 },
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    limits: { assessments: null },
  },
};

// Compatibilidade retroativa: free → personal, pro → professional
const PLAN_ALIASES = {
  FREE: 'PERSONAL',
  PRO: 'PROFESSIONAL',
  PROFISSIONAL: 'PROFESSIONAL',
  PREMIUM: 'BUSINESS',
  INSIDER: 'PROFESSIONAL',
  DIAMOND: 'BUSINESS',
  ENTERPRISE: 'BUSINESS',
};

function getMockPlanById(planId) {
  const key = (planId || '').toUpperCase();
  const resolved = PLAN_ALIASES[key] || key;
  return PLANS[resolved] || PLANS.PERSONAL;
}

export { PLANS, getMockPlanById };
