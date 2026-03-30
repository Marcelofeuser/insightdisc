import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import {
  createBillingCheckoutSession,
  getCheckoutSessionStatusForUser,
} from '../modules/billing/stripe-billing.service.js';

const router = Router();

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const PLAN_LIMITS = Object.freeze({
  personal: Object.freeze({
    assessmentsPerMonth: 10,
    teamMap: false,
    jobMatching: false,
    reportPdf: false,
  }),
  professional: Object.freeze({
    assessmentsPerMonth: 100,
    teamMap: true,
    jobMatching: true,
    reportPdf: true,
  }),
  business: Object.freeze({
    assessmentsPerMonth: Number.POSITIVE_INFINITY,
    teamMap: true,
    jobMatching: true,
    reportPdf: true,
  }),
});

const createCheckoutSchema = z
  .object({
    planId: z.string().trim().optional(),
    product: z.string().trim().optional(),
    productType: z.string().trim().optional(),
    creditsPackageId: z.string().trim().optional(),
    packageId: z.string().trim().optional(),
    credits: z.coerce.number().int().positive().max(10_000).optional(),
    mode: z.enum(['payment', 'subscription']).optional(),
    priceId: z.string().trim().optional(),
    flow: z.string().trim().optional(),
    assessmentId: z.string().trim().optional(),
    token: z.string().trim().optional(),
    giftToken: z.string().trim().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    workspaceId: z.string().trim().optional(),
    orderBumpAdvancedAnalysis: booleanLikeSchema.optional(),
  })
  .refine(
    (value) =>
      Boolean(String(value.planId || '').trim())
      || Boolean(String(value.product || '').trim())
      || Boolean(String(value.productType || '').trim())
      || Boolean(String(value.creditsPackageId || value.packageId || '').trim())
      || Number(value.credits || 0) > 0,
    'Informe plano/produto para checkout.',
  );

const changePlanSchema = z.object({
  action: z.enum(['upgrade', 'downgrade']),
  targetPlan: z.enum(['personal', 'professional', 'business']),
});

function resolveStatusByCode(code = '') {
  const normalized = String(code || '').trim().toUpperCase();
  if (
    normalized === 'INVALID_CHECKOUT_PRODUCT'
    || normalized === 'INVALID_PRICE_FOR_PRODUCT'
    || normalized === 'BILLING_PRICE_NOT_CONFIGURED'
    || normalized === 'CHECKOUT_SESSION_REQUIRED'
    || normalized === 'INVALID_PAYLOAD'
  ) {
    return 400;
  }

  if (normalized === 'FORBIDDEN') return 403;
  if (normalized === 'AUTH_REQUIRED') return 401;
  if (normalized === 'STRIPE_NOT_CONFIGURED') return 503;
  return 500;
}

router.use(requireAuth, attachUser);

router.get('/plans', (_req, res) => {
  return res.status(200).json({
    ok: true,
    plans: PLAN_LIMITS,
  });
});

router.post('/create-checkout-session', async (req, res) => {
  try {
    const input = createCheckoutSchema.parse(req.body || {});

    const payload = await createBillingCheckoutSession({
      userId: req.auth?.userId,
      user: req.user,
      input,
    });

    return res.status(200).json({
      ok: true,
      provider: payload.provider,
      mode: payload.mode,
      sessionId: payload.sessionId,
      checkoutUrl: payload.checkoutUrl,
      paymentMethods: payload.paymentMethods,
      item: payload.item,
    });
  } catch (error) {
    const code = String(error?.code || '').trim().toUpperCase() || 'BILLING_CHECKOUT_CREATE_FAILED';
    return res.status(resolveStatusByCode(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao criar checkout Stripe.',
    });
  }
});

router.get('/checkout-session/:sessionId/status', async (req, res) => {
  try {
    const sessionId = String(req.params?.sessionId || '').trim();
    const status = await getCheckoutSessionStatusForUser({
      sessionId,
      userId: req.auth?.userId,
    });

    return res.status(200).json({
      ok: true,
      ...status,
    });
  } catch (error) {
    const code = String(error?.code || '').trim().toUpperCase() || 'BILLING_CHECKOUT_STATUS_FAILED';
    return res.status(resolveStatusByCode(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao consultar status do checkout.',
    });
  }
});

router.post('/portal', (_req, res) => {
  return res.status(200).json({
    ok: true,
    url: `${env.appUrl}/Pricing?billingPortal=1`,
  });
});

router.post('/change-plan', async (req, res) => {
  try {
    const input = changePlanSchema.parse(req.body || {});

    if (input.action === 'upgrade') {
      const checkout = await createBillingCheckoutSession({
        userId: req.auth?.userId,
        user: req.user,
        input: {
          planId: input.targetPlan,
          mode: input.targetPlan === 'personal' ? 'payment' : 'subscription',
        },
      });

      return res.status(200).json({
        ok: true,
        action: 'checkout_required',
        targetPlan: input.targetPlan,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        message: `Upgrade para ${input.targetPlan} iniciado via Stripe Checkout.`,
      });
    }

    return res.status(200).json({
      ok: true,
      action: 'downgrade_requested',
      targetPlan: input.targetPlan,
      message: `Solicitação de downgrade para ${input.targetPlan} registrada.`,
    });
  } catch (error) {
    const code = String(error?.code || '').trim().toUpperCase() || 'BILLING_PLAN_CHANGE_FAILED';
    return res.status(resolveStatusByCode(code)).json({
      ok: false,
      error: code,
      message: error?.message || 'Falha ao alterar plano.',
    });
  }
});

export default router;
