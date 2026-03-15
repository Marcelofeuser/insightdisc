import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl, resolveApiRequestUrl } from '../../src/lib/apiClient.js';

test('mantem localhost no ambiente local quando a API local esta configurada', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    mode: 'development',
    dev: true,
    prod: false,
    configuredApiUrl: 'http://localhost:4000',
    runtimeOrigin: 'http://localhost:5173',
  });

  assert.equal(apiBaseUrl, 'http://localhost:4000');
});

test('usa api.insightdisc.com no app publicado quando o build vier sem VITE_API_URL', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    mode: 'production',
    dev: false,
    prod: true,
    configuredApiUrl: '',
    runtimeOrigin: 'https://app.insightdisc.com',
  });

  assert.equal(apiBaseUrl, 'https://api.insightdisc.com');
});

test('canoniza host legado insightdisc-api.vercel.app para api.insightdisc.com em producao', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    mode: 'production',
    dev: false,
    prod: true,
    configuredApiUrl: 'https://insightdisc-api.vercel.app',
    runtimeOrigin: 'https://app.insightdisc.com',
  });

  assert.equal(apiBaseUrl, 'https://api.insightdisc.com');
});

test('preserva configuracao absoluta customizada fora do host publico principal', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    mode: 'production',
    dev: false,
    prod: true,
    configuredApiUrl: 'https://staging-api.example.com',
    runtimeOrigin: 'https://staging.example.com',
  });

  assert.equal(apiBaseUrl, 'https://staging-api.example.com');
});

test('usa proxy same-origin para campanhas no app publicado', () => {
  const url = resolveApiRequestUrl('/api/campaigns', {
    baseUrl: 'https://api.insightdisc.com',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://app.insightdisc.com/api/proxy/api/campaigns');
});

test('usa proxy same-origin para rotas autenticadas do backend no app publicado', () => {
  const url = resolveApiRequestUrl('/super-admin/overview', {
    baseUrl: 'https://api.insightdisc.com',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://app.insightdisc.com/api/proxy/super-admin/overview');
});

test('converte URL absoluta do backend para proxy same-origin no app publicado', () => {
  const url = resolveApiRequestUrl('https://api.insightdisc.com/report/report-123/pdf?download=1', {
    baseUrl: 'https://api.insightdisc.com',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://app.insightdisc.com/api/proxy/report/report-123/pdf?download=1');
});

test('mantem endpoints serverless locais fora do proxy de backend', () => {
  const url = resolveApiRequestUrl('/api/stripe/verify', {
    baseUrl: 'https://api.insightdisc.com',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://app.insightdisc.com/api/stripe/verify');
});
