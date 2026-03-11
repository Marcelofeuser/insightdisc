import { apiRequest } from '@/lib/apiClient';
import { isSuperAdminAccess } from '@/modules/auth/access-control';
import {
  buildCreditConsumptionResult,
  canConsumeCredits,
  resolveCreditsBalance,
} from './creditsEngine.js';

export async function getCreditsStatus({ access = {}, requireAuth = true } = {}) {
  if (isSuperAdminAccess(access)) {
    return {
      ok: true,
      credits: Number.POSITIVE_INFINITY,
      balance: Number.POSITIVE_INFINITY,
      source: 'super-admin-bypass',
    };
  }

  try {
    const payload = await apiRequest('/assessment/credits', {
      method: 'GET',
      requireAuth,
    });
    const balance = resolveCreditsBalance(payload);
    return {
      ok: true,
      credits: balance,
      balance,
      source: '/assessment/credits',
    };
  } catch (error) {
    if (![404, 405].includes(Number(error?.status || 0))) {
      throw error;
    }
  }

  const mePayload = await apiRequest('/auth/me', {
    method: 'GET',
    requireAuth,
  });
  const balance = resolveCreditsBalance(mePayload);
  return {
    ok: true,
    credits: balance,
    balance,
    source: '/auth/me',
  };
}

export async function consumeAssessmentCredit(userId, options = {}) {
  const normalizedUserId = String(userId || '').trim();
  const amount = Number(options?.amount || 1) || 1;
  const access = options?.access || {};
  const dryRun = options?.dryRun !== false;

  const status = await getCreditsStatus({ access, requireAuth: true });
  const validation = canConsumeCredits({
    balance: status?.balance,
    amount,
    isUnlimited: isSuperAdminAccess(access),
  });

  if (!validation.ok) {
    return buildCreditConsumptionResult({
      ok: false,
      userId: normalizedUserId,
      balance: validation.balance,
      consumed: 0,
      remaining: validation.remaining,
      reason: 'insufficient_credits',
      source: status?.source || 'credits-status',
    });
  }

  if (dryRun) {
    return buildCreditConsumptionResult({
      ok: true,
      userId: normalizedUserId,
      balance: validation.balance,
      consumed: 0,
      remaining: validation.remaining,
      reason: 'validated',
      source: status?.source || 'credits-status',
    });
  }

  return buildCreditConsumptionResult({
    ok: true,
    userId: normalizedUserId,
    balance: validation.balance,
    consumed: amount,
    remaining: validation.remaining,
    reason: 'consumed',
    source: 'client-estimation',
  });
}
