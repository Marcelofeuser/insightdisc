import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_unit';

const { prisma } = await import('../../server/src/lib/prisma.js');
const { processStripeWebhookEvent } = await import('../../server/src/modules/billing/stripe-billing.service.js');

function createStripeSignatureHeader(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function buildStripeEventPayload({ id, type, dataObject }) {
  return JSON.stringify({
    id,
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: dataObject || {},
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  });
}

function createStripeWebhookMocks(store) {
  return {
    findUnique: async ({ where }) => store.get(where.stripeEventId) || null,
    create: async ({ data }) => {
      store.set(data.stripeEventId, { ...data });
      return store.get(data.stripeEventId);
    },
    update: async ({ where, data }) => {
      const existing = store.get(where.stripeEventId) || { stripeEventId: where.stripeEventId };
      const next = { ...existing, ...data, stripeEventId: where.stripeEventId };
      store.set(where.stripeEventId, next);
      return next;
    },
  };
}

test('checkout.session.completed não permite sobrescrever ownership de payment existente', async () => {
  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalTransaction = prisma.$transaction;

  let paymentUpserts = 0;

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.$transaction = async (callback) => {
    const tx = {
      payment: {
        findUnique: async () => ({
          userId: 'user_owner',
          stripeSubscriptionId: null,
          stripeCustomerId: null,
          stripePaymentIntent: null,
          amount: 0,
          currency: 'BRL',
        }),
        upsert: async () => {
          paymentUpserts += 1;
          return { id: 'payment_unit', userId: 'user_owner' };
        },
      },
      user: {
        findUnique: async () => null,
        update: async () => ({}),
      },
      credit: {
        upsert: async () => ({ balance: 0 }),
      },
      creditLedgerEntry: {
        findUnique: async () => null,
        create: async () => ({}),
      },
      billingSubscription: {
        upsert: async () => ({}),
      },
    };
    return callback(tx);
  };

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_claim_owner',
      type: 'checkout.session.completed',
      dataObject: {
        id: 'cs_unit_owner',
        mode: 'payment',
        payment_status: 'paid',
        currency: 'brl',
        amount_total: 10_00,
        customer_details: { email: 'owner@example.com' },
        metadata: {
          userId: 'user_attacker',
          checkoutMode: 'payment',
          planTarget: 'professional',
        },
      },
    });

    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);

    await assert.rejects(
      () => processStripeWebhookEvent({ rawBody, signature }),
      (error) => error?.code === 'FORBIDDEN',
    );

    assert.equal(paymentUpserts, 0);
    assert.equal(eventStore.get('evt_unit_claim_owner')?.status, 'FAILED');
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.$transaction = originalTransaction;
  }
});

test('checkout.session.completed bloqueia claim quando email do Stripe não corresponde ao usuário', async () => {
  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalTransaction = prisma.$transaction;

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.$transaction = async (callback) => {
    const tx = {
      payment: {
        findUnique: async () => null,
        upsert: async () => ({ id: 'payment_unit', userId: 'user_attacker' }),
      },
      user: {
        findUnique: async (args) => {
          if (args?.where?.id === 'user_attacker') {
            return { email: 'attacker@example.com' };
          }
          return null;
        },
        update: async () => ({}),
      },
      credit: {
        upsert: async () => ({ balance: 0 }),
      },
      creditLedgerEntry: {
        findUnique: async () => null,
        create: async () => ({}),
      },
      billingSubscription: {
        upsert: async () => ({}),
      },
    };
    return callback(tx);
  };

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_email_mismatch',
      type: 'checkout.session.completed',
      dataObject: {
        id: 'cs_unit_email_mismatch',
        mode: 'payment',
        payment_status: 'paid',
        currency: 'brl',
        amount_total: 10_00,
        customer_details: { email: 'victim@example.com' },
        metadata: {
          userId: 'user_attacker',
          checkoutMode: 'payment',
          creditsToGrant: '10',
        },
      },
    });

    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);

    await assert.rejects(
      () => processStripeWebhookEvent({ rawBody, signature }),
      (error) => error?.code === 'FORBIDDEN',
    );
    assert.equal(eventStore.get('evt_unit_email_mismatch')?.status, 'FAILED');
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.$transaction = originalTransaction;
  }
});

test('checkout.session.completed é idempotente ao aplicar créditos (credit ledger)', async () => {
  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalTransaction = prisma.$transaction;

  const paymentStore = new Map();
  const creditLedgerStore = new Map();
  const creditStore = new Map();
  let ledgerCreates = 0;

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.$transaction = async (callback) => {
    const tx = {
      payment: {
        findUnique: async ({ where }) => paymentStore.get(where.stripeSession) || null,
        upsert: async ({ where, create, update }) => {
          const key = where.stripeSession;
          const existing = paymentStore.get(key);
          const next = existing
            ? { ...existing, ...update, stripeSession: key }
            : { id: `pay_${paymentStore.size + 1}`, stripeSession: key, ...create };
          paymentStore.set(key, next);
          return next;
        },
      },
      user: {
        findUnique: async (args) => {
          if (args?.where?.id === 'user_credit') {
            return { email: 'buyer@example.com' };
          }
          if (args?.where?.email === 'buyer@example.com') {
            return { id: 'user_credit' };
          }
          return null;
        },
        update: async () => ({}),
      },
      credit: {
        upsert: async ({ where, create, update }) => {
          const userId = where.userId;
          const existing = creditStore.get(userId);
          const nextBalance = existing
            ? existing.balance + (update?.balance?.increment || 0)
            : create.balance;
          const next = { userId, balance: nextBalance };
          creditStore.set(userId, next);
          return next;
        },
      },
      creditLedgerEntry: {
        findUnique: async ({ where }) => {
          const key = `${where.userId_source_externalRef.userId}|${where.userId_source_externalRef.source}|${where.userId_source_externalRef.externalRef}`;
          return creditLedgerStore.get(key) || null;
        },
        create: async ({ data }) => {
          const key = `${data.userId}|${data.source}|${data.externalRef}`;
          ledgerCreates += 1;
          creditLedgerStore.set(key, { ...data });
          return creditLedgerStore.get(key);
        },
      },
      billingSubscription: {
        upsert: async () => ({}),
      },
    };

    return callback(tx);
  };

  try {
    const build = (eventId) =>
      buildStripeEventPayload({
        id: eventId,
        type: 'checkout.session.completed',
        dataObject: {
          id: 'cs_unit_credits',
          mode: 'payment',
          payment_status: 'paid',
          currency: 'brl',
          amount_total: 10_00,
          customer_details: { email: 'buyer@example.com' },
          metadata: {
            checkoutMode: 'payment',
            creditsToGrant: '10',
          },
        },
      });

    for (const eventId of ['evt_unit_credit_1', 'evt_unit_credit_2']) {
      const payload = build(eventId);
      const rawBody = Buffer.from(payload);
      const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);
      const result = await processStripeWebhookEvent({ rawBody, signature });
      assert.equal(result.ok, true);
    }

    assert.equal(ledgerCreates, 1);
    assert.equal(creditStore.get('user_credit')?.balance, 10);
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.$transaction = originalTransaction;
  }
});

