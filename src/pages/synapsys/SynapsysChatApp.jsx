import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { analyzeWithSynapsys } from '@/lib/synapsysApi';
import { resolvePlanFromAccess } from '@/modules/billing/planConfig';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';
import SynapsysNeuralChat from '@/modules/synapsys/components/SynapsysNeuralChat';
import {
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
} from '@/modules/synapsys/routes';
import {
  consumeSynapsysFreeMessage,
  grantSynapsysRewardedBonus,
  persistSynapsysIntent,
  readSynapsysUsage,
  resolveSynapsysUserKey,
} from '@/modules/synapsys/session';

export default function SynapsysChatApp() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user, access } = useAuth();
  const [searchParams] = useSearchParams();

  const requestedPlan = String(searchParams.get('plan') || 'free').trim().toLowerCase();
  const resolvedPlan = resolvePlanFromAccess(access);
  const isPremium = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.AI_LAB);
  const tier = isPremium ? 'premium' : 'free';
  const userKey = resolveSynapsysUserKey(user, access);
  const [usageState, setUsageState] = useState(() => readSynapsysUsage(userKey, tier));

  useEffect(() => {
    persistSynapsysIntent(requestedPlan === 'premium' ? 'premium' : 'free');
  }, [requestedPlan]);

  useEffect(() => {
    setUsageState(readSynapsysUsage(userKey, tier));
  }, [userKey, tier]);

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

  const handleConsumeMessage = () => {
    if (tier === 'premium') {
      return { allowed: true, state: usageState };
    }

    const result = consumeSynapsysFreeMessage(userKey);
    setUsageState(result.state);
    return result;
  };

  const handleRewardedUnlock = () => {
    if (tier === 'premium') return;
    const nextState = grantSynapsysRewardedBonus(userKey);
    setUsageState(nextState);
  };

  return (
    <SynapsysNeuralChat
      tier={tier}
      usageState={usageState}
      onConsumeMessage={handleConsumeMessage}
      onUpgradeRequest={() => navigate(buildSynapsysPricingPath({ plan: 'premium' }))}
      onRewardedUnlock={handleRewardedUnlock}
      rewardedReady={false}
      analyze={analyzeWithSynapsys}
    />
  );
}
