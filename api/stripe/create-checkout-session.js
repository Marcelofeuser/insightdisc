import { readJsonBody, sendJson } from '../_lib/http.js';
import { createStripeCheckoutSession, getPriceIdByEnvKey } from '../_lib/stripe.js';
import { getProductById, resolveProductId } from '../../shared/pricing.js';

function appendQuery(urlValue, params = {}) {
  const url = new URL(urlValue);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const {
      email = '',
      name = '',
      assessmentId = '',
      token = '',
      flow = '',
      mode = 'payment',
      product = '',
      priceEnvKey = 'STRIPE_PRICE_PRO',
      successUrl,
      cancelUrl,
    } = body || {};

    const resolvedProductId = resolveProductId(product);
    const resolvedProduct = getProductById(resolvedProductId);
    const priceId = getPriceIdByEnvKey(priceEnvKey);
    const baseAppUrl = process.env.APP_URL || 'http://localhost:5173';
    const resolvedSuccessUrl = appendQuery(
      successUrl || `${baseAppUrl}/CheckoutSuccess`,
      {
        session_id: '{CHECKOUT_SESSION_ID}',
        assessmentId,
        token,
        flow,
        email,
        name,
      }
    );
    const resolvedCancelUrl = cancelUrl || `${baseAppUrl}/Pricing`;

    const session = await createStripeCheckoutSession({
      mode,
      priceId,
      email,
      name,
      successUrl: resolvedSuccessUrl,
      cancelUrl: resolvedCancelUrl,
      metadata: {
        assessmentId,
        token,
        flow,
        email,
        name,
        mode,
        product: resolvedProductId || '',
      },
    });

    return sendJson(res, 200, {
      ok: true,
      id: session?.id,
      url: session?.url,
      mocked: Boolean(session?.mocked),
      product: resolvedProductId || '',
      amount: Number(resolvedProduct?.price || 0),
      currency: resolvedProduct?.currency || 'BRL',
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Falha ao criar sessão de checkout.',
    });
  }
}
