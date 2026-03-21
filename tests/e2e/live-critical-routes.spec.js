import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';

const API_BASE_URL =
  process.env.E2E_API_URL ||
  process.env.VITE_API_URL ||
  'http://127.0.0.1:4000';

const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || '',
  password: process.env.SUPER_ADMIN_PASSWORD || '',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || '',
};

const RAW_ERROR_PATTERN = /NOT_FOUND|The page could not be found|Parâmetros ausentes|payload\.error/i;

function hasSuperAdminCreds() {
  return Boolean(SUPER_ADMIN.email && SUPER_ADMIN.password && SUPER_ADMIN.masterKey);
}

function normalizeApiBaseUrl(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

async function loginAsAppUser(page) {
  await page.goto('/Login', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator('#login-email')).toBeVisible();

  await page.locator('#login-email').fill(SUPER_ADMIN.email);
  await page.locator('#login-password').fill(SUPER_ADMIN.password);
  await page.locator('form').getByRole('button', { name: /^Entrar$/i }).click();
  await expect(page).toHaveURL(/\/super-admin/);
}

async function fetchLatestPublicAccess(request) {
  const apiBaseUrl = normalizeApiBaseUrl(API_BASE_URL);
  const loginResponse = await request.post(`${apiBaseUrl}/auth/super-admin-login`, {
    data: {
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      masterKey: SUPER_ADMIN.masterKey,
    },
    failOnStatusCode: false,
  });

  expect(loginResponse.ok(), `super-admin login failed with ${loginResponse.status()}`).toBeTruthy();
  const loginPayload = await loginResponse.json();
  const token = String(loginPayload?.token || '').trim();
  expect(token.length).toBeGreaterThan(10);

  const overviewResponse = await request.get(`${apiBaseUrl}/super-admin/overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    failOnStatusCode: false,
  });

  expect(
    overviewResponse.ok(),
    `super-admin overview failed with ${overviewResponse.status()}`,
  ).toBeTruthy();
  const overviewPayload = await overviewResponse.json();
  const latestReport = Array.isArray(overviewPayload?.latestReports)
    ? overviewPayload.latestReports[0]
    : null;

  expect(latestReport).toBeTruthy();
  const previewUrl = String(latestReport?.previewUrl || '').trim();
  const previewPath = String(latestReport?.previewPath || '').trim();
  const pdfUrl = String(latestReport?.pdfUrl || '').trim();

  expect(previewUrl || previewPath).toBeTruthy();
  expect(pdfUrl).toBeTruthy();

  return {
    previewUrl,
    previewPath,
    pdfUrl,
  };
}

async function expectNoRawUiErrors(page) {
  await expect(page.locator('body')).not.toContainText(RAW_ERROR_PATTERN);
}

test.describe('Live critical routes and navigation', () => {
  test('painel, menu, compare-profiles, team-map, branding e PremiumAssessment funcionam com backend real', async ({
    page,
    request,
  }) => {
    test.skip(!hasSuperAdminCreds(), 'Missing SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_MASTER_KEY.');
    test.setTimeout(180_000);

    const publicAccess = await fetchLatestPublicAccess(request);
    const previewUrl = publicAccess.previewUrl || `http://127.0.0.1:5173${publicAccess.previewPath}`;
    const previewLink = new URL(previewUrl);
    const publicToken = String(previewLink.searchParams.get('token') || '').trim();
    const reportType = String(previewLink.searchParams.get('type') || 'business').trim();

    expect(publicToken).toBeTruthy();

    await loginAsAppUser(page);
    await waitForApp(page);

    await page.goto('/painel', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.locator('body')).toContainText(
      /Escolha a experiência do seu painel|Business Mode|Professional Mode|Painel/i,
    );
    const panelModeSelect = page.getByLabel(/Selecionar modo do painel/i);
    if (await panelModeSelect.count()) {
      await panelModeSelect.selectOption('business');
    }
    await expectNoRawUiErrors(page);

    await page.goto('/MyAssessments', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    const assessmentsLink = page.getByRole('link', { name: /Avaliações/i }).first();
    const reportsLink = page.getByRole('link', { name: /Relatórios/i }).first();
    await expect(assessmentsLink).toHaveClass(/bg-indigo-50/);
    await expect(reportsLink).not.toHaveClass(/bg-indigo-50/);
    await expectNoRawUiErrors(page);

    await page.goto('/MyAssessments#reports', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/MyAssessments#reports$/);
    await expect(reportsLink).toHaveClass(/bg-indigo-50/);
    await expect(assessmentsLink).not.toHaveClass(/bg-indigo-50/);
    await expectNoRawUiErrors(page);

    await page.goto('/compare-profiles', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /Atualizar base/i }).click();
    const useButtons = page.getByRole('button', { name: /Usar como/i });
    const useButtonCount = await useButtons.count();
    expect(useButtonCount).toBeGreaterThan(0);
    if (useButtonCount > 0) {
      await useButtons.nth(0).click();
    }
    if (useButtonCount > 1) {
      await useButtons.nth(1).click();
    }
    await page.getByRole('button', { name: /Relatorio comparativo/i }).click();
    await expect(page.locator('#comparison-report-section')).toBeVisible({ timeout: 30_000 });
    const resultButtons = page.getByRole('button', { name: /Resultado /i });
    const resultButtonCount = await resultButtons.count();
    if (resultButtonCount > 0) {
      await resultButtons.first().click();
      await expect(page).toHaveURL(/\/assessments\/.+\/result(?:\?|$)/);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await waitForApp(page);
    }
    await expectNoRawUiErrors(page);

    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('team-map-page')).toBeVisible();
    const generateTeamMapButton = page.getByRole('button', { name: /Gerar mapa organizacional/i });
    await expect(generateTeamMapButton).toBeEnabled();
    await generateTeamMapButton.click();
    await expect(page.locator('body')).toContainText(
      /Distribuição DISC agregada|Mapa de perfis da equipe|Insights organizacionais/i,
      { timeout: 30_000 },
    );
    await expectNoRawUiErrors(page);

    await page.goto('/app/branding', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Configurações de Marca/i })).toBeVisible();
    await page.getByRole('button', { name: /Salvar identidade visual/i }).click();
    await expect(page.locator('body')).toContainText(/Identidade visual salva com sucesso|Identidade visual salva/i, {
      timeout: 30_000,
    });
    await expectNoRawUiErrors(page);

    await page.goto(
      `/PremiumAssessment?token=${encodeURIComponent(publicToken)}&type=${encodeURIComponent(reportType)}`,
      { waitUntil: 'domcontentloaded' },
    );
    await waitForApp(page, { timeout: 30_000 });
    await expect(page.locator('body')).toContainText(
      /Avaliação Premium DISC|Contexto Pessoal|Tempo estimado/i,
      { timeout: 30_000 },
    );
    await expectNoRawUiErrors(page);
  });
});
