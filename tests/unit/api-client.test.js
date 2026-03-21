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

test('usa insightdisc-production.up.railway.app no app publicado quando o build vier sem VITE_API_URL', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    mode: 'production',
    dev: false,
    prod: true,
    configuredApiUrl: '',
    runtimeOrigin: 'https://app.insightdisc.com',
  });

  assert.equal(apiBaseUrl, 'https://insightdisc-production.up.railway.app');
});

test('canoniza host legado insightdisc-api.vercel.app para insightdisc-production.up.railway.app em producao', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    mode: 'production',
    dev: false,
    prod: true,
    configuredApiUrl: 'https://insightdisc-api.vercel.app',
    runtimeOrigin: 'https://app.insightdisc.com',
  });

  assert.equal(apiBaseUrl, 'https://insightdisc-production.up.railway.app');
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

test('usa backend direto para campanhas no app publicado', () => {
  const url = resolveApiRequestUrl('/api/campaigns', {
    baseUrl: 'https://insightdisc-production.up.railway.app',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://insightdisc-production.up.railway.app/api/campaigns');
});

test('usa backend direto para rotas autenticadas do backend no app publicado', () => {
  const url = resolveApiRequestUrl('/super-admin/overview', {
    baseUrl: 'https://insightdisc-production.up.railway.app',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://insightdisc-production.up.railway.app/super-admin/overview');
});

test('usa backend direto para rotas de autenticacao no app publicado', () => {
  const url = resolveApiRequestUrl('/auth/login', {
    baseUrl: 'https://insightdisc-production.up.railway.app',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://insightdisc-production.up.railway.app/auth/login');
});

test('mantem URL absoluta do backend fora do proxy same-origin no app publicado', () => {
  const url = resolveApiRequestUrl('https://insightdisc-production.up.railway.app/report/report-123/pdf?download=1', {
    baseUrl: 'https://insightdisc-production.up.railway.app',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://insightdisc-production.up.railway.app/report/report-123/pdf?download=1');
});

test('mantem endpoints serverless locais fora do proxy de backend', () => {
  const url = resolveApiRequestUrl('/api/stripe/verify', {
    baseUrl: 'https://insightdisc-production.up.railway.app',
    runtimeOrigin: 'https://app.insightdisc.com',
    prod: true,
  });

  assert.equal(url, 'https://app.insightdisc.com/api/stripe/verify');
});
