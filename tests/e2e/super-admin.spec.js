import { expect, test } from '@playwright/test';
import { clearAuth, loginAsSuperAdmin, loginAsUser } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Super Admin Access', () => {
  test.afterEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('usuário comum não acessa /super-admin', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Acesso restrito/i)).toBeVisible();
  });

  test('super admin em sessão válida acessa /super-admin', async ({ page }) => {
    test.skip(
      !process.env.VITE_API_URL && !process.env.E2E_API_URL,
      'Requer backend API para validar sessão super admin dedicada.',
    );

    await loginAsSuperAdmin(page);

    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Sessão super admin validada/i)).toBeVisible();
  });
});
