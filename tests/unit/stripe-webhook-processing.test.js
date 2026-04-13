import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_unit';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_unit';

const { prisma } = await import('../../server/src/lib/prisma.js');
const { processStripeWebhookEvent } = await import(
  '../../server/src/modules/billing/stripe-billing.service.js',
);

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

test('processStripeWebhookEvent deduplica eventos por stripeEventId', async () => {
  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_dedup',
      type: 'account.updated',
      dataObject: { id: 'acct_unit' },
    });
    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);

    const first = await processStripeWebhookEvent({ rawBody, signature });
    assert.equal(first.ok, true);
    assert.equal(first.duplicate, false);
    assert.equal(first.eventId, 'evt_unit_dedup');

    const second = await processStripeWebhookEvent({ rawBody, signature });
    assert.equal(second.ok, true);
    assert.equal(second.duplicate, true);
    assert.equal(second.eventId, 'evt_unit_dedup');

    assert.equal(eventStore.get('evt_unit_dedup')?.status, 'PROCESSED');
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
  }
});

test('processStripeWebhookEvent ativa plano e identidade no evento de subscription', async () => {
  process.env.STRIPE_PRICE_BUSINESS = 'price_business_unit';

  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalBillingSubscriptionDelegate = prisma.billingSubscription;
  const originalPaymentDelegate = prisma.payment;
  const originalTransaction = prisma.$transaction;

  const userUpdates = [];
  const subscriptionUpserts = [];

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.billingSubscription = {
    ...originalBillingSubscriptionDelegate,
    findUnique: async () => null,
  };
  prisma.payment = {
    ...originalPaymentDelegate,
    findFirst: async () => ({ userId: 'user_unit' }),
  };
  prisma.$transaction = async (callback) => {
    const tx = {
      billingSubscription: {
        upsert: async (args) => {
          subscriptionUpserts.push(args);
          return { stripeSubscriptionId: args.where.stripeSubscriptionId, userId: args.create.userId };
        },
      },
      user: {
        update: async (args) => {
          userUpdates.push(args);
          return {};
        },
      },
    };
    return callback(tx);
  };

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_sub',
      type: 'customer.subscription.created',
      dataObject: {
        id: 'sub_unit',
        customer: 'cus_unit',
        status: 'active',
        items: {
          data: [
            {
              price: { id: 'price_business_unit' },
            },
          ],
        },
      },
    });

    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);
    const result = await processStripeWebhookEvent({ rawBody, signature });

    assert.equal(result.ok, true);
    assert.equal(result.duplicate, false);
    assert.equal(result.eventId, 'evt_unit_sub');

    assert.equal(subscriptionUpserts.length, 1);
    assert.equal(subscriptionUpserts[0]?.where?.stripeSubscriptionId, 'sub_unit');

    assert.ok(userUpdates.some((call) => call?.data?.plan === 'BUSINESS'));
    assert.ok(
      userUpdates.some(
        (call) =>
          call?.data?.stripeCustomerId === 'cus_unit'
          && call?.data?.stripeSubscriptionId === 'sub_unit'
          && call?.data?.subscriptionStatus === 'ACTIVE',
      ),
    );
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.billingSubscription = originalBillingSubscriptionDelegate;
    prisma.payment = originalPaymentDelegate;
    prisma.$transaction = originalTransaction;
  }
});

test('processStripeWebhookEvent remove acesso premium quando a assinatura é cancelada', async () => {
  process.env.STRIPE_PRICE_BUSINESS_CORPORATION = 'price_corporation_unit';

  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalBillingSubscriptionDelegate = prisma.billingSubscription;
  const originalTransaction = prisma.$transaction;

  const userUpdates = [];
  const subscriptionUpdates = [];

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.billingSubscription = {
    ...originalBillingSubscriptionDelegate,
    findUnique: async () => ({
      stripeSubscriptionId: 'sub_unit_deleted',
      userId: 'user_unit_deleted',
      stripeCustomerId: 'cus_unit_deleted',
      stripePriceId: 'price_corporation_unit',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    }),
  };
  prisma.$transaction = async (callback) => {
    const tx = {
      billingSubscription: {
        update: async (args) => {
          subscriptionUpdates.push(args);
          return {};
        },
      },
      user: {
        update: async (args) => {
          userUpdates.push(args);
          return {};
        },
      },
    };
    return callback(tx);
  };

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_subscription_deleted',
      type: 'customer.subscription.deleted',
      dataObject: {
        id: 'sub_unit_deleted',
        customer: 'cus_unit_deleted',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
        items: {
          data: [
            {
              price: { id: 'price_corporation_unit' },
            },
          ],
        },
      },
    });

    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);
    const result = await processStripeWebhookEvent({ rawBody, signature });

    assert.equal(result.ok, true);
    assert.equal(result.eventId, 'evt_unit_subscription_deleted');
    assert.equal(subscriptionUpdates.length, 1);
    assert.ok(userUpdates.some((call) => call?.data?.plan === 'PERSONAL'));
    assert.ok(
      userUpdates.some(
        (call) =>
          call?.data?.subscriptionStatus === 'CANCELED'
          && call?.data?.whiteLabelEnabled === false,
      ),
    );
    assert.equal(eventStore.get('evt_unit_subscription_deleted')?.status, 'PROCESSED');
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.billingSubscription = originalBillingSubscriptionDelegate;
    prisma.$transaction = originalTransaction;
  }
});

test('processStripeWebhookEvent marca payment como FAILED em payment_intent.payment_failed', async () => {
  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalPaymentDelegate = prisma.payment;

  const paymentUpdates = [];

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.payment = {
    ...originalPaymentDelegate,
    findFirst: async () => ({
      stripeSession: 'cs_unit_payment_failed',
      amount: 12_900,
      currency: 'BRL',
    }),
    update: async (args) => {
      paymentUpdates.push(args);
      return {};
    },
  };

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_payment_failed',
      type: 'payment_intent.payment_failed',
      dataObject: {
        id: 'pi_unit_payment_failed',
        status: 'requires_payment_method',
        currency: 'brl',
      },
    });

    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);
    const result = await processStripeWebhookEvent({ rawBody, signature });

    assert.equal(result.ok, true);
    assert.equal(paymentUpdates.length, 1);
    assert.equal(paymentUpdates[0]?.data?.status, 'FAILED');
    assert.equal(paymentUpdates[0]?.data?.amount, 12_900);
    assert.equal(eventStore.get('evt_unit_payment_failed')?.status, 'PROCESSED');
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.payment = originalPaymentDelegate;
  }
});

test('processStripeWebhookEvent falha com BILLING_PRICE_NOT_CONFIGURED quando price_id é desconhecido', async () => {
  delete process.env.STRIPE_PRICE_DIAMOND_CONSULTING;

  const eventStore = new Map();
  const stripeWebhookEventMocks = createStripeWebhookMocks(eventStore);
  const originalStripeWebhookEventDelegate = prisma.stripeWebhookEvent;
  const originalBillingSubscriptionDelegate = prisma.billingSubscription;
  const originalPaymentDelegate = prisma.payment;
  const originalTransaction = prisma.$transaction;

  prisma.stripeWebhookEvent = {
    ...originalStripeWebhookEventDelegate,
    ...stripeWebhookEventMocks,
  };
  prisma.billingSubscription = {
    ...originalBillingSubscriptionDelegate,
    findUnique: async () => null,
  };
  prisma.payment = {
    ...originalPaymentDelegate,
    findFirst: async () => ({ userId: 'user_unit' }),
  };
  prisma.$transaction = async (callback) => callback({ billingSubscription: { upsert: async () => ({}) }, user: { update: async () => ({}) } });

  try {
    const payload = buildStripeEventPayload({
      id: 'evt_unit_unknown_price',
      type: 'customer.subscription.updated',
      dataObject: {
        id: 'sub_unit_unknown',
        customer: 'cus_unit_unknown',
        status: 'active',
        items: {
          data: [
            {
              price: { id: 'price_unknown_unit' },
            },
          ],
        },
      },
    });

    const rawBody = Buffer.from(payload);
    const signature = createStripeSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET);

    await assert.rejects(
      () => processStripeWebhookEvent({ rawBody, signature }),
      (error) => error?.code === 'BILLING_PRICE_NOT_CONFIGURED',
    );

    assert.equal(eventStore.get('evt_unit_unknown_price')?.status, 'FAILED');
  } finally {
    prisma.stripeWebhookEvent = originalStripeWebhookEventDelegate;
    prisma.billingSubscription = originalBillingSubscriptionDelegate;
    prisma.payment = originalPaymentDelegate;
    prisma.$transaction = originalTransaction;
  }
});
