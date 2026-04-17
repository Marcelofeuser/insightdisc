cat > ~/Projects/insightdisc/src/pages/synapsys/SynapsysChatApp.jsx << 'EOF'
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { analyzeWithSynapsys } from '@/lib/synapsysApi';
import { useAuth } from '@/lib/AuthContext';
import {
  buildSynapsysUsageState,
  mergeSynapsysAccessIntoUser,
  fetchSynapsysAccess,
  canUseSynapsysChat,
} from '@/modules/synapsys/access';
import SynapsysNeuralChat from '@/modules/synapsys/components/SynapsysNeuralChat';
import {
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
  buildSynapsysEntryPath,
} from '@/modules/synapsys/routes';
import { persistSynapsysIntent } from '@/modules/synapsys/session';

function buildAccessErrorResponse(error) {
  const message = String(error?.message || 'A Synapsys não conseguiu continuar.').trim();
  return `<strong>Fluxo interrompido.</strong><br />${message}`;
}

export default function SynapsysChatApp() {
  const [synapsysAccess, setSynapsysAccess] = useState(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user, applyAuthenticatedUser } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPlan = String(searchParams.get('plan') || 'free').trim().toLowerCase();

  useEffect(() => {
    persistSynapsysIntent(requestedPlan === 'premium' ? 'premium' : 'free');
  }, [requestedPlan]);

  useEffect(() => {
    let active = true;
    async function loadAccess() {
      if (!user?.id) { setLoadingAccess(false); return; }
      const acc = await fetchSynapsysAccess(user.id);
      if (!active) return;
      setSynapsysAccess(acc);
      setLoadingAccess(false);
    }
    loadAccess();
    return () => { active = false; };
  }, [user?.id]);

  const tier = synapsysAccess?.isPremium ? 'premium' : 'free';
  const usageState = useMemo(() => canUseSynapsysChat(synapsysAccess), [synapsysAccess]);

  if (isLoadingAuth || loadingAccess) {
    return (
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#030a12',color:'#fff'}}>
        Carregando Synapsys...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = buildSynapsysSignupPath({
      intent: requestedPlan === 'premium' ? 'premium' : 'free',
      next: `/chat/app?plan=${requestedPlan}`,
    });
    return null;
  }

  if (!synapsysAccess?.hasAccess) {
    window.location.href = requestedPlan === 'premium'
      ? buildSynapsysPricingPath({ plan: 'premium' })
      : buildSynapsysEntryPath();
    return null;
  }

  const handleConsumeMessage = () => ({
    allowed: tier === 'premium' || Number(usageState?.remaining || 0) > 0,
    state: usageState,
  });

  const handleAnalyze = async (payload) => {
    try {
      const result = await analyzeWithSynapsys(payload);
      if (result?.synapsysAccess && user) {
        applyAuthenticatedUser(mergeSynapsysAccessIntoUser(user, result.synapsysAccess));
      }
      return result;
    } catch (error) {
      if (error?.synapsysAccess && user) {
        applyAuthenticatedUser(mergeSynapsysAccessIntoUser(user, error.synapsysAccess));
      }
      const code = String(error?.code || '').toUpperCase();
      if (['SYNAPSYS_DAILY_LIMIT_REACHED','SYNAPSYS_ACCESS_REQUIRED','SYNAPSYS_ACCESS_BLOCKED'].includes(code)) {
        return { ok: false, response: buildAccessErrorResponse(error), synapsysAccess };
      }
      throw error;
    }
  };

  return (
    <SynapsysNeuralChat
      tier={tier}
      usageState={usageState}
      onConsumeMessage={handleConsumeMessage}
      onUpgradeRequest={() => navigate(buildSynapsysPricingPath({ plan: 'premium' }))}
      onRewardedUnlock={null}
      rewardedReady={false}
      analyze={handleAnalyze}
    />
  );
}
EOF