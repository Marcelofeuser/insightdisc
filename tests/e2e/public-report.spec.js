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

  const download = await capturePdfDownload(page, () => clickDownloadPdf(page));
  expect(download.savePath.toLowerCase()).toContain('.pdf');

  await page.screenshot({
    path: testInfo.outputPath('public-report-final.png'),
    fullPage: true,
  });
});
