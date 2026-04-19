import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasSynapsysSourceParam,
  shouldUseSynapsysStandaloneMode,
} from '../../src/modules/synapsys/route-mode.js';

test('reconhece source=synapsys na query string', () => {
  assert.equal(hasSynapsysSourceParam('?source=synapsys&plan=premium'), true);
  assert.equal(hasSynapsysSourceParam('?source=other'), false);
});

test('habilita modo standalone da Synapsys por hostname runtime', () => {
  assert.equal(
    shouldUseSynapsysStandaloneMode({
      runtime: true,
      search: '',
      routeContext: false,
    }),
    true,
  );
});

test('habilita modo standalone da Synapsys por contexto de rota salvo', () => {
  assert.equal(
    shouldUseSynapsysStandaloneMode({
      runtime: false,
      search: '',
      routeContext: true,
    }),
    true,
  );
});

test('mantem rotas gerais fora do modo Synapsys quando nao ha sinalizadores', () => {
  assert.equal(
    shouldUseSynapsysStandaloneMode({
      runtime: false,
      search: '',
      routeContext: false,
    }),
    false,
  );
});
