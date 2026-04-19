const SYNAPSYS_TIERS = Object.freeze({
  FREE: 'free',
  PREMIUM: 'premium',
});

const SYNAPSYS_STATUSES_WITH_ACCESS = new Set(['active', 'trial']);

function toText(value = '') {
  return String(value || '').trim();
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizePlan(value = '') {
  return String(value || '').trim().toLowerCase();
}

function getPlanFromSource(source = null) {
  return normalizePlan(
    source?.plan ||
    source?.billingPlan ||
    source?.subscriptionPlan ||
    source?.account?.plan ||
    source?.user?.plan ||
    source?.user?.billingPlan ||
    source?.user?.subscriptionPlan
  );
}

function hasPlanBasedSynapsysPremium(source = null) {
  const plan = getPlanFromSource(source);

  return [
    'insider',
    'professional',
    'business',
    'corporation',
    'diamond_consulting',
    'diamond-consulting',
  ].includes(plan);
}

export function normalizeSynapsysAccess(rawAccess = null) {
  if (!rawAccess || typeof rawAccess !== 'object') return null;

  const tier = toText(rawAccess.tier).toLowerCase() === SYNAPSYS_TIERS.PREMIUM
    ? SYNAPSYS_TIERS.PREMIUM
    : SYNAPSYS_TIERS.FREE;
  const status = toText(rawAccess.status).toLowerCase() || 'blocked';
  const dailyMessageLimit =
    tier === SYNAPSYS_TIERS.PREMIUM
      ? null
      : Math.max(0, toNumber(rawAccess.daily_message_limit ?? rawAccess.dailyMessageLimit, 0));
  const dailyMessagesUsed =
    tier === SYNAPSYS_TIERS.PREMIUM
      ? 0
      : Math.max(0, toNumber(rawAccess.daily_messages_used ?? rawAccess.dailyMessagesUsed, 0));
  const explicitRemaining = rawAccess.daily_messages_remaining ?? rawAccess.dailyMessagesRemaining;
  const dailyMessagesRemaining =
    tier === SYNAPSYS_TIERS.PREMIUM
      ? Infinity
      : Math.max(
          0,
          explicitRemaining == null
            ? dailyMessageLimit - dailyMessagesUsed
            : toNumber(explicitRemaining, 0),
        );

  const hasAccess =
    Boolean(rawAccess.has_access ?? rawAccess.hasAccess) ||
    (SYNAPSYS_STATUSES_WITH_ACCESS.has(status) &&
      (tier === SYNAPSYS_TIERS.PREMIUM || dailyMessageLimit >= 0));

  return {
    id: rawAccess.id || null,
    productKey: toText(rawAccess.product_key || rawAccess.productKey || 'synapsys').toLowerCase(),
    tier,
    status,
    dailyMessageLimit,
    dailyMessagesUsed,
    dailyMessagesRemaining,
    trialEndsAt: toText(rawAccess.trial_ends_at || rawAccess.trialEndsAt) || null,
    createdAt: toText(rawAccess.created_at || rawAccess.createdAt) || null,
    updatedAt: toText(rawAccess.updated_at || rawAccess.updatedAt) || null,
    hasAccess,
    isPremium: Boolean(rawAccess.is_premium ?? rawAccess.isPremium) || tier === SYNAPSYS_TIERS.PREMIUM,
  };
}

export function getSynapsysAccess(source = null) {
  const direct =
    source?.synapsysAccess ||
    source?.synapsys_access ||
    source?.user?.synapsysAccess ||
    source?.user?.synapsys_access ||
    source?.access?.synapsysAccess ||
    source?.access?.synapsys_access ||
    null;

  return normalizeSynapsysAccess(direct);
}

export function hasSynapsysAccess(user = null, accessState = null) {
  const resolved = getSynapsysAccess(accessState || user);
  if (resolved?.hasAccess) return true;

  return hasPlanBasedSynapsysPremium(accessState) || hasPlanBasedSynapsysPremium(user);
}

export function resolveSynapsysTier(source = null) {
  const resolved = getSynapsysAccess(source);
  if (resolved?.isPremium) return SYNAPSYS_TIERS.PREMIUM;
  if (hasPlanBasedSynapsysPremium(source)) return SYNAPSYS_TIERS.PREMIUM;
  if (resolved?.hasAccess) return SYNAPSYS_TIERS.FREE;
  return 'locked';
}

export function buildSynapsysUsageState(source = null) {
  const resolved = getSynapsysAccess(source);

  if (!resolved) {
    if (hasPlanBasedSynapsysPremium(source)) {
      return {
        tier: SYNAPSYS_TIERS.PREMIUM,
        limit: null,
        totalLimit: null,
        used: 0,
        remaining: Infinity,
        status: 'active',
      };
    }

    return {
      tier: 'locked',
      limit: 0,
      totalLimit: 0,
      used: 0,
      remaining: 0,
      status: 'missing',
    };
  }

  if (resolved.isPremium || hasPlanBasedSynapsysPremium(source)) {
    return {
      tier: SYNAPSYS_TIERS.PREMIUM,
      limit: null,
      totalLimit: null,
      used: 0,
      remaining: Infinity,
      status: resolved.status,
    };
  }

  return {
    tier: SYNAPSYS_TIERS.FREE,
    limit: resolved.dailyMessageLimit,
    totalLimit: resolved.dailyMessageLimit,
    used: resolved.dailyMessagesUsed,
    remaining: resolved.dailyMessagesRemaining,
    status: resolved.status,
    trialEndsAt: resolved.trialEndsAt,
  };
}

export function mergeSynapsysAccessIntoUser(user = null, synapsysAccess = null) {
  if (!user) return user;
  const normalizedAccess = normalizeSynapsysAccess(synapsysAccess);
  return {
    ...user,
    synapsys_access: normalizedAccess,
  };
}
