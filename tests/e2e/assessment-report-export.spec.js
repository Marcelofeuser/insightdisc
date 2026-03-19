import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';

function mockReportDataPayload(assessmentId) {
  return {
    ok: true,
    assessment: {
      id: assessmentId,
      candidateName: 'Pessoa Exportação',
      candidateEmail: 'pessoa.exportacao@example.com',
      completedAt: '2026-03-11T09:00:00.000Z',
      createdAt: '2026-03-11T08:00:00.000Z',
    },
    report: {
      id: `report-${assessmentId}`,
      pdfUrl: '',
      discProfile: {
        summary: { D: 41, I: 26, S: 20, C: 13 },
        natural: { D: 42, I: 25, S: 20, C: 13 },
        adapted: { D: 39, I: 27, S: 21, C: 13 },
        dominant: 'D',
        secondary: 'I',
      },
    },
    reportItem: {
      assessmentId,
      reportId: `report-${assessmentId}`,
      candidateName: 'Pessoa Exportação',
      candidateEmail: 'pessoa.exportacao@example.com',
      completedAt: '2026-03-11T09:00:00.000Z',
      createdAt: '2026-03-11T08:00:00.000Z',
      pdfUrl: '',
      discProfile: {
        summary: { D: 41, I: 26, S: 20, C: 13 },
        natural: { D: 42, I: 25, S: 20, C: 13 },
        adapted: { D: 39, I: 27, S: 21, C: 13 },
        dominant: 'D',
        secondary: 'I',
      },
    },
  };
}

test.describe('Exportação PDF do relatório oficial', () => {
  test('aciona endpoint oficial e inicia download do PDF', async ({ page }) => {
    test.skip(!IS_API_MODE, 'Fluxo de exportação PDF depende do modo API.');

    const assessmentId = 'e2e-export-report';
    const publicToken = 'public-token-e2e-export-report';
    await loginAsProfessional(page);

    await page.route(`**/assessment/report-data?id=${assessmentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReportDataPayload(assessmentId)),
      });
    });

    await page.route(`**/assessment/public-token/${assessmentId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          assessmentId,
          token: publicToken,
          reportType: 'business',
          publicReportUrl: `/c/report?token=${publicToken}`,
          publicPdfUrl: `/api/report/pdf?token=${publicToken}`,
        }),
      });
    });

    await page.route(`**/api/report/pdf?token=${publicToken}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'content-disposition': `attachment; filename="insightdisc-relatorio-oficial-${assessmentId}.pdf"`,
        },
        body: '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
      });
    });

    await page.goto(`/assessments/${assessmentId}/report`, { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const exportButton = page.getByRole('button', { name: /Exportar PDF/i });
    await expect(exportButton).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click(),
    ]);

    expect(download.suggestedFilename().toLowerCase()).toContain('.pdf');
    await expect(page.locator('body')).toContainText(/PDF gerado com sucesso|Relatório DISC/i);
  });
});
