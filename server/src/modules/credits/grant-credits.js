import { prisma } from '../../lib/prisma.js';

function toInt(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function assertRequired(value, errorCode) {
  if (!String(value || '').trim()) {
    const error = new Error(errorCode);
    error.code = errorCode;
    throw error;
  }
}

async function runGrant(client, {
  userId,
  amount,
  reason,
  sourceType,
  sourceId,
  actorUserId = '',
  campaignId = '',
}) {
  assertRequired(userId, 'CREDIT_TARGET_REQUIRED');
  assertRequired(sourceType, 'CREDIT_SOURCE_REQUIRED');
  assertRequired(sourceId, 'CREDIT_SOURCE_REQUIRED');

  const normalizedAmount = toInt(amount);
  if (normalizedAmount <= 0) {
    const error = new Error('INVALID_CREDITS_AMOUNT');
    error.code = 'INVALID_CREDITS_AMOUNT';
    throw error;
  }

  const existingGrant = await client.creditGrant.findUnique({
    where: {
      userId_sourceType_sourceId: {
        userId,
        sourceType,
        sourceId,
      },
    },
    select: {
      id: true,
      amount: true,
    },
  });

  if (existingGrant) {
    const credit = await client.credit.findFirst({
      where: { userId },
      select: { balance: true },
    });

    return {
      ok: true,
      created: false,
      alreadyGranted: true,
      amount: Number(existingGrant.amount || normalizedAmount),
      balance: Number(credit?.balance || 0),
      grantId: existingGrant.id,
    };
  }

  const grant = await client.creditGrant.create({
    data: {
      userId,
      campaignId: campaignId || null,
      amount: normalizedAmount,
      reason: String(reason || 'Crédito promocional').trim() || 'Crédito promocional',
      sourceType: String(sourceType).trim(),
      sourceId: String(sourceId).trim(),
      actorUserId: actorUserId || null,
    },
    select: { id: true },
  });

  const credit = await client.credit.upsert({
    where: { userId },
    create: {
      userId,
      balance: normalizedAmount,
    },
    update: {
      balance: {
        increment: normalizedAmount,
      },
    },
    select: {
      balance: true,
    },
  });

  return {
    ok: true,
    created: true,
    alreadyGranted: false,
    amount: normalizedAmount,
    balance: Number(credit?.balance || 0),
    grantId: grant.id,
  };
}

export async function grantCreditsToUser(input = {}) {
  const client = input.tx && typeof input.tx === 'object' ? input.tx : null;
  if (client) {
    return runGrant(client, input);
  }

  return prisma.$transaction((tx) => runGrant(tx, input));
}
