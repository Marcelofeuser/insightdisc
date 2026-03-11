import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORT_TIER,
  getReportTierProgress,
  resolveReportTierByPlan,
} from '../../src/modules/reports/reportValueLadder.js';

test('resolveReportTierByPlan mapeia planos para escada de relatorios', () => {
  assert.equal(resolveReportTierByPlan('personal'), REPORT_TIER.STANDARD);
  assert.equal(resolveReportTierByPlan('professional'), REPORT_TIER.PREMIUM);
  assert.equal(resolveReportTierByPlan('business'), REPORT_TIER.PROFESSIONAL);
});

test('getReportTierProgress marca nivel atual corretamente', () => {
  const levels = getReportTierProgress(REPORT_TIER.PREMIUM);
  assert.equal(levels.length, 3);
  assert.equal(levels[0].state, 'passed');
  assert.equal(levels[1].state, 'current');
  assert.equal(levels[2].state, 'upcoming');
});

