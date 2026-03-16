import { hashInviteToken } from './invite-token.js';

function parseDate(value) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return null;
  return ts;
}

function normalizeStatus(assessment) {
  if (!assessment) {
    return { status: 'invalid', reason: 'not_found' };
  }

  const now = Date.now();
  const expiresAt = parseDate(assessment.invite_expires_at);
  const isExpired =
    assessment?.invite_status === 'expired' ||
    assessment?.status === 'expired' ||
    (expiresAt !== null && expiresAt <= now);

  if (isExpired) {
    return { status: 'expired', reason: 'expired' };
  }

  const isUsed =
    assessment?.status === 'completed' ||
    assessment?.invite_status === 'used' ||
    Boolean(assessment?.invite_used_at || assessment?.used_at);

  if (isUsed) {
    return { status: 'used', reason: 'already_used' };
  }

  return { status: 'valid', reason: 'ok' };
}

function pickLatest(results = []) {
  if (!Array.isArray(results) || results.length === 0) return null;
  return [...results].sort((a, b) => {
    const aTime = parseDate(a?.created_date) || 0;
    const bTime = parseDate(b?.created_date) || 0;
    return bTime - aTime;
  })[0];
}

export async function validateInviteToken(token, assessmentEntity) {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    return { status: 'invalid', reason: 'missing_token', assessment: null };
  }

  const tokenHash = await hashInviteToken(rawToken);

  let byHash = [];
  if (tokenHash) {
    byHash = await assessmentEntity.filter({ access_token_hash: tokenHash });
  }

  let source = 'hash';
  let assessment = pickLatest(byHash);
  if (!assessment) {
    const byLegacyToken = await assessmentEntity.filter({ access_token: rawToken });
    assessment = pickLatest(byLegacyToken);
    source = 'legacy';
  }

  const normalized = normalizeStatus(assessment);
  return {
    status: normalized.status,
    reason: normalized.reason,
    assessment,
    source,
    tokenHash,
  };
}
