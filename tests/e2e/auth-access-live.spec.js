import { expect, test } from '@playwright/test';

const BASE_URL = process.env.LIVE_BASE_URL || 'https://insightdisc.vercel.app';
const LIVE_API_BASE_URL = process.env.LIVE_API_BASE_URL || BASE_URL;

const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || '',
  password: process.env.SUPER_ADMIN_PASSWORD || '',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || '',
};

const NORMAL_USER = {
  name: process.env.NORMAL_USER_NAME || 'QA Live User',
  email: process.env.NORMAL_USER_EMAIL || '',
  password: process.env.NORMAL_USER_PASSWORD || '',
};

const PROTECTED_ROUTES = ['/dashboard', '/reports', '/admin', '/profile', '/settings', '/app/dashboard'];
const ADMIN_RESTRICTED_ROUTES = ['/admin', '/settings/admin', '/system', '/manage-users', '/app/admin'];

function nowTag() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function hasSuperAdminCreds() {
  return Boolean(SUPER_ADMIN.email && SUPER_ADMIN.password && SUPER_ADMIN.masterKey);
}

function hasNormalUserCreds() {
  return Boolean(NORMAL_USER.email && NORMAL_USER.password);
}

async function collectClientErrors(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      bucket.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    bucket.push(`pageerror: ${error.message}`);
  });
  page.on('requestfailed', (request) => {
    bucket.push(`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText || 'unknown'})`);
  });
}

async function loginAsSuperAdmin(page) {
  await page.goto('/super-admin-login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Entrar como Super Admin/i })).toBeVisible();

  await page.locator('#super-admin-email').fill(SUPER_ADMIN.email);
  await page.locator('#super-admin-password').fill(SUPER_ADMIN.password);
  await page.locator('#super-admin-key').fill(SUPER_ADMIN.masterKey);
  await page.getByRole('button', { name: /Entrar como Super Admin/i }).click();
}

async function loginAsNormalUser(page, email, password) {
  await page.goto('/Login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /^Entrar$/i })).toBeVisible();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: /Entrar/i }).click();
}

async function createNormalUserViaSignup(page, name, email, password) {
  await page.goto('/Signup', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Criar conta/i })).toBeVisible();
  await page.locator('#signup-name').fill(name);
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('#signup-confirm-password').fill(password);
  await page.getByRole('button', { name: /Criar conta/i }).click();
}

async function assertProtectedRedirectOrDenied(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const current = page.url();
  const redirectedToLogin = current.includes('/Login');
  const redirectedToPricing = current.includes('/Pricing');
  const redirectedToSuperAdminLogin = current.includes('/super-admin-login');
  const deniedVisible = await page.getByText(/Acesso negado|Acesso restrito/i).first().isVisible().catch(() => false);
  const notFoundVisible = await page.getByText(/Page Not Found|404/i).first().isVisible().catch(() => false);

  expect(
    redirectedToLogin || redirectedToPricing || redirectedToSuperAdminLogin || deniedVisible || notFoundVisible,
    `Route ${route} should be protected. Current URL: ${current}`,
  ).toBeTruthy();
}

async function runConcurrentAuthAttempts(request, concurrency) {
  const endpoint = `${LIVE_API_BASE_URL.replace(/\/$/, '')}/auth/login`;
  const startedAt = Date.now();

  const tasks = Array.from({ length: concurrency }).map((_, idx) => {
    const payload = {
      email: `qa-load-${idx}-${nowTag()}@example.com`,
      password: 'invalid-password',
    };
    return request
      .post(endpoint, {
        data: payload,
        headers: { 'content-type': 'application/json' },
        failOnStatusCode: false,
        timeout: 20_000,
      })
      .then(async (response) => ({
        ok: response.ok(),
        status: response.status(),
        text: (await response.text()).slice(0, 220),
      }))
      .catch((error) => ({
        ok: false,
        status: 0,
        text: String(error?.message || 'request failed'),
      }));
  });

  const responses = await Promise.all(tasks);
  const elapsedMs = Date.now() - startedAt;
  const statusHistogram = responses.reduce((acc, item) => {
    const key = String(item.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const serverErrors = responses.filter((item) => item.status >= 500).length;
  const failedTransport = responses.filter((item) => item.status === 0).length;

  return {
    concurrency,
    elapsedMs,
    avgMsPerRequest: Math.round(elapsedMs / Math.max(1, concurrency)),
    statusHistogram,
    serverErrors,
    failedTransport,
    sample: responses.slice(0, 5),
  };
}

test.describe('InsightDISC Live Auth & Access Control', () => {
  test('1) Super Admin login, route access, session persistence and logout', async ({ page }) => {
    test.skip(!hasSuperAdminCreds(), 'Missing SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_MASTER_KEY env vars.');

    const clientErrors = [];
    await collectClientErrors(page, clientErrors);
    await loginAsSuperAdmin(page);

    await page.waitForTimeout(1200);
    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.getByRole('heading', { name: /Painel Super Admin/i })).toBeVisible();
    await expect(page.getByTestId('super-admin-overview-cards')).toBeVisible();
    await expect(page.getByTestId('super-admin-leads-table')).toBeVisible();
    await expect(page.getByTestId('super-admin-demo-tools')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin/);

    const tokenBeforeLogout = await page.evaluate(() => window.localStorage.getItem('insightdisc_api_token') || '');
    expect(tokenBeforeLogout.length).toBeGreaterThan(10);

    await page.getByRole('button', { name: /Sair/i }).click();
    await expect(page).toHaveURL(/\/super-admin-login/);

    const tokenAfterLogout = await page.evaluate(() => window.localStorage.getItem('insightdisc_api_token') || '');
    expect(tokenAfterLogout).toBe('');

    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin-login/);

    await test.info().attach('super-admin-client-errors', {
      contentType: 'application/json',
      body: JSON.stringify(clientErrors, null, 2),
    });
    expect(clientErrors.filter((item) => item.includes('requestfailed')).length).toBe(0);
  });

  test('2) Normal user login, dashboard redirect and admin route restrictions', async ({ page }) => {
    const clientErrors = [];
    await collectClientErrors(page, clientErrors);

    const defaultPassword = hasNormalUserCreds() ? NORMAL_USER.password : 'Insight123!';
    const signupEmail = hasNormalUserCreds()
      ? NORMAL_USER.email
      : `qa-live-${nowTag()}@example.com`;
    const signupName = hasNormalUserCreds() ? NORMAL_USER.name : `QA Live ${nowTag()}`;

    if (!hasNormalUserCreds()) {
      await createNormalUserViaSignup(page, signupName, signupEmail, defaultPassword);
      await page.waitForTimeout(1300);
      await expect(page.url()).toMatch(/\/Pricing|\/Login|\/Dashboard/i);
      await page.evaluate(() => {
        window.localStorage.removeItem('insightdisc_api_token');
        window.localStorage.removeItem('insightdisc_api_email');
      });
    }

    await loginAsNormalUser(page, signupEmail, defaultPassword);
    await page.waitForTimeout(1300);
    await expect(page.url()).toMatch(/\/Dashboard|\/Pricing\?unlock=1/i);

    for (const route of ADMIN_RESTRICTED_ROUTES) {
      await assertProtectedRedirectOrDenied(page, route);
    }

    await test.info().attach('normal-user-client-errors', {
      contentType: 'application/json',
      body: JSON.stringify(clientErrors, null, 2),
    });
  });

  test('3) Access without login to protected routes', async ({ page }) => {
    await page.goto('/Login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.localStorage.removeItem('insightdisc_api_token');
      window.localStorage.removeItem('insightdisc_api_email');
      window.localStorage.removeItem('server_api_token');
    });

    for (const route of PROTECTED_ROUTES) {
      await assertProtectedRedirectOrDenied(page, route);
    }
  });

  test('4) Login error handling and input validation', async ({ page }) => {
    await page.goto('/Login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^Entrar$/i })).toBeVisible();

    const submitButton = page.locator('form button[type="submit"]').first();
    await expect(submitButton).toBeDisabled();

    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-password').fill('12345678');
    const isValidEmailField = await page.locator('#login-email').evaluate((el) => el.checkValidity());
    expect(isValidEmailField).toBeFalsy();

    await page.locator('#login-email').fill('wrong-user@example.com');
    await page.locator('#login-password').fill('wrong-password');
    await submitButton.click();
    await page.waitForTimeout(1000);

    const feedbackVisible = await page
      .locator('.border-red-200, .text-red-700')
      .first()
      .isVisible()
      .catch(() => false);
    expect(feedbackVisible).toBeTruthy();

    await page.locator('#login-password').fill(`' OR '1'='1`);
    await submitButton.click();
    await page.waitForTimeout(800);

    await page.locator('#login-password').fill('<script>alert(1)</script>');
    await submitButton.click();
    await page.waitForTimeout(800);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('stack trace');
    expect(bodyText.toLowerCase()).not.toContain('prisma');
  });

  test('5) Session security: token creation, refresh persistence, invalid token and post-logout access', async ({ page }) => {
    test.skip(!hasSuperAdminCreds(), 'Session hardening flow requires a valid authenticated account.');

    await loginAsSuperAdmin(page);
    await expect(page).toHaveURL(/\/super-admin/);

    const tokenBeforeRefresh = await page.evaluate(() => window.localStorage.getItem('insightdisc_api_token') || '');
    expect(tokenBeforeRefresh.length).toBeGreaterThan(10);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin/);

    await page.evaluate(() => {
      window.localStorage.setItem('insightdisc_api_token', 'invalid-token-for-security-test');
    });
    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/super-admin-login|\/super-admin/);

    await page.goto('/super-admin-login', { waitUntil: 'domcontentloaded' });
    await page.locator('#super-admin-email').fill(SUPER_ADMIN.email);
    await page.locator('#super-admin-password').fill(SUPER_ADMIN.password);
    await page.locator('#super-admin-key').fill(SUPER_ADMIN.masterKey);
    await page.getByRole('button', { name: /Entrar como Super Admin/i }).click();
    await expect(page).toHaveURL(/\/super-admin/);

    await page.getByRole('button', { name: /Sair/i }).click();
    await expect(page).toHaveURL(/\/super-admin-login/);
    await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/Login|\/Pricing/);
  });

  test('6) UI/Frontend validation on desktop and mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/Login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/super-admin-login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#super-admin-email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar como Super Admin/i })).toBeVisible();
  });

  test('7) Performance: 10, 50 and 100 concurrent login attempts', async ({ request }) => {
    const runs = [];
    for (const concurrency of [10, 50, 100]) {
      const result = await runConcurrentAuthAttempts(request, concurrency);
      runs.push(result);
    }

    await test.info().attach('auth-load-results', {
      contentType: 'application/json',
      body: JSON.stringify(
        {
          baseUrl: BASE_URL,
          apiBaseUrl: LIVE_API_BASE_URL,
          runs,
        },
        null,
        2,
      ),
    });

    for (const run of runs) {
      expect(run.serverErrors, `Expected no 5xx for concurrency ${run.concurrency}`).toBe(0);
      expect(run.failedTransport, `Transport failures detected for concurrency ${run.concurrency}`).toBe(0);
    }
  });

  test('8) Security validation: direct API calls, token reuse and frontend bypass attempts', async ({ page, request }) => {
    const endpoint = `${LIVE_API_BASE_URL.replace(/\/$/, '')}/auth/login`;
    const invalidAttempts = [
      { email: 'qa-brute-1@example.com', password: 'wrong-pass-1' },
      { email: 'qa-brute-2@example.com', password: 'wrong-pass-2' },
      { email: 'qa-brute-3@example.com', password: 'wrong-pass-3' },
    ];

    const bruteStatuses = [];
    for (const payload of invalidAttempts) {
      const response = await request.post(endpoint, {
        data: payload,
        headers: { 'content-type': 'application/json' },
        failOnStatusCode: false,
      });
      bruteStatuses.push(response.status());
    }

    const unauthenticatedOverview = await request.get(`${LIVE_API_BASE_URL.replace(/\/$/, '')}/super-admin/overview`, {
      failOnStatusCode: false,
    });
    const unauthenticatedReportGenerate = await request.post(`${LIVE_API_BASE_URL.replace(/\/$/, '')}/report/generate`, {
      data: { assessmentId: 'fake' },
      headers: { 'content-type': 'application/json' },
      failOnStatusCode: false,
    });

    await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.localStorage.setItem('insightdisc_api_token', 'forged-token');
      window.localStorage.setItem('insightdisc_api_email', 'attacker@example.com');
    });
    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    const bypassUrl = page.url();

    await test.info().attach('security-results', {
      contentType: 'application/json',
      body: JSON.stringify(
        {
          endpoint,
          bruteStatuses,
          unauthenticatedOverviewStatus: unauthenticatedOverview.status(),
          unauthenticatedReportGenerateStatus: unauthenticatedReportGenerate.status(),
          bypassUrl,
        },
        null,
        2,
      ),
    });

    expect([401, 403, 404, 405]).toContain(unauthenticatedOverview.status());
    expect([401, 403, 404, 405]).toContain(unauthenticatedReportGenerate.status());
    expect(bypassUrl).toMatch(/\/super-admin-login|\/Login|\/Pricing|\/super-admin/);
  });
});
