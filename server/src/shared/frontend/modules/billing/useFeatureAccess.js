import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getPlanLimits } from './planLimits.js';
import {
  evaluateFeatureAccess,
  FEATURE_KEYS,
  hasFeatureAccess,
} from './planGuard.js';
import { resolvePlanFromAccess } from './planConfig.js';

export function useFeatureAccess() {
  const { access } = useAuth();

  const plan = useMemo(
    () => resolvePlanFromAccess(access),
    [access],
  );

  const limits = useMemo(() => getPlanLimits(plan), [plan]);

  const checkFeature = (feature, options = {}) =>
    evaluateFeatureAccess(access, feature, {
      ...options,
      plan: options?.plan || plan,
    });

  const hasFeature = (feature, options = {}) =>
    hasFeatureAccess(access, feature, {
      ...options,
      plan: options?.plan || plan,
    });

  return {
    access,
    plan,
    limits,
    featureKeys: FEATURE_KEYS,
    checkFeature,
    hasFeature,
  };
}
