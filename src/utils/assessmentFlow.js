import { apiRequest, getApiToken } from '@/lib/apiClient';
import { isSuperAdminAccess } from '@/modules/auth/access-control';
import { consumeAssessmentCredit, getCreditsStatus } from '@/modules/credits';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

function devLog(message, payload = null) {
  if (!import.meta.env.DEV) return;
  if (payload) {
    // eslint-disable-next-line no-console
    console.info(`[assessmentFlow] ${message}`, payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(`[assessmentFlow] ${message}`);
}

function navigateTo(navigate, target, options = undefined) {
  if (typeof navigate !== 'function') return;
  navigate(target, options);
}

function getDevMockUserId() {
  if (typeof window === 'undefined') return '';
  return String(window.localStorage.getItem('disc_mock_user_email') || '').trim();
}

function isAuthError(error) {
  const status = Number(error?.status || 0);
  const code = String(
    error?.payload?.error || error?.payload?.reason || error?.message || ''
  ).toUpperCase();
  return (
    status === 401 ||
    status === 403 ||
    code.includes('API_AUTH_MISSING') ||
    code.includes('AUTH_REQUIRED') ||
    code.includes('UNAUTHORIZED')
  );
}

function isInsufficientCreditsError(error) {
  const status = Number(error?.status || 0);
  const code = String(
    error?.payload?.error || error?.payload?.reason || error?.message || ''
  ).toUpperCase();
  return status === 402 || code.includes('INSUFFICIENT_CREDITS');
}

export async function startSelfAssessment({
  apiBaseUrl = '',
  navigate,
  access = null,
  source = 'dashboard',
} = {}) {
  const hasApi = Boolean(String(apiBaseUrl || '').trim());
  const hasApiSession = Boolean(getApiToken());
  const shouldUseBase44Fallback = !hasApi || (Boolean(base44?.__isMock) && !hasApiSession);
  const loginPath = createPageUrl('Login');

  if (shouldUseBase44Fallback) {
    navigateTo(navigate, createPageUrl('PremiumAssessment'));
    return { ok: true, reason: 'BASE44_FALLBACK' };
  }

  const isAuthenticated =
    Boolean(access?.userId) || hasApiSession || Boolean(getDevMockUserId());
  if (!isAuthenticated) {
    navigateTo(navigate, loginPath);
    return { ok: false, reason: 'AUTH_REQUIRED' };
  }

  const isSuperAdmin = isSuperAdminAccess(access);

  try {
    const creditsStatus = await getCreditsStatus({ access });
    const credits = Number(creditsStatus?.credits || 0);

    devLog('credits resolved', {
      source: creditsStatus?.source || 'unknown',
      credits,
      isSuperAdmin,
    });

    const consumeResult = await consumeAssessmentCredit(access?.userId || access?.email || '', {
      access,
      amount: 1,
      dryRun: true,
    });

    if (!consumeResult.ok) {
      navigateTo(navigate, '/checkout');
      return { ok: false, reason: 'INSUFFICIENT_CREDITS' };
    }

    const payload = await apiRequest('/assessment/self/start', {
      method: 'POST',
      requireAuth: true,
    });

    const token = String(payload?.token || '').trim();
    if (!token) {
      throw new Error('SELF_ASSESSMENT_TOKEN_MISSING');
    }

    const params = new URLSearchParams({
      token,
      self: '1',
      from: String(source || 'dashboard'),
    });
    navigateTo(navigate, `/c/assessment?${params.toString()}`);
    return { ok: true, reason: 'STARTED', token };
  } catch (error) {
    if (isAuthError(error)) {
      navigateTo(navigate, loginPath);
      return { ok: false, reason: 'AUTH_REQUIRED' };
    }

    if (isInsufficientCreditsError(error)) {
      navigateTo(navigate, '/checkout');
      return { ok: false, reason: 'INSUFFICIENT_CREDITS' };
    }

    throw error;
  }
}
