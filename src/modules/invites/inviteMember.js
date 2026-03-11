import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { generateInviteToken, hashInviteToken } from './invite-token.js';

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

export async function inviteMember(email, options = {}) {
  const requestedEmail = normalizeEmail(email);
  const allowAnonymous = Boolean(options?.allowAnonymous);
  const fallbackAnonymousEmail = `invite-${Date.now()}@insightdisc.app`;
  const normalizedEmail = requestedEmail || (allowAnonymous ? fallbackAnonymousEmail : '');

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    const error = new Error('EMAIL_INVALID');
    error.code = 'EMAIL_INVALID';
    throw error;
  }

  const organizationId = String(options?.organizationId || '').trim();
  const apiBaseUrl = getApiBaseUrl();
  const baseUrl = options?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  if (apiBaseUrl) {
    if (!organizationId) {
      const error = new Error('ORGANIZATION_REQUIRED');
      error.code = 'ORGANIZATION_REQUIRED';
      throw error;
    }

    const created = await apiRequest('/assessments/create', {
      method: 'POST',
      requireAuth: true,
      body: {
        organizationId,
        ...(allowAnonymous ? {} : { candidateEmail: normalizedEmail }),
      },
    });
    const assessmentId = String(created?.assessment?.id || '').trim();
    if (!assessmentId) {
      throw new Error('ASSESSMENT_CREATE_FAILED');
    }

    const generated = await apiRequest('/assessments/generate-link', {
      method: 'POST',
      requireAuth: true,
      body: { assessmentId },
    });
    const token = String(generated?.token || '').trim();
    if (!token) {
      throw new Error('INVITE_TOKEN_MISSING');
    }

    return {
      ok: true,
      source: 'api',
      assessmentId,
      email: normalizedEmail,
      token,
      inviteUrl: `${baseUrl}/c/invite?token=${encodeURIComponent(token)}`,
    };
  }

  const user = await base44.auth.me();
  const token = generateInviteToken();
  const tokenHash = await hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * (Number(options?.expiresInDays || 7))).toISOString();

  const assessment = await base44.entities.Assessment.create({
    user_id: normalizedEmail,
    type: 'premium',
    status: 'pending',
    professional_id: user.id,
    workspace_id: user.active_workspace_id || organizationId || '',
    access_token: token,
    access_token_hash: tokenHash,
    invite_status: 'active',
    invite_expires_at: expiresAt,
  });

  return {
    ok: true,
    source: 'base44',
    assessmentId: assessment?.id || '',
    email: normalizedEmail,
    token,
    inviteUrl: `${baseUrl}/c/invite?token=${encodeURIComponent(token)}`,
  };
}
