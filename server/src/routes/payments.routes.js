import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { env } from '../config/env.js';
import { PRODUCTS, getProductById, resolveProductId as resolveCatalogProductId } from '../config/pricing.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

function appendQuery(urlValue, params = {}) {
  const url = new URL(urlValue);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function getStripeClient() {
  if (!env.stripeSecretKey) return null;
  return new Stripe(env.stripeSecretKey, { apiVersion: '2024-12-18.acacia' });
}

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

router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      assessmentId: z.string().optional(),
      token: z.string().optional(),
      flow: z.string().optional(),
      productType: z
        .enum(['single_assessment', 'gift_assessment', 'credit_pack', 'business_subscription', 'report_unlock'])
        .optional(),
      product: z.string().trim().optional(),
      credits: z.number().int().positive().optional(),
      mode: z.enum(['payment', 'subscription']).optional(),
      priceEnvKey: z.string().trim().min(1).optional(),
      giftToken: z.string().optional(),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    });

    const input = schema.parse(req.body || {});
    const resolvedProductId = resolveCatalogProductId(
      input.product || resolveProductIdFromPayload(input.productType, input.credits)
    );
    const resolvedProduct = getProductById(resolvedProductId);

    const resolvedMode =
      input.mode
      || (input.productType === 'business_subscription' || resolvedProductId === PRODUCTS.BUSINESS_MONTHLY.id
        ? 'subscription'
        : 'payment');

    const resolvedCredits = Number(
      input.credits
      || resolvedProduct?.credits
      || (input.productType === 'business_subscription' || resolvedProductId === PRODUCTS.BUSINESS_MONTHLY.id ? 5 : 1)
    );
    const explicitPriceId = String(input.priceEnvKey ? process.env[input.priceEnvKey] || '' : '').trim();
    const resolvedPriceId = explicitPriceId || env.stripePriceCredits;
    const resolvedSuccessUrl = appendQuery(
      input.successUrl || `${env.appUrl}/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
      {
        assessmentId: input.assessmentId || '',
        token: input.token || '',
        flow: input.flow || '',
        giftToken: input.giftToken || '',
      }
    );

    const stripe = getStripeClient();
    if (!stripe || !resolvedPriceId) {
      const mockSessionId = `mock_${Date.now()}`;
      const url = appendQuery(`${env.appUrl}/CheckoutSuccess?session_id=${mockSessionId}`, {
        assessmentId: input.assessmentId || '',
        token: input.token || '',
        flow: input.flow || '',
        giftToken: input.giftToken || '',
        credits: resolvedCredits,
      });
      return res.status(200).json({
        ok: true,
        mocked: true,
        id: mockSessionId,
        url,
        product: resolvedProductId || '',
        amount: Number(resolvedProduct?.price || 0),
        currency: resolvedProduct?.currency || 'BRL',
      });
    }

    if (resolvedMode === 'subscription' && !explicitPriceId) {
      return res.status(400).json({
        ok: false,
        error: 'BUSINESS_PRICE_NOT_CONFIGURED',
        message: 'Preço da assinatura Business não configurado no backend.',
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: resolvedMode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: resolvedPriceId,
          quantity: explicitPriceId ? 1 : resolvedCredits,
        },
      ],
      success_url: resolvedSuccessUrl,
      cancel_url: input.cancelUrl || `${env.appUrl}/Pricing`,
      metadata: {
        userId: req.auth.userId,
        assessmentId: input.assessmentId || '',
        token: input.token || '',
        flow: input.flow || '',
        giftToken: input.giftToken || '',
        productType: input.productType || '',
        product: resolvedProductId || '',
        productName: resolvedProduct?.name || '',
        priceEnvKey: input.priceEnvKey || '',
        credits: String(resolvedCredits),
      },
    });

    return res.status(200).json({ ok: true, id: session.id, url: session.url });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao criar checkout.' });
  }
});

router.post('/confirm', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      sessionId: z.string().min(1),
      credits: z.number().int().positive().optional(),
    });
    const input = schema.parse(req.body || {});

    const existingPayment = await prisma.payment.findUnique({
      where: { stripeSession: input.sessionId },
    });

    if (existingPayment && existingPayment.userId !== req.auth.userId) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    if (existingPayment?.status === 'PAID') {
      const currentCredit = await prisma.credit.findUnique({ where: { userId: req.auth.userId } });
      return res.status(200).json({
        ok: true,
        alreadyProcessed: true,
        creditsAdded: existingPayment.creditsAdded,
        balance: Number(currentCredit?.balance || 0),
      });
    }

    const stripe = getStripeClient();
    let creditsAdded = Number(input.credits || 0);
    let amount = 0;
    let paid = false;

    if (stripe && !String(input.sessionId).startsWith('mock_')) {
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);
      paid = session?.payment_status === 'paid';
      creditsAdded = Number(session?.metadata?.credits || creditsAdded || 0);
      amount = Number(session?.amount_total || 0);
    } else {
      paid = true;
      creditsAdded = Number(input.credits || 1);
    }

    if (!paid) {
      return res.status(400).json({ ok: false, error: 'PAYMENT_NOT_CONFIRMED' });
    }

    if (!creditsAdded || creditsAdded < 1) {
      return res.status(400).json({ ok: false, error: 'INVALID_CREDITS_AMOUNT' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { stripeSession: input.sessionId },
        create: {
          userId: req.auth.userId,
          creditsAdded,
          amount,
          stripeSession: input.sessionId,
          status: 'PAID',
        },
        update: {
          userId: req.auth.userId,
          creditsAdded,
          amount,
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
      creditsAdded: result.creditsAdded,
      balance: result.balance,
    });
  } catch (error) {
    const message = String(error?.message || '').toUpperCase();
    if (message.includes('FORBIDDEN')) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao confirmar pagamento.' });
  }
});

export default router;
