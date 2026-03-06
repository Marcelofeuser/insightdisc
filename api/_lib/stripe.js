const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

export function getPriceIdByEnvKey(priceEnvKey = 'STRIPE_PRICE_PRO') {
  return process.env[priceEnvKey] || '';
}

function getDefaultAppUrl() {
  return process.env.APP_URL || 'http://localhost:5173';
}

export function createMockCheckoutUrl({ successUrl, assessmentId, token, flow, email, name }) {
  const url = new URL(successUrl || `${getDefaultAppUrl()}/CheckoutSuccess`);
  url.searchParams.set('session_id', `mock_${Date.now()}`);
  if (assessmentId) url.searchParams.set('assessmentId', assessmentId);
  if (token) url.searchParams.set('token', token);
  if (flow) url.searchParams.set('flow', flow);
  if (email) url.searchParams.set('email', email);
  if (name) url.searchParams.set('name', name);
  return url.toString();
}

export async function createStripeCheckoutSession({
  mode = 'payment',
  priceId,
  email,
  name,
  successUrl,
  cancelUrl,
  metadata = {},
} = {}) {
  const secretKey = getStripeSecretKey();
  if (!secretKey || !priceId) {
    return {
      mocked: true,
      id: `mock_${Date.now()}`,
      url: createMockCheckoutUrl({
        successUrl: successUrl || `${getDefaultAppUrl()}/CheckoutSuccess`,
        assessmentId: metadata?.assessmentId,
        token: metadata?.token,
        flow: metadata?.flow,
        email,
        name,
      }),
    };
  }

  const payload = new URLSearchParams();
  payload.set('mode', mode);
  payload.set('success_url', successUrl || `${getDefaultAppUrl()}/CheckoutSuccess`);
  payload.set('cancel_url', cancelUrl || `${getDefaultAppUrl()}/Pricing`);
  payload.set('line_items[0][price]', priceId);
  payload.set('line_items[0][quantity]', '1');
  if (email) payload.set('customer_email', email);
  if (name) payload.set('customer_creation', 'always');

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      payload.set(`metadata[${key}]`, String(value));
    }
  });

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Erro ao criar sessão no Stripe.');
  }

  return data;
}

export async function fetchStripeCheckoutSession(sessionId) {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    return null;
  }

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Erro ao validar sessão Stripe.');
  }
  return data;
}
