import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveApiBaseUrl,
  resolveApiRequestUrl,
} from '../../src/lib/apiClient.js';

test('resolveApiBaseUrl usa fallback local quando o frontend roda em localhost sem env configurada', () => {
  const result = resolveApiBaseUrl({
    mode: 'development',
    dev: true,
    prod: false,
    configuredApiUrl: '',
    configuredApiBaseUrl: '',
    runtimeOrigin: 'http://localhost:5173',
  });

  assert.equal(result, 'http://localhost:4000');
});

test('resolveApiBaseUrl preserva URL explicitamente configurada', () => {
  const result = resolveApiBaseUrl({
    mode: 'development',
    dev: true,
    prod: false,
    configuredApiUrl: 'http://localhost:4100',
    configuredApiBaseUrl: '',
    runtimeOrigin: 'http://localhost:5173',
  });

  assert.equal(result, 'http://localhost:4100');
});

test('resolveApiRequestUrl monta a rota de login super admin com base absoluta', () => {
  const result = resolveApiRequestUrl('/auth/super-admin-login', {
    baseUrl: 'http://localhost:4000',
  });

  assert.equal(result, 'http://localhost:4000/auth/super-admin-login');
});
