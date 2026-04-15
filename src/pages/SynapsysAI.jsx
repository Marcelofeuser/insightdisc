import { useAuth } from '@/lib/AuthContext';
import { analyzeWithSynapsys } from '@/lib/synapsysApi';
import { hasSynapsysAccess, resolveSynapsysTier } from '@/modules/synapsys/access';
import SynapsysChatExperience from '@/modules/synapsys/components/SynapsysChatExperience';

export default function SynapsysAI() {
  const { access } = useAuth();
  const resolvedTier = resolveSynapsysTier(access);
  const canUseSynapsys = hasSynapsysAccess(access);

  return (
    <SynapsysChatExperience
      tier={canUseSynapsys ? resolvedTier : 'locked'}
      planLabel={resolvedTier === 'premium' ? 'Synapsys premium' : 'Synapsys free'}
      analyze={analyzeWithSynapsys}
    />
  );
}
