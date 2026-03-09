import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.LIVE_API_BASE_URL || 'http://localhost:4000';

const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@insightdisc.app',
  password: process.env.SUPER_ADMIN_PASSWORD || 'Trocar123!',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || 'InsightDiscMaster2026!',
};

function uniqueEmail(prefix = 'audit-api') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

function authHeaders(token = '') {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function superAdminLogin(request) {
  const response = await request.post(`${API_BASE_URL}/auth/super-admin-login`, {
    data: {
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      masterKey: SUPER_ADMIN.masterKey,
    },
    failOnStatusCode: false,
  });
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload?.ok).toBeTruthy();
  expect(payload?.token).toBeTruthy();
  return payload.token;
}

async function registerNormalUser(request) {
  const email = uniqueEmail('normal-api');
  const password = 'NormalApi123!';
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { email, password, name: 'Normal API User' },
    failOnStatusCode: false,
  });
  expect(response.status()).toBe(201);
  const payload = await response.json();
  return { email, password, token: payload.token };
}

async function grantCredits(request, token, credits = 5) {
  const response = await request.post(`${API_BASE_URL}/payments/confirm`, {
    headers: authHeaders(token),
    data: {
      sessionId: `mock_audit_${Date.now()}_${Math.floor(Math.random() * 10_000)}`,
      credits,
    },
    failOnStatusCode: false,
  });
  expect(response.status()).toBe(200);
}

test.describe('Audit API Authorization', () => {
  test('unauthenticated API calls are blocked', async ({ request }) => {
    const meResponse = await request.get(`${API_BASE_URL}/auth/me`, { failOnStatusCode: false });
    expect(meResponse.status()).toBe(401);

    const superAdminOverview = await request.get(`${API_BASE_URL}/super-admin/overview`, {
      failOnStatusCode: false,
    });
    expect(superAdminOverview.status()).toBe(401);

    const generateResponse = await request.post(`${API_BASE_URL}/report/generate`, {
      data: { assessmentId: 'missing' },
      failOnStatusCode: false,
    });
    expect(generateResponse.status()).toBe(401);

    const resetPassword = await request.post(`${API_BASE_URL}/auth/reset-password`, {
      data: {
        email: uniqueEmail('reset-probe'),
        newPassword: 'AnyPass123!',
      },
      failOnStatusCode: false,
    });
    expect(resetPassword.status()).toBe(401);

    const devHeaderBypass = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: { 'x-insight-user-email': SUPER_ADMIN.email },
      failOnStatusCode: false,
    });
    expect(devHeaderBypass.status()).toBe(401);
  });

  test('normal user cannot access admin-only endpoints', async ({ request }) => {
    const normal = await registerNormalUser(request);

    const meResponse = await request.get(`${API_BASE_URL}/auth/me`, {
      headers: authHeaders(normal.token),
      failOnStatusCode: false,
    });
    expect(meResponse.status()).toBe(200);

    const superAdminOverview = await request.get(`${API_BASE_URL}/super-admin/overview`, {
      headers: authHeaders(normal.token),
      failOnStatusCode: false,
    });
    expect(superAdminOverview.status()).toBe(403);

    const adminCreateOrg = await request.post(`${API_BASE_URL}/admin/organizations`, {
      headers: authHeaders(normal.token),
      data: { name: 'Forbidden Org' },
      failOnStatusCode: false,
    });
    expect(adminCreateOrg.status()).toBe(403);
  });

  test('cross-tenant report generation is denied for normal users', async ({ request }) => {
    const superToken = await superAdminLogin(request);
    const normal = await registerNormalUser(request);
    await grantCredits(request, normal.token, 5);

    const overviewResponse = await request.get(`${API_BASE_URL}/super-admin/overview`, {
      headers: authHeaders(superToken),
      failOnStatusCode: false,
    });
    expect(overviewResponse.status()).toBe(200);
    const overview = await overviewResponse.json();
    const targetAssessmentId =
      overview?.latestReports?.[0]?.assessmentId || overview?.latestAssessments?.[0]?.id || '';

    test.skip(!targetAssessmentId, 'No assessment available for authorization probe.');

    const htmlAsNormal = await request.get(
      `${API_BASE_URL}/report/${encodeURIComponent(targetAssessmentId)}/html`,
      {
        headers: authHeaders(normal.token),
        failOnStatusCode: false,
      },
    );
    expect(htmlAsNormal.status()).toBe(403);

    const generateAsNormal = await request.post(`${API_BASE_URL}/report/generate`, {
      headers: authHeaders(normal.token),
      data: { assessmentId: targetAssessmentId },
      failOnStatusCode: false,
    });
    expect(generateAsNormal.status()).toBe(403);
  });

  test('super admin can generate report and receive a reachable PDF URL', async ({ request }) => {
    const superToken = await superAdminLogin(request);
    const overviewResponse = await request.get(`${API_BASE_URL}/super-admin/overview`, {
      headers: authHeaders(superToken),
      failOnStatusCode: false,
    });
    expect(overviewResponse.status()).toBe(200);
    const overview = await overviewResponse.json();
    const targetAssessmentId =
      overview?.latestReports?.[0]?.assessmentId || overview?.latestAssessments?.[0]?.id || '';

    test.skip(!targetAssessmentId, 'No assessment available for report/PDF probe.');

    const htmlResponse = await request.get(
      `${API_BASE_URL}/report/${encodeURIComponent(targetAssessmentId)}/html`,
      {
        headers: authHeaders(superToken),
        failOnStatusCode: false,
      },
    );
    expect([200, 400]).toContain(htmlResponse.status());

    const generateResponse = await request.post(`${API_BASE_URL}/report/generate`, {
      headers: authHeaders(superToken),
      data: { assessmentId: targetAssessmentId },
      failOnStatusCode: false,
    });
    expect(generateResponse.status()).toBe(200);
    const generated = await generateResponse.json();
    const pdfUrl = String(generated?.pdfUrl || generated?.report?.pdfUrl || '').trim();
    expect(pdfUrl).toBeTruthy();

    const absolutePdfUrl = /^https?:\/\//i.test(pdfUrl)
      ? pdfUrl
      : `${API_BASE_URL}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;

    const pdfResponse = await request.get(absolutePdfUrl, { failOnStatusCode: false });
    expect(pdfResponse.status()).toBe(200);
    const contentType = pdfResponse.headers()['content-type'] || '';
    expect(contentType.toLowerCase()).toContain('application/pdf');
  });
});

