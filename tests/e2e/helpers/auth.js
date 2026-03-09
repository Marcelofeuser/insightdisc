import { expect } from '@playwright/test';
import { waitForApp } from './waitForApp';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';
const MOCK_BOOTSTRAP_PATH = IS_API_MODE ? '/' : '/?app_id=null';
const MOCK_LOGIN_PATH = IS_API_MODE ? '/Login' : '/Login?app_id=null';

const ROLE_PRESETS = Object.freeze({
  ADMIN: {
    email: 'admin@example.com',
    name: 'Admin E2E',
    role: 'admin',
    tenantId: 'workspace-1',
  },
  PROFESSIONAL: {
    email: 'pro@example.com',
    name: 'Profissional E2E',
    role: 'professional',
    tenantId: 'workspace-1',
  },
  USER: {
    email: 'user@example.com',
    name: 'Usuário E2E',
    role: 'user',
    tenantId: 'workspace-1',
  },
  SUPER_ADMIN: {
    email: 'superadmin@example.com',
    name: 'Super Admin E2E',
    role: 'admin',
    appRole: 'SUPER_ADMIN',
    tenantId: 'workspace-1',
  },
});

function normalizeRole(role = 'PROFESSIONAL') {
  const raw = String(role || '').trim().toLowerCase();
  if (['admin', 'administrador'].includes(raw)) return 'ADMIN';
  if (['super_admin', 'superadmin'].includes(raw)) return 'SUPER_ADMIN';
  if (['profissional', 'professional', 'pro'].includes(raw)) return 'PROFESSIONAL';
  if (['usuario', 'usuário', 'user', 'tenant_user'].includes(raw)) return 'USER';
  return 'PROFESSIONAL';
}

function getPreset(role = 'PROFESSIONAL') {
  const key = normalizeRole(role);
  return { key, ...(ROLE_PRESETS[key] || ROLE_PRESETS.PROFESSIONAL) };
}

const DEV_SHORTCUT_LABEL_BY_ROLE = Object.freeze({
  ADMIN: /Entrar como Admin/i,
  PROFESSIONAL: /Entrar como Profissional/i,
  USER: /Entrar como Usuário/i,
});

async function loginViaDevShortcut(page, roleKey) {
  const shortcutLabel = DEV_SHORTCUT_LABEL_BY_ROLE[roleKey];
  if (!shortcutLabel) return false;

  await page.goto(MOCK_LOGIN_PATH, { waitUntil: 'domcontentloaded' });
  const shortcutButton = page.getByRole('button', { name: shortcutLabel }).first();
  const count = await page.getByRole('button', { name: shortcutLabel }).count();
  if (!count) {
    console.info('[e2e-auth] dev shortcut not found', { roleKey, loginPath: MOCK_LOGIN_PATH });
    return false;
  }
  console.info('[e2e-auth] using dev shortcut', { roleKey, loginPath: MOCK_LOGIN_PATH });
  await shortcutButton.click({ force: true });
  return true;
}

export async function setMockSession(page, overrides = {}) {
  const preset = getPreset(overrides.role);
  const session = {
    email: String(overrides.email || preset.email).toLowerCase(),
    name: String(overrides.name || preset.name),
    role: String(overrides.appRole || preset.appRole || preset.role),
    tenantId: String(overrides.tenantId || preset.tenantId),
  };

  await page.goto(MOCK_BOOTSTRAP_PATH, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  await page.evaluate((payload) => {
    const email = String(payload?.email || '').toLowerCase().trim();
    const tenantId = String(payload?.tenantId || '').trim();
    if (!email) return;

    // Mock auth storage used by base44Mock.
    window.localStorage.setItem('disc_mock_user_email', email);
    if (tenantId) {
      window.localStorage.setItem('disc_mock_active_tenant', tenantId);
    }

    // Defensive cleanup for API mode leftovers from previous tests.
    [
      'insightdisc_token',
      'insightdisc_api_token',
      'insight_api_token',
      'server_api_token',
      'candidate_jwt',
    ].forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  }, session);

  const storedSession = await page.evaluate(() => ({
    email: window.localStorage.getItem('disc_mock_user_email') || '',
    tenant: window.localStorage.getItem('disc_mock_active_tenant') || '',
  }));
  console.info('[e2e-auth] setMockSession stored', storedSession);

  return { ...session, key: preset.key };
}

export async function isAuthenticated(page) {
  return page.evaluate(() => Boolean(window.localStorage.getItem('disc_mock_user_email')));
}

export async function loginAs(page, role = 'PROFESSIONAL') {
  const preset = await setMockSession(page, { role });
  await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  const redirectedToLogin = /\/Login(?:\?|$)/i.test(page.url());
  if (redirectedToLogin) {
    const usedShortcut = await loginViaDevShortcut(page, preset.key);
    console.info('[e2e-auth] redirected to login after mock session', {
      role: preset.key,
      usedShortcut,
      currentUrl: page.url(),
    });
    if (usedShortcut) {
      await page.waitForURL(/\/Pricing(?:\?|$)|\/Dashboard(?:\?|$)/, { timeout: 10_000 });
      await waitForApp(page);
    } else {
      await setMockSession(page, { role: preset.key });
      await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
    }
  }

  console.info('[e2e-auth] post-login URL', { role: preset.key, currentUrl: page.url() });

  if (preset.key === 'USER') {
    await expect(page).toHaveURL(/\/Pricing(?:\?|$)|\/Dashboard(?:\?|$)/);
    return;
  }

  await expect(page).toHaveURL(/\/Dashboard(?:\?|$)/);
}

export async function loginAsAdmin(page) {
  await loginAs(page, 'ADMIN');
}

export async function loginAsProfessional(page) {
  await loginAs(page, 'PROFESSIONAL');
}

export async function loginAsUser(page) {
  await loginAs(page, 'USER');
}

export async function loginAsSuperAdmin(page) {
  await loginAs(page, 'SUPER_ADMIN');
}

export async function ensureAuthenticated(page, role = 'PROFESSIONAL') {
  const preset = getPreset(role);
  const currentEmail = await page.evaluate(() => window.localStorage.getItem('disc_mock_user_email') || '');
  if (String(currentEmail).toLowerCase() !== String(preset.email).toLowerCase()) {
    await setMockSession(page, { role: preset.key });
  }
}

export async function clearAuth(page) {
  await page.goto(MOCK_BOOTSTRAP_PATH, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await page.evaluate(() => {
    [
      'disc_mock_user_email',
      'disc_mock_active_tenant',
      'candidate_jwt',
      'insightdisc_token',
      'insightdisc_api_token',
      'insight_api_token',
      'server_api_token',
      'insightdisc_api_email',
      'insight_api_email',
    ].forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  });
}
