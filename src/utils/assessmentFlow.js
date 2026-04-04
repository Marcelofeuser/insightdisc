import { apiRequest, getApiErrorMessage, getApiToken } from '@/lib/apiClient';
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

export function resolveSelfAssessmentStartErrorMessage(error, { apiBaseUrl = '' } = {}) {
  const status = Number(error?.status || 0);
  const code = String(
    error?.payload?.error || error?.payload?.reason || error?.code || error?.message || '',
  ).toUpperCase();

  if (status === 401 || code.includes('UNAUTHORIZED') || code.includes('AUTH_REQUIRED')) {
    return 'Sua sessão expirou. Faça login novamente para iniciar a avaliação.';
  }

  if (status === 403 || code.includes('FORBIDDEN')) {
    return 'Seu perfil atual não tem permissão para iniciar autoavaliação. Use uma conta Professional/Business.';
  }

  if (status === 402 || code.includes('INSUFFICIENT_CREDITS')) {
    return 'Você não possui créditos suficientes para iniciar uma nova avaliação.';
  }

  if (code.includes('LIMIT_REACHED')) {
    return 'O limite de avaliações do plano foi atingido para este workspace.';
  }

  return getApiErrorMessage(error, {
    apiBaseUrl,
    fallback: 'Não foi possível iniciar a avaliação neste momento.',
  });
}

export async function startSelfAssessment({
  apiBaseUrl = '',
  navigate,
  access = null,
  source = 'dashboard',
} = {}) {
  const runtimeMode = String(import.meta.env.MODE || '').trim().toLowerCase();
  const isE2eApiRuntime = runtimeMode.startsWith('e2e-api');
  const hasApi = Boolean(String(apiBaseUrl || '').trim());
  const hasApiSession = Boolean(getApiToken());
  const shouldUseBase44Fallback = !hasApi || (Boolean(base44?.__isMock) && !hasApiSession);
  const loginPath = createPageUrl('Login');
  const devMockEmail = getDevMockUserId();

  if (import.meta.env.DEV && isE2eApiRuntime && devMockEmail && !hasApiSession) {
    const isSuperAdmin = isSuperAdminAccess(access);

    let creditsStatus = null;
    try {
      creditsStatus = await getCreditsStatus({ access, requireAuth: false });
    } catch (creditsError) {
      devLog('DEV_E2E_BYPASS credits unavailable', creditsError);
      creditsStatus = null;
    }

    const credits = Number(creditsStatus?.credits || 0);
    devLog('DEV_E2E_BYPASS credits resolved', {
      source: creditsStatus?.source || 'unknown',
      credits,
      isSuperAdmin,
    });

    if (creditsStatus && !isSuperAdmin && credits < 1) {
      navigateTo(navigate, '/checkout');
      return { ok: false, reason: 'INSUFFICIENT_CREDITS' };
    }

    devLog('DEV_E2E_BYPASS', { source, email: devMockEmail });
    const bypassToken = `tok-e2e-bypass-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const params = new URLSearchParams({
      token: bypassToken,
      self: '1',
      from: String(source || 'dashboard'),
    });
    navigateTo(navigate, `/c/assessment?${params.toString()}`);
    return { ok: true, reason: 'DEV_E2E_BYPASS', token: bypassToken };
  }

  if (shouldUseBase44Fallback) {
    navigateTo(navigate, createPageUrl('PremiumAssessment'));
    return { ok: true, reason: 'BASE44_FALLBACK' };
  }

  const isAuthenticated =
    Boolean(access?.userId) || hasApiSession || Boolean(devMockEmail);
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

    const normalizedMessage = resolveSelfAssessmentStartErrorMessage(error, { apiBaseUrl });
    const wrappedError = new Error(normalizedMessage);
    wrappedError.status = Number(error?.status || 0);
    wrappedError.code = String(error?.code || error?.payload?.error || 'SELF_ASSESSMENT_START_FAILED');
    wrappedError.payload = {
      ...(error?.payload && typeof error.payload === 'object' ? error.payload : {}),
      message: normalizedMessage,
    };
    wrappedError.cause = error;
    throw wrappedError;
  }
}
