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
import { loginSuperAdminWithAutoSeed } from './helpers/super-admin-login.js';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '')
  .trim()
  .toLowerCase() === 'true';

const API_BASE_URL = (
  process.env.LIVE_API_BASE_URL ||
  process.env.E2E_API_URL ||
  process.env.VITE_API_URL ||
  'http://127.0.0.1:4000'
).replace(/\/+$/, '');

const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@insightdisc.app',
  password: process.env.SUPER_ADMIN_PASSWORD || 'change_me_in_tests',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || 'example_master_key',
};

function hasSuperAdminCreds() {
  return Boolean(SUPER_ADMIN.email && SUPER_ADMIN.password && SUPER_ADMIN.masterKey);
}

function buildSubmitAnswers() {
  return [
    { questionId: 'q01', most: 'q01D', least: 'q01C' },
    { questionId: 'q02', most: 'q02I', least: 'q02S' },
    { questionId: 'q03', most: 'q03S', least: 'q03D' },
    { questionId: 'q04', most: 'q04C', least: 'q04I' },
    { questionId: 'q05', most: 'q05D', least: 'q05S' },
    { questionId: 'q06', most: 'q06I', least: 'q06C' },
  ];
}

async function createCompletedAssessment(request, token) {
  const startResponse = await request.post(`${API_BASE_URL}/assessment/self/start`, {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });

  expect(startResponse.status(), 'assessment/self/start must return 201').toBe(201);
  const startPayload = await startResponse.json();
  const inviteToken = String(startPayload?.token || '').trim();
  const assessmentId = String(startPayload?.assessmentId || '').trim();

  expect(inviteToken, 'assessment/self/start must return an invite token').toBeTruthy();
  expect(assessmentId, 'assessment/self/start must return assessmentId').toBeTruthy();

  const submitResponse = await request.post(`${API_BASE_URL}/assessment/submit`, {
    data: {
      token: inviteToken,
      respondentName: 'Participante E2E Public Report',
      respondentEmail: `public-report-${Date.now()}@example.com`,
      reportType: 'business',
      answers: buildSubmitAnswers(),
    },
    failOnStatusCode: false,
  });

  expect(
    submitResponse.status(),
    `assessment/submit must return 200 (got ${submitResponse.status()})`,
  ).toBe(200);

  return assessmentId;
}

function pickAssessmentIdFromOverview(overview = {}) {
  const latestReports = Array.isArray(overview?.latestReports) ? overview.latestReports : [];
  const latestAssessments = Array.isArray(overview?.latestAssessments) ? overview.latestAssessments : [];

  const reportedAssessmentId = String(latestReports?.[0]?.assessmentId || '').trim();
  if (reportedAssessmentId) return reportedAssessmentId;

  const completedAssessment = latestAssessments.find((item) => {
    const status = String(item?.status || '').trim().toUpperCase();
    const hasReport = Boolean(item?.reportId || item?.report?.id);
    return status === 'COMPLETED' || hasReport;
  });

  return String(completedAssessment?.id || latestAssessments?.[0]?.id || '').trim();
}

async function resolveRuntimePublicReportContext(request) {
  const { response, payload, seedAttempted, seedError } = await loginSuperAdminWithAutoSeed(
    request,
    {
      apiBaseUrl: API_BASE_URL,
      credentials: SUPER_ADMIN,
    },
  );

  const loginStatus = response.status();
  const loginError = payload?.error || payload?.message || 'UNKNOWN_LOGIN_ERROR';
  const seedContext = seedAttempted ? ' Seed attempted automatically.' : '';
  const seedFailure = seedError ? ` Seed failed: ${seedError}` : '';
  expect(
    loginStatus,
    `super-admin login failed with status ${loginStatus} (${loginError}).${seedContext}${seedFailure}`,
  ).toBe(200);

  const superToken = String(payload?.token || '').trim();
  expect(superToken).toBeTruthy();

  const overviewResponse = await request.get(`${API_BASE_URL}/super-admin/overview`, {
    headers: { Authorization: `Bearer ${superToken}` },
    failOnStatusCode: false,
  });

  expect(
    overviewResponse.status(),
    `super-admin overview failed with ${overviewResponse.status()}`,
  ).toBe(200);
  const overviewPayload = await overviewResponse.json();

  let assessmentId = pickAssessmentIdFromOverview(overviewPayload);
  if (!assessmentId) {
    assessmentId = await createCompletedAssessment(request, superToken);
  }
  expect(assessmentId, 'Could not resolve assessmentId for public report flow').toBeTruthy();

  const publicTokenResponse = await request.get(
    `${API_BASE_URL}/assessment/public-token/${encodeURIComponent(assessmentId)}?reportType=business`,
    {
      headers: { Authorization: `Bearer ${superToken}` },
      failOnStatusCode: false,
    },
  );

  expect(publicTokenResponse.status(), 'assessment/public-token must return 200').toBe(200);
  const publicTokenPayload = await publicTokenResponse.json();
  const token = String(publicTokenPayload?.token || '').trim();
  const reportType = String(publicTokenPayload?.reportType || 'business')
    .trim()
    .toLowerCase();
  const publicPdfUrl = String(publicTokenPayload?.publicPdfUrl || '').trim();
  const backendPdfProbeUrl = `${API_BASE_URL}/api/report/pdf?token=${encodeURIComponent(token)}&type=${encodeURIComponent(
    reportType || 'business',
  )}`;

  expect(token, 'assessment/public-token must return token').toBeTruthy();
  expect(publicPdfUrl, 'assessment/public-token must return publicPdfUrl').toBeTruthy();

  const probeResponse = await request.get(backendPdfProbeUrl, { failOnStatusCode: false });
  expect(probeResponse.status(), 'public PDF endpoint must be reachable').toBe(200);
  const contentType = String(probeResponse.headers()['content-type'] || '').toLowerCase();
  expect(contentType).toContain('application/pdf');

  return {
    token,
    reportType: reportType || 'business',
  };
}

test('fluxo público do relatório: render + download de PDF', async ({ page, request }, testInfo) => {
  test.skip(
    !IS_API_MODE && !process.env.PW_PUBLIC_REPORT_URL,
    'Requires PW_PUBLIC_REPORT_URL when running outside API mode',
  );

  let targetReportUrl = publicReportUrl;

  if (IS_API_MODE && !process.env.PW_PUBLIC_REPORT_URL) {
    expect(
      hasSuperAdminCreds(),
      'Set SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_MASTER_KEY or PW_PUBLIC_REPORT_URL',
    ).toBeTruthy();

    const runtimeContext = await resolveRuntimePublicReportContext(request);
    targetReportUrl = `/r/${encodeURIComponent(runtimeContext.token)}?type=${encodeURIComponent(
      runtimeContext.reportType,
    )}`;
  }

  await openPublicReport(page, targetReportUrl);
  await waitForReportRender(page);

  if (targetReportUrl.startsWith('/r/') || /\/r\//.test(targetReportUrl)) {
    await expect(page).toHaveURL(/\/c\/report\?token=.*(?:&|$)/);
  }

  await expect(page.getByText(/Relatório DISC/i)).toBeVisible();
  await expect(page.getByText(/Respondente:/i)).toBeVisible();
  await expect(getDownloadPdfButton(page)).toBeVisible();

  const savePortalButton = getSavePortalButton(page);
  if ((await savePortalButton.count()) > 0) {
    await expect(savePortalButton).toBeVisible();
  }

  let validatedPdfFlow = false;
  try {
    const download = await capturePdfDownload(page, () => clickDownloadPdf(page));
    expect(download.savePath.toLowerCase()).toContain('.pdf');
    validatedPdfFlow = true;
  } catch {
    const pdfResponsePromise = page
      .waitForResponse((response) => response.url().includes('/api/report/pdf?token='), {
        timeout: 15_000,
      })
      .catch(() => null);

    const popupPromise = page.waitForEvent('popup', { timeout: 15_000 }).catch(() => null);
    await clickDownloadPdf(page);

    const [pdfResponse, popup] = await Promise.all([pdfResponsePromise, popupPromise]);
    if (pdfResponse) {
      expect(pdfResponse.status()).toBe(200);
      const contentType = String(pdfResponse.headers()['content-type'] || '').toLowerCase();
      expect(contentType).toContain('application/pdf');
      validatedPdfFlow = true;
    } else if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      expect(popup.url().toLowerCase()).toMatch(/pdf|report-pdf-by-token|\/reports\//);
      await popup.close();
      validatedPdfFlow = true;
    }
  }

  expect(validatedPdfFlow, 'Expected a real public PDF generation flow').toBeTruthy();

  await page.screenshot({
    path: testInfo.outputPath('public-report-final.png'),
    fullPage: true,
  });
});
