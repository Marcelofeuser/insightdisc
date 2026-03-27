// Catálogo de features por plano SaaS

const FEATURE_CATALOG = {
  personal: {
    ai_coach: false,
    premium_pdf: false,
    archetypes_full: false,
    profile_comparison: false,
    team_features: false,
  },
  professional: {
    ai_coach: true,
    premium_pdf: true,
    archetypes_full: true,
    profile_comparison: true,
    team_features: false,
  },
  business: {
    ai_coach: true,
    premium_pdf: true,
    archetypes_full: true,
    profile_comparison: true,
    team_features: true,
  },
};

const FEATURE_MIN_PLAN = {
  ai_coach: 'professional',
  premium_pdf: 'professional',
  archetypes_full: 'professional',
  profile_comparison: 'professional',
  team_features: 'business',
};

function getFeaturesForPlan(planId) {
  const key = (planId || 'personal').toLowerCase();
  return FEATURE_CATALOG[key] || FEATURE_CATALOG.personal;
}

function getMinPlanForFeature(featureKey) {
  return FEATURE_MIN_PLAN[featureKey] || 'professional';
}

export { FEATURE_CATALOG, FEATURE_MIN_PLAN, getFeaturesForPlan, getMinPlanForFeature };
