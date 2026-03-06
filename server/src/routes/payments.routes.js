import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

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

router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      assessmentId: z.string().optional(),
      token: z.string().optional(),
      flow: z.string().optional(),
      credits: z.number().int().positive().default(1),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    });

    const input = schema.parse(req.body || {});
    const resolvedSuccessUrl = appendQuery(
      input.successUrl || `${env.appUrl}/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`,
      {
        assessmentId: input.assessmentId || '',
        token: input.token || '',
        flow: input.flow || '',
      }
    );

    const stripe = getStripeClient();
    if (!stripe || !env.stripePriceCredits) {
      const mockSessionId = `mock_${Date.now()}`;
      const url = appendQuery(`${env.appUrl}/CheckoutSuccess?session_id=${mockSessionId}`, {
        assessmentId: input.assessmentId || '',
        token: input.token || '',
        flow: input.flow || '',
      });
      return res.status(200).json({ ok: true, mocked: true, id: mockSessionId, url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: env.stripePriceCredits,
          quantity: input.credits,
        },
      ],
      success_url: resolvedSuccessUrl,
      cancel_url: input.cancelUrl || `${env.appUrl}/Pricing`,
      metadata: {
        userId: req.auth.userId,
        assessmentId: input.assessmentId || '',
        token: input.token || '',
        flow: input.flow || '',
        credits: String(input.credits),
      },
    });

    return res.status(200).json({ ok: true, id: session.id, url: session.url });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao criar checkout.' });
  }
});

export default router;
