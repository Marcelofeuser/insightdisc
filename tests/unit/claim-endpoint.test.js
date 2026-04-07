import test from 'node:test';
import assert from 'node:assert/strict';

// Ensure service runs in test mode (skips heavy processing)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';

const { prisma } = await import('../../server/src/lib/prisma.js');
const { claimStripeCheckoutSessionForUser } = await import('../../server/src/modules/billing/stripe-billing.service.js');

test('claimStripeCheckoutSessionForUser bloqueia claim quando payment pertence a outro usuário', async () => {
  const originalCreate = prisma.payment.create;
  const originalUpdateMany = prisma.payment.updateMany;

  // Simula conflito de unique + update condicional que não afeta (outro dono)
  prisma.payment.create = async () => {
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    throw err;
  };
  prisma.payment.updateMany = async () => ({ count: 0 });

  try {
    await assert.rejects(
      () => claimStripeCheckoutSessionForUser({ sessionId: 'mock_claim_owner', userId: 'user_attacker', user: { email: '' } }),
      (err) => err?.code === 'FORBIDDEN',
    );
  } finally {
    prisma.payment.create = originalCreate;
    prisma.payment.updateMany = originalUpdateMany;
  }
});

test('claimStripeCheckoutSessionForUser cria quando não existe payment (claim por criação)', async () => {
  const originalCreate = prisma.payment.create;
  const originalUpdateMany = prisma.payment.updateMany;

  prisma.payment.create = async () => ({ id: 'pay_created', userId: 'user_attacker' });
  prisma.payment.updateMany = async () => ({ count: 0 });

  try {
    const result = await claimStripeCheckoutSessionForUser({ sessionId: 'mock_claim_create', userId: 'user_attacker', user: { email: '' } });
    assert.equal(result.ok, true);
  } finally {
    prisma.payment.create = originalCreate;
    prisma.payment.updateMany = originalUpdateMany;
  }
});

test('claimStripeCheckoutSessionForUser reclama com update condicional quando create conflita', async () => {
  const originalCreate = prisma.payment.create;
  const originalUpdateMany = prisma.payment.updateMany;

  prisma.payment.create = async () => {
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    throw err;
  };
  prisma.payment.updateMany = async () => ({ count: 1 });

  try {
    const result = await claimStripeCheckoutSessionForUser({ sessionId: 'mock_claim_update', userId: 'user_attacker', user: { email: '' } });
    assert.equal(result.ok, true);
  } finally {
    prisma.payment.create = originalCreate;
    prisma.payment.updateMany = originalUpdateMany;
  }
});
