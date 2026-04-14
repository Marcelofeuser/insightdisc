import { useAuth } from '@/lib/AuthContext';
import { analyzeWithSynapsys } from '@/lib/synapsysApi';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';
import { resolvePlanFromAccess } from '@/modules/billing/planConfig';
import SynapsysChatExperience from '@/modules/synapsys/components/SynapsysChatExperience';

export default function SynapsysAI() {
  const { access } = useAuth();
  const resolvedPlan = resolvePlanFromAccess(access) || 'personal';
  const canUseSynapsys = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.AI_LAB);

  return (
    <SynapsysChatExperience
      tier={canUseSynapsys ? 'premium' : 'locked'}
      planLabel={resolvedPlan}
      analyze={analyzeWithSynapsys}
    />
  );
}
