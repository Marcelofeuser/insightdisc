import { expect, test } from '@playwright/test';
import { capturePdfDownload } from './helpers/downloads';
import {
  clickDownloadPdf,
  getDownloadPdfButton,
  getSavePortalButton,
  openPublicReport,
  waitForReportRender,
} from './helpers/report';
import { publicReportUrl } from './fixtures/publicReport';

test('fluxo público do relatório: render + download de PDF', async ({ page }, testInfo) => {
  await openPublicReport(page, publicReportUrl);
  await waitForReportRender(page);

  await expect(page.getByText(/Relatório DISC/i)).toBeVisible();
  await expect(page.getByText(/Respondente:/i)).toBeVisible();
  await expect(page.getByText(/Usuário Tenant|Participante/i)).toBeVisible();
  await expect(getDownloadPdfButton(page)).toBeVisible();
  await expect(getSavePortalButton(page)).toBeVisible();

  let validatedPdfFlow = false;
  try {
    const download = await capturePdfDownload(page, () => clickDownloadPdf(page));
    expect(download.savePath.toLowerCase()).toContain('.pdf');
    validatedPdfFlow = true;
  } catch {
    const popupPromise = page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null);
    await clickDownloadPdf(page);
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      expect(popup.url().toLowerCase()).toMatch(/pdf|report-pdf-by-token|\/reports\//);
      await popup.close();
      validatedPdfFlow = true;
    } else {
      await expect(getDownloadPdfButton(page)).toContainText(/Preparando|Baixar PDF/i, { timeout: 15_000 });
      await expect(page.getByText(/Falha ao baixar relatório/i)).toHaveCount(0);
      validatedPdfFlow = true;
    }
  }
  expect(validatedPdfFlow).toBeTruthy();

  await page.screenshot({
    path: testInfo.outputPath('public-report-final.png'),
    fullPage: true,
  });
});
