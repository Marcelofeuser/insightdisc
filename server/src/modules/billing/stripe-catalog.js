import { PRODUCTS, resolveProductId as resolvePricingProductId } from '../../config/pricing.js';

const SUPPORTED_PLANS = Object.freeze({
  personal: Object.freeze({
    id: 'personal',
    type: 'plan',
    mode: 'payment',
    planTarget: 'personal',
    creditsToGrant: 1,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_PERSONAL']),
  }),
  professional: Object.freeze({
    id: 'professional',
    type: 'plan',
    mode: 'subscription',
    planTarget: 'professional',
    creditsToGrant: 10,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_PROFESSIONAL']),
  }),
  business: Object.freeze({
    id: 'business',
    type: 'plan',
    mode: 'subscription',
    planTarget: 'business',
    creditsToGrant: 25,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_BUSINESS']),
  }),
});

const LEGACY_PRODUCTS = Object.freeze({
  [PRODUCTS.SINGLE_PRO.id]: Object.freeze({
    id: PRODUCTS.SINGLE_PRO.id,
    type: 'one_time',
    mode: 'payment',
    creditsToGrant: 1,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_SINGLE', 'STRIPE_PRICE_PERSONAL']),
  }),
  [PRODUCTS.REPORT_UNLOCK.id]: Object.freeze({
    id: PRODUCTS.REPORT_UNLOCK.id,
    type: 'one_time',
    mode: 'payment',
    creditsToGrant: 0,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_REPORT_UNLOCK', 'STRIPE_PRICE_SINGLE']),
  }),
  [PRODUCTS.GIFT.id]: Object.freeze({
    id: PRODUCTS.GIFT.id,
    type: 'one_time',
    mode: 'payment',
    creditsToGrant: 0,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_GIFT', 'STRIPE_PRICE_SINGLE']),
  }),
  [PRODUCTS.PACK_10.id]: Object.freeze({
    id: PRODUCTS.PACK_10.id,
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 10,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_PACK_10', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 10,
  }),
  [PRODUCTS.PACK_50.id]: Object.freeze({
    id: PRODUCTS.PACK_50.id,
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 50,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_PACK_50', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 50,
  }),
  [PRODUCTS.PACK_100.id]: Object.freeze({
    id: PRODUCTS.PACK_100.id,
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 100,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_PACK_100', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 100,
  }),
  [PRODUCTS.BUSINESS_MONTHLY.id]: Object.freeze({
    id: PRODUCTS.BUSINESS_MONTHLY.id,
    type: 'plan',
    mode: 'subscription',
    planTarget: 'business',
    creditsToGrant: 25,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_BUSINESS']),
  }),
  'credit-1': Object.freeze({
    id: 'credit-1',
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 1,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_CREDIT_1', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 1,
  }),
  'credit-5': Object.freeze({
    id: 'credit-5',
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 5,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_CREDIT_5', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 5,
  }),
  'credit-10': Object.freeze({
    id: 'credit-10',
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 10,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_CREDIT_10', 'STRIPE_PRICE_PACK_10', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 10,
  }),
  'credit-50': Object.freeze({
    id: 'credit-50',
    type: 'credits',
    mode: 'payment',
    creditsToGrant: 50,
    currency: 'brl',
    priceEnvCandidates: Object.freeze(['STRIPE_PRICE_CREDIT_50', 'STRIPE_PRICE_PACK_50', 'STRIPE_PRICE_ID_CREDITS']),
    quantityWhenFallbackPrice: 50,
  }),
});

const PLAN_ALIASES = Object.freeze({
  personal: 'personal',
  pessoa: 'personal',
  profissional: 'professional',
  professional: 'professional',
  pro: 'professional',
  business: 'business',
  empresa: 'business',
  disc: PRODUCTS.SINGLE_PRO.id,
  diamond: 'business',
});

const PRODUCT_TYPE_TO_PRODUCT_ID = Object.freeze({
  single_assessment: PRODUCTS.SINGLE_PRO.id,
  gift_assessment: PRODUCTS.GIFT.id,
  business_subscription: PRODUCTS.BUSINESS_MONTHLY.id,
  report_unlock: PRODUCTS.REPORT_UNLOCK.id,
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMode(value, fallback = 'payment') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'payment' || normalized === 'subscription') return normalized;
  return fallback;
}

export function normalizePlanId(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return PLAN_ALIASES[normalized] || '';
}

function resolveProductIdFromInput(input = {}) {
  const directProduct = resolvePricingProductId(input.product || '');
  if (directProduct) return directProduct;

  const productFromType = PRODUCT_TYPE_TO_PRODUCT_ID[String(input.productType || '').trim().toLowerCase()];
  if (productFromType) return productFromType;

  if (String(input.productType || '').trim().toLowerCase() === 'credit_pack') {
    const credits = toNumber(input.credits, 0);
    if (credits === 10) return PRODUCTS.PACK_10.id;
    if (credits === 50) return PRODUCTS.PACK_50.id;
    if (credits === 100) return PRODUCTS.PACK_100.id;
  }

  const packageId = String(input.creditsPackageId || input.packageId || '').trim().toLowerCase();
  if (packageId && LEGACY_PRODUCTS[packageId]) {
    return packageId;
  }

  return '';
}

function resolvePriceFromEnv(entry, envVars = process.env) {
  const candidates = Array.isArray(entry?.priceEnvCandidates) ? entry.priceEnvCandidates : [];
  for (const envKey of candidates) {
    const value = String(envVars?.[envKey] || '').trim();
    if (value) {
      return {
        priceId: value,
        priceSourceEnv: envKey,
      };
    }
  }

  return {
    priceId: '',
    priceSourceEnv: '',
  };
}

function resolveBooleanInput(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

function resolvePlanCheckoutEntry(input = {}, envVars = process.env) {
  const normalizedPlan = normalizePlanId(input.planId || '');
  const planEntry = SUPPORTED_PLANS[normalizedPlan] || null;
  if (!planEntry) return null;

  const mode = normalizeMode(input.mode, planEntry.mode);
  const { priceId, priceSourceEnv } = resolvePriceFromEnv(planEntry, envVars);

  return {
    ...planEntry,
    mode,
    priceId,
    priceSourceEnv,
    quantity: 1,
  };
}

function resolveProductCheckoutEntry(input = {}, envVars = process.env) {
  const productId = resolveProductIdFromInput(input);
  if (!productId) return null;

  const baseEntry = LEGACY_PRODUCTS[productId];
  if (!baseEntry) return null;

  const mode = normalizeMode(input.mode, baseEntry.mode);
  const { priceId, priceSourceEnv } = resolvePriceFromEnv(baseEntry, envVars);
  const quantity =
    priceSourceEnv === 'STRIPE_PRICE_ID_CREDITS'
      ? Number(baseEntry.quantityWhenFallbackPrice || 1)
      : 1;

  return {
    ...baseEntry,
    mode,
    priceId,
    priceSourceEnv,
    quantity,
  };
}

export function resolveCheckoutCatalogEntry(input = {}, options = {}) {
  const envVars = options?.envVars || process.env;

  const fromPlan = resolvePlanCheckoutEntry(input, envVars);
  const fromProduct = fromPlan || resolveProductCheckoutEntry(input, envVars);

  if (!fromProduct) {
    const error = new Error('Produto/plano de checkout inválido.');
    error.code = 'INVALID_CHECKOUT_PRODUCT';
    throw error;
  }

  if (!fromProduct.priceId) {
    const error = new Error(
      `Preço Stripe não configurado para ${fromProduct.id}. Defina as variáveis de ambiente de preço no backend.`,
    );
    error.code = 'BILLING_PRICE_NOT_CONFIGURED';
    throw error;
  }

  const explicitPriceId = String(input.priceId || '').trim();
  if (explicitPriceId && explicitPriceId !== fromProduct.priceId) {
    const error = new Error('priceId enviado não corresponde ao catálogo oficial do backend.');
    error.code = 'INVALID_PRICE_FOR_PRODUCT';
    throw error;
  }

  return {
    ...fromProduct,
    quantity: Math.max(1, Number(fromProduct.quantity || 1)),
    creditsToGrant: Math.max(0, Number(fromProduct.creditsToGrant || 0)),
    currency: String(fromProduct.currency || 'brl').toLowerCase(),
  };
}

export function resolveOrderBumpEntry(input = {}, options = {}) {
  const envVars = options?.envVars || process.env;
  const enabled = resolveBooleanInput(input?.orderBumpAdvancedAnalysis);
  if (!enabled) return null;

  const priceId = String(
    envVars.STRIPE_PRICE_ORDER_BUMP_ADVANCED_ANALYSIS || envVars.STRIPE_PRICE_ORDER_BUMP || '',
  ).trim();

  if (!priceId) {
    const error = new Error(
      'Preço Stripe do order bump não configurado. Defina STRIPE_PRICE_ORDER_BUMP_ADVANCED_ANALYSIS no backend.',
    );
    error.code = 'BILLING_PRICE_NOT_CONFIGURED';
    throw error;
  }

  return {
    id: 'advanced-analysis',
    type: 'order_bump',
    mode: 'payment',
    quantity: 1,
    priceId,
    currency: 'brl',
  };
}

export function getRecurringCreditsByPlan(plan = '') {
  const normalized = normalizePlanId(plan);
  if (normalized === 'business') return 25;
  if (normalized === 'professional') return 10;
  return 0;
}

export function resolveStripePaymentMethods(mode = 'payment', currency = 'brl') {
  const normalizedMode = normalizeMode(mode);
  const normalizedCurrency = String(currency || '').trim().toLowerCase();

  if (normalizedMode === 'subscription') {
    return ['card'];
  }

  if (normalizedCurrency === 'brl') {
    return ['card', 'pix'];
  }

  return ['card'];
}
