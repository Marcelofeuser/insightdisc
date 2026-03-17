import test from 'node:test';
import assert from 'node:assert/strict';

import { apiRequest, checkApiHealth } from '../../src/lib/apiClient.js';
import { mapAuthRequestError } from '../../src/modules/auth/authApi.js';

const originalFetch = global.fetch;

function restoreFetch() {
  global.fetch = originalFetch;
}

test.afterEach(() => {
  restoreFetch();
});

test('apiRequest faz retry único em erro transitório de rede', async () => {
  let attempts = 0;

  global.fetch = async () => {
    attempts += 1;

    if (attempts === 1) {
      throw new TypeError('Failed to fetch');
    }

    return new Response(JSON.stringify({ ok: true, token: 'abc', user: { id: '1' } }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  };

  const payload = await apiRequest('/auth/super-admin-login', {
    method: 'POST',
    baseUrl: 'http://localhost:4000',
    body: {
      email: 'admin@insightdisc.app',
      password: 'Trocar123!',
      masterKey: 'InsightDiscMaster2026!',
    },
    retry: 1,
    retryDelayMs: 0,
    includeAuthHeaders: false,
  });

  assert.equal(attempts, 2);
  assert.equal(payload.ok, true);
  assert.equal(payload.token, 'abc');
});

test('apiRequest retorna REQUEST_TIMEOUT quando a API excede o limite', async () => {
  global.fetch = (_url, options = {}) =>
    new Promise((_, reject) => {
      options.signal?.addEventListener(
        'abort',
        () => {
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });

  await assert.rejects(
    () =>
      apiRequest('/auth/super-admin-login', {
        method: 'POST',
        baseUrl: 'http://localhost:4000',
        body: { email: 'admin@insightdisc.app', password: 'x', masterKey: 'y' },
        timeoutMs: 20,
        includeAuthHeaders: false,
      }),
    (error) => {
      assert.equal(error.code, 'REQUEST_TIMEOUT');
      assert.equal(error.requestUrl, 'http://localhost:4000/auth/super-admin-login');
      return true;
    },
  );
});

test('checkApiHealth traduz falha de conexão para API_HEALTHCHECK_FAILED', async () => {
  global.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  await assert.rejects(
    () =>
      checkApiHealth({
        baseUrl: 'http://localhost:4000',
        retry: 0,
        timeoutMs: 50,
      }),
    (error) => {
      assert.equal(error.code, 'API_HEALTHCHECK_FAILED');
      assert.equal(error.payload?.message, 'Servidor backend não está acessível no momento.');
      return true;
    },
  );
});

test('mapAuthRequestError converte backend indisponível e chave master inválida em mensagens legíveis', () => {
  assert.equal(
    mapAuthRequestError(
      { code: 'API_HEALTHCHECK_FAILED' },
      { apiBaseUrl: 'http://localhost:4000', path: '/auth/super-admin-login' },
    ),
    'Servidor backend não está acessível no momento em http://localhost:4000.',
  );

  assert.equal(
    mapAuthRequestError(
      {
        status: 403,
        payload: {
          error: 'INVALID_MASTER_KEY',
        },
      },
      { apiBaseUrl: 'http://localhost:4000', path: '/auth/super-admin-login' },
    ),
    'Chave administrativa incorreta.',
  );
});
