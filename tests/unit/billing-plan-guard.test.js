import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlanFromAccess } from '../../src/modules/billing/planConfig.js';
import { evaluateFeatureAccess, FEATURE_KEYS } from '../../src/modules/billing/planGuard.js';

test('resolvePlanFromAccess normaliza planos legados para camada SaaS', () => {
  assert.equal(resolvePlanFromAccess({ plan: 'free' }), 'personal');
  assert.equal(resolvePlanFromAccess({ plan: 'premium' }), 'professional');
  assert.equal(resolvePlanFromAccess({ plan: 'enterprise' }), 'business');
});

test('evaluateFeatureAccess bloqueia team map para plano personal', () => {
  const result = evaluateFeatureAccess(
    { plan: 'free', lifecycleStatus: 'registered_no_purchase' },
    FEATURE_KEYS.TEAM_MAP,
  );

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'plan_limit');
  assert.equal(result.upgradeTo, 'business');
});

test('evaluateFeatureAccess libera exportacao PDF para plano professional com permissao', () => {
  const result = evaluateFeatureAccess(
    {
      plan: 'premium',
      lifecycleStatus: 'customer_active',
      tenantRole: 'TENANT_ADMIN',
      entitlements: ['report.export.pdf', 'report.pro'],
    },
    FEATURE_KEYS.REPORT_PDF,
  );

  assert.equal(result.allowed, true);
});

test('professional libera comparacao avancada e relatorio premium', () => {
  const comparison = evaluateFeatureAccess(
    { plan: 'premium', lifecycleStatus: 'customer_active' },
    FEATURE_KEYS.ADVANCED_COMPARISON,
  );
  const premiumReport = evaluateFeatureAccess(
    { plan: 'premium', lifecycleStatus: 'customer_active' },
    FEATURE_KEYS.PREMIUM_REPORTS,
  );

  assert.equal(comparison.allowed, true);
  assert.equal(premiumReport.allowed, true);
});

test('professional bloqueia inteligencia organizacional e business libera', () => {
  const professionalTeamMap = evaluateFeatureAccess(
    { plan: 'premium', lifecycleStatus: 'customer_active' },
    FEATURE_KEYS.TEAM_MAP,
  );
  const businessTeamMap = evaluateFeatureAccess(
    { plan: 'enterprise', lifecycleStatus: 'customer_active' },
    FEATURE_KEYS.TEAM_MAP,
  );

  assert.equal(professionalTeamMap.allowed, false);
  assert.equal(professionalTeamMap.upgradeTo, 'business');
  assert.equal(businessTeamMap.allowed, true);
});
