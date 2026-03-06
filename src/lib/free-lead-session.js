import {
  FREE_LEAD_STORAGE_KEY,
  getFreeLead,
  setFreeLead,
} from '@/modules/freeLead/freeLeadStorage';

export function readFreeLeadSession() {
  return getFreeLead();
}

export function writeFreeLeadSession({ name, email, consentLgpd = true } = {}) {
  const lead = setFreeLead({
    name,
    email,
    consent: Boolean(consentLgpd),
  });

  if (!lead) return null;
  return lead;
}

export function hydrateLeadFromQuery(name, email) {
  const trimmedName = String(name || '').trim();
  const trimmedEmail = String(email || '').trim().toLowerCase();
  if (!trimmedName || !trimmedEmail) return null;
  return writeFreeLeadSession({ name: trimmedName, email: trimmedEmail, consentLgpd: true });
}

export { FREE_LEAD_STORAGE_KEY };
