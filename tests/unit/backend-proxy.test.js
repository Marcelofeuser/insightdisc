import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyProxyError,
  resolveBackendCandidates,
} from '../../api/_lib/backend-proxy.js';

test('resolveBackendCandidates prioriza BACKEND_API_URL e adiciona fallback legado', () => {
  const candidates = resolveBackendCandidates({
    BACKEND_API_URL: 'https://api.insightdisc.com',
  });

  assert.deepEqual(
    candidates.map((entry) => entry.url),
    ['https://api.insightdisc.com', 'https://insightdisc-api.vercel.app'],
  );
});

test('resolveBackendCandidates ignora host do frontend por seguranca', () => {
  const candidates = resolveBackendCandidates({
    BACKEND_API_URL: 'https://app.insightdisc.com',
    VITE_API_URL: '',
    API_BASE_URL: '',
  });

  assert.deepEqual(
    candidates.map((entry) => entry.url),
    ['https://api.insightdisc.com', 'https://insightdisc-api.vercel.app'],
  );
});

test('classifyProxyError identifica falha de DNS', () => {
  const classified = classifyProxyError({
    message: 'fetch failed',
    cause: { code: 'ENOTFOUND' },
  });

  assert.deepEqual(classified, {
    code: 'BACKEND_DNS_ERROR',
    message: 'Falha ao resolver DNS do backend configurado.',
    networkCode: 'ENOTFOUND',
  });
});
