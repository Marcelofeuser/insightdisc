import { expect, test } from '@playwright/test';
import { loginSuperAdminWithAutoSeed, resolveSuperAdminCredentials } from './helpers/super-admin-login.js';

const API_BASE_URL = (
  process.env.LIVE_API_BASE_URL ||
  process.env.E2E_API_URL ||
  process.env.VITE_API_URL ||
  'http://localhost:4000'
).replace(/\/+$/, '');

const SUPER_ADMIN = resolveSuperAdminCredentials({
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@insightdisc.app',
  password: process.env.SUPER_ADMIN_PASSWORD || 'change_me_in_tests',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || 'example_master_key',
});

function uniqueEmail(prefix = 'audit-user') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

async function clearClientSession(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    [
      'insightdisc_api_token',
      'insight_api_token',
      'server_api_token',
      'insightdisc_api_email',
      'insight_api_email',
      'disc_mock_user_email',
      'disc_mock_active_tenant',
      'candidate_jwt',
      'insightdisc_super_admin_token',
      'insightdisc_super_admin_email',
    ].forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  });
}

async function loginSuperAdmin(page, request) {
  const { response, payload, seedAttempted, seedError } = await loginSuperAdminWithAutoSeed(
    request,
    {
      apiBaseUrl: API_BASE_URL,
      credentials: SUPER_ADMIN,
    },
  );
  const status = response.status();
  const loginError = payload?.error || payload?.message || 'UNKNOWN_LOGIN_ERROR';
  const seedContext = seedAttempted ? ' Seed attempted automatically.' : '';
  const seedFailure = seedError ? ` Seed failed: ${seedError}` : '';
  expect(
    status,
    `super-admin preflight login failed with status ${status} (${loginError}).${seedContext}${seedFailure}`,
  ).toBe(200);

  await page.goto('/super-admin-login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#super-admin-email')).toBeVisible();
  await page.locator('#super-admin-email').fill(SUPER_ADMIN.email);
  await page.locator('#super-admin-password').fill(SUPER_ADMIN.password);
  await page.locator('#super-admin-key').fill(SUPER_ADMIN.masterKey);
  await page.locator('form').getByRole('button', { name: /Entrar como Super Admin/i }).click();
  await expect(page).toHaveURL(/\/super-admin(?:\?|$)/);
}

async function signupAndLoginNormalUser(page, email, password) {
  await page.goto('/Signup', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#signup-name')).toBeVisible();
  await page.locator('#signup-name').fill('Audit Normal User');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('#signup-confirm-password').fill(password);
  await page.locator('form').getByRole('button', { name: /Criar conta/i }).click();
  await expect(page).toHaveURL(/\/Pricing(?:\?|$)|\/Dashboard(?:\?|$)/);

  await clearClientSession(page);

  await page.goto('/Login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#login-email')).toBeVisible();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  const submit = page.locator('form').getByRole('button', { name: /^Entrar$/i });
  await submit.click();

  const targetUrlPattern = /\/Pricing(?:\?unlock=1)?|\/Dashboard(?:\?|$)/;
  const reachedTarget = await page
    .waitForURL(targetUrlPattern, { timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedTarget) {
    const stillOnLogin = /\/Login(?:\?|$)/i.test(page.url());
    if (stillOnLogin) {
      await submit.click();
      await page.waitForURL(targetUrlPattern, { timeout: 8_000 });
    }
  }
}

async function expectProtected(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page
    .waitForURL(/\/Login|\/Pricing|\/super-admin-login/, {
      timeout: 4_000,
    })
    .catch(() => null);
  await page.waitForTimeout(600);

  const url = page.url();
  const redirected =
    url.includes('/Login') || url.includes('/Pricing') || url.includes('/super-admin-login');
  const deniedVisible = await page
    .getByText(/Acesso negado|Acesso restrito/i)
    .first()
    .isVisible()
    .catch(() => false);

  expect(
    redirected || deniedVisible,
    `Expected route ${route} to be protected. Current URL: ${url}`,
  ).toBeTruthy();
}

test.describe('Audit Auth Routes', () => {
  test('super admin login, session persistence, and logout behavior', async ({ page, request }) => {
    await clearClientSession(page);
    await loginSuperAdmin(page, request);

    const sessionBeforeReload = await page.evaluate(() => ({
      token: window.localStorage.getItem('insightdisc_api_token') || '',
      email: window.localStorage.getItem('insightdisc_api_email') || '',
    }));

    expect(sessionBeforeReload.token.length).toBeGreaterThan(10);
    expect(sessionBeforeReload.email).toBe(SUPER_ADMIN.email);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin(?:\?|$)/);

    await page.getByRole('button', { name: /^Sair$/i }).first().click();
    await expect(page).toHaveURL(/\/super-admin-login(?:\?|$)/);

    const sessionAfterLogout = await page.evaluate(() => ({
      token: window.localStorage.getItem('insightdisc_api_token') || '',
      email: window.localStorage.getItem('insightdisc_api_email') || '',
    }));

    expect(sessionAfterLogout.token).toBe('');
    expect(sessionAfterLogout.email).toBe('');

    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin-login(?:\?|$)/);
  });

  test('normal user login and admin-only route restrictions', async ({ page }) => {
    await clearClientSession(page);

    const email = uniqueEmail('normal');
    const password = 'AuditNormal123!';
    await signupAndLoginNormalUser(page, email, password);

    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/\/Pricing(?:\?unlock=1)?|\/Dashboard(?:\?|$)/);

    await expectProtected(page, '/super-admin');
    await expectProtected(page, '/app/admin');
    await expectProtected(page, '/AdminDashboard');
  });

  test('guest access without login is blocked on protected pages', async ({ page }) => {
    await clearClientSession(page);

    const protectedRoutes = ['/Dashboard', '/MyAssessments', '/app/dashboard'];
    for (const route of protectedRoutes) {
      await expectProtected(page, route);
    }

    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin-login(?:\?|$)/);
  });
});
