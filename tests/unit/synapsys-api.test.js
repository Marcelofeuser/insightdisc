import test from 'node:test';
import assert from 'node:assert/strict';

import {
  requestSynapsysApi,
  resolveSynapsysApiBaseCandidates,
} from '../../src/lib/synapsysApi.js';

const originalFetch = global.fetch;

test.afterEach(() => {
  global.fetch = originalFetch;
});

test('resolveSynapsysApiBaseCandidates prioriza o backend canonico do app', () => {
  const result = resolveSynapsysApiBaseCandidates({
    apiBaseUrl: 'https://insightdisc-production.up.railway.app',
    configuredSynapsysApiUrl: 'https://api.synapsys.insightdisc.com',
  });

  assert.deepEqual(result, [
    'https://insightdisc-production.up.railway.app',
    'https://api.synapsys.insightdisc.com',
  ]);
});

test('requestSynapsysApi usa o proximo host quando o primeiro devolve 404', async () => {
  const calls = [];

  global.fetch = async (url) => {
    calls.push(String(url));

    if (String(url) === 'https://legacy.example.com/synapsys/health') {
      return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'not found' }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  };

  const payload = await requestSynapsysApi('/synapsys/health', {
    method: 'GET',
    includeAuthHeaders: false,
    retry: 0,
    baseUrls: ['https://legacy.example.com', 'https://canonical.example.com'],
  });

  assert.equal(payload.status, 'ok');
  assert.deepEqual(calls, [
    'https://legacy.example.com/synapsys/health',
    'https://canonical.example.com/synapsys/health',
  ]);
});
