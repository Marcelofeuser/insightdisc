import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSynapsysAppPath,
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
} from '../../src/modules/synapsys/routes.js';
import {
  normalizeSynapsysIntent,
  resolveSynapsysAuthDestination,
} from '../../src/modules/synapsys/session.js';

test('monta rota de signup com intent e next sanitizado', () => {
  assert.equal(
    buildSynapsysSignupPath({
      intent: 'premium',
      next: '/chat/app?plan=premium',
    }),
    '/chat/signup?intent=premium&next=%2Fchat%2Fapp%3Fplan%3Dpremium',
  );
});

test('monta rota de pricing com source synapsys', () => {
  assert.equal(
    buildSynapsysPricingPath({ plan: 'premium' }),
    '/pricing?source=synapsys&plan=premium',
  );
});

test('normaliza intent desconhecido para free', () => {
  assert.equal(normalizeSynapsysIntent('qualquer'), 'free');
});

test('destino pos-auth cai na entrada quando usuario ainda nao tem acesso synapsys', () => {
  assert.equal(
    resolveSynapsysAuthDestination('free', { plan: 'personal' }),
    '/chat/entry',
  );
});

test('destino pos-auth cai no chat gratis quando acesso free existe', () => {
  assert.equal(
    resolveSynapsysAuthDestination('free', {
      synapsys_access: {
        tier: 'free',
        status: 'trial',
        has_access: true,
      },
    }),
    buildSynapsysAppPath({ plan: 'free' }),
  );
});

test('destino pos-auth cai no pricing quando intent premium ainda nao esta liberado', () => {
  assert.equal(
    resolveSynapsysAuthDestination('premium', { plan: 'personal' }),
    buildSynapsysPricingPath({ plan: 'premium' }),
  );
});
