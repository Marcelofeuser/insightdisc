import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Página oficial de relatório DISC', () => {
  test('aliases de rota redirecionam para /assessments/:id/report', async ({ page }) => {
    await loginAsProfessional(page);

    await page.goto('/assessment/e2e-alias-report/report', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/assessments\/e2e-alias-report\/report(?:\?|$)/);

    await page.goto('/report/e2e-alias-report-2', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/assessments\/e2e-alias-report-2\/report(?:\?|$)/);
  });

  test('rota oficial renderiza estado seguro para avaliação inexistente', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/assessments/e2e-not-found-report/report', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.locator('body')).toContainText(
      /Relatório oficial não encontrado|Sem permissão|Relatório DISC/i,
    );
  });
});
