function createBillingPriceNotConfiguredError({ planKey, envKey } = {}) {
  const error = new Error(
    `Preço Stripe não configurado para ${planKey}. Defina ${envKey} no backend.`,
  );
  error.code = 'BILLING_PRICE_NOT_CONFIGURED';
  error.planKey = planKey;
  error.envKey = envKey;
  return error;
}

export const STRIPE_V21_PRICE_ENV_KEYS = Object.freeze({
  disc_individual: 'STRIPE_PRICE_DISC_INDIVIDUAL',

  personal: 'STRIPE_PRICE_PERSONAL',
  insider: 'STRIPE_PRICE_INSIDER',

  professional: 'STRIPE_PRICE_PROFESSIONAL',
  business: 'STRIPE_PRICE_BUSINESS',
  business_corporation: 'STRIPE_PRICE_BUSINESS_CORPORATION',
  diamond_consulting: 'STRIPE_PRICE_DIAMOND_CONSULTING',

  white_label_one_time: 'STRIPE_PRICE_WHITE_LABEL_ONE_TIME',
});

export const STRIPE_V21_PRICE_ENV_ALIASES = Object.freeze({
  disc_individual: Object.freeze(['STRIPE_PRICE_SINGLE']),
});

function resolveEnvKeyCandidates(planKey = '') {
  const canonicalKey = STRIPE_V21_PRICE_ENV_KEYS[planKey] || '';
  const aliases = STRIPE_V21_PRICE_ENV_ALIASES[planKey] || [];
  return [canonicalKey, ...aliases].filter(Boolean);
}

export function getPriceId(planKey = '', envVars = process.env) {
  const normalizedPlanKey = String(planKey || '').trim().toLowerCase();
  if (!normalizedPlanKey) return '';

  const envKeys = resolveEnvKeyCandidates(normalizedPlanKey);
  if (envKeys.length === 0) return '';

  for (const envKey of envKeys) {
    const value = String(envVars?.[envKey] || '').trim();
    if (value) return value;
  }

  throw createBillingPriceNotConfiguredError({
    planKey: normalizedPlanKey,
    envKey: envKeys[0],
  });
}

export function resolvePlanFromPrice(priceId = '', envVars = process.env) {
  const normalizedPriceId = String(priceId || '').trim();
  if (!normalizedPriceId) return '';

  for (const planKey of Object.keys(STRIPE_V21_PRICE_ENV_KEYS)) {
    const envKeys = resolveEnvKeyCandidates(planKey);
    for (const envKey of envKeys) {
      const envValue = String(envVars?.[envKey] || '').trim();
      if (envValue && envValue === normalizedPriceId) return planKey;
    }
  }

  return '';
}
