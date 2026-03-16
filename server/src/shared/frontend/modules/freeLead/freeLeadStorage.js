const FREE_LEAD_STORAGE_KEY = 'disc_free_lead';

function safeGet(key) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // no-op
  }
}

function safeRemove(key) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

function normalizeLead(input = {}) {
  const name = String(input?.name || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  const consentLgpd = Boolean(input?.consentLgpd);
  const createdAt = input?.createdAt || new Date().toISOString();

  if (!name || !email || !consentLgpd) {
    return null;
  }

  return { name, email, consentLgpd, createdAt };
}

export function setFreeLead({ name, email, consent = false } = {}) {
  const lead = normalizeLead({
    name,
    email,
    consentLgpd: consent,
  });

  if (!lead) {
    return null;
  }

  safeSet(FREE_LEAD_STORAGE_KEY, JSON.stringify(lead));

  // Legacy keys kept for backward compatibility with existing flow/components.
  safeSet('disc_free_name', lead.name);
  safeSet('disc_free_email', lead.email);
  safeSet('disc_lgpd_ok', '1');
  safeSet('disc_free_started_at', lead.createdAt);
  safeSet('disc_free_lgpd', 'true');
  safeSet('disc_free_created_at', lead.createdAt);
  safeSet('disc_consent_given', 'true');

  return lead;
}

export function getFreeLead() {
  const directRaw = safeGet(FREE_LEAD_STORAGE_KEY);
  if (directRaw) {
    try {
      const parsed = JSON.parse(directRaw);
      const normalized = normalizeLead(parsed);
      if (normalized) return normalized;
    } catch {
      // continue to legacy fallback
    }
  }

  const legacyName = safeGet('disc_free_name');
  const legacyEmail = safeGet('disc_free_email');
  const legacyConsent =
    safeGet('disc_lgpd_ok') === '1' || safeGet('disc_free_lgpd') === 'true';

  if (legacyName && legacyEmail && legacyConsent) {
    return setFreeLead({
      name: legacyName,
      email: legacyEmail,
      consent: true,
    });
  }

  return null;
}

export function clearFreeLead() {
  safeRemove(FREE_LEAD_STORAGE_KEY);
  safeRemove('disc_free_name');
  safeRemove('disc_free_email');
  safeRemove('disc_lgpd_ok');
  safeRemove('disc_free_started_at');
  safeRemove('disc_free_lgpd');
  safeRemove('disc_free_created_at');
}

export { FREE_LEAD_STORAGE_KEY };
