import { prisma, withPrismaRetry, withPrismaTransactionRetry } from '../../lib/prisma.js';

export const PRODUCT_KEYS = Object.freeze({
  SYNAPSYS: 'synapsys',
});

export const PRODUCT_ACCESS_TIERS = Object.freeze({
  FREE: 'free',
  PREMIUM: 'premium',
});

export const PRODUCT_ACCESS_STATUS = Object.freeze({
  ACTIVE: 'active',
  TRIAL: 'trial',
  BLOCKED: 'blocked',
  CANCELED: 'canceled',
});

const ACCESS_STATUSES_WITH_ENTRY = new Set([
  PRODUCT_ACCESS_STATUS.ACTIVE,
  PRODUCT_ACCESS_STATUS.TRIAL,
]);

const DEFAULT_SYNAPSYS_DAILY_LIMIT = Math.max(
  1,
  Number(process.env.SYNAPSYS_FREE_DAILY_LIMIT || 10) || 10,
);

const DEFAULT_SYNAPSYS_TRIAL_DAYS = Math.max(
  1,
  Number(process.env.SYNAPSYS_TRIAL_DAYS || 7) || 7,
);

function normalizeString(value = '') {
  return String(value || '').trim();
}

function normalizeTier(value = '') {
  const normalized = normalizeString(value).toLowerCase();
  return normalized === PRODUCT_ACCESS_TIERS.PREMIUM
    ? PRODUCT_ACCESS_TIERS.PREMIUM
    : PRODUCT_ACCESS_TIERS.FREE;
}

function normalizeStatus(value = '') {
  const normalized = normalizeString(value).toLowerCase();
  if (Object.values(PRODUCT_ACCESS_STATUS).includes(normalized)) {
    return normalized;
  }
  return PRODUCT_ACCESS_STATUS.BLOCKED;
}

function todayUsageBucket(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isSameUsageBucket(left, right = new Date()) {
  if (!left) return false;
  const normalizedLeft = todayUsageBucket(new Date(left));
  const normalizedRight = todayUsageBucket(right);
  return normalizedLeft.getTime() === normalizedRight.getTime();
}

function resolveSynapsysTrialEndsAt(now = new Date()) {
  return new Date(now.getTime() + DEFAULT_SYNAPSYS_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

function hasTrialExpired(record = {}, now = new Date()) {
  if (normalizeTier(record?.tier) !== PRODUCT_ACCESS_TIERS.FREE) return false;
  if (!record?.trialEndsAt) return false;
  return new Date(record.trialEndsAt).getTime() < now.getTime();
}

function getResetAwareUsage(record = {}, now = new Date()) {
  const shouldReset = !isSameUsageBucket(record?.usageDate, now);
  return {
    shouldReset,
    usageDate: todayUsageBucket(now),
    dailyMessagesUsed: shouldReset ? 0 : Math.max(0, Number(record?.dailyMessagesUsed || 0)),
  };
}

function computeRemaining(record = {}, now = new Date()) {
  if (normalizeTier(record?.tier) === PRODUCT_ACCESS_TIERS.PREMIUM) {
    return Infinity;
  }

  const dailyLimit = Math.max(0, Number(record?.dailyMessageLimit || DEFAULT_SYNAPSYS_DAILY_LIMIT));
  const usage = getResetAwareUsage(record, now);
  return Math.max(0, dailyLimit - usage.dailyMessagesUsed);
}

export function mapProductAccessRecord(record = null, now = new Date()) {
  if (!record) return null;

  const tier = normalizeTier(record.tier);
  const status = normalizeStatus(record.status);
  const usage = getResetAwareUsage(record, now);
  const expired = hasTrialExpired(record, now);
  const effectiveStatus =
    expired && status === PRODUCT_ACCESS_STATUS.TRIAL
      ? PRODUCT_ACCESS_STATUS.BLOCKED
      : status;
  const dailyMessageLimit =
    tier === PRODUCT_ACCESS_TIERS.PREMIUM
      ? null
      : Math.max(0, Number(record.dailyMessageLimit || DEFAULT_SYNAPSYS_DAILY_LIMIT));
  const dailyMessagesUsed =
    tier === PRODUCT_ACCESS_TIERS.PREMIUM ? 0 : usage.dailyMessagesUsed;
  const dailyMessagesRemaining =
    tier === PRODUCT_ACCESS_TIERS.PREMIUM ? null : Math.max(0, dailyMessageLimit - dailyMessagesUsed);
  const hasAccess =
    ACCESS_STATUSES_WITH_ENTRY.has(effectiveStatus) &&
    (tier === PRODUCT_ACCESS_TIERS.PREMIUM || !expired);

  return {
    id: record.id,
    user_id: record.userId,
    product_key: normalizeString(record.productKey || PRODUCT_KEYS.SYNAPSYS).toLowerCase(),
    tier,
    status: effectiveStatus,
    daily_message_limit: dailyMessageLimit,
    daily_messages_used: dailyMessagesUsed,
    daily_messages_remaining: dailyMessagesRemaining,
    trial_ends_at: record.trialEndsAt ? new Date(record.trialEndsAt).toISOString() : null,
    usage_date: usage.usageDate ? usage.usageDate.toISOString() : null,
    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : null,
    updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    has_access: hasAccess,
    is_premium: tier === PRODUCT_ACCESS_TIERS.PREMIUM && effectiveStatus === PRODUCT_ACCESS_STATUS.ACTIVE,
  };
}

export function resolveSynapsysAccessFromUser(user = null) {
  const list = Array.isArray(user?.productAccesses) ? user.productAccesses : [];
  const direct =
    list.find((item) => normalizeString(item?.productKey).toLowerCase() === PRODUCT_KEYS.SYNAPSYS) ||
    user?.synapsysAccess ||
    user?.synapsys_access ||
    null;

  if (!direct) return null;
  return mapProductAccessRecord(direct);
}

export async function getProductAccessForUser(userId = '', productKey = PRODUCT_KEYS.SYNAPSYS) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) return null;

  return withPrismaRetry(
    () =>
      prisma.productAccess.findUnique({
        where: {
          userId_productKey: {
            userId: normalizedUserId,
            productKey,
          },
        },
      }),
    { retries: 1 },
  );
}

async function updateExpiredTrialIfNeeded(tx, record = null, now = new Date()) {
  if (!record || !hasTrialExpired(record, now)) {
    return record;
  }

  return tx.productAccess.update({
    where: { id: record.id },
    data: {
      status: PRODUCT_ACCESS_STATUS.BLOCKED,
    },
  });
}

export async function provisionSynapsysFreeAccessForUser(userId = '') {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    const error = new Error('USER_ID_REQUIRED');
    error.code = 'USER_ID_REQUIRED';
    throw error;
  }

  const now = new Date();
  return withPrismaTransactionRetry(async (tx) => {
    const existing = await tx.productAccess.findUnique({
      where: {
        userId_productKey: {
          userId: normalizedUserId,
          productKey: PRODUCT_KEYS.SYNAPSYS,
        },
      },
    });

    if (!existing) {
      return tx.productAccess.create({
        data: {
          userId: normalizedUserId,
          productKey: PRODUCT_KEYS.SYNAPSYS,
          tier: PRODUCT_ACCESS_TIERS.FREE,
          status: PRODUCT_ACCESS_STATUS.TRIAL,
          dailyMessageLimit: DEFAULT_SYNAPSYS_DAILY_LIMIT,
          dailyMessagesUsed: 0,
          usageDate: todayUsageBucket(now),
          trialEndsAt: resolveSynapsysTrialEndsAt(now),
        },
      });
    }

    const refreshed = await updateExpiredTrialIfNeeded(tx, existing, now);
    if (!refreshed) return existing;

    const normalizedStatus = normalizeStatus(refreshed.status);
    if (
      normalizeTier(refreshed.tier) === PRODUCT_ACCESS_TIERS.PREMIUM &&
      normalizedStatus === PRODUCT_ACCESS_STATUS.ACTIVE
    ) {
      return refreshed;
    }

    const usage = getResetAwareUsage(refreshed, now);
    if (usage.shouldReset) {
      return tx.productAccess.update({
        where: { id: refreshed.id },
        data: {
          dailyMessagesUsed: 0,
          usageDate: usage.usageDate,
        },
      });
    }

    return refreshed;
  });
}

export async function activateSynapsysPremiumAccessForUser(userId = '') {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    const error = new Error('USER_ID_REQUIRED');
    error.code = 'USER_ID_REQUIRED';
    throw error;
  }

  const now = new Date();
  return withPrismaTransactionRetry(async (tx) =>
    tx.productAccess.upsert({
      where: {
        userId_productKey: {
          userId: normalizedUserId,
          productKey: PRODUCT_KEYS.SYNAPSYS,
        },
      },
      create: {
        userId: normalizedUserId,
        productKey: PRODUCT_KEYS.SYNAPSYS,
        tier: PRODUCT_ACCESS_TIERS.PREMIUM,
        status: PRODUCT_ACCESS_STATUS.ACTIVE,
        dailyMessageLimit: null,
        dailyMessagesUsed: 0,
        usageDate: todayUsageBucket(now),
        trialEndsAt: null,
      },
      update: {
        tier: PRODUCT_ACCESS_TIERS.PREMIUM,
        status: PRODUCT_ACCESS_STATUS.ACTIVE,
        dailyMessageLimit: null,
        dailyMessagesUsed: 0,
        usageDate: todayUsageBucket(now),
        trialEndsAt: null,
      },
    }),
  );
}

export async function consumeSynapsysMessageForUser(userId = '') {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    const error = new Error('SYNAPSYS_ACCESS_REQUIRED');
    error.code = 'SYNAPSYS_ACCESS_REQUIRED';
    throw error;
  }

  const now = new Date();
  return withPrismaTransactionRetry(async (tx) => {
    const current = await tx.productAccess.findUnique({
      where: {
        userId_productKey: {
          userId: normalizedUserId,
          productKey: PRODUCT_KEYS.SYNAPSYS,
        },
      },
    });

    if (!current) {
      const error = new Error('SYNAPSYS_ACCESS_REQUIRED');
      error.code = 'SYNAPSYS_ACCESS_REQUIRED';
      error.access = null;
      throw error;
    }

    const refreshed = await updateExpiredTrialIfNeeded(tx, current, now);
    const mapped = mapProductAccessRecord(refreshed, now);
    if (!mapped?.has_access) {
      const error = new Error(
        mapped?.status === PRODUCT_ACCESS_STATUS.BLOCKED
          ? 'SYNAPSYS_ACCESS_BLOCKED'
          : 'SYNAPSYS_ACCESS_REQUIRED',
      );
      error.code = error.message;
      error.access = mapped;
      throw error;
    }

    if (mapped.is_premium) {
      return refreshed;
    }

    if (Number(mapped.daily_messages_remaining || 0) <= 0) {
      const error = new Error('SYNAPSYS_DAILY_LIMIT_REACHED');
      error.code = 'SYNAPSYS_DAILY_LIMIT_REACHED';
      error.access = mapped;
      throw error;
    }

    const usage = getResetAwareUsage(refreshed, now);
    return tx.productAccess.update({
      where: { id: refreshed.id },
      data: {
        dailyMessagesUsed: usage.dailyMessagesUsed + 1,
        usageDate: usage.usageDate,
      },
    });
  });
}

export async function syncSynapsysAccessFromCheckout(tx, { userId = '', metadata = {}, paid = false } = {}) {
  if (!paid) return null;

  const productKey = normalizeString(metadata?.productKey || metadata?.product_key).toLowerCase();
  const productTier = normalizeString(metadata?.productTier || metadata?.product_tier).toLowerCase();
  if (productKey !== PRODUCT_KEYS.SYNAPSYS) {
    return null;
  }

  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) return null;

  return tx.productAccess.upsert({
    where: {
      userId_productKey: {
        userId: normalizedUserId,
        productKey: PRODUCT_KEYS.SYNAPSYS,
      },
    },
    create: {
      userId: normalizedUserId,
      productKey: PRODUCT_KEYS.SYNAPSYS,
      tier: productTier === PRODUCT_ACCESS_TIERS.PREMIUM ? PRODUCT_ACCESS_TIERS.PREMIUM : PRODUCT_ACCESS_TIERS.FREE,
      status:
        productTier === PRODUCT_ACCESS_TIERS.PREMIUM
          ? PRODUCT_ACCESS_STATUS.ACTIVE
          : PRODUCT_ACCESS_STATUS.TRIAL,
      dailyMessageLimit:
        productTier === PRODUCT_ACCESS_TIERS.PREMIUM ? null : DEFAULT_SYNAPSYS_DAILY_LIMIT,
      dailyMessagesUsed: 0,
      usageDate: todayUsageBucket(),
      trialEndsAt:
        productTier === PRODUCT_ACCESS_TIERS.PREMIUM ? null : resolveSynapsysTrialEndsAt(),
    },
    update: {
      tier: productTier === PRODUCT_ACCESS_TIERS.PREMIUM ? PRODUCT_ACCESS_TIERS.PREMIUM : PRODUCT_ACCESS_TIERS.FREE,
      status:
        productTier === PRODUCT_ACCESS_TIERS.PREMIUM
          ? PRODUCT_ACCESS_STATUS.ACTIVE
          : PRODUCT_ACCESS_STATUS.TRIAL,
      dailyMessageLimit:
        productTier === PRODUCT_ACCESS_TIERS.PREMIUM ? null : DEFAULT_SYNAPSYS_DAILY_LIMIT,
      dailyMessagesUsed: 0,
      usageDate: todayUsageBucket(),
      trialEndsAt:
        productTier === PRODUCT_ACCESS_TIERS.PREMIUM ? null : resolveSynapsysTrialEndsAt(),
    },
  });
}
