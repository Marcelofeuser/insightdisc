import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('MyAssessments - relatórios autosalvos', () => {
  test('profissional visualiza relatórios salvos automaticamente na aba Relatórios', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/MyAssessments#reports', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page).toHaveURL(/\/MyAssessments#reports$/);
    await expect(page.getByRole('link', { name: /Relatórios/i }).first()).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    const reportButtons = page.getByRole('button', { name: /^Relatório$/ });
    await expect(reportButtons.first()).toBeVisible();

    const pdfAction = page.getByRole('button', { name: /^PDF$|^PDF indisponível$/ }).first();
    await expect(pdfAction).toBeVisible();
  });
});
