import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { PRODUCTS } from '../config/pricing.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import {
  createBillingCheckoutSession,
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
  if (
    normalized === 'INVALID_CHECKOUT_PRODUCT'
    || normalized === 'BILLING_PRICE_NOT_CONFIGURED'
    || normalized === 'INVALID_PRICE_FOR_PRODUCT'
    || normalized === 'CHECKOUT_SESSION_REQUIRED'
  ) {
    return 400;
  }
  if (normalized === 'STRIPE_NOT_CONFIGURED') return 503;
  return 500;
}

function buildCheckoutInputFromLegacyPayload(input = {}) {
  const resolvedProduct = String(
    input.product
    || resolveProductIdFromPayload(input.productType, input.credits)
    || '',
  ).trim();
  const explicitPriceId = String(input.priceEnvKey ? process.env[input.priceEnvKey] || '' : '').trim();

  return {
    planId: input.planId,
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
  };
}

router.post('/create-checkout', requireAuth, attachUser, async (req, res) => {
  try {
    const schema = z.object({
      assessmentId: z.string().optional(),
      token: z.string().optional(),
      flow: z.string().optional(),
      planId: z.string().optional(),
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
      giftToken: z.string().optional(),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    });

    const input = schema.parse(req.body || {});
    const checkoutInput = buildCheckoutInputFromLegacyPayload(input);

    const payload = await createBillingCheckoutSession({
      userId: req.auth?.userId,
      user: req.user,
      input: {
        ...checkoutInput,
        flow: input.flow,
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
