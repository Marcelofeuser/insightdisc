import { expect } from '@playwright/test';
import { waitForApp } from './waitForApp';

export async function openPublicReport(page, reportUrl) {
  await page.goto(reportUrl, { waitUntil: 'networkidle' });
  await waitForApp(page);
}

export async function waitForReportRender(page) {
  await expect(page.getByText(/Carregando relatório/i)).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId('candidate-report-container')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Relatório DISC/i)).toBeVisible();
}

export function getDownloadPdfButton(page) {
  return page.getByTestId('candidate-report-download-pdf');
}

export function getSavePortalButton(page) {
  return page.getByTestId('candidate-report-save-portal');
}

export async function clickDownloadPdf(page) {
  await getDownloadPdfButton(page).click();
}

export async function clickSaveToPortal(page) {
  await getSavePortalButton(page).click();
}
