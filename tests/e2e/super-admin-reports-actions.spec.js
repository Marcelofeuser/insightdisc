import { expect, test } from '@playwright/test';
import { clearAuth } from './helpers/auth';
import { capturePdfDownload } from './helpers/downloads';
import { waitForApp } from './helpers/waitForApp';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';
const HAS_API = IS_API_MODE && Boolean(process.env.VITE_API_URL || process.env.E2E_API_URL);
const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || '',
  password: process.env.SUPER_ADMIN_PASSWORD || '',
  masterKey: process.env.SUPER_ADMIN_MASTER_KEY || '',
};

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

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginAsSuperAdminUi(page);
    await waitForApp(page);

    const table = page.getByTestId('super-admin-reports-table');
    await expect(table).toBeVisible();

    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    test.skip(rowCount < 1, 'Nenhum relatório disponível para validar ações.');
    const targetRow = rows.first();

    const previewButton = targetRow.getByRole('button', { name: /^Preview$/i });
    const pdfButton = targetRow.getByRole('button', { name: /^PDF$|^Baixando/i });
    const regenerateButton = targetRow.getByRole('button', { name: /Regenerar PDF|Gerando/i });
    const linkButton = targetRow.getByRole('button', { name: /^Link$/i });

    await previewButton.click();
    await expect(page).toHaveURL(/\/Report\?id=/);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await capturePdfDownload(
      page,
      async () => {
        await rows.first().getByRole('button', { name: /^PDF$|^Baixando/i }).click();
      },
      { minBytes: 2000 },
    );

    await rows.first().getByRole('button', { name: /Regenerar PDF|Gerando/i }).click();
    await expect(page.getByText(/Relatório gerado/i)).toBeVisible({ timeout: 30000 });

    await rows.first().getByRole('button', { name: /^Link$/i }).click();
    await expect(page.getByText(/copiado/i)).toBeVisible({ timeout: 10000 });
    const clipboardText = await page.evaluate(async () => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/\/Report\?id=/);

    await expect(previewButton).toBeVisible();
    await expect(pdfButton).toBeVisible();
    await expect(regenerateButton).toBeVisible();
    await expect(linkButton).toBeVisible();
  });
});
