import { expect, test } from '@playwright/test';

const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@insightdisc.app',
  password: process.env.SUPER_ADMIN_PASSWORD || 'Trocar123!',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || 'InsightDiscMaster2026!',
};

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
    ].forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  });
}

async function loginSuperAdmin(page) {
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
  await page.locator('form').getByRole('button', { name: /^Entrar$/i }).click();
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
  test('super admin login, session persistence, and logout behavior', async ({ page }) => {
    await clearClientSession(page);
    await loginSuperAdmin(page);

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
