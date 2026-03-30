import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStripeCheckoutMetadata } from '../../server/src/modules/billing/stripe-billing.service.js';

test('buildStripeCheckoutMetadata inclui vinculo obrigatório de usuário e conta', () => {
  const metadata = buildStripeCheckoutMetadata({
    userId: 'user_123',
    user: { email: 'cliente@insightdisc.app' },
    input: {
      flow: 'checkout_plan',
      assessmentId: 'assessment_1',
      token: 'tok_abc',
      product: 'business-monthly',
      productType: 'business_subscription',
    },
    checkoutItem: {
      id: 'business',
      mode: 'subscription',
      planTarget: 'business',
      type: 'plan',
      priceId: 'price_business',
    },
    orderBump: {
      id: 'advanced-analysis',
      priceId: 'price_bump_19',
    },
    creditsToGrant: 0,
    resolvedWorkspaceId: 'workspace_1',
  });

  assert.equal(metadata.userId, 'user_123');
  assert.equal(metadata.email, 'cliente@insightdisc.app');
  assert.equal(metadata.planId, 'business');
  assert.equal(metadata.workspaceId, 'workspace_1');
  assert.equal(metadata.accountId, 'workspace_1');
  assert.equal(metadata.checkoutMode, 'subscription');
  assert.equal(metadata.stripePriceId, 'price_business');
  assert.equal(metadata.orderBumpId, 'advanced-analysis');
  assert.equal(metadata.orderBumpPriceId, 'price_bump_19');
});
