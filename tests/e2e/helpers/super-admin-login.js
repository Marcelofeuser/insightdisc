import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RETRYABLE_LOGIN_STATUSES = new Set([401, 404]);

let hasAttemptedSeed = false;

function normalizeApiBaseUrl(value = '') {
  const normalized = String(value || '').trim();
  return normalized ? normalized.replace(/\/+$/, '') : 'http://localhost:4000';
}

function normalizeSuperAdminCredentials(credentials = {}) {
  return {
    email: String(credentials.email || '').trim().toLowerCase(),
    password: String(credentials.password || ''),
    masterKey: String(credentials.masterKey || ''),
  };
}

async function requestSuperAdminLogin(request, { apiBaseUrl, credentials }) {
  const response = await request.post(`${apiBaseUrl}/auth/super-admin-login`, {
    data: {
      email: credentials.email,
      password: credentials.password,
      masterKey: credentials.masterKey,
    },
    failOnStatusCode: false,
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function formatSeedError(error) {
  const stdout = String(error?.stdout || '')
    .trim()
    .split('\n')
    .slice(-5)
    .join(' | ');
  const stderr = String(error?.stderr || '')
    .trim()
    .split('\n')
    .slice(-5)
    .join(' | ');
  const message = String(error?.message || 'seed-super-admin failed');

  return [message, stderr, stdout].filter(Boolean).join(' :: ');
}

function seedSuperAdminUser() {
  if (hasAttemptedSeed) return null;
  hasAttemptedSeed = true;

  const seedScriptPath = path.resolve(process.cwd(), 'server/scripts/seed-super-admin.js');
  try {
    execFileSync(process.execPath, [seedScriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
    });
    return null;
  } catch (error) {
    return formatSeedError(error);
  }
}

export async function loginSuperAdminWithAutoSeed(
  request,
  { apiBaseUrl = 'http://localhost:4000', credentials = {} } = {},
) {
  const resolvedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const resolvedCredentials = normalizeSuperAdminCredentials(credentials);

  let { response, payload } = await requestSuperAdminLogin(request, {
    apiBaseUrl: resolvedApiBaseUrl,
    credentials: resolvedCredentials,
  });

  if (!RETRYABLE_LOGIN_STATUSES.has(response.status())) {
    return {
      response,
      payload,
      credentials: resolvedCredentials,
      seedAttempted: false,
      seedError: '',
    };
  }

  const seedError = seedSuperAdminUser();
  if (seedError) {
    return {
      response,
      payload,
      credentials: resolvedCredentials,
      seedAttempted: true,
      seedError,
    };
  }

  ({ response, payload } = await requestSuperAdminLogin(request, {
    apiBaseUrl: resolvedApiBaseUrl,
    credentials: resolvedCredentials,
  }));

  return {
    response,
    payload,
    credentials: resolvedCredentials,
    seedAttempted: true,
    seedError: '',
  };
}
