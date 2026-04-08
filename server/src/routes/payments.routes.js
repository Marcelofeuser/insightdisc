import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { PRODUCTS } from '../config/pricing.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import { normalizePlan } from '../lib/plan-normalize.js';
import {
  createBillingCheckoutSession,
  claimStripeCheckoutSessionForUser,
  createPublicBillingCheckoutSession,
  getCheckoutSessionStatusForUser,
} from '../modules/billing/stripe-billing.service.js';

const router = Router();

function resolveProductIdFromPayload(productType, credits) {
  if (productType === 'single_assessment') return PRODUCTS.SINGLE_PRO.id;
  if (productType === 'gift_assessment') return PRODUCTS.GIFT.id;
  if (productType === 'business_subscription') return PRODUCTS.BUSINESS_MONTHLY.id;
  if (productType === 'report_unlock') return PRODUCTS.REPORT_UNLOCK.id;
  if (productType === 'credit_pack') {
    const normalizedCredits = Number(credits || 0);
    if (normalizedCredits === PRODUCTS.PACK_10.credits) return PRODUCTS.PACK_10.id;
    if (normalizedCredits === PRODUCTS.PACK_50.credits) return PRODUCTS.PACK_50.id;
    if (normalizedCredits === PRODUCTS.PACK_100.credits) return PRODUCTS.PACK_100.id;
  }
  return '';
}

function resolveStatusCodeByError(code = '') {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized === 'AUTH_REQUIRED') return 401;
  if (normalized === 'FORBIDDEN') return 403;
  if (normalized === 'RESOURCE_MISSING') return 404;
  if (
    normalized === 'INVALID_CHECKOUT_PRODUCT'
    || normalized === 'BILLING_PRICE_NOT_CONFIGURED'
    || normalized === 'INVALID_PRICE_FOR_PRODUCT'
    || normalized === 'CHECKOUT_SESSION_REQUIRED'
    || normalized === 'INVALID_CHECKOUT_SESSION_ID'
  ) {
    return 400;
  }
  if (normalized === 'STRIPE_NOT_CONFIGURED') return 503;
  return 500;
}

function resolveRequestOrigin(req) {
  const headerOrigin = String(req?.get?.('origin') || '').trim();
  if (headerOrigin) return headerOrigin.replace(/\/$/, '');

  const referer = String(req?.get?.('referer') || '').trim();
  if (!referer) return '';

  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
}

function buildCheckoutInputFromLegacyPayload(input = {}) {
  const normalizedPlan = String(input.planId || input.plan || '').trim();
  const resolvedProduct = String(
    input.product
    || resolveProductIdFromPayload(input.productType, input.credits)
    || '',
  ).trim();
  const requestedEnvKey = String(input.priceEnvKey || '').trim();
  const explicitPriceId =
    requestedEnvKey && /^STRIPE_PRICE_[A-Z0-9_]+$/.test(requestedEnvKey)
      ? String(process.env[requestedEnvKey] || '').trim()
      : '';

  return {
    planId: normalizedPlan,
    product: resolvedProduct,
    productType: input.productType,
    creditsPackageId: input.creditsPackageId || input.packageId,
    packageId: input.packageId,
    credits: input.credits,
    mode: input.mode,
    priceId: explicitPriceId || input.priceId,
    flow: input.flow,
    assessmentId: input.assessmentId,
    token: input.token,
    giftToken: input.giftToken,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    workspaceId: input.workspaceId,
    orderBumpAdvancedAnalysis: input.orderBumpAdvancedAnalysis,
    whiteLabelAddon: input.whiteLabelAddon,
  };
}

const createCheckoutSchema = z.object({
  assessmentId: z.string().optional(),
  token: z.string().optional(),
  flow: z.string().optional(),
  plan: z.string().trim().optional(),
  planId: z.string().optional(),
  billing: z.enum(['monthly', 'yearly', 'one_time']).optional(),
  provider: z.enum(['STRIPE']).optional(),
  productType: z
    .enum(['single_assessment', 'gift_assessment', 'credit_pack', 'business_subscription', 'report_unlock'])
    .optional(),
  product: z.string().trim().optional(),
  credits: z.number().int().positive().optional(),
  mode: z.enum(['payment', 'subscription']).optional(),
  priceId: z.string().trim().optional(),
  priceEnvKey: z.string().trim().min(1).optional(),
  creditsPackageId: z.string().trim().optional(),
  packageId: z.string().trim().optional(),
  workspaceId: z.string().trim().optional(),
  orderBumpAdvancedAnalysis: z.boolean().optional(),
  whiteLabelAddon: z.boolean().optional(),
  giftToken: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const PUBLIC_CHECKOUT_ALLOWED_PLANS = new Set([
  'personal',
  'insider',
  'professional',
  'business',
  'business_corporation',
  'diamond_consulting',
]);

router.post('/create-checkout-public', async (req, res) => {
  try {
    const input = createCheckoutSchema.parse(req.body || {});
    const checkoutInput = buildCheckoutInputFromLegacyPayload(input);
    const normalizedPlan = normalizePlan(checkoutInput.planId || checkoutInput.plan || checkoutInput.product || '');
    const requestOrigin = resolveRequestOrigin(req);

    if (!PUBLIC_CHECKOUT_ALLOWED_PLANS.has(normalizedPlan)) {
      const error = new Error('Plano não disponível para checkout público.');
      error.code = 'INVALID_CHECKOUT_PRODUCT';
      throw error;
    }

    const payload = await createPublicBillingCheckoutSession({
      input: {
        ...checkoutInput,
        flow: input.flow,
        successUrl:
          checkoutInput.successUrl ||
          (requestOrigin ? `${requestOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}` : ''),
      },
    });

    return res.status(200).json({
      ok: true,
      id: payload.sessionId,
      sessionId: payload.sessionId,
      url: payload.checkoutUrl,
      checkoutUrl: payload.checkoutUrl,
      provider: payload.provider,
      mode: payload.mode,
      item: payload.item,
      paymentMethods: payload.paymentMethods,
      public: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        ok: false,
        error: 'VALIDATION_FAILED',
        message: 'Payload inválido.',
      });
    }
    const code = String(error?.code || error?.message || 'PAYMENTS_CHECKOUT_PUBLIC_CREATE_FAILED').toUpperCase();
    return res.status(resolveStatusCodeByError(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao criar checkout Stripe.',
    });
  }
});

router.post('/claim-checkout', requireAuth, attachUser, async (req, res) => {
  try {
    const schema = z.object({
      sessionId: z
        .string()
        .trim()
        .min(1)
        .max(255)
        .refine(
          (value) =>
            /^cs_(test_|live_)?[a-zA-Z0-9_]+$/.test(value) ||
            (env.nodeEnv !== 'production' && /^mock_[a-zA-Z0-9_]+$/.test(value)),
          'checkoutSessionId inválido.',
        ),
    });
    const input = schema.parse(req.body || {});

    await claimStripeCheckoutSessionForUser({
      sessionId: input.sessionId,
      userId: req.auth?.userId,
      user: req.user,
    });

    const status = await getCheckoutSessionStatusForUser({
      sessionId: input.sessionId,
      userId: req.auth?.userId,
    });

    return res.status(200).json({
      ok: true,
      ...status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        ok: false,
        error: 'VALIDATION_FAILED',
        message: 'checkoutSessionId inválido.',
      });
    }
    const code = String(error?.code || error?.message || 'PAYMENTS_CHECKOUT_CLAIM_FAILED').toUpperCase();
    return res.status(resolveStatusCodeByError(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao confirmar checkout Stripe.',
    });
  }
});

router.post('/create-checkout', requireAuth, attachUser, async (req, res) => {
  try {
    const input = createCheckoutSchema.parse(req.body || {});
    const checkoutInput = buildCheckoutInputFromLegacyPayload(input);
    const requestOrigin = resolveRequestOrigin(req);

    const payload = await createBillingCheckoutSession({
      userId: req.auth?.userId,
      user: req.user,
      input: {
        ...checkoutInput,
        flow: input.flow,
        successUrl:
          checkoutInput.successUrl ||
          (requestOrigin ? `${requestOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}` : ''),
      },
    });

    return res.status(200).json({
      ok: true,
      id: payload.sessionId,
      sessionId: payload.sessionId,
      url: payload.checkoutUrl,
      checkoutUrl: payload.checkoutUrl,
      provider: payload.provider,
      mode: payload.mode,
      item: payload.item,
      paymentMethods: payload.paymentMethods,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        ok: false,
        error: 'VALIDATION_FAILED',
        message: 'Payload inválido.',
      });
    }
    const code = String(error?.code || error?.message || 'PAYMENTS_CHECKOUT_CREATE_FAILED').toUpperCase();
    return res.status(resolveStatusCodeByError(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao criar checkout Stripe.',
    });
  }
});

router.post('/confirm', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      sessionId: z.string().min(1),
      credits: z.number().int().positive().optional(),
    });

    const input = schema.parse(req.body || {});
    const isLegacyMockAllowed =
      env.nodeEnv !== 'production'
      && String(input.sessionId || '').startsWith('mock_');

    if (isLegacyMockAllowed) {
      const creditsAdded = Number(input.credits || 1);
      const result = await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: { stripeSession: input.sessionId },
          create: {
            userId: req.auth.userId,
            creditsAdded,
            amount: 0,
            stripeSession: input.sessionId,
            status: 'PAID',
            productId: 'mock',
            mode: 'payment',
            currency: 'BRL',
          },
          update: {
            userId: req.auth.userId,
            creditsAdded,
            status: 'PAID',
          },
        });

        const credit = await tx.credit.upsert({
          where: { userId: req.auth.userId },
          create: { userId: req.auth.userId, balance: creditsAdded },
          update: { balance: { increment: creditsAdded } },
        });

        return {
          creditsAdded,
          balance: Number(credit?.balance || 0),
        };
      });

      return res.status(200).json({
        ok: true,
        mocked: true,
        creditsAdded: result.creditsAdded,
        balance: result.balance,
      });
    }

    const status = await getCheckoutSessionStatusForUser({
      sessionId: input.sessionId,
      userId: req.auth.userId,
    });

    if (status.status === 'paid') {
      return res.status(200).json({
        ok: true,
        creditsAdded: Number(status.creditsAdded || 0),
        balance: Number(status.balance || 0),
        plan: status.plan,
        paymentStatus: status.paymentStatus,
      });
    }

    if (status.status === 'pending') {
      return res.status(409).json({
        ok: false,
        error: 'PAYMENT_PENDING_WEBHOOK',
        message: 'Pagamento em processamento. Aguarde a confirmação do webhook Stripe.',
      });
    }

    return res.status(400).json({
      ok: false,
      error: 'PAYMENT_NOT_CONFIRMED',
      message: 'Pagamento não confirmado.',
    });
  } catch (error) {
    const code = String(error?.code || error?.message || 'PAYMENTS_CONFIRM_FAILED').toUpperCase();
    if (code.includes('FORBIDDEN')) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }
    return res.status(resolveStatusCodeByError(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao confirmar pagamento.',
    });
  }
});

export default router;
