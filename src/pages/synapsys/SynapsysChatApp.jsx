import { useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { analyzeWithSynapsys } from '@/lib/synapsysApi';
import {
  buildSynapsysUsageState,
  getSynapsysAccess,
  hasSynapsysAccess,
  mergeSynapsysAccessIntoUser,
  resolveSynapsysTier,
} from '@/modules/synapsys/access';
import SynapsysNeuralChat from '@/modules/synapsys/components/SynapsysNeuralChat';
import {
  buildSynapsysEntryPath,
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
} from '@/modules/synapsys/routes';
import { persistSynapsysIntent } from '@/modules/synapsys/session';

function buildAccessErrorResponse(error) {
  const message = String(
    error?.message ||
      'A Synapsys não conseguiu continuar a conversa com este nível de acesso.',
  ).trim();
  return `<strong>Fluxo interrompido.</strong><br />${message}`;
}

export default function SynapsysChatApp() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user, access, applyAuthenticatedUser } = useAuth();
  const [searchParams] = useSearchParams();

  const requestedPlan = String(searchParams.get('plan') || 'free').trim().toLowerCase();
  const synapsysAccess = getSynapsysAccess(access);
  const tier = resolveSynapsysTier(access);
  const usageState = useMemo(() => buildSynapsysUsageState(access), [access]);

  useEffect(() => {
    persistSynapsysIntent(requestedPlan === 'premium' ? 'premium' : 'free');
  }, [requestedPlan]);

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#02040b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-200" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to={buildSynapsysSignupPath({
          intent: requestedPlan === 'premium' ? 'premium' : 'free',
          next: `/chat/app?plan=${encodeURIComponent(requestedPlan === 'premium' ? 'premium' : 'free')}`,
        })}
      />
    );
  }

  if (!hasSynapsysAccess(user, access)) {
    return (
      <Navigate
        replace
        to={requestedPlan === 'premium' ? buildSynapsysPricingPath({ plan: 'premium' }) : buildSynapsysEntryPath()}
      />
    );
  }

  const handleConsumeMessage = () => {
    if (tier === 'premium') {
      return { allowed: true, state: usageState };
    }

    return {
      allowed: Number(usageState.remaining || 0) > 0,
      state: usageState,
    };
  };

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

      const accessErrorCode = String(error?.code || '').trim().toUpperCase();
      if (
        accessErrorCode === 'SYNAPSYS_DAILY_LIMIT_REACHED' ||
        accessErrorCode === 'SYNAPSYS_ACCESS_REQUIRED' ||
        accessErrorCode === 'SYNAPSYS_ACCESS_BLOCKED'
      ) {
        return {
          ok: false,
          response: buildAccessErrorResponse(error),
          synapsysAccess: error?.synapsysAccess || synapsysAccess,
        };
      }

      throw error;
    }
  };

  return (
    <SynapsysNeuralChat
      tier={tier === 'premium' ? 'premium' : 'free'}
      usageState={usageState}
      onConsumeMessage={handleConsumeMessage}
      onUpgradeRequest={() => navigate(buildSynapsysPricingPath({ plan: 'premium' }))}
      onRewardedUnlock={null}
      rewardedReady={false}
      analyze={handleAnalyze}
    />
  );
}
