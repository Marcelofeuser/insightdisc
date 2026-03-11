import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreditConsumptionResult,
  canConsumeCredits,
  resolveCreditsBalance,
} from '../../src/modules/credits/creditsEngine.js';

test('resolveCreditsBalance encontra saldo em payload heterogeneo', () => {
  const value = resolveCreditsBalance({
    summary: { balance: 12 },
  });
  assert.equal(value, 12);
});

test('canConsumeCredits bloqueia quando saldo e insuficiente', () => {
  const result = canConsumeCredits({
    balance: 0,
    amount: 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient_credits');
});

test('buildCreditConsumptionResult normaliza saida semantica', () => {
  const result = buildCreditConsumptionResult({
    ok: true,
    userId: 'user-1',
    balance: 10,
    consumed: 1,
    remaining: 9,
    reason: 'consumed',
    source: 'client',
  });

  assert.equal(result.ok, true);
  assert.equal(result.userId, 'user-1');
  assert.equal(result.remaining, 9);
  assert.equal(result.reason, 'consumed');
});
