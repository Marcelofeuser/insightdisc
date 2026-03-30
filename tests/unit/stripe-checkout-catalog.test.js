import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlanId,
  resolveCheckoutCatalogEntry,
  resolveOrderBumpEntry,
  resolveStripePaymentMethods,
} from '../../server/src/modules/billing/stripe-catalog.js';

test('normalizePlanId traduz aliases de plano corretamente', () => {
  assert.equal(normalizePlanId('profissional'), 'professional');
  assert.equal(normalizePlanId('business'), 'business');
  assert.equal(normalizePlanId('personal'), 'personal');
  assert.equal(normalizePlanId('diamond'), 'business');
});

test('resolveCheckoutCatalogEntry monta sessão de assinatura para plano professional', () => {
  const entry = resolveCheckoutCatalogEntry(
    {
      planId: 'profissional',
      mode: 'subscription',
    },
    {
      envVars: {
        STRIPE_PRICE_PROFESSIONAL: 'price_professional',
      },
    },
  );

  assert.equal(entry.id, 'professional');
  assert.equal(entry.mode, 'subscription');
  assert.equal(entry.priceId, 'price_professional');
  assert.equal(entry.planTarget, 'professional');
});

test('resolveCheckoutCatalogEntry usa preço unitário como fallback para pacote de créditos', () => {
  const entry = resolveCheckoutCatalogEntry(
    {
      productType: 'credit_pack',
      credits: 50,
      mode: 'payment',
    },
    {
      envVars: {
        STRIPE_PRICE_ID_CREDITS: 'price_credit_unit',
      },
    },
  );

  assert.equal(entry.id, 'pack-50');
  assert.equal(entry.mode, 'payment');
  assert.equal(entry.priceId, 'price_credit_unit');
  assert.equal(entry.quantity, 50);
  assert.equal(entry.creditsToGrant, 50);
});

test('resolveCheckoutCatalogEntry valida mismatch entre priceId informado e catálogo oficial', () => {
  assert.throws(
    () =>
      resolveCheckoutCatalogEntry(
        {
          product: 'single',
          priceId: 'price_client_side_override',
        },
        {
          envVars: {
            STRIPE_PRICE_SINGLE: 'price_single_official',
          },
        },
      ),
    (error) => error?.code === 'INVALID_PRICE_FOR_PRODUCT',
  );
});

test('resolveStripePaymentMethods habilita PIX somente para payment BRL', () => {
  assert.deepEqual(resolveStripePaymentMethods('payment', 'brl'), ['card', 'pix']);
  assert.deepEqual(resolveStripePaymentMethods('subscription', 'brl'), ['card']);
  assert.deepEqual(resolveStripePaymentMethods('payment', 'usd'), ['card']);
});

test('resolveOrderBumpEntry retorna line item quando order bump está ativo', () => {
  const entry = resolveOrderBumpEntry(
    {
      orderBumpAdvancedAnalysis: true,
    },
    {
      envVars: {
        STRIPE_PRICE_ORDER_BUMP_ADVANCED_ANALYSIS: 'price_bump_19',
      },
    },
  );

  assert.equal(entry.id, 'advanced-analysis');
  assert.equal(entry.priceId, 'price_bump_19');
  assert.equal(entry.quantity, 1);
});

test('resolveOrderBumpEntry exige preço quando order bump está ativo', () => {
  assert.throws(
    () =>
      resolveOrderBumpEntry(
        {
          orderBumpAdvancedAnalysis: true,
        },
        {
          envVars: {},
        },
      ),
    (error) => error?.code === 'BILLING_PRICE_NOT_CONFIGURED',
  );
});
