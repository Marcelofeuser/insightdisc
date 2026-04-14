const metaEnv =
  typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env : {};

export const SYNAPSYS_HOST = String(
  metaEnv.VITE_SYNAPSYS_HOST || 'synapsys.insightdisc.com',
)
  .trim()
  .toLowerCase();

export const SYNAPSYS_PREMIUM_PRICE_INTRO = String(
  metaEnv.VITE_SYNAPSYS_PREMIUM_PRICE_INTRO || 'R$ 59,90',
).trim();

export const SYNAPSYS_PREMIUM_PRICE_RENEWAL = String(
  metaEnv.VITE_SYNAPSYS_PREMIUM_PRICE_RENEWAL || 'R$ 79,90',
).trim();

export const SYNAPSYS_FREE_DAILY_LIMIT = Math.max(
  1,
  Number(metaEnv.VITE_SYNAPSYS_FREE_DAILY_LIMIT || 10) || 10,
);

export const SYNAPSYS_REWARDED_BONUS = Math.max(
  1,
  Number(metaEnv.VITE_SYNAPSYS_REWARDED_BONUS || 5) || 5,
);

export const SYNAPSYS_PREMIUM_CHECKOUT_URL = String(
  metaEnv.VITE_SYNAPSYS_PREMIUM_CHECKOUT_URL || '',
).trim();

export const SYNAPSYS_PREMIUM_FALLBACK_PLAN = String(
  metaEnv.VITE_SYNAPSYS_PREMIUM_FALLBACK_PLAN || 'insider',
)
  .trim()
  .toLowerCase();

export function getRuntimeHostname() {
  if (typeof window === 'undefined') return '';
  return String(window.location?.hostname || '').trim().toLowerCase();
}

export function isSynapsysRuntime() {
  const hostname = getRuntimeHostname();
  if (!hostname) return false;
  return hostname === SYNAPSYS_HOST || hostname.startsWith('synapsys.');
}

export function resolveSynapsysCheckoutTarget({ returnTo = '' } = {}) {
  if (SYNAPSYS_PREMIUM_CHECKOUT_URL) {
    try {
      const target = new URL(SYNAPSYS_PREMIUM_CHECKOUT_URL);
      target.searchParams.set('source', 'synapsys');
      if (String(returnTo || '').trim()) {
        target.searchParams.set('returnTo', returnTo);
      }
      return target.toString();
    } catch {
      return SYNAPSYS_PREMIUM_CHECKOUT_URL;
    }
  }

  const params = new URLSearchParams();
  params.set('source', 'synapsys');
  if (String(returnTo || '').trim()) {
    params.set('returnTo', returnTo);
  }

  const query = params.toString();
  return `/checkout/plan/${encodeURIComponent(SYNAPSYS_PREMIUM_FALLBACK_PLAN)}${query ? `?${query}` : ''}`;
}
