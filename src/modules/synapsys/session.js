import { SYNAPSYS_FREE_DAILY_LIMIT, SYNAPSYS_REWARDED_BONUS } from './runtime.js';
import {
  SYNAPSYS_ROUTE_CONTEXT_KEY,
  buildSynapsysAppPath,
  buildSynapsysEntryPath,
  buildSynapsysPricingPath,
} from './routes.js';
import { getSynapsysAccess, hasSynapsysAccess as hasSynapsysProductAccess, resolveSynapsysTier as resolveAccessTier } from './access.js';

const SYNAPSYS_INTENT_KEY = 'synapsys.intent.v1';
const SYNAPSYS_USAGE_KEY = 'synapsys.usage.v1';
const DEFAULT_HISTORY_LIMIT = 80;

export function normalizeSynapsysIntent(value = '') {
  return String(value || '').trim().toLowerCase() === 'premium' ? 'premium' : 'free';
}

export function resolveSynapsysAuthDestination(intent = 'free', access = null) {
  const normalizedIntent = normalizeSynapsysIntent(intent);
  const tier = resolveSynapsysTier(access);
  const hasAccess = hasSynapsysProductAccess(access);

  if (normalizedIntent === 'premium' && tier !== 'premium') {
    return buildSynapsysPricingPath({ plan: 'premium' });
  }

  if (!hasAccess) {
    return buildSynapsysEntryPath();
  }

  return buildSynapsysAppPath({
    plan: tier === 'premium' ? 'premium' : normalizedIntent,
  });
}

export function persistSynapsysIntent(intent = 'free') {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SYNAPSYS_INTENT_KEY, normalizeSynapsysIntent(intent));
}

export function readSynapsysIntent(fallback = 'free') {
  if (typeof window === 'undefined') return normalizeSynapsysIntent(fallback);
  return normalizeSynapsysIntent(window.sessionStorage.getItem(SYNAPSYS_INTENT_KEY) || fallback);
}

export function clearSynapsysIntent() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SYNAPSYS_INTENT_KEY);
}

export function markSynapsysRouteContext() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SYNAPSYS_ROUTE_CONTEXT_KEY, '1');
}

export function hasSynapsysRouteContext() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(SYNAPSYS_ROUTE_CONTEXT_KEY) === '1';
}

export function resolveSynapsysTier(access = null) {
  return resolveAccessTier(access);
}

export function getCurrentSynapsysAccess(access = null) {
  return getSynapsysAccess(access);
}

export function hasSynapsysAccess(access = null) {
  return hasSynapsysProductAccess(access);
}

export function resolveSynapsysUserKey(user = null, access = null) {
  const candidate = String(
    user?.id ||
      user?.email ||
      access?.userId ||
      access?.email ||
      access?.user?.email ||
      '',
  )
    .trim()
    .toLowerCase();

  return candidate ? candidate.replace(/[^a-z0-9:_-]/g, '-') : 'guest';
}

function todayBucket() {
  return new Date().toISOString().slice(0, 10);
}

function readUsageStore() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(SYNAPSYS_USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsageStore(store = {}) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYNAPSYS_USAGE_KEY, JSON.stringify(store));
}

function normalizeUsageEntry(entry = {}) {
  const bucket = todayBucket();
  const normalizedDay = String(entry?.day || '').trim();
  if (normalizedDay !== bucket) {
    return {
      day: bucket,
      used: 0,
      bonus: 0,
      rewardedUnlocks: 0,
    };
  }

  return {
    day: bucket,
    used: Math.max(0, Number(entry?.used || 0)),
    bonus: Math.max(0, Number(entry?.bonus || 0)),
    rewardedUnlocks: Math.max(0, Number(entry?.rewardedUnlocks || 0)),
  };
}

export function readSynapsysUsage(userKey = '', tier = 'free') {
  if (tier === 'premium') {
    return {
      tier: 'premium',
      limit: null,
      used: 0,
      bonus: 0,
      remaining: Infinity,
      rewardedUnlocks: 0,
    };
  }

  const safeKey = String(userKey || '').trim() || 'guest';
  const store = readUsageStore();
  const entry = normalizeUsageEntry(store[safeKey]);
  const totalLimit = SYNAPSYS_FREE_DAILY_LIMIT + entry.bonus;

  return {
    tier: 'free',
    limit: SYNAPSYS_FREE_DAILY_LIMIT,
    used: entry.used,
    bonus: entry.bonus,
    remaining: Math.max(0, totalLimit - entry.used),
    rewardedUnlocks: entry.rewardedUnlocks,
  };
}

export function consumeSynapsysFreeMessage(userKey = '') {
  const safeKey = String(userKey || '').trim() || 'guest';
  const store = readUsageStore();
  const entry = normalizeUsageEntry(store[safeKey]);
  const totalLimit = SYNAPSYS_FREE_DAILY_LIMIT + entry.bonus;

  if (entry.used >= totalLimit) {
    return {
      allowed: false,
      state: readSynapsysUsage(safeKey, 'free'),
    };
  }

  const nextEntry = {
    ...entry,
    used: entry.used + 1,
  };

  store[safeKey] = nextEntry;
  writeUsageStore(store);

  return {
    allowed: true,
    state: readSynapsysUsage(safeKey, 'free'),
  };
}

export function grantSynapsysRewardedBonus(userKey = '') {
  const safeKey = String(userKey || '').trim() || 'guest';
  const store = readUsageStore();
  const entry = normalizeUsageEntry(store[safeKey]);

  store[safeKey] = {
    ...entry,
    bonus: entry.bonus + SYNAPSYS_REWARDED_BONUS,
    rewardedUnlocks: entry.rewardedUnlocks + 1,
  };

  writeUsageStore(store);
  return readSynapsysUsage(safeKey, 'free');
}

export function readSynapsysHistory(storageKey = '', fallbackMessages = []) {
  const safeKey = String(storageKey || '').trim();
  if (!safeKey || typeof window === 'undefined') return fallbackMessages;

  try {
    const raw = window.localStorage.getItem(safeKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return fallbackMessages;
    }
    return parsed;
  } catch {
    return fallbackMessages;
  }
}

export function writeSynapsysHistory(storageKey = '', messages = [], limit = DEFAULT_HISTORY_LIMIT) {
  const safeKey = String(storageKey || '').trim();
  if (!safeKey || typeof window === 'undefined') return;

  const normalizedMessages = Array.isArray(messages) ? messages.slice(-Math.max(1, Number(limit) || DEFAULT_HISTORY_LIMIT)) : [];
  window.localStorage.setItem(safeKey, JSON.stringify(normalizedMessages));
}

export function clearSynapsysHistory(storageKey = '') {
  const safeKey = String(storageKey || '').trim();
  if (!safeKey || typeof window === 'undefined') return;
  window.localStorage.removeItem(safeKey);
}
