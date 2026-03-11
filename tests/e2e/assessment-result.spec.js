import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Página oficial de resultado DISC', () => {
  test('alias /assessment/:id/result redireciona para rota oficial', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/assessment/e2e-alias-result/result', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/assessments\/e2e-alias-result\/result(?:\?|$)/);
  });

  test('rota oficial renderiza estado seguro para avaliação inexistente', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/assessments/e2e-not-found-result/result', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.locator('body')).toContainText(/Resultado oficial não encontrado|Sem permissão|Seu Resultado DISC/i);
  });
});

