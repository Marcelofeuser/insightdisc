import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasFeatureAccess,
  resolveFeatureMinimumPlan,
  resolveUserPlan,
} from '../../server/src/modules/plans/feature-access.js';

test('resolveUserPlan prioriza role quando plano explícito não existe', () => {
  assert.equal(resolveUserPlan({ role: 'ADMIN' }), 'business');
  assert.equal(resolveUserPlan({ role: 'PRO' }), 'professional');
  assert.equal(resolveUserPlan({ role: 'CANDIDATE' }), 'personal');
});

test('hasFeatureAccess aplica matriz personal/professional/business', () => {
  assert.equal(hasFeatureAccess('personal', 'ai_lab'), false);
  assert.equal(hasFeatureAccess('professional', 'ai_lab'), true);
  assert.equal(hasFeatureAccess('professional', 'team_map'), false);
  assert.equal(hasFeatureAccess('business', 'team_map'), true);
  assert.equal(hasFeatureAccess('business', 'jobs'), true);
  assert.equal(hasFeatureAccess('business', 'insights'), true);
});

test('resolveFeatureMinimumPlan retorna plano mínimo esperado', () => {
  assert.equal(resolveFeatureMinimumPlan('coach'), 'professional');
  assert.equal(resolveFeatureMinimumPlan('ai_lab'), 'professional');
  assert.equal(resolveFeatureMinimumPlan('team_map'), 'business');
  assert.equal(resolveFeatureMinimumPlan('jobs'), 'business');
  assert.equal(resolveFeatureMinimumPlan('insights'), 'business');
});
