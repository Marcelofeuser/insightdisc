import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';

const { prisma } = await import('../../server/src/lib/prisma.js');
const { claimStripeCheckoutSessionForUser } = await import(
  '../../server/src/modules/billing/stripe-billing.service.js'
);

test('claimStripeCheckoutSessionForUser bloqueia claim quando payment pertence a outro usuário', async () => {
  const originalFindUnique = prisma.payment.findUnique;
  const originalCreate = prisma.payment.create;

  prisma.payment.create = async () => {
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    throw err;
  };
  prisma.payment.findUnique = async () => ({ userId: 'user_owner' });

  try {
    await assert.rejects(
      () =>
        claimStripeCheckoutSessionForUser({
          sessionId: 'mock_claim_owner',
          userId: 'user_attacker',
          user: { email: '' },
        }),
      (err) => err?.code === 'FORBIDDEN'
    );
  } finally {
    prisma.payment.findUnique = originalFindUnique;
    prisma.payment.create = originalCreate;
  }
});

test('claimStripeCheckoutSessionForUser cria quando não existe payment (claim por criação)', async () => {
  const originalFindUnique = prisma.payment.findUnique;
  const originalCreate = prisma.payment.create;

  prisma.payment.findUnique = async () => null;
  prisma.payment.create = async () => ({ id: 'pay_created', userId: 'user_attacker' });

  try {
    const result = await claimStripeCheckoutSessionForUser({
      sessionId: 'mock_claim_create',
      userId: 'user_attacker',
      user: { email: '' },
    });
    assert.equal(result.ok, true);
  } finally {
    prisma.payment.findUnique = originalFindUnique;
    prisma.payment.create = originalCreate;
  }
});

test('claimStripeCheckoutSessionForUser aceita quando o payment já pertence ao mesmo usuário', async () => {
  const originalFindUnique = prisma.payment.findUnique;
  const originalCreate = prisma.payment.create;

  prisma.payment.create = async () => {
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    throw err;
  };
  prisma.payment.findUnique = async () => ({ userId: 'user_attacker' });

  try {
    const result = await claimStripeCheckoutSessionForUser({
      sessionId: 'mock_claim_same_owner',
      userId: 'user_attacker',
      user: { email: '' },
    });
    assert.equal(result.ok, true);
  } finally {
    prisma.payment.findUnique = originalFindUnique;
    prisma.payment.create = originalCreate;
  }
});
