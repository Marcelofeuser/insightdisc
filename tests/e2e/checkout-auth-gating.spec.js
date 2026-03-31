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

    await expect(page).toHaveURL(/\/checkout(?:\/plan)?\/profissional(?:\?|$)/i);
    // The UI title varies between versions; ensure either the main page title or the plan name is visible.
    const mainTitle = page.locator('h1', { hasText: /Checkout do plano/i });
    const planHeading = page.locator('h2, h1', { hasText: /Finalizar\s*PROFISSIONAL|Professional|Profissional/i });

    if (await mainTitle.count() > 0) {
      await expect(mainTitle).toBeVisible();
    } else {
      await expect(planHeading.first()).toBeVisible();
    }
  });
});
