import { expect, test } from '@playwright/test';
import { clearAuth, loginAsSuperAdmin } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

const hasApiMode = Boolean(process.env.VITE_API_URL || process.env.E2E_API_URL);
const hasDevLoginShortcuts = String(process.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';

test.skip(
  hasApiMode || !hasDevLoginShortcuts,
  'Cenário usa mock localStorage e depende de execução local com atalhos de login de desenvolvimento habilitados.',
);

test.describe('Super Admin Unlimited Bypass', () => {
  test.afterEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('dashboard exibe acesso total e créditos ilimitados para super admin', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByText('SUPER ADMIN — ACESSO TOTAL')).toBeVisible();
    await expect(page.getByText('Ilimitado')).toBeVisible();
  });

  test('send assessment remove paywall e habilita modo ilimitado', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/SendAssessment', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByText('SUPER ADMIN — TESTES ILIMITADOS')).toBeVisible();
    await expect(page.getByText(/Envio premium bloqueado por falta de créditos/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Gerar Links/i })).toBeEnabled();
  });

  test('free results não redireciona para checkout quando super admin', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/FreeResults?id=assessment-inexistente', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page).not.toHaveURL(/\/checkout\?product=report-unlock/);
    await expect(page.getByText('Resultado não encontrado')).toBeVisible();
  });

  test('pricing sinaliza modo sem cobrança real para super admin', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/Pricing', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByText(/SUPER ADMIN — sem cobrança real para testes internos/i)).toBeVisible();
  });
});
