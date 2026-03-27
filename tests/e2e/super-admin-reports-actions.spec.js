import { expect, test } from '@playwright/test';
import { clearAuth } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';
const HAS_API = IS_API_MODE && Boolean(process.env.VITE_API_URL || process.env.E2E_API_URL);
const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || '',
  password: process.env.SUPER_ADMIN_PASSWORD || '',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || '',
};
const RAW_ERROR_PATTERN = /NOT_FOUND|The page could not be found|Parâmetros ausentes|payload\.error/i;

function hasSuperAdminCreds() {
  return Boolean(SUPER_ADMIN.email && SUPER_ADMIN.password && SUPER_ADMIN.masterKey);
}

async function loginAsSuperAdminUi(page) {
  await page.goto('/super-admin-login', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
  await expect(page.locator('#super-admin-email')).toBeVisible();

  await page.locator('#super-admin-email').fill(SUPER_ADMIN.email);
  await page.locator('#super-admin-password').fill(SUPER_ADMIN.password);
  await page.locator('#super-admin-key').fill(SUPER_ADMIN.masterKey);
  await page.getByRole('button', { name: /Entrar como Super Admin/i }).click();
  await expect(page).toHaveURL(/\/super-admin/);
}

test.describe('Super Admin - Relatórios mais recentes actions', () => {
  test.afterEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('Preview, PDF, Regenerar PDF e Link funcionam com dados reais', async ({ page, context }) => {
    test.skip(!HAS_API, 'Requer backend API configurado (VITE_API_URL ou E2E_API_URL).');
    test.skip(!hasSuperAdminCreds(), 'Missing SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_MASTER_KEY.');
    test.setTimeout(180_000);

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginAsSuperAdminUi(page);
    await waitForApp(page);

    const table = page.locator('div[data-testid="super-admin-reports-table"]').first();
    await expect(table).toBeVisible();

    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    const targetRow = rows.first();

    const previewButton = targetRow.getByRole('button', { name: /^Preview$/i });
    const pdfButton = targetRow.getByRole('button', { name: /^PDF$|^Baixando/i });
    const regenerateButton = targetRow.getByRole('button', { name: /Regenerar PDF|Gerando/i });
    const linkButton = targetRow.getByRole('button', { name: /^Link$/i });

    await previewButton.click();
    await expect(page).toHaveURL(/\/c\/report\?token=.*[?&]type=(personal|professional|business)/);
    await expect(page.getByTestId('candidate-report-container')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Relatório DISC/i)).toBeVisible();
    const reportFrame = page.frameLocator('iframe[title="Prévia do relatório do candidato"]');
    await expect(reportFrame.locator('.slide').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('body')).not.toContainText(RAW_ERROR_PATTERN);
    await page.goto('/super-admin', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(table).toBeVisible({ timeout: 30_000 });
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });

    const pdfResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        /\/api\/report\/pdf\?token=/.test(response.url()),
      { timeout: 90_000 },
    );
    await rows.first().getByRole('button', { name: /^PDF$|^Baixando/i }).click();
    const pdfResponse = await pdfResponsePromise;
    expect(pdfResponse.ok()).toBeTruthy();
    expect(String(pdfResponse.headers()['content-type'] || '').toLowerCase()).toContain('application/pdf');
    expect(String(pdfResponse.headers()['content-disposition'] || '').toLowerCase()).toContain('.pdf');
    await expect(rows.first().getByRole('button', { name: /^PDF$/i })).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator('body')).not.toContainText(RAW_ERROR_PATTERN);

    const regenerateResponsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/assessment/generate-report')
      );
    });
    await rows.first().getByRole('button', { name: /Regenerar PDF|Gerando/i }).click();
    const regenerateResponse = await regenerateResponsePromise;
    expect(regenerateResponse.ok()).toBeTruthy();
    const regeneratePayload = await regenerateResponse.json();
    expect(regeneratePayload?.reportType).toMatch(/personal|professional|business/i);
    await expect(rows.first().getByRole('button', { name: /Regenerar PDF/i })).toBeVisible({
      timeout: 30_000,
    });

    await rows.first().getByRole('button', { name: /^Link$/i }).click();
    await expect(page.getByText('Copiado', { exact: true })).toBeVisible({ timeout: 10000 });
    const clipboardText = await page.evaluate(async () => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/\/c\/report\?token=.*[?&]type=(personal|professional|business)/);

    await expect(previewButton).toBeVisible();
    await expect(pdfButton).toBeVisible();
    await expect(regenerateButton).toBeVisible();
    await expect(linkButton).toBeVisible();
  });
});
