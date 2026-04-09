import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasFeatureAccess,
  resolveFeatureMinimumPlan,
  resolveUserPlan,
  mapPlanForFeatures,
} from '../../server/src/modules/plans/feature-access.js';

test('ai_lab exige professional', () => {
  assert.equal(resolveFeatureMinimumPlan('ai_lab'), 'professional');
});

test('coach exige professional', () => {
  assert.equal(resolveFeatureMinimumPlan('coach'), 'professional');
});

test('team_map exige business', () => {
  assert.equal(resolveFeatureMinimumPlan('team_map'), 'business');
});

test('ai_lab bloqueado no personal', () => {
  assert.equal(hasFeatureAccess('personal', 'ai_lab'), false);
});

test('ai_lab liberado no professional', () => {
  assert.equal(hasFeatureAccess('professional', 'ai_lab'), true);
});

test('ai_lab liberado no business', () => {
  assert.equal(hasFeatureAccess('business', 'ai_lab'), true);
});

test('ai_lab liberado no corporation', () => {
  assert.equal(hasFeatureAccess('corporation', 'ai_lab'), true);
});

test('ai_lab liberado no diamond_consulting', () => {
  assert.equal(hasFeatureAccess('diamond_consulting', 'ai_lab'), true);
});

test('normaliza nomes legados', () => {
  assert.equal(mapPlanForFeatures('premium'), 'professional');
  assert.equal(mapPlanForFeatures('enterprise'), 'corporation');
  assert.equal(mapPlanForFeatures('diamond'), 'diamond_consulting');
  assert.equal(mapPlanForFeatures('standard'), 'personal');
});

test('plano explícito personal NÃO deve subir para professional mesmo com pagamento', () => {
  assert.equal(
    resolveUserPlan({ plan: 'personal', payment_status: 'paid' }),
    'personal'
  );
});

test('subscription premium vira professional', () => {
  assert.equal(
    resolveUserPlan({ subscription_plan: 'premium' }),
    'professional'
  );
});

test('usuário pago sem plano explícito sobe para professional', () => {
  assert.equal(resolveUserPlan({ payment_status: 'paid' }), 'professional');
});

test('role ADMIN resolve business', () => {
  assert.equal(resolveUserPlan({ role: 'ADMIN' }), 'business');
});

test('role PROFESSIONAL resolve professional', () => {
  assert.equal(resolveUserPlan({ role: 'PROFESSIONAL' }), 'professional');
});

test('sem nada => personal', () => {
  assert.equal(resolveUserPlan({}), 'personal');
});
