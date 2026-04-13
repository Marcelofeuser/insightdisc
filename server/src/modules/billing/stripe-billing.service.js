import Stripe from 'stripe';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { sendEmail } from '../../services/email.service.js';
import {
  getRecurringCreditsByPlan,
  normalizePlanId,
  resolveCheckoutCatalogEntry,
  resolveOrderBumpEntry,
  resolveWhiteLabelAddonEntry,
  resolveStripePaymentMethods,
} from './stripe-catalog.js';
import { resolvePlanFromPrice } from './stripe-price-map.js';

function createError(code = 'BILLING_ERROR', message = 'Erro de billing.') {
  const error = new Error(message);
  error.code = String(code || 'BILLING_ERROR').trim().toUpperCase();
  return error;
}

const STRIPE_CHECKOUT_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';
const STRIPE_CHECKOUT_SESSION_PLACEHOLDER_TOKEN = '__CHECKOUT_SESSION_ID__';

function protectStripeCheckoutSessionPlaceholder(value = '') {
  return String(value || '')
    .replaceAll(STRIPE_CHECKOUT_SESSION_PLACEHOLDER, STRIPE_CHECKOUT_SESSION_PLACEHOLDER_TOKEN)
    .replace(/%7BCHECKOUT_SESSION_ID%7D/gi, STRIPE_CHECKOUT_SESSION_PLACEHOLDER_TOKEN);
}

function restoreStripeCheckoutSessionPlaceholder(value = '') {
  return String(value || '').replaceAll(
    STRIPE_CHECKOUT_SESSION_PLACEHOLDER_TOKEN,
    STRIPE_CHECKOUT_SESSION_PLACEHOLDER,
  );
}

function appendQuery(urlValue, params = {}) {
  const url = new URL(protectStripeCheckoutSessionPlaceholder(urlValue));
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return restoreStripeCheckoutSessionPlaceholder(url.toString());
}

function resolveSafeCheckoutRedirectUrl(requestedUrl, fallbackUrl) {
  const raw = String(requestedUrl || '').trim();
  if (!raw) return fallbackUrl;

  try {
    const fallbackOrigin = new URL(fallbackUrl).origin;
    const parsed = new URL(protectStripeCheckoutSessionPlaceholder(raw));
    if (parsed.origin !== fallbackOrigin) {
      console.warn('[billing] ignoring unsafe checkout redirect url', { requestedUrl: raw });
      return fallbackUrl;
    }
    return restoreStripeCheckoutSessionPlaceholder(parsed.toString());
  } catch {
    return fallbackUrl;
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function isAllowedCheckoutReturnOrigin(origin = '', fallbackAppUrl = '') {
  const normalizedOrigin = String(origin || '').trim();
  if (!normalizedOrigin) return false;

  try {
    const fallbackOrigin = new URL(String(fallbackAppUrl || '')).origin;
    if (normalizedOrigin === fallbackOrigin) return true;
  } catch {
    // ignore
  }

  if (env.nodeEnv === 'production') return false;

  try {
    const hostname = new URL(normalizedOrigin).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

function resolveCheckoutAppUrl(input = {}, fallbackAppUrl = '') {
  const normalizedFallback = normalizeBaseUrl(fallbackAppUrl);
  const candidates = [input?.successUrl, input?.cancelUrl];

  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;

    try {
      const origin = new URL(raw).origin;
      if (isAllowedCheckoutReturnOrigin(origin, normalizedFallback)) {
        return normalizeBaseUrl(origin);
      }
    } catch {
      // ignore invalid URL
    }
  }

  return normalizedFallback;
}

const STRIPE_INLINE_PRICE_FALLBACK_CENTS = Object.freeze({
  disc_individual: 5990,
  personal: 9990,
  insider: 12990,
  professional: 19990,
  business: 39990,
  business_corporation: 99990,
  diamond_consulting: 999000,
  'advanced-analysis': 1990,
  'white-label-one-time': 29900,
});

const STRIPE_INLINE_PRICE_FALLBACK_NAMES = Object.freeze({
  disc_individual: 'DISC Individual',
  personal: 'Plano Personal',
  insider: 'Plano Insider',
  professional: 'Plano Professional',
  business: 'Plano Business',
  business_corporation: 'Business Corporation',
  diamond_consulting: 'Diamond Consulting',
  'advanced-analysis': 'Análise avançada com IA',
  'white-label-one-time': 'White Label (pagamento único)',
});

const BILLING_ITEM_LABELS = Object.freeze({
  disc_individual: 'DISC Individual',
  single: 'DISC Individual',
  report_unlock: 'Desbloqueio de relatório',
  gift_assessment: 'Gift DISC',
  gift: 'Gift DISC',
  personal: 'Plano Personal',
  insider: 'Plano Insider',
  professional: 'Plano Professional',
  business: 'Plano Business',
  business_corporation: 'Business Corporation',
  diamond_consulting: 'Diamond Consulting',
  'advanced-analysis': 'Análise avançada com IA',
  'white-label-one-time': 'White Label',
});

function isStripeNoSuchPriceError(error) {
  const code = String(error?.code || '').trim().toLowerCase();
  if (code !== 'resource_missing') return false;
  const message = String(error?.message || '').trim().toLowerCase();
  return message.includes('no such price');
}

function buildInlinePriceDataLineItem(entry, { currency = 'brl' } = {}) {
  const id = String(entry?.id || '').trim();
  const amountCents = STRIPE_INLINE_PRICE_FALLBACK_CENTS[id];
  if (!id || !Number.isFinite(amountCents) || amountCents <= 0) return null;

  const name = STRIPE_INLINE_PRICE_FALLBACK_NAMES[id] || id;
  const quantity = Math.max(1, Number(entry?.quantity || 1));
  const isRecurring = String(entry?.mode || '').trim().toLowerCase() === 'subscription';

  return {
    price_data: {
      currency: String(currency || 'brl').trim().toLowerCase(),
      unit_amount: Math.trunc(amountCents),
      ...(isRecurring ? { recurring: { interval: 'month' } } : {}),
      product_data: {
        name,
      },
    },
    quantity,
  };
}

function buildInlinePriceDataLineItems({
  checkoutItem,
  orderBumpItem,
  whiteLabelAddonItem,
} = {}) {
  const currency = String(checkoutItem?.currency || 'brl').trim().toLowerCase();

  const lineItems = [];
  const baseItem = buildInlinePriceDataLineItem(checkoutItem, { currency });
  if (baseItem) lineItems.push(baseItem);

  if (orderBumpItem?.id) {
    const bumpItem = buildInlinePriceDataLineItem(orderBumpItem, { currency });
    if (bumpItem) lineItems.push(bumpItem);
  }

  if (whiteLabelAddonItem?.id) {
    const addonItem = buildInlinePriceDataLineItem(whiteLabelAddonItem, { currency });
    if (addonItem) lineItems.push(addonItem);
  }

  return lineItems;
}

async function createStripeCheckoutSessionWithFallback({
  stripe,
  stripePayload,
  checkoutItem,
  orderBumpItem,
  whiteLabelAddonItem,
} = {}) {
  try {
    return await stripe.checkout.sessions.create(stripePayload);
  } catch (error) {
    if (env.nodeEnv === 'production' || !isStripeNoSuchPriceError(error)) {
      throw error;
    }

    const fallbackLineItems = buildInlinePriceDataLineItems({
      checkoutItem,
      orderBumpItem,
      whiteLabelAddonItem,
    });

    if (!fallbackLineItems.length) {
      throw error;
    }

    console.warn('[billing] falling back to inline price_data for checkout session', {
      checkoutItemId: checkoutItem?.id || 'n/a',
      mode: stripePayload?.mode,
      error: String(error?.message || error),
    });

    return stripe.checkout.sessions.create({
      ...stripePayload,
      line_items: fallbackLineItems,
    });
  }
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toUpperText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized ? normalized.toUpperCase() : fallback;
}

function formatCurrencyForEmail(amount = 0, currency = 'BRL') {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return '';

  const normalizedCurrency = String(currency || 'BRL').trim().toUpperCase();
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(numericAmount / 100);
  } catch {
    return `${normalizedCurrency} ${(numericAmount / 100).toFixed(2)}`;
  }
}

function resolveBillingItemLabel(itemKey = '') {
  const normalized = String(itemKey || '').trim().toLowerCase();
  return BILLING_ITEM_LABELS[normalized] || normalized || 'Compra InsightDISC';
}

async function sendBillingStatusEmail({
  to = '',
  status = 'success',
  itemKey = '',
  amount = 0,
  currency = 'BRL',
  isSubscription = false,
} = {}) {
  if (env.nodeEnv !== 'production') return;

  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient) return;

  const normalizedStatus = String(status || '').trim().toLowerCase();
  const itemLabel = resolveBillingItemLabel(itemKey);
  const amountLabel = formatCurrencyForEmail(amount, currency);
  const appUrl = normalizeBaseUrl(env.appUrl) || 'https://app.insightdisc.com';
  const targetUrl = `${appUrl}/Pricing`;

  const subject =
    normalizedStatus === 'failed'
      ? 'Pagamento não confirmado - InsightDISC'
      : isSubscription
        ? 'Assinatura confirmada - InsightDISC'
        : 'Pagamento confirmado - InsightDISC';
  const title =
    normalizedStatus === 'failed'
      ? 'Nao foi possivel confirmar sua cobranca.'
      : isSubscription
        ? 'Sua assinatura foi confirmada.'
        : 'Seu pagamento foi confirmado.';
  const description =
    normalizedStatus === 'failed'
      ? 'Houve uma falha na cobranca. Revise seu metodo de pagamento para manter o acesso.'
      : isSubscription
        ? 'Sua assinatura esta ativa e o acesso ja foi sincronizado no InsightDISC.'
        : 'Sua compra ja foi sincronizada e o acesso foi liberado no InsightDISC.';

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <p style="margin:0 0 12px">${description}</p>
      <p style="margin:0 0 8px"><strong>Item:</strong> ${itemLabel}</p>
      ${amountLabel ? `<p style="margin:0 0 16px"><strong>Valor:</strong> ${amountLabel}</p>` : ''}
      <p style="margin:0 0 20px">
        <a href="${targetUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px">
          Abrir minha conta
        </a>
      </p>
      <p style="margin:0;color:#475569;font-size:14px">InsightDISC</p>
    </div>
  `;

  try {
    await sendEmail({
      to: recipient,
      subject,
      html,
    });
  } catch (error) {
    console.error('[billing][email] falha ao enviar e-mail de cobranca', {
      to: recipient,
      subject,
      error: String(error?.message || error),
    });
  }
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

function subscriptionStatusKeepsEntitlements(value = '') {
  const normalized = resolveSubscriptionStatus(value);
  return normalized === 'ACTIVE' || normalized === 'TRIALING';
}

function resolveBillingPlanEnum(value = '') {
  const normalizedPlan = normalizePlanId(value);
  if (normalizedPlan === 'diamond_consulting' || normalizedPlan === 'diamond') return 'DIAMOND';
  if (normalizedPlan === 'business' || normalizedPlan === 'business_corporation') return 'BUSINESS';
  if (normalizedPlan === 'professional' || normalizedPlan === 'insider') return 'PROFESSIONAL';
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

async function applyStripeIdentity(tx, userId, {
  stripeCustomerId = '',
  stripeSubscriptionId = '',
  subscriptionStatus = '',
  whiteLabelEnabled = undefined,
} = {}) {
  if (!userId) return;

  const updates = {};

  const normalizedCustomerId = String(stripeCustomerId || '').trim();
  if (normalizedCustomerId) {
    updates.stripeCustomerId = normalizedCustomerId;
  }

  const normalizedSubscriptionId = String(stripeSubscriptionId || '').trim();
  if (normalizedSubscriptionId) {
    updates.stripeSubscriptionId = normalizedSubscriptionId;
  }

  const rawStatus = String(subscriptionStatus || '').trim();
  if (rawStatus) {
    updates.subscriptionStatus = resolveSubscriptionStatus(rawStatus);
  }

  if (typeof whiteLabelEnabled === 'boolean') {
    updates.whiteLabelEnabled = whiteLabelEnabled;
  }

  if (Object.keys(updates).length === 0) return;

  await tx.user.update({
    where: { id: userId },
    data: updates,
  });
}

async function syncSubscriptionAccess(tx, userId, {
  plan = '',
  stripeCustomerId = '',
  stripeSubscriptionId = '',
  subscriptionStatus = '',
  whiteLabelEnabled = false,
} = {}) {
  if (!userId) return;

  const keepsEntitlements = subscriptionStatusKeepsEntitlements(subscriptionStatus);
  await applyPlan(tx, userId, keepsEntitlements ? plan : 'personal');
  await applyStripeIdentity(tx, userId, {
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    whiteLabelEnabled: keepsEntitlements && Boolean(whiteLabelEnabled),
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
  const requestedUserId = String(metadata?.userId || '').trim();
  const checkoutEmail = String(session?.customer_details?.email || session?.customer_email || '')
    .trim()
    .toLowerCase();
  const metadataEmail = String(metadata?.email || '').trim().toLowerCase();
  const emailCandidate = checkoutEmail || metadataEmail;

  const stripeCheckoutPriceId = String(metadata?.stripePriceId || '').trim();
  const rawPlanTarget = String(
    metadata?.planTarget
    || metadata?.planId
    || metadata?.plan
    || '',
  ).trim();
  const checkoutMode = String(metadata?.checkoutMode || session?.mode || '').trim().toLowerCase();
  const isSubscriptionCheckout = checkoutMode === 'subscription';
  const planTarget = isSubscriptionCheckout
    ? normalizePlanId(resolvePlanFromPrice(stripeCheckoutPriceId))
    : normalizePlanId(rawPlanTarget);
  if (isSubscriptionCheckout && !planTarget) {
    throw createError(
      'BILLING_PRICE_NOT_CONFIGURED',
      `Preço Stripe não reconhecido para assinatura (${stripeCheckoutPriceId || 'N/A'}).`,
    );
  }

  const whiteLabelFromMetadata =
    String(metadata?.white_label || metadata?.whiteLabelAddon || '')
      .trim()
      .toLowerCase() === 'true';
  const whiteLabelIncludedByPlan =
    planTarget === 'business_corporation' || planTarget === 'diamond_consulting';
  const shouldEnableWhiteLabel = whiteLabelFromMetadata || whiteLabelIncludedByPlan;

  const creditsToGrant = Math.max(0, toInteger(metadata?.creditsToGrant || metadata?.credits, 0));
  const creditsToApplyNow = isSubscriptionCheckout ? 0 : creditsToGrant;

  const paid = shouldTreatSessionAsPaid(eventType, session?.payment_status);
  const failed = shouldTreatSessionAsFailed(eventType);
  const paymentStatus = paid ? 'PAID' : failed ? 'FAILED' : 'PENDING';

  const stripeSubscriptionFromSession = String(session?.subscription || '').trim();
  const stripeCustomerFromSession = String(session?.customer || '').trim();
  const stripePaymentIntentFromSession = String(session?.payment_intent || '').trim();
  const amountFromSession = toInteger(session?.amount_total, 0);
  const currencyFromSession = toUpperText(session?.currency, '');

  await prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findUnique({
      where: { stripeSession: stripeSessionId },
      select: {
        userId: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        stripePaymentIntent: true,
        amount: true,
        currency: true,
      },
    });

    const existingUserId = String(existingPayment?.userId || '').trim();
    if (existingUserId && requestedUserId && existingUserId !== requestedUserId) {
      throw createError('FORBIDDEN', 'Sessão de checkout pertence a outro usuário.');
    }

    let effectiveUserId = existingUserId || requestedUserId;
    if (!effectiveUserId && emailCandidate) {
      const userByEmail = await tx.user.findUnique({
        where: { email: emailCandidate },
        select: { id: true },
      });
      effectiveUserId = String(userByEmail?.id || '').trim();
    }

    if (!effectiveUserId) {
      console.warn('[STRIPE WEBHOOK] checkout sem usuário associado, ignorando processamento automático', {
        stripeSessionId,
        email: emailCandidate || 'n/a',
      });
      return;
    }

    if (!existingUserId && requestedUserId && emailCandidate) {
      const claimedUser = await tx.user.findUnique({
        where: { id: requestedUserId },
        select: { email: true },
      });
      const claimedEmail = String(claimedUser?.email || '').trim().toLowerCase();
      if (claimedEmail && claimedEmail !== emailCandidate) {
        throw createError('FORBIDDEN', 'Sessão de checkout pertence a outro e-mail.');
      }
    }

    const stripeSubscriptionId = String(
      stripeSubscriptionFromSession || existingPayment?.stripeSubscriptionId || '',
    ).trim();
    const stripeCustomerId = String(stripeCustomerFromSession || existingPayment?.stripeCustomerId || '').trim();
    const stripePaymentIntent = String(
      stripePaymentIntentFromSession || existingPayment?.stripePaymentIntent || '',
    ).trim();
    const amount = amountFromSession > 0 ? amountFromSession : toInteger(existingPayment?.amount, 0);
    const currency = currencyFromSession || toUpperText(existingPayment?.currency, 'BRL');

    const payment = await tx.payment.upsert({
      where: { stripeSession: stripeSessionId },
      create: {
        userId: effectiveUserId,
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

    if (requestedUserId && payment.userId !== requestedUserId) {
      throw createError('FORBIDDEN', 'Sessão de checkout pertence a outro usuário.');
    }

    const resolvedUserId = payment.userId;
    if (paid && planTarget) {
      await applyPlan(tx, resolvedUserId, planTarget);
    }

    if (paid && creditsToApplyNow > 0) {
      await applyCreditLedgerEntry(tx, {
        userId: resolvedUserId,
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
        userId: resolvedUserId,
        plan: planTarget || rawPlanTarget,
        status: paid ? 'active' : failed ? 'past_due' : 'incomplete',
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: stripeCheckoutPriceId,
      });
    }

    if (isSubscriptionCheckout) {
      await syncSubscriptionAccess(tx, resolvedUserId, {
        plan: planTarget || rawPlanTarget || 'personal',
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: paid ? 'active' : failed ? 'past_due' : 'incomplete',
        whiteLabelEnabled: shouldEnableWhiteLabel,
      });
    } else if (paid && shouldEnableWhiteLabel) {
      await applyStripeIdentity(tx, resolvedUserId, {
        subscriptionStatus: 'active',
        whiteLabelEnabled: true,
      });
    }
  });

  if (!isSubscriptionCheckout && emailCandidate && (paid || failed)) {
    void sendBillingStatusEmail({
      to: emailCandidate,
      status: paid ? 'success' : 'failed',
      itemKey: String(metadata?.checkoutItemId || metadata?.product || ''),
      amount: amountFromSession,
      currency: currencyFromSession || 'BRL',
      isSubscription: false,
    });
  }
}

async function processInvoiceEvent(eventType, invoice) {
  const invoiceId = String(invoice?.id || '').trim();
  if (!invoiceId) return;

  const subscriptionId = String(invoice?.subscription || '').trim();
  if (!subscriptionId) return;

  const stripeCustomerId = String(invoice?.customer || '').trim();
  const lineItems = Array.isArray(invoice?.lines?.data) ? invoice.lines.data : [];
  const linePriceIds = lineItems
    .map((item) => String(item?.price?.id || '').trim())
    .filter(Boolean);
  const resolvedPlanLine = lineItems
    .map((item) => {
      const priceId = String(item?.price?.id || '').trim();
      return {
        item,
        priceId,
        planKey: resolvePlanFromPrice(priceId),
      };
    })
    .find((entry) =>
      entry.priceId
      && entry.planKey
      && entry.planKey !== 'white_label_one_time'
      && entry.planKey !== 'disc_individual'
    );

  const subscription = await prisma.billingSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  let userId = String(subscription?.userId || '').trim();
  if (!userId) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscriptionId },
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
      },
    });
    userId = String(payment?.userId || '').trim();
  }
  if (!userId && stripeCustomerId) {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId },
      select: { id: true },
    });
    userId = String(user?.id || '').trim();
  }

  if (!userId) return;

  const planPriceId = String(resolvedPlanLine?.priceId || subscription?.stripePriceId || '').trim();
  const planKey = resolvePlanFromPrice(planPriceId);
  if (!planKey) {
    throw createError(
      'BILLING_PRICE_NOT_CONFIGURED',
      `Preço Stripe não reconhecido para invoice (${planPriceId || 'N/A'}).`,
    );
  }

  const whiteLabelPurchased = linePriceIds.some((priceId) => resolvePlanFromPrice(priceId) === 'white_label_one_time');
  const whiteLabelIncludedByPlan =
    planKey === 'business_corporation' || planKey === 'diamond_consulting';
  const shouldEnableWhiteLabel = whiteLabelPurchased || whiteLabelIncludedByPlan;

  const paymentStatus =
    String(eventType || '').trim().toLowerCase() === 'invoice.payment_failed'
      ? 'FAILED'
      : 'PAID';
  const amount = toInteger(invoice?.amount_paid ?? invoice?.amount_due, 0);
  const currency = toUpperText(invoice?.currency, 'BRL');
  const recurringCredits = paymentStatus === 'PAID'
    ? Math.max(0, getRecurringCreditsByPlan(planKey))
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
        productId: planKey,
        mode: 'subscription',
        currency,
        stripePaymentIntent: String(invoice?.payment_intent || '') || null,
        stripeCustomerId: stripeCustomerId || null,
        stripeSubscriptionId: subscriptionId,
        metadata: {
          eventType,
          invoiceId,
          subscriptionId,
          planKey,
          planPriceId,
          linePriceIds,
          whiteLabelPurchased,
          whiteLabelIncluded: whiteLabelIncludedByPlan,
        },
      },
      update: {
        userId,
        creditsAdded: recurringCredits,
        amount,
        status: resolvePaymentStatus(paymentStatus),
        productId: planKey,
        mode: 'subscription',
        currency,
        stripePaymentIntent: String(invoice?.payment_intent || '') || null,
        stripeCustomerId: stripeCustomerId || null,
        stripeSubscriptionId: subscriptionId,
        metadata: {
          eventType,
          invoiceId,
          subscriptionId,
          planKey,
          planPriceId,
          linePriceIds,
          whiteLabelPurchased,
          whiteLabelIncluded: whiteLabelIncludedByPlan,
        },
      },
    });

    if (paymentStatus === 'PAID' && recurringCredits > 0) {
      await applyCreditLedgerEntry(tx, {
        userId,
        paymentId: payment.id,
        amount: recurringCredits,
        source: 'stripe_invoice',
        externalRef: invoiceId,
        metadata: { subscriptionId },
      });
    }

    await upsertSubscription(tx, {
      userId,
      plan: planKey,
      status: paymentStatus === 'PAID' ? 'active' : 'past_due',
      stripeCustomerId: stripeCustomerId || null,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: planPriceId,
      currentPeriodStart: resolvedPlanLine?.item?.period?.start
        ? new Date(Number(resolvedPlanLine.item.period.start) * 1000)
        : subscription?.currentPeriodStart,
      currentPeriodEnd: resolvedPlanLine?.item?.period?.end
        ? new Date(Number(resolvedPlanLine.item.period.end) * 1000)
        : subscription?.currentPeriodEnd,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
      canceledAt: subscription?.canceledAt,
    });

    await syncSubscriptionAccess(tx, userId, {
      plan: planKey,
      stripeCustomerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: paymentStatus === 'PAID' ? 'active' : 'past_due',
      whiteLabelEnabled: shouldEnableWhiteLabel,
    });
  });

  if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    const billingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const billingEmail = String(billingUser?.email || '').trim().toLowerCase();
    if (billingEmail) {
      void sendBillingStatusEmail({
        to: billingEmail,
        status: eventType === 'invoice.payment_failed' ? 'failed' : 'success',
        itemKey: planKey,
        amount,
        currency,
        isSubscription: true,
      });
    }
  }
}

async function processSubscriptionLifecycleEvent(subscription) {
  const subscriptionId = String(subscription?.id || '').trim();
  if (!subscriptionId) return;

  const existingSubscription = await prisma.billingSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  const stripeCustomerId = String(subscription?.customer || '').trim();
  const stripePriceId = String(subscription?.items?.data?.[0]?.price?.id || '').trim();
  const planKey = resolvePlanFromPrice(stripePriceId);
  if (!planKey) {
    throw createError(
      'BILLING_PRICE_NOT_CONFIGURED',
      `Preço Stripe não reconhecido para assinatura (${stripePriceId || 'N/A'}).`,
    );
  }
  const whiteLabelIncludedByPlan =
    planKey === 'business_corporation' || planKey === 'diamond_consulting';
  const subscriptionStatus = resolveSubscriptionStatus(subscription?.status);

  if (!existingSubscription?.userId) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscriptionId },
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
      },
    });

    let userId = String(payment?.userId || '').trim();
    if (!userId && stripeCustomerId) {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId },
        select: { id: true },
      });
      userId = String(user?.id || '').trim();
    }
    if (!userId) return;

    await prisma.$transaction(async (tx) => {
      await upsertSubscription(tx, {
        userId,
        plan: planKey,
        status: subscription?.status,
        stripeCustomerId: stripeCustomerId || null,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: stripePriceId || null,
        currentPeriodStart: subscription?.current_period_start
          ? new Date(Number(subscription.current_period_start) * 1000)
          : null,
        currentPeriodEnd: subscription?.current_period_end
          ? new Date(Number(subscription.current_period_end) * 1000)
          : null,
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        canceledAt: subscription?.canceled_at
          ? new Date(Number(subscription.canceled_at) * 1000)
          : null,
      });

      await syncSubscriptionAccess(tx, userId, {
        plan: planKey,
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: subscription?.status,
        whiteLabelEnabled: whiteLabelIncludedByPlan,
      });
    });

    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.billingSubscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        plan: resolveBillingPlanEnum(planKey),
        status: subscriptionStatus,
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
        stripeCustomerId: stripeCustomerId || existingSubscription.stripeCustomerId || null,
        stripePriceId: stripePriceId || existingSubscription.stripePriceId || null,
      },
    });

    await syncSubscriptionAccess(tx, existingSubscription.userId, {
      plan: planKey,
      stripeCustomerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: subscription?.status,
      whiteLabelEnabled: whiteLabelIncludedByPlan,
    });
  });
}

async function processPaymentIntentEvent(eventType, paymentIntent) {
  const paymentIntentId = String(paymentIntent?.id || '').trim();
  if (!paymentIntentId) return;

  const payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntent: paymentIntentId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!payment) return;

  const normalizedEventType = String(eventType || '').trim().toLowerCase();
  const normalizedIntentStatus = String(paymentIntent?.status || '').trim().toLowerCase();
  const nextPaymentStatus =
    normalizedEventType === 'payment_intent.payment_failed'
      || normalizedIntentStatus === 'requires_payment_method'
      || normalizedIntentStatus === 'canceled'
      ? 'FAILED'
      : 'PAID';

  await prisma.payment.update({
    where: { stripeSession: payment.stripeSession },
    data: {
      status: nextPaymentStatus,
      amount:
        nextPaymentStatus === 'FAILED'
          ? payment.amount
          : toInteger(paymentIntent?.amount_received, payment.amount),
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

async function resolveStripeCustomerIdForUser({ userId, user = null } = {}) {
  const fromRequestUser = String(user?.stripeCustomerId || '').trim();
  if (fromRequestUser) return fromRequestUser;

  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return '';

  const persistedUser = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: { stripeCustomerId: true },
  });
  const fromUser = String(persistedUser?.stripeCustomerId || '').trim();
  if (fromUser) return fromUser;

  const activeSubscription = await prisma.billingSubscription.findFirst({
    where: {
      userId: normalizedUserId,
      stripeCustomerId: { not: null },
    },
    orderBy: [
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: { stripeCustomerId: true },
  });
  const fromSubscription = String(activeSubscription?.stripeCustomerId || '').trim();
  if (fromSubscription) return fromSubscription;

  const latestPayment = await prisma.payment.findFirst({
    where: {
      userId: normalizedUserId,
      stripeCustomerId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { stripeCustomerId: true },
  });

  return String(latestPayment?.stripeCustomerId || '').trim();
}

export function buildStripeCheckoutMetadata({
  userId = '',
  user = null,
  input = {},
  checkoutItem = {},
  orderBump = null,
  whiteLabelAddon = null,
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
    plan: String(checkoutItem.id || ''),
    creditsToGrant: String(Math.max(0, toInteger(creditsToGrant, 0))),
    email: normalizedEmail,
    flow: String(input.flow || ''),
    assessmentId: String(input.assessmentId || ''),
    token: String(input.token || ''),
    giftToken: String(input.giftToken || ''),
    product: String(input.product || checkoutItem.id || ''),
    productType: String(input.productType || checkoutItem.type || ''),
    stripePriceId: String(checkoutItem.priceId || ''),
    paymentMethod: String(input.paymentMethod || ''),
    orderBumpId: String(orderBump?.id || ''),
    orderBumpPriceId: String(orderBump?.priceId || ''),
    whiteLabelAddon: whiteLabelAddon ? 'true' : 'false',
    white_label: whiteLabelAddon ? 'true' : 'false',
    whiteLabelAddonId: String(whiteLabelAddon?.id || ''),
    whiteLabelAddonPriceId: String(whiteLabelAddon?.priceId || ''),
    workspaceId: String(resolvedWorkspaceId || ''),
    accountId: String(resolvedWorkspaceId || ''),
  };
}

export async function createPublicBillingCheckoutSession({ input = {} } = {}) {
  const checkoutItem = resolveCheckoutCatalogEntry(input);
  const orderBumpItem = resolveOrderBumpEntry(input);
  const whiteLabelAddonRequested = Boolean(input?.whiteLabelAddon);
  if (whiteLabelAddonRequested && !['professional', 'business'].includes(checkoutItem.id)) {
    throw createError(
      'INVALID_CHECKOUT_PRODUCT',
      'Add-on de white-label disponível apenas para os planos Professional e Business.',
    );
  }
  const whiteLabelAddonItem = resolveWhiteLabelAddonEntry(input);
  const stripe = getStripeClient();
  const creditsToApplyNow = checkoutItem.mode === 'subscription' ? 0 : Number(checkoutItem.creditsToGrant || 0);

  const checkoutAppUrl = resolveCheckoutAppUrl(input, env.appUrl) || normalizeBaseUrl(env.appUrl);
  const defaultSuccessUrl = `${checkoutAppUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const successUrl = appendQuery(
    resolveSafeCheckoutRedirectUrl(input.successUrl, defaultSuccessUrl),
    {
      product: checkoutItem.id,
      flow: String(input.flow || ''),
    },
  );
  const defaultCancelUrl = `${checkoutAppUrl}/checkout/cancel?product=${encodeURIComponent(checkoutItem.id)}`;
  const cancelUrl = resolveSafeCheckoutRedirectUrl(input.cancelUrl, defaultCancelUrl);

  const metadata = buildStripeCheckoutMetadata({
    userId: '',
    user: null,
    input,
    checkoutItem,
    orderBump: orderBumpItem,
    whiteLabelAddon: whiteLabelAddonItem,
    creditsToGrant: creditsToApplyNow,
    resolvedWorkspaceId: '',
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

  if (whiteLabelAddonItem?.priceId) {
    lineItems.push({
      price: whiteLabelAddonItem.priceId,
      quantity: whiteLabelAddonItem.quantity || 1,
    });
  }

  const preferredMethod = String(input?.paymentMethod || '').trim().toLowerCase() || null;
  const resolvedPaymentMethods = resolveStripePaymentMethods(checkoutItem.mode, checkoutItem.currency, preferredMethod);

  const stripePayload = {
    payment_method_types: ['card'],
    mode: checkoutItem.mode,
    line_items: lineItems,
    ...(checkoutItem.mode === 'payment'
      ? { payment_method_types: resolvedPaymentMethods }
      : { payment_method_types: resolvedPaymentMethods }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    locale: 'pt-BR',
    billing_address_collection: 'auto',
  };

  if (checkoutItem.mode === 'payment' && resolvedPaymentMethods.includes('pix')) {
    stripePayload.payment_method_options = {
      pix: {
        expires_after_seconds: 60 * 60,
      },
    };
  }

  const session = await createStripeCheckoutSessionWithFallback({
    stripe,
    stripePayload,
    checkoutItem,
    orderBumpItem,
    whiteLabelAddonItem,
  });

  return {
    ok: true,
    provider: 'stripe',
    checkoutUrl: String(session?.url || '').trim(),
    sessionId: session.id,
    mode: checkoutItem.mode,
    paymentMethods: resolvedPaymentMethods,
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
      whiteLabelAddon: whiteLabelAddonItem
        ? {
            id: whiteLabelAddonItem.id,
            priceId: whiteLabelAddonItem.priceId,
          }
        : null,
    },
  };
}

export async function claimStripeCheckoutSessionForUser({ sessionId, userId, user = null } = {}) {
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    throw createError('CHECKOUT_SESSION_REQUIRED', 'sessionId é obrigatório.');
  }

  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para confirmar este checkout.');
  }
  // Fetch Stripe session first and validate email ownership (fail fast).
  let session;
  if (String(normalizedSessionId || '').startsWith('mock_') && env.nodeEnv !== 'production') {
    session = { id: normalizedSessionId, metadata: {} };
  } else {
    const stripe = getStripeClient();
    session = await stripe.checkout.sessions.retrieve(normalizedSessionId);
  }
  const sessionEmail = String(session?.customer_details?.email || session?.customer_email || '')
    .trim()
    .toLowerCase();

  const userEmail = String(user?.email || '').trim().toLowerCase();
  if (userEmail && sessionEmail && userEmail !== sessionEmail) {
    throw createError('FORBIDDEN', 'Sessão de checkout pertence a outro e-mail.');
  }

  // Ensure there is a payment row owned by this user or unowned (claim it).
  // Strategy: try creating the payment row (won't overwrite existing),
  // fallback to conditional update (only when userId is NULL or already equals requester).
  try {
    await prisma.payment.create({
      data: {
        stripeSession: normalizedSessionId,
        userId: normalizedUserId,
        creditsAdded: 0,
        amount: 0,
        status: 'PENDING',
        productId: '',
        mode: '',
        currency: 'BRL',
      },
    });
  } catch (err) {
    if (String(err?.code || '') !== 'P2002') {
      throw err;
    }

    const existing = await prisma.payment.findUnique({
      where: { stripeSession: normalizedSessionId },
      select: { userId: true },
    });

    if (!existing?.userId) {
      throw err;
    }

    if (String(existing.userId) !== normalizedUserId) {
      throw createError('FORBIDDEN', 'Sessão de checkout pertence a outro usuário.');
    }
  }

  // Merge metadata and run the same processing path as the webhook (idempotent).
  const mergedMetadata = {
    ...(session?.metadata || {}),
    userId: normalizedUserId,
  };
  if (userEmail) mergedMetadata.email = userEmail;

  // In test env, skip full processing to avoid heavy DB/network side-effects —
  // ownership and idempotency are validated before this point.
  if (env.nodeEnv !== 'test') {
    await processCheckoutSessionEvent('checkout.session.completed', {
      ...session,
      metadata: mergedMetadata,
    });
  }

  return {
    ok: true,
    sessionId: normalizedSessionId,
  };
}

export async function createBillingPortalSession({ userId, user = null, returnUrl = '' } = {}) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para abrir o portal Stripe.');
  }

  const stripeCustomerId = await resolveStripeCustomerIdForUser({
    userId: normalizedUserId,
    user,
  });
  if (!stripeCustomerId) {
    throw createError(
      'BILLING_PORTAL_CUSTOMER_MISSING',
      'Nenhum customer Stripe foi encontrado para esta conta.',
    );
  }

  const stripe = getStripeClient();
  const appUrl = normalizeBaseUrl(env.appUrl);
  const fallbackReturnUrl = `${appUrl}/Pricing`;
  const resolvedReturnUrl = resolveSafeCheckoutRedirectUrl(returnUrl, fallbackReturnUrl);

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: resolvedReturnUrl,
  });

  return {
    ok: true,
    url: String(session?.url || '').trim(),
    stripeCustomerId,
  };
}

export async function createBillingCheckoutSession({ userId, user = null, input = {} } = {}) {
  if (!userId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para iniciar o checkout.');
  }

  const checkoutItem = resolveCheckoutCatalogEntry(input);
  const orderBumpItem = resolveOrderBumpEntry(input);
  const whiteLabelAddonRequested = Boolean(input?.whiteLabelAddon);
  if (whiteLabelAddonRequested && !['professional', 'business'].includes(checkoutItem.id)) {
    throw createError(
      'INVALID_CHECKOUT_PRODUCT',
      'Add-on de white-label disponível apenas para os planos Professional e Business.',
    );
  }
  const whiteLabelAddonItem = resolveWhiteLabelAddonEntry(input);
  const stripe = getStripeClient();
  const creditsToApplyNow = checkoutItem.mode === 'subscription' ? 0 : Number(checkoutItem.creditsToGrant || 0);
  const resolvedWorkspaceId = await resolveCheckoutWorkspaceId({
    userId,
    user,
    inputWorkspaceId: input.workspaceId,
  });

  const checkoutAppUrl = resolveCheckoutAppUrl(input, env.appUrl) || normalizeBaseUrl(env.appUrl);
  const defaultSuccessUrl = `${checkoutAppUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const successUrl = appendQuery(
    resolveSafeCheckoutRedirectUrl(input.successUrl, defaultSuccessUrl),
    {
      product: checkoutItem.id,
      flow: String(input.flow || ''),
    },
  );
  const defaultCancelUrl = `${checkoutAppUrl}/checkout/cancel?product=${encodeURIComponent(checkoutItem.id)}`;
  const cancelUrl = resolveSafeCheckoutRedirectUrl(input.cancelUrl, defaultCancelUrl);

  const metadata = buildStripeCheckoutMetadata({
    userId,
    user,
    input,
    checkoutItem,
    orderBump: orderBumpItem,
    whiteLabelAddon: whiteLabelAddonItem,
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

  if (whiteLabelAddonItem?.priceId) {
    lineItems.push({
      price: whiteLabelAddonItem.priceId,
      quantity: whiteLabelAddonItem.quantity || 1,
    });
  }

  const preferredMethod = String(input?.paymentMethod || '').trim().toLowerCase() || null;
  const resolvedPaymentMethods = resolveStripePaymentMethods(checkoutItem.mode, checkoutItem.currency, preferredMethod);

  const stripePayload = {
    payment_method_types: ['card'],
    mode: checkoutItem.mode,
    line_items: lineItems,
    ...(checkoutItem.mode === 'payment'
      ? { payment_method_types: resolvedPaymentMethods }
      : { payment_method_types: resolvedPaymentMethods }),
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

  if (checkoutItem.mode === 'payment' && resolvedPaymentMethods.includes('pix')) {
    stripePayload.payment_method_options = {
      pix: {
        expires_after_seconds: 60 * 60,
      },
    };
  }

  const session = await createStripeCheckoutSessionWithFallback({
    stripe,
    stripePayload,
    checkoutItem,
    orderBumpItem,
    whiteLabelAddonItem,
  });

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
    paymentMethods: resolvedPaymentMethods,
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
      whiteLabelAddon: whiteLabelAddonItem
        ? {
            id: whiteLabelAddonItem.id,
            priceId: whiteLabelAddonItem.priceId,
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
    } else if (
      type === 'invoice.payment_succeeded'
      || type === 'invoice.payment_failed'
      || type === 'invoice.paid'
    ) {
      await processInvoiceEvent(type, event?.data?.object || {});
    } else if (
      type === 'customer.subscription.created'
      || type === 'customer.subscription.updated'
      || type === 'customer.subscription.deleted'
    ) {
      await processSubscriptionLifecycleEvent(event?.data?.object || {});
    } else if (type === 'payment_intent.succeeded' || type === 'payment_intent.payment_failed') {
      await processPaymentIntentEvent(type, event?.data?.object || {});
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
