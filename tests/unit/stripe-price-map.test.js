import test from 'node:test';
import assert from 'node:assert/strict';

import { getPriceId, resolvePlanFromPrice } from '../../server/src/modules/billing/stripe-price-map.js';
import { getRecurringCreditsByPlan } from '../../server/src/modules/billing/stripe-catalog.js';

test('getPriceId usa env-only e exige configuração', () => {
  assert.equal(
    getPriceId('professional', { STRIPE_PRICE_PROFESSIONAL: 'price_professional' }),
    'price_professional',
  );

  assert.throws(
    () => getPriceId('professional', {}),
    (error) => error?.code === 'BILLING_PRICE_NOT_CONFIGURED' && error?.envKey === 'STRIPE_PRICE_PROFESSIONAL',
  );
});

test('getPriceId aceita alias legado somente via env', () => {
  assert.equal(
    getPriceId('disc_individual', { STRIPE_PRICE_DISC_INDIVIDUAL: 'price_disc' }),
    'price_disc',
  );

  assert.equal(
    getPriceId('disc_individual', { STRIPE_PRICE_SINGLE: 'price_single' }),
    'price_single',
  );
});

test('resolvePlanFromPrice resolve plano via price_id do env', () => {
  const envVars = {
    STRIPE_PRICE_PROFESSIONAL: 'price_professional',
    STRIPE_PRICE_BUSINESS_CORPORATION: 'price_corp',
    STRIPE_PRICE_WHITE_LABEL_ONE_TIME: 'price_whitelabel',
  };

  assert.equal(resolvePlanFromPrice('price_professional', envVars), 'professional');
  assert.equal(resolvePlanFromPrice('price_corp', envVars), 'business_corporation');
  assert.equal(resolvePlanFromPrice('price_whitelabel', envVars), 'white_label_one_time');
  assert.equal(resolvePlanFromPrice('price_unknown', envVars), '');
});

test('getRecurringCreditsByPlan libera ilimitado para corporation/diamond', () => {
  assert.equal(getRecurringCreditsByPlan('professional'), 10);
  assert.equal(getRecurringCreditsByPlan('business'), 25);
  assert.equal(getRecurringCreditsByPlan('business_corporation'), 999999);
  assert.equal(getRecurringCreditsByPlan('diamond_consulting'), 999999);
});

