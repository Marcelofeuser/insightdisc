import Stripe from 'stripe';
import { env } from '../../config/env.js';
import { isSuperAdminUser } from '../auth/super-admin-access.js';

const CHECKOUT_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'credit-1',
    credits: 1,
    label: '1 crédito DISC',
    description: 'Ideal para uma avaliação pontual.',
  }),
  Object.freeze({
    id: 'credit-5',
    credits: 5,
    label: '5 créditos DISC',
    description: 'Pacote enxuto para pequenos ciclos de teste.',
  }),
  Object.freeze({
    id: 'credit-10',
    credits: 10,
    label: '10 créditos DISC',
    description: 'Volume recorrente para consultorias e RH.',
  }),
  Object.freeze({
    id: 'credit-50',
    credits: 50,
    label: '50 créditos DISC',
    description: 'Escala para operação intensiva de avaliações.',
  }),
]);

const PRODUCTS_BY_ID = CHECKOUT_PRODUCTS.reduce((accumulator, product) => {
  accumulator[product.id] = product;
  return accumulator;
}, {});

function createError(code, message) {
  const error = new Error(message || code);
  error.code = String(code || 'CHECKOUT_ERROR').toUpperCase();
  return error;
}

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

function resolveCheckoutProduct({ packageId = '', credits = 0 } = {}) {
  const normalizedPackageId = String(packageId || '').trim().toLowerCase();
  if (normalizedPackageId && PRODUCTS_BY_ID[normalizedPackageId]) {
    return PRODUCTS_BY_ID[normalizedPackageId];
  }

  const numericCredits = Number(credits || 0);
  if (Number.isFinite(numericCredits) && numericCredits > 0) {
    return (
      CHECKOUT_PRODUCTS.find((item) => item.credits === numericCredits)
      || {
        id: `credit-${numericCredits}`,
        credits: Math.trunc(numericCredits),
        label: `${Math.trunc(numericCredits)} créditos DISC`,
        description: 'Pacote personalizado de créditos.',
      }
    );
  }

  return null;
}

export function listCheckoutProducts() {
  return CHECKOUT_PRODUCTS;
}

export async function createCheckoutSession({ userId, auth = {}, packageId = '', credits = 0 } = {}) {
  if (!userId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para iniciar o checkout.');
  }

  const product = resolveCheckoutProduct({ packageId, credits });
  if (!product) {
    throw createError('INVALID_CHECKOUT_PRODUCT', 'Produto de checkout inválido.');
  }

  if (product.credits < 1 || product.credits > 500) {
    throw createError('INVALID_CREDITS_AMOUNT', 'Quantidade de créditos inválida para checkout.');
  }

  const hasSuperAdminBypass = isSuperAdminUser({
    role: auth?.role,
    globalRole: auth?.globalRole,
    global_role: auth?.global_role,
  });

  if (hasSuperAdminBypass) {
    const sessionId = `superadmin_${Date.now()}`;
    const checkoutUrl = appendQuery(`${env.appUrl}/CheckoutSuccess?session_id=${sessionId}`, {
      flow: 'credit_pack',
      credits: 0,
      superAdminBypass: 1,
    });

    return {
      ok: true,
      mocked: true,
      bypassed: true,
      provider: 'stripe',
      package: product,
      sessionId,
      checkoutUrl,
    };
  }

  const stripe = getStripeClient();
  const priceId = String(env.stripePriceCredits || '').trim();

  if (!stripe || !priceId) {
    const sessionId = `mock_${Date.now()}`;
    const checkoutUrl = appendQuery(`${env.appUrl}/CheckoutSuccess?session_id=${sessionId}`, {
      flow: 'credit_pack',
      credits: product.credits,
    });

    return {
      ok: true,
      mocked: true,
      provider: 'stripe',
      package: product,
      sessionId,
      checkoutUrl,
    };
  }

  const successUrl = appendQuery(`${env.appUrl}/CheckoutSuccess?session_id={CHECKOUT_SESSION_ID}`, {
    flow: 'credit_pack',
    credits: product.credits,
    product: product.id,
  });

  const cancelUrl = appendQuery(`${env.appUrl}/checkout`, {
    package: product.id,
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: product.credits,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      flow: 'credit_pack',
      productType: 'credit_pack',
      product: product.id,
      credits: String(product.credits),
    },
  });

  return {
    ok: true,
    provider: 'stripe',
    mocked: false,
    package: product,
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}
