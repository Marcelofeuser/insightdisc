import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { resolvePlanFromAccess } from '@/modules/billing/planConfig';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';
import { sanitizeNextPath } from '@/modules/auth/next-path';
import { resolveSynapsysCheckoutTarget } from '@/modules/synapsys/runtime';
import {
  buildSynapsysAppPath,
  buildSynapsysSignupPath,
} from '@/modules/synapsys/routes';
import { persistSynapsysIntent } from '@/modules/synapsys/session';

export default function SynapsysSubscribePage() {
  const { isAuthenticated, isLoadingAuth, access } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = sanitizeNextPath(
    searchParams.get('returnTo'),
    buildSynapsysAppPath({ plan: 'premium' }),
  );
  const resolvedPlan = resolvePlanFromAccess(access);
  const alreadyPremium = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.AI_LAB);
  const checkoutTarget = resolveSynapsysCheckoutTarget({ returnTo });

  useEffect(() => {
    persistSynapsysIntent('premium');
  }, []);

  useEffect(() => {
    if (
      !isLoadingAuth &&
      isAuthenticated &&
      !alreadyPremium &&
      /^https?:\/\//i.test(checkoutTarget)
    ) {
      window.location.assign(checkoutTarget);
    }
  }, [alreadyPremium, checkoutTarget, isAuthenticated, isLoadingAuth]);

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
          intent: 'premium',
          next: `/subscribe?returnTo=${encodeURIComponent(returnTo)}`,
        })}
      />
    );
  }

  if (alreadyPremium) {
    return <Navigate replace to={returnTo} />;
  }

  if (/^https?:\/\//i.test(checkoutTarget)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#02040b]">
        <div className="text-center text-white">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/72">Synapsys</p>
          <h1 className="mt-3 text-3xl font-semibold">Redirecionando para a contratação premium</h1>
          <p className="mt-4 text-sm text-white/64">
            Estamos abrindo o checkout seguro para concluir a ativação da camada premium.
          </p>
        </div>
      </div>
    );
  }

  return <Navigate replace to={checkoutTarget} />;
}
