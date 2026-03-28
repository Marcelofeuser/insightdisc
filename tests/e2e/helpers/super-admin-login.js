import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';

const RETRYABLE_LOGIN_STATUSES = new Set([401, 404]);
const PLACEHOLDER_PASSWORDS = new Set(['', 'change_me_in_tests']);
const PLACEHOLDER_MASTER_KEYS = new Set(['', 'example_master_key']);

let hasAttemptedSeed = false;
let cachedEnvFallbacks = null;

function normalizeApiBaseUrl(value = '') {
  const normalized = String(value || '').trim();
  return normalized ? normalized.replace(/\/+$/, '') : 'http://localhost:4000';
}

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function readEnvFile(envFilePath) {
  try {
    if (!fs.existsSync(envFilePath)) return {};
    const raw = fs.readFileSync(envFilePath, 'utf8');
    return dotenv.parse(raw);
  } catch {
    return {};
  }
}

function readEnvFallbacks() {
  if (cachedEnvFallbacks) return cachedEnvFallbacks;

  const root = process.cwd();
  const candidates = [
    path.resolve(root, '.env.local'),
    path.resolve(root, '.env'),
    path.resolve(root, 'server/.env.local'),
    path.resolve(root, 'server/.env'),
  ];

  cachedEnvFallbacks = candidates.reduce((acc, envPath) => {
    return { ...acc, ...readEnvFile(envPath) };
  }, {});
  return cachedEnvFallbacks;
}

function pickValue(key) {
  const fromProcess = String(process.env[key] || '').trim();
  if (fromProcess) return fromProcess;

  const fallbackMap = readEnvFallbacks();
  return String(fallbackMap?.[key] || '').trim();
}

function pickCredentialValue(rawValue, fallbackValue, placeholders) {
  if (!placeholders) return rawValue || fallbackValue;
  if (rawValue && !placeholders.has(rawValue)) return rawValue;
  return fallbackValue || rawValue;
}

export function resolveSuperAdminCredentials(credentials = {}) {
  const rawEmail = normalizeEmail(credentials.email);
  const rawPassword = String(credentials.password || '');
  const rawMasterKey = String(credentials.masterKey || '').trim();

  const fallbackEmail = normalizeEmail(pickValue('SUPER_ADMIN_EMAIL') || pickValue('SUPER_ADMIN_SEED_EMAIL'));
  const fallbackPassword = pickValue('SUPER_ADMIN_PASSWORD') || pickValue('SUPER_ADMIN_SEED_PASSWORD');
  const fallbackMasterKey = pickValue('SUPER_ADMIN_MASTER_KEY');

  return {
    email: rawEmail || fallbackEmail || 'admin@insightdisc.app',
    password: pickCredentialValue(rawPassword, fallbackPassword, PLACEHOLDER_PASSWORDS),
    masterKey: pickCredentialValue(rawMasterKey, fallbackMasterKey, PLACEHOLDER_MASTER_KEYS),
  };
}

export function hasResolvableSuperAdminCredentials(credentials = {}) {
  const resolved = resolveSuperAdminCredentials(credentials);
  const resolvedPassword = String(resolved.password || '');
  const resolvedMasterKey = String(resolved.masterKey || '').trim();
  return Boolean(
    String(resolved.email || '').trim() &&
      resolvedPassword &&
      resolvedMasterKey &&
      !PLACEHOLDER_PASSWORDS.has(resolvedPassword) &&
      !PLACEHOLDER_MASTER_KEYS.has(resolvedMasterKey),
  );
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

function buildSeedEnv(credentials = {}) {
  const normalizedEmail = normalizeEmail(credentials.email);
  const normalizedPassword = String(credentials.password || '');
  const normalizedMasterKey = String(credentials.masterKey || '').trim();

  return {
    ...process.env,
    ...(normalizedEmail ? { SUPER_ADMIN_EMAIL: normalizedEmail } : {}),
    ...(normalizedEmail ? { SUPER_ADMIN_SEED_EMAIL: normalizedEmail } : {}),
    ...(normalizedPassword ? { SUPER_ADMIN_PASSWORD: normalizedPassword } : {}),
    ...(normalizedPassword ? { SUPER_ADMIN_SEED_PASSWORD: normalizedPassword } : {}),
    ...(normalizedMasterKey ? { SUPER_ADMIN_MASTER_KEY: normalizedMasterKey } : {}),
  };
}

function seedSuperAdminUser(credentials = {}) {
  if (hasAttemptedSeed) return null;
  hasAttemptedSeed = true;

  const seedScriptPath = path.resolve(process.cwd(), 'server/scripts/seed-super-admin.js');
  try {
    execFileSync(process.execPath, [seedScriptPath], {
      cwd: process.cwd(),
      env: buildSeedEnv(credentials),
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
  const resolvedCredentials = resolveSuperAdminCredentials(credentials);
  const envResolvedCredentials = resolveSuperAdminCredentials({});

  let { response, payload } = await requestSuperAdminLogin(request, {
    apiBaseUrl: resolvedApiBaseUrl,
    credentials: resolvedCredentials,
  });
  let effectiveCredentials = { ...resolvedCredentials };

  if (
    response.status() === 403 &&
    String(payload?.error || '').toUpperCase() === 'INVALID_MASTER_KEY'
  ) {
    const fallbackMasterKey = String(envResolvedCredentials.masterKey || '').trim();
    if (
      fallbackMasterKey &&
      !PLACEHOLDER_MASTER_KEYS.has(fallbackMasterKey) &&
      fallbackMasterKey !== effectiveCredentials.masterKey
    ) {
      effectiveCredentials = { ...effectiveCredentials, masterKey: fallbackMasterKey };
      ({ response, payload } = await requestSuperAdminLogin(request, {
        apiBaseUrl: resolvedApiBaseUrl,
        credentials: effectiveCredentials,
      }));
    }
  }

  if (!RETRYABLE_LOGIN_STATUSES.has(response.status())) {
    return {
      response,
      payload,
      credentials: effectiveCredentials,
      seedAttempted: false,
      seedError: '',
    };
  }

  const seedError = seedSuperAdminUser(effectiveCredentials);
  if (seedError) {
    return {
      response,
      payload,
      credentials: effectiveCredentials,
      seedAttempted: true,
      seedError,
    };
  }

  ({ response, payload } = await requestSuperAdminLogin(request, {
    apiBaseUrl: resolvedApiBaseUrl,
    credentials: effectiveCredentials,
  }));

  return {
    response,
    payload,
    credentials: effectiveCredentials,
    seedAttempted: true,
    seedError: '',
  };
}
