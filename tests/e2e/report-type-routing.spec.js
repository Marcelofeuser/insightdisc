import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';
const REPORT_TYPES = ['personal', 'professional', 'business'];

function buildReportPayload(token, reportType) {
  return {
    ok: true,
    reportType,
    assessment: {
      id: `assessment-${reportType}`,
      status: 'COMPLETED',
      candidateName: `Pessoa ${reportType}`,
      candidateEmail: `${reportType}@example.com`,
      completedAt: '2026-03-11T09:00:00.000Z',
      createdAt: '2026-03-11T08:00:00.000Z',
    },
    report: {
      id: `report-${reportType}`,
      html: `<html><body><div class="page">Relatório ${reportType}</div></body></html>`,
      pdfUrl: `/api/report/pdf?token=${token}&type=${reportType}`,
      reportType,
      discProfile: {
        summary: { D: 41, I: 26, S: 20, C: 13 },
        natural: { D: 42, I: 25, S: 20, C: 13 },
        adapted: { D: 39, I: 27, S: 21, C: 13 },
        dominant: 'D',
        secondary: 'I',
        reportType,
        meta: { reportType },
      },
    },
    publicAccess: {
      token,
      reportType,
      publicReportPath: `/c/report?token=${token}&type=${reportType}`,
      publicPdfUrl: `/api/report/pdf?token=${token}&type=${reportType}`,
    },
    answeredCount: 40,
    answers: new Array(40).fill(null),
  };
}

test.describe('Public report type routing', () => {
  for (const reportType of REPORT_TYPES) {
    test(`CandidateUpgrade preserva ${reportType} até o relatório público`, async ({ page }) => {
      test.skip(!IS_API_MODE, 'Fluxo público com roteamento por token depende do modo API.');

      const token = `tok-routing-${reportType}`;

      await page.route('**/assessment/report-by-token*', async (route) => {
        const url = new URL(route.request().url());
        expect(url.searchParams.get('type')).toBe(reportType);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildReportPayload(token, reportType)),
        });
      });

      await page.goto(`/c/upgrade?token=${token}&type=${reportType}`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForApp(page);

      await expect(page).toHaveURL(new RegExp(`/c/report\\?token=${token}.*type=${reportType}`));
      await expect(page.getByTestId('candidate-report-container')).toBeVisible();
      await expect(page.getByTestId('candidate-report-download-pdf')).toBeVisible();
    });
  }
});
