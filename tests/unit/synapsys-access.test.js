import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSynapsysUsageState,
  hasSynapsysAccess,
  normalizeSynapsysAccess,
  resolveSynapsysTier,
} from '../../src/modules/synapsys/access.js';

test('normaliza acesso free da synapsys com saldo diario', () => {
  const access = normalizeSynapsysAccess({
    tier: 'free',
    status: 'trial',
    daily_message_limit: 10,
    daily_messages_used: 4,
    has_access: true,
  });

  assert.equal(access?.tier, 'free');
  assert.equal(access?.dailyMessagesRemaining, 6);
  assert.equal(access?.hasAccess, true);
});

test('nao concede acesso synapsys apenas por estar autenticado no insightdisc', () => {
  assert.equal(
    hasSynapsysAccess({ plan: 'business', lifecycle_status: 'customer_active' }),
    false,
  );
});

test('resolve tier premium somente quando acesso premium existe', () => {
  assert.equal(
    resolveSynapsysTier({
      synapsys_access: {
        tier: 'premium',
        status: 'active',
        has_access: true,
      },
    }),
    'premium',
  );
});

test('monta estado de uso locked quando synapsys ainda nao foi ativada', () => {
  const usage = buildSynapsysUsageState(null);
  assert.equal(usage.tier, 'locked');
  assert.equal(usage.remaining, 0);
});
