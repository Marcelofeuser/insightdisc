import { Router } from 'express';
import { sendSafeJsonError } from '../lib/http-security.js';
import { processStripeWebhookEvent } from '../modules/billing/stripe-billing.service.js';

const router = Router();

export async function handleStripeWebhook(req, res) {
  try {
    const rawBody = req.body;
    const signature = req.headers['stripe-signature'];

    const result = await processStripeWebhookEvent({
      rawBody,
      signature,
    });

    return res.status(200).json({
      ok: true,
      eventId: result.eventId,
      eventType: result.eventType,
      duplicate: Boolean(result.duplicate),
    });
  } catch (error) {
    const code = String(error?.code || '').trim().toUpperCase();
    const isSignatureRelated =
      code === 'INVALID_WEBHOOK_BODY'
      || code === 'STRIPE_SIGNATURE_REQUIRED'
      || code === 'STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED'
      || code.includes('SIGNATURE')
      || error?.type === 'StripeSignatureVerificationError';

    if (isSignatureRelated) {
      return sendSafeJsonError(res, {
        status: 400,
        error: code || 'STRIPE_WEBHOOK_INVALID_SIGNATURE',
        message: error?.message || 'Webhook Stripe inválido.',
      });
    }

    return sendSafeJsonError(res, {
      status: 500,
      error: code || 'STRIPE_WEBHOOK_PROCESSING_FAILED',
      message: error?.message || 'Falha ao processar webhook Stripe.',
    });
  }
}

router.post('/stripe/webhook', handleStripeWebhook);

export default router;
