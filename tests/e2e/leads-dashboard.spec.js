import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { clearAuth, loginAsAdmin } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

async function ensureLeadWithPhone(page) {
  await page.evaluate(() => {
    const key = 'insightdisc_chatbot_leads';
    const now = Date.now();
    const current = JSON.parse(window.localStorage.getItem(key) || '[]');
    if (Array.isArray(current) && current.length > 0) return;
    current.push({
      id: `local-seed-${now}`,
      createdAt: new Date(now).toISOString(),
      source: 'chatbot',
      payload: {
        name: 'Lead Seed',
        email: `lead-seed-${now}@example.com`,
        phone: '62994090276',
        company: 'InsightDISC',
        interest: 'Plano corporativo',
        message: 'Seed lead para testes',
      },
      status: 'new',
      notes: '',
    });
    window.localStorage.setItem(key, JSON.stringify(current));
  });
}

test.describe('Leads Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await loginAsAdmin(page);
  });

  test('chatbot captura lead e dashboard lista', async ({ page }) => {
    const now = Date.now();
    const leadName = `Lead E2E ${now}`;
    const leadEmail = `lead-e2e-${now}@example.com`;

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await page.getByTestId('insight-chat-toggle').click();
    await page.getByRole('button', { name: /Falar com atendimento/i }).click();
    await page.getByRole('button', { name: /Deixar meus dados/i }).click();

    await page.fill('#chat-field-name', leadName);
    await page.fill('#chat-field-email', leadEmail);
    await page.fill('#chat-field-phone', '62994090276');
    await page.fill('#chat-field-company', 'Empresa E2E');
    await page.fill('#chat-field-interest', 'Plano corporativo');
    await page.fill('#chat-field-message', 'Quero entender o onboarding');
    await page.getByRole('button', { name: /Enviar dados/i }).click();

    await expect(page.getByText(/Dados enviados com sucesso/i)).toBeVisible();

    await page.goto('/LeadsDashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(leadEmail)).toBeVisible();
  });

  test('exporta CSV de leads', async ({ page }) => {
    await ensureLeadWithPhone(page);
    await page.goto('/LeadsDashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 25_000 }),
      page.getByRole('button', { name: /Exportar CSV/i }).click(),
    ]);

    const downloadDir = path.resolve('test-results/downloads');
    await fs.mkdir(downloadDir, { recursive: true });

    const suggested = download.suggestedFilename();
    const savePath = path.join(downloadDir, `${Date.now()}-${suggested || 'leads.csv'}`);
    await download.saveAs(savePath);

    const stats = await fs.stat(savePath);
    expect((suggested || '').toLowerCase()).toContain('.csv');
    expect(stats.size).toBeGreaterThan(200);
  });

  test('abre WhatsApp com mensagem personalizada', async ({ page }) => {
    await ensureLeadWithPhone(page);
    await page.goto('/LeadsDashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const firstWhatsappButton = page.getByRole('button', { name: /WhatsApp/i }).first();

    const popupPromise = page.waitForEvent('popup', { timeout: 10_000 });
    await firstWhatsappButton.click();
    const popup = await popupPromise;

    const url = popup.url();
    expect(url).toMatch(/wa\.me\/|api\.whatsapp\.com\/send/i);
    expect(decodeURIComponent(url)).toContain('InsightDISC');
  });

  test('edita status de lead sem quebrar a tela', async ({ page }) => {
    await ensureLeadWithPhone(page);
    await page.goto('/LeadsDashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const statusSelect = firstRow.locator('select').first();
    await statusSelect.selectOption('qualified');
    await expect(statusSelect).toHaveValue('qualified');
  });
});
