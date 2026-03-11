import { test, expect } from '@playwright/test';
import { loginAsProfessional, loginAsSuperAdmin } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Fase 5-9 - rotas principais', () => {
  test('rota pública /demo abre sem autenticação', async ({ page }) => {
    await page.goto('/demo');
    await waitForApp(page);

    await expect(page.getByText('Modo Demo')).toBeVisible();
    await expect(page.getByText('Demo comercial da InsightDISC')).toBeVisible();
  });

  test('profissional acessa /coach e recebe gating em /organization-report', async ({ page }) => {
    await loginAsProfessional(page);

    await page.goto('/coach');
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: 'Assistente comportamental estratégico' })).toBeVisible();

    await page.goto('/organization-report');
    await waitForApp(page);
    await expect(page.getByText(/Relatório executivo organizacional bloqueado/i)).toBeVisible();
  });

  test('super admin acessa /admin e /admin/billing', async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.goto('/admin');
    await waitForApp(page);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();

    await page.goto('/admin/billing');
    await waitForApp(page);
    await expect(page.getByText('Admin • Billing')).toBeVisible();
  });
});
