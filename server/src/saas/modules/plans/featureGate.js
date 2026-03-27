// Gate central de features SaaS
import { getAccountPlan } from './planService.js';
import { getFeaturesForPlan, getMinPlanForFeature } from './featureCatalog.js';
import { db } from '../../services/saasDb.js';

function canUseFeature(accountId, featureKey) {
  try {
    const account = db.accounts.find((a) => a.id === String(accountId));
    if (!account) {
      return { ok: false, reason: 'ACCOUNT_NOT_FOUND', feature: featureKey, plan: 'personal' };
    }

    const plan = getAccountPlan(account);
    const features = getFeaturesForPlan(plan.id);
    const allowed = Boolean(features[featureKey]);

    if (!allowed) {
      const minPlan = getMinPlanForFeature(featureKey);
      return {
        ok: false,
        reason: 'FEATURE_BLOCKED',
        feature: featureKey,
        plan: plan.id,
        requiredPlan: minPlan,
        message: `Este recurso está disponível apenas no plano ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} ou superior.`,
      };
    }

    return { ok: true, feature: featureKey, plan: plan.id };
  } catch (err) {
    // Fail closed: se erro, bloqueia por segurança
    return { ok: false, reason: 'GATE_ERROR', feature: featureKey, plan: 'personal' };
  }
}

export { canUseFeature };
