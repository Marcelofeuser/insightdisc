import { test, expect } from '@playwright/test';
import { clearAuth, loginAsProfessional } from './helpers/auth';

test.describe('Checkout auth gating', () => {
  test('visitante sem sessão é redirecionado para login ao abrir /checkout', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/checkout?product=single', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/Login\?next=/i);
    await expect(page.getByRole('heading', { name: /Entrar/i })).toBeVisible();
  });

  test('visitante sem sessão é redirecionado para login ao abrir /checkout/:planSlug', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/checkout/profissional', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/Login\?next=/i);
    await expect(page.getByRole('heading', { name: /Entrar/i })).toBeVisible();
  });

  test('usuário autenticado acessa checkout de plano normalmente', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/checkout/profissional', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/checkout\/profissional(?:\?|$)/i);
    await expect(page.getByRole('heading', { name: /Finalizar PROFISSIONAL/i })).toBeVisible();
  });
});
