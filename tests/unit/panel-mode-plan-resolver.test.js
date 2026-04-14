import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePanelModeFromPlan } from '../../src/modules/navigation/panelModePlanResolver.js';

test('mantem modo personal para plano personal', () => {
  assert.equal(
    resolvePanelModeFromPlan({
      plan: 'personal',
      lifecycleStatus: 'customer_active',
    }),
    'personal',
  );
});

test('eleva insider para modo professional mesmo sem tenant role', () => {
  assert.equal(
    resolvePanelModeFromPlan({
      plan: 'insider',
      role: 'PRO',
      lifecycleStatus: 'customer_active',
      tenantRole: null,
      globalRole: null,
    }),
    'professional',
  );
});

test('eleva business para modo business mesmo sem tenant role', () => {
  assert.equal(
    resolvePanelModeFromPlan({
      plan: 'business',
      role: 'PRO',
      lifecycleStatus: 'customer_active',
      tenantRole: null,
      globalRole: null,
    }),
    'business',
  );
});

test('mapeia diamond consulting para modo business', () => {
  assert.equal(
    resolvePanelModeFromPlan({
      plan: 'diamond',
      lifecycleStatus: 'customer_active',
    }),
    'business',
  );
});

test('mapeia corporation para modo business', () => {
  assert.equal(
    resolvePanelModeFromPlan({
      plan: 'corporation',
      lifecycleStatus: 'customer_active',
    }),
    'business',
  );
});
