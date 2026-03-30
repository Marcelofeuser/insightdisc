import Stripe from 'stripe';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import {
  getRecurringCreditsByPlan,
  normalizePlanId,
  resolveCheckoutCatalogEntry,
  resolveOrderBumpEntry,
  resolveStripePaymentMethods,
} from './stripe-catalog.js';

function createError(code = 'BILLING_ERROR', message = 'Erro de billing.') {
  const error = new Error(message);
  error.code = String(code || 'BILLING_ERROR').trim().toUpperCase();
  return error;
}

function appendQuery(urlValue, params = {}) {
  const url = new URL(urlValue);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toUpperText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized ? normalized.toUpperCase() : fallback;
}

function resolvePaymentStatus(value = '') {
  const normalized = toUpperText(value);
  if (normalized === 'PAID') return 'PAID';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'CANCELED') return 'CANCELED';
  return 'PENDING';
}

function resolveSubscriptionStatus(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'trialing') return 'TRIALING';
  if (normalized === 'active') return 'ACTIVE';
  if (normalized === 'past_due') return 'PAST_DUE';
  if (normalized === 'canceled') return 'CANCELED';
  if (normalized === 'unpaid') return 'UNPAID';
  return 'INCOMPLETE';
}

function resolveBillingPlanEnum(value = '') {
  const normalizedPlan = normalizePlanId(value);
  if (normalizedPlan === 'business') return 'BUSINESS';
  if (normalizedPlan === 'professional') return 'PROFESSIONAL';
  return 'PERSONAL';
}

function getStripeClient() {
  const secret = String(env.stripeSecretKey || '').trim();
  if (!secret) {
    throw createError('STRIPE_NOT_CONFIGURED', 'STRIPE_SECRET_KEY não configurada no backend.');
  }

  return new Stripe(secret, { apiVersion: '2024-12-18.acacia' });
}

async function applyCreditLedgerEntry(tx, {
  userId,
  paymentId,
  amount,
  source,
  externalRef,
  metadata = null,
} = {}) {
  const creditsAmount = Math.max(0, toInteger(amount, 0));
  if (!userId || creditsAmount < 1 || !source || !externalRef) {
    return { applied: false, balance: null };
  }

  const existingLedgerEntry = await tx.creditLedgerEntry.findUnique({
    where: {
      userId_source_externalRef: {
        userId,
        source,
        externalRef,
      },
    },
  });

  if (existingLedgerEntry) {
    return {
      applied: false,
      balance: Number(existingLedgerEntry.balanceAfter || 0),
    };
  }

  const credit = await tx.credit.upsert({
    where: { userId },
    create: { userId, balance: creditsAmount },
    update: { balance: { increment: creditsAmount } },
  });

  await tx.creditLedgerEntry.create({
    data: {
      userId,
      paymentId: paymentId || null,
      source,
      externalRef,
      amount: creditsAmount,
      balanceAfter: Number(credit.balance || 0),
      metadata: metadata || undefined,
    },
  });

  return {
    applied: true,
    balance: Number(credit.balance || 0),
  };
}

async function upsertSubscription(tx, {
  userId,
  plan,
  status,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  canceledAt,
} = {}) {
  if (!userId || !stripeSubscriptionId) return null;

  const billingPlan = resolveBillingPlanEnum(plan);
  const subscriptionStatus = resolveSubscriptionStatus(status);

  return tx.billingSubscription.upsert({
    where: {
      stripeSubscriptionId,
    },
    create: {
      userId,
      plan: billingPlan,
      status: subscriptionStatus,
      stripeCustomerId: stripeCustomerId || null,
      stripeSubscriptionId,
      stripePriceId: stripePriceId || null,
      currentPeriodStart: currentPeriodStart || null,
      currentPeriodEnd: currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
      canceledAt: canceledAt || null,
    },
    update: {
      userId,
      plan: billingPlan,
      status: subscriptionStatus,
      stripeCustomerId: stripeCustomerId || null,
      stripePriceId: stripePriceId || null,
      currentPeriodStart: currentPeriodStart || null,
      currentPeriodEnd: currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
      canceledAt: canceledAt || null,
    },
  });
}

async function applyPlan(tx, userId, plan) {
  if (!userId || !plan) return;

  await tx.user.update({
    where: { id: userId },
    data: {
      plan: resolveBillingPlanEnum(plan),
    },
  });
}

function shouldTreatSessionAsPaid(eventType, paymentStatus) {
  const normalizedType = String(eventType || '').trim().toLowerCase();
  if (normalizedType === 'checkout.session.async_payment_succeeded') return true;
  return String(paymentStatus || '').trim().toLowerCase() === 'paid';
}

function shouldTreatSessionAsFailed(eventType) {
  const normalizedType = String(eventType || '').trim().toLowerCase();
  return normalizedType === 'checkout.session.async_payment_failed';
}

async function processCheckoutSessionEvent(eventType, session) {
  const stripeSessionId = String(session?.id || '').trim();
  if (!stripeSessionId) {
    throw createError('WEBHOOK_SESSION_ID_MISSING', 'Evento Stripe sem session id.');
  }

  const metadata = session?.metadata || {};
  const existingPayment = await prisma.payment.findUnique({
    where: { stripeSession: stripeSessionId },
  });

  const userId = String(metadata?.userId || existingPayment?.userId || '').trim();
  if (!userId) {
    throw createError('WEBHOOK_USER_ID_MISSING', 'Usuário não identificado no checkout Stripe.');
  }

  const rawPlanTarget = String(
    metadata?.planTarget
    || metadata?.planId
    || metadata?.plan
    || '',
  ).trim();
  const planTarget = normalizePlanId(rawPlanTarget);
  const checkoutMode = String(metadata?.checkoutMode || session?.mode || '').trim().toLowerCase();
  const isSubscriptionCheckout = checkoutMode === 'subscription';
  const creditsToGrant = Math.max(0, toInteger(metadata?.creditsToGrant || metadata?.credits, 0));
  const creditsToApplyNow = isSubscriptionCheckout ? 0 : creditsToGrant;

  const paid = shouldTreatSessionAsPaid(eventType, session?.payment_status);
  const failed = shouldTreatSessionAsFailed(eventType);
  const paymentStatus = paid ? 'PAID' : failed ? 'FAILED' : 'PENDING';

  const stripeSubscriptionId = String(session?.subscription || existingPayment?.stripeSubscriptionId || '').trim();
  const stripeCustomerId = String(session?.customer || existingPayment?.stripeCustomerId || '').trim();
  const stripePaymentIntent = String(session?.payment_intent || existingPayment?.stripePaymentIntent || '').trim();
  const amount = toInteger(session?.amount_total, toInteger(existingPayment?.amount, 0));
  const currency = toUpperText(session?.currency, toUpperText(existingPayment?.currency, 'BRL'));

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { stripeSession: stripeSessionId },
      create: {
        userId,
        creditsAdded: creditsToApplyNow,
        amount,
        stripeSession: stripeSessionId,
        status: resolvePaymentStatus(paymentStatus),
        productId: String(metadata?.checkoutItemId || metadata?.product || ''),
        mode: String(metadata?.checkoutMode || session?.mode || ''),
        currency,
        stripePaymentIntent: stripePaymentIntent || null,
        stripeCustomerId: stripeCustomerId || null,
        stripeSubscriptionId: stripeSubscriptionId || null,
        metadata,
      },
      update: {
        userId,
        creditsAdded: creditsToApplyNow,
        amount,
        status: resolvePaymentStatus(paymentStatus),
        productId: String(metadata?.checkoutItemId || metadata?.product || ''),
        mode: String(metadata?.checkoutMode || session?.mode || ''),
        currency,
        stripePaymentIntent: stripePaymentIntent || null,
        stripeCustomerId: stripeCustomerId || null,
        stripeSubscriptionId: stripeSubscriptionId || null,
        metadata,
      },
    });

    if (paid && planTarget) {
      await applyPlan(tx, userId, planTarget);
    }

    if (paid && creditsToApplyNow > 0) {
      await applyCreditLedgerEntry(tx, {
        userId,
        paymentId: payment.id,
        amount: creditsToApplyNow,
        source: 'stripe_checkout_session',
        externalRef: stripeSessionId,
        metadata: {
          eventType,
          checkoutItemId: String(metadata?.checkoutItemId || ''),
        },
      });
    }

    if (stripeSubscriptionId) {
      await upsertSubscription(tx, {
        userId,
        plan: planTarget || metadata?.planTarget || metadata?.plan,
        status: paid ? 'active' : failed ? 'past_due' : 'incomplete',
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: String(metadata?.stripePriceId || ''),
      });
    }
  });
}

async function processInvoiceEvent(eventType, invoice) {
  const invoiceId = String(invoice?.id || '').trim();
  if (!invoiceId) return;

  const subscriptionId = String(invoice?.subscription || '').trim();
  if (!subscriptionId) return;

  const subscription = await prisma.billingSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!subscription?.userId) return;

  const userId = subscription.userId;
  const paymentStatus =
    String(eventType || '').trim().toLowerCase() === 'invoice.payment_failed'
      ? 'FAILED'
      : 'PAID';
  const amount = toInteger(invoice?.amount_paid ?? invoice?.amount_due, 0);
  const currency = toUpperText(invoice?.currency, 'BRL');
  const recurringCredits = paymentStatus === 'PAID'
    ? Math.max(0, getRecurringCreditsByPlan(String(subscription.plan || '').toLowerCase()))
    : 0;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { stripeSession: invoiceId },
      create: {
        userId,
        creditsAdded: recurringCredits,
        amount,
        stripeSession: invoiceId,
        status: resolvePaymentStatus(paymentStatus),
        productId: String(subscription.plan || '').toLowerCase(),
        mode: 'subscription',
        currency,
        stripePaymentIntent: String(invoice?.payment_intent || '') || null,
        stripeCustomerId: String(invoice?.customer || '') || null,
        stripeSubscriptionId: subscriptionId,
        metadata: {
          eventType,
          invoiceId,
        },
      },
      update: {
        userId,
        creditsAdded: recurringCredits,
        amount,
        status: resolvePaymentStatus(paymentStatus),
        productId: String(subscription.plan || '').toLowerCase(),
        mode: 'subscription',
        currency,
        stripePaymentIntent: String(invoice?.payment_intent || '') || null,
        stripeCustomerId: String(invoice?.customer || '') || null,
        stripeSubscriptionId: subscriptionId,
        metadata: {
          eventType,
          invoiceId,
        },
      },
    });

    if (paymentStatus === 'PAID') {
      if (recurringCredits > 0) {
        await applyCreditLedgerEntry(tx, {
          userId,
          paymentId: payment.id,
          amount: recurringCredits,
          source: 'stripe_invoice',
          externalRef: invoiceId,
          metadata: { subscriptionId },
        });
      }

      await applyPlan(tx, userId, String(subscription.plan || '').toLowerCase());
    }

    await upsertSubscription(tx, {
      userId,
      plan: String(subscription.plan || '').toLowerCase(),
      status: paymentStatus === 'PAID' ? 'active' : 'past_due',
      stripeCustomerId: String(invoice?.customer || '') || null,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: String(invoice?.lines?.data?.[0]?.price?.id || subscription.stripePriceId || ''),
      currentPeriodStart: invoice?.lines?.data?.[0]?.period?.start
        ? new Date(Number(invoice.lines.data[0].period.start) * 1000)
        : subscription.currentPeriodStart,
      currentPeriodEnd: invoice?.lines?.data?.[0]?.period?.end
        ? new Date(Number(invoice.lines.data[0].period.end) * 1000)
        : subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
    });
  });
}

async function processSubscriptionLifecycleEvent(subscription) {
  const subscriptionId = String(subscription?.id || '').trim();
  if (!subscriptionId) return;

  const existingSubscription = await prisma.billingSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!existingSubscription?.userId) return;

  await prisma.billingSubscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: resolveSubscriptionStatus(subscription?.status),
      currentPeriodStart: subscription?.current_period_start
        ? new Date(Number(subscription.current_period_start) * 1000)
        : existingSubscription.currentPeriodStart,
      currentPeriodEnd: subscription?.current_period_end
        ? new Date(Number(subscription.current_period_end) * 1000)
        : existingSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      canceledAt: subscription?.canceled_at
        ? new Date(Number(subscription.canceled_at) * 1000)
        : existingSubscription.canceledAt,
      stripeCustomerId: String(subscription?.customer || existingSubscription.stripeCustomerId || '') || null,
      stripePriceId:
        String(subscription?.items?.data?.[0]?.price?.id || existingSubscription.stripePriceId || '') || null,
    },
  });
}

async function processPaymentIntentEvent(paymentIntent) {
  const paymentIntentId = String(paymentIntent?.id || '').trim();
  if (!paymentIntentId) return;

  const payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntent: paymentIntentId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!payment) return;

  await prisma.payment.update({
    where: { stripeSession: payment.stripeSession },
    data: {
      status: 'PAID',
      amount: toInteger(paymentIntent?.amount_received, payment.amount),
      currency: toUpperText(paymentIntent?.currency, payment.currency || 'BRL'),
    },
  });
}

async function markWebhookEventAsFailed(stripeEventId, error) {
  await prisma.stripeWebhookEvent.update({
    where: { stripeEventId },
    data: {
      status: 'FAILED',
      errorMessage: String(error?.message || error || 'WEBHOOK_PROCESSING_FAILED').slice(0, 1024),
      processedAt: new Date(),
    },
  });
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveCheckoutWorkspaceId({ userId, user = null, inputWorkspaceId = '' } = {}) {
  const explicit = String(inputWorkspaceId || '').trim();
  if (explicit) return explicit;

  const fromUser =
    String(
      user?.active_workspace_id
      || user?.activeWorkspaceId
      || user?.tenant_id
      || user?.tenantId
      || '',
    ).trim();
  if (fromUser) return fromUser;

  if (!userId) return '';

  const ownedOrganization = await prisma.organization.findFirst({
    where: { ownerId: userId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (ownedOrganization?.id) return String(ownedOrganization.id);

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { createdAt: 'asc' },
  });
  return String(membership?.organizationId || '').trim();
}

export function buildStripeCheckoutMetadata({
  userId = '',
  user = null,
  input = {},
  checkoutItem = {},
  orderBump = null,
  creditsToGrant = 0,
  resolvedWorkspaceId = '',
} = {}) {
  const normalizedEmail = String(user?.email || '').trim().toLowerCase();
  return {
    userId: String(userId || ''),
    checkoutItemId: String(checkoutItem.id || ''),
    checkoutMode: String(checkoutItem.mode || ''),
    planTarget: String(checkoutItem.planTarget || ''),
    planId: String(checkoutItem.planTarget || checkoutItem.id || ''),
    creditsToGrant: String(Math.max(0, toInteger(creditsToGrant, 0))),
    email: normalizedEmail,
    flow: String(input.flow || ''),
    assessmentId: String(input.assessmentId || ''),
    token: String(input.token || ''),
    giftToken: String(input.giftToken || ''),
    product: String(input.product || checkoutItem.id || ''),
    productType: String(input.productType || checkoutItem.type || ''),
    stripePriceId: String(checkoutItem.priceId || ''),
    orderBumpId: String(orderBump?.id || ''),
    orderBumpPriceId: String(orderBump?.priceId || ''),
    workspaceId: String(resolvedWorkspaceId || ''),
    accountId: String(resolvedWorkspaceId || ''),
  };
}

export async function createBillingCheckoutSession({ userId, user = null, input = {} } = {}) {
  if (!userId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para iniciar o checkout.');
  }

  const checkoutItem = resolveCheckoutCatalogEntry(input);
  const orderBumpItem = resolveOrderBumpEntry(input);
  const stripe = getStripeClient();
  const creditsToApplyNow = checkoutItem.mode === 'subscription' ? 0 : Number(checkoutItem.creditsToGrant || 0);
  const resolvedWorkspaceId = await resolveCheckoutWorkspaceId({
    userId,
    user,
    inputWorkspaceId: input.workspaceId,
  });

  const successUrl = appendQuery(
    input.successUrl || `${env.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    {
      product: checkoutItem.id,
      flow: String(input.flow || ''),
    },
  );
  const cancelUrl =
    input.cancelUrl
    || `${env.appUrl}/checkout/cancel?product=${encodeURIComponent(checkoutItem.id)}`;

  const metadata = buildStripeCheckoutMetadata({
    userId,
    user,
    input,
    checkoutItem,
    orderBump: orderBumpItem,
    creditsToGrant: creditsToApplyNow,
    resolvedWorkspaceId,
  });

  const lineItems = [
    {
      price: checkoutItem.priceId,
      quantity: checkoutItem.quantity,
    },
  ];

  if (orderBumpItem?.priceId) {
    lineItems.push({
      price: orderBumpItem.priceId,
      quantity: orderBumpItem.quantity || 1,
    });
  }

  const stripePayload = {
    mode: checkoutItem.mode,
    line_items: lineItems,
    payment_method_types: resolveStripePaymentMethods(checkoutItem.mode, checkoutItem.currency),
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata,
    locale: 'pt-BR',
    billing_address_collection: 'auto',
  };

  const userEmail = String(user?.email || '').trim();
  if (userEmail) {
    stripePayload.customer_email = userEmail;
  }

  if (checkoutItem.mode === 'payment') {
    stripePayload.payment_method_options = {
      pix: {
        expires_after_seconds: 60 * 60,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(stripePayload);

  await prisma.payment.upsert({
    where: { stripeSession: session.id },
    create: {
      userId,
      creditsAdded: creditsToApplyNow,
      amount: toInteger(session?.amount_total, 0),
      stripeSession: session.id,
      status: 'PENDING',
      productId: checkoutItem.id,
      mode: checkoutItem.mode,
      currency: toUpperText(session?.currency, 'BRL'),
      stripePaymentIntent: String(session?.payment_intent || '') || null,
      stripeCustomerId: String(session?.customer || '') || null,
      stripeSubscriptionId: String(session?.subscription || '') || null,
      metadata,
    },
    update: {
      userId,
      creditsAdded: creditsToApplyNow,
      amount: toInteger(session?.amount_total, 0),
      status: 'PENDING',
      productId: checkoutItem.id,
      mode: checkoutItem.mode,
      currency: toUpperText(session?.currency, 'BRL'),
      stripePaymentIntent: String(session?.payment_intent || '') || null,
      stripeCustomerId: String(session?.customer || '') || null,
      stripeSubscriptionId: String(session?.subscription || '') || null,
      metadata,
    },
  });

  return {
    ok: true,
    provider: 'stripe',
    checkoutUrl: String(session?.url || '').trim(),
    sessionId: session.id,
    mode: checkoutItem.mode,
    paymentMethods: resolveStripePaymentMethods(checkoutItem.mode, checkoutItem.currency),
      item: {
        id: checkoutItem.id,
        type: checkoutItem.type,
        creditsToGrant: checkoutItem.creditsToGrant,
        planTarget: checkoutItem.planTarget || null,
        currency: checkoutItem.currency,
        priceId: checkoutItem.priceId,
        orderBump: orderBumpItem
          ? {
              id: orderBumpItem.id,
              priceId: orderBumpItem.priceId,
            }
          : null,
      },
  };
}

export async function getCheckoutSessionStatusForUser({ sessionId, userId } = {}) {
  if (!sessionId) {
    throw createError('CHECKOUT_SESSION_REQUIRED', 'sessionId é obrigatório.');
  }

  const payment = await prisma.payment.findUnique({
    where: { stripeSession: sessionId },
  });

  if (!payment) {
    return {
      ok: true,
      found: false,
      status: 'pending',
      paymentStatus: 'PENDING',
      creditsAdded: 0,
      amount: 0,
      currency: 'BRL',
    };
  }

  if (userId && payment.userId !== userId) {
    throw createError('FORBIDDEN', 'Sessão de checkout pertence a outro usuário.');
  }

  const normalizedStatus = resolvePaymentStatus(payment.status);
  const credit = await prisma.credit.findUnique({
    where: {
      userId: payment.userId,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: {
      id: true,
      plan: true,
    },
  });

  return {
    ok: true,
    found: true,
    status: normalizedStatus === 'PAID' ? 'paid' : normalizedStatus === 'FAILED' ? 'failed' : 'pending',
    paymentStatus: normalizedStatus,
    sessionId,
    userId: payment.userId,
    creditsAdded: Number(payment.creditsAdded || 0),
    balance: Number(credit?.balance || 0),
    amount: Number(payment.amount || 0),
    currency: String(payment.currency || 'BRL'),
    plan: String(user?.plan || 'PERSONAL').toLowerCase(),
    updatedAt: toDateOrNull(payment.updatedAt || payment.createdAt),
  };
}

export async function processStripeWebhookEvent({ rawBody, signature } = {}) {
  if (!Buffer.isBuffer(rawBody)) {
    throw createError('INVALID_WEBHOOK_BODY', 'Payload raw do webhook Stripe é obrigatório.');
  }

  if (!signature) {
    throw createError('STRIPE_SIGNATURE_REQUIRED', 'Header Stripe-Signature não informado.');
  }

  if (!env.stripeWebhookSecret) {
    throw createError('STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED', 'STRIPE_WEBHOOK_SECRET não configurada.');
  }

  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  const stripeEventId = String(event?.id || '').trim();
  if (!stripeEventId) {
    throw createError('INVALID_STRIPE_EVENT', 'Evento Stripe sem id.');
  }

  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId },
  });
  if (alreadyProcessed?.status === 'PROCESSED') {
    return {
      ok: true,
      duplicate: true,
      eventId: stripeEventId,
      eventType: String(event?.type || ''),
    };
  }

  if (!alreadyProcessed) {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId,
        eventType: String(event?.type || ''),
        livemode: Boolean(event?.livemode),
        payload: event,
        status: 'PROCESSING',
      },
    });
  } else {
    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        eventType: String(event?.type || ''),
        livemode: Boolean(event?.livemode),
        payload: event,
        status: 'PROCESSING',
        errorMessage: null,
      },
    });
  }

  try {
    const type = String(event?.type || '').trim();

    if (
      type === 'checkout.session.completed'
      || type === 'checkout.session.async_payment_succeeded'
      || type === 'checkout.session.async_payment_failed'
    ) {
      await processCheckoutSessionEvent(type, event?.data?.object || {});
    } else if (type === 'invoice.payment_succeeded' || type === 'invoice.payment_failed') {
      await processInvoiceEvent(type, event?.data?.object || {});
    } else if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      await processSubscriptionLifecycleEvent(event?.data?.object || {});
    } else if (type === 'payment_intent.succeeded') {
      await processPaymentIntentEvent(event?.data?.object || {});
    }

    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    return {
      ok: true,
      duplicate: false,
      eventId: stripeEventId,
      eventType: type,
    };
  } catch (error) {
    await markWebhookEventAsFailed(stripeEventId, error);
    throw error;
  }
}
