import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

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

router.use(requireAuth);

router.get('/plans', (_req, res) => {
  return res.status(200).json({
    ok: true,
    plans: PLAN_LIMITS,
  });
});

router.post('/portal', (_req, res) => {
  return res.status(200).json({
    ok: true,
    url: `${env.appUrl}/Pricing?billingPortal=1`,
  });
});

router.post('/change-plan', (req, res) => {
  const schema = z.object({
    action: z.enum(['upgrade', 'downgrade']),
    targetPlan: z.enum(['personal', 'professional', 'business']),
  });

  try {
    const input = schema.parse(req.body || {});

    if (input.action === 'upgrade' && input.targetPlan === 'business') {
      return res.status(200).json({
        ok: true,
        action: 'checkout_required',
        checkoutUrl: `${env.appUrl}/checkout?product=business-monthly`,
        message: 'Upgrade para Business redirecionado para checkout de assinatura.',
      });
    }

    return res.status(200).json({
      ok: true,
      action: `${input.action}_recorded`,
      targetPlan: input.targetPlan,
      message: `Solicitação de ${input.action} para plano ${input.targetPlan} registrada.`,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error?.message || 'BILLING_PLAN_CHANGE_FAILED',
    });
  }
});

export default router;
