import { sanitizeNextPath } from '../auth/next-path.js';

export const SYNAPSYS_ROUTE_CONTEXT_KEY = 'synapsys.route-context.v1';
export const SYNAPSYS_ENTRY_PATH = '/chat/entry';
export const SYNAPSYS_SIGNUP_PATH = '/chat/signup';
export const SYNAPSYS_APP_PATH = '/chat/app';
export const SYNAPSYS_SUBSCRIBE_PATH = '/subscribe';

function appendParams(pathname, entries = []) {
  const params = new URLSearchParams();

  entries.forEach(([key, value]) => {
    const normalized = String(value || '').trim();
    if (normalized) {
      params.set(key, normalized);
    }
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildSynapsysEntryPath() {
  return SYNAPSYS_ENTRY_PATH;
}

export function buildSynapsysPricingPath({ plan = 'premium', source = 'synapsys' } = {}) {
  return appendParams('/pricing', [
    ['source', source],
    ['plan', plan],
  ]);
}

export function buildSynapsysAppPath({ plan = 'free' } = {}) {
  return appendParams(SYNAPSYS_APP_PATH, [['plan', plan]]);
}

export function buildSynapsysSignupPath({ intent = 'free', next = '' } = {}) {
  return appendParams(SYNAPSYS_SIGNUP_PATH, [
    ['intent', intent],
    ['next', sanitizeNextPath(next, '')],
  ]);
}

export function buildSynapsysSubscribePath({ returnTo = '' } = {}) {
  return appendParams(SYNAPSYS_SUBSCRIBE_PATH, [['returnTo', sanitizeNextPath(returnTo, '')]]);
}
