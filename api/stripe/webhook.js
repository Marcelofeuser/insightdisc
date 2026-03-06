import crypto from 'node:crypto';
import { addPaymentRecord, unlockAssessment } from '../_lib/dev-store.js';
import { sendJson } from '../_lib/http.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseStripeSignature(headerValue = '') {
  return String(headerValue || '')
    .split(',')
    .reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});
}

function verifyStripeSignature(payload, signatureHeader, webhookSecret) {
  if (!webhookSecret || !signatureHeader) return true;
  const parts = parseStripeSignature(signatureHeader);
  const signedPayload = `${parts.t}.${payload}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');
  return parts.v1 === expected;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
      return sendJson(res, 400, { ok: false, error: 'Invalid Stripe signature.' });
    }

    const event = JSON.parse(rawBody || '{}');
    if (event?.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const assessmentId = session?.metadata?.assessmentId || '';
      const email = session?.customer_details?.email || session?.customer_email || '';

      await addPaymentRecord({
        sessionId: session?.id,
        assessmentId,
        email,
        amount: Number(session?.amount_total || 0),
        status: session?.payment_status || 'paid',
      });

      if (assessmentId) {
        await unlockAssessment({
          sessionId: session?.id,
          assessmentId,
          email,
        });
      }
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Erro ao processar webhook.',
    });
  }
}
