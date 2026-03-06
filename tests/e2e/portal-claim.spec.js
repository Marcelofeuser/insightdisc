import { expect, test } from '@playwright/test';
import { clearAuth, loginAsProfessional } from './helpers/auth';
import {
  clickSaveToPortal,
  getSavePortalButton,
  openPublicReport,
  waitForReportRender,
} from './helpers/report';
import { publicReportUrl } from './fixtures/publicReport';

test.describe('Salvar no meu portal', () => {
  test('usuário autenticado salva e redireciona', async ({ page }, testInfo) => {
    await loginAsProfessional(page);
    await openPublicReport(page, publicReportUrl);
    await waitForReportRender(page);

    const saveButton = getSavePortalButton(page);
    await expect(saveButton).toBeEnabled();
    await clickSaveToPortal(page);

    await expect(page).toHaveURL(/\/MyAssessments(?:\?|$)|\/c\/portal(?:\?|$)/);
    await page.screenshot({
      path: testInfo.outputPath('portal-claim-authenticated.png'),
      fullPage: true,
    });
  });

  test('usuário não autenticado entra no fluxo de autenticação sem quebrar', async ({
    page,
  }, testInfo) => {
    await clearAuth(page);
    await openPublicReport(page, publicReportUrl);
    await waitForReportRender(page);

    const saveButton = getSavePortalButton(page);
    await expect(saveButton).toBeEnabled();
    await clickSaveToPortal(page);

    await expect(saveButton).toBeEnabled({ timeout: 8_000 });

    const modalVisible = await page
      .getByText(/Salvar no meu perfil|Criar conta|Já tenho conta/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (modalVisible) {
      await expect(page.getByText(/Criar conta|Já tenho conta/i).first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/c\/report/i);
      await expect(page.getByTestId('candidate-report-container')).toBeVisible();
    }

    await page.screenshot({
      path: testInfo.outputPath('portal-claim-unauthenticated.png'),
      fullPage: true,
    });
  });
});
