import { expect, test } from '@playwright/test';
import { loginAsAdmin, loginAsProfessional, loginAsUser } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Feature gating por plano', () => {
  test('business acessa Team Map, AI Lab, Coach e Criador de Vagas sem upgrade', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('team-map-page')).toBeVisible();
    await expect(page.getByText(/Mapa comportamental organizacional bloqueado/i)).toHaveCount(0);

    await page.goto('/painel/ai-lab', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('panel-ai-lab-page')).toBeVisible();
    await expect(page.getByText(/AI Lab bloqueado no plano atual/i)).toHaveCount(0);

    await page.goto('/painel/coach', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('panel-coach-page')).toBeVisible();
    await expect(page.getByText(/Coach bloqueado no plano atual/i)).toHaveCount(0);

    await page.goto('/app/job-matching', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Compatibilidade DISC para Vagas/i })).toBeVisible();
    await expect(page.getByText(/Pessoa × Cargo disponível em plano superior/i)).toHaveCount(0);
  });

  test('professional acessa AI Lab e Coach, mas recebe upgrade em Team Map e Criador de Vagas', async ({ page }) => {
    await loginAsProfessional(page);

    await page.goto('/painel/ai-lab', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('panel-ai-lab-page')).toBeVisible();
    await expect(page.getByText(/AI Lab bloqueado no plano atual/i)).toHaveCount(0);

    await page.goto('/painel/coach', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('panel-coach-page')).toBeVisible();
    await expect(page.getByText(/Coach bloqueado no plano atual/i)).toHaveCount(0);

    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Mapa comportamental organizacional bloqueado/i)).toBeVisible();
    await expect(page.getByText(/Plano recomendado: Business/i)).toBeVisible();

    await page.goto('/app/job-matching', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Pessoa × Cargo disponível em plano superior/i)).toBeVisible();
    await expect(page.getByText(/Plano recomendado: Business/i)).toBeVisible();
  });

  test('personal recebe upgrade em todos os recursos premium', async ({ page }) => {
    await loginAsUser(page);

    await page.goto('/painel/ai-lab', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/AI Lab bloqueado no plano atual/i)).toBeVisible();

    await page.goto('/painel/coach', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Coach bloqueado no plano atual/i)).toBeVisible();

    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Mapa comportamental organizacional bloqueado/i)).toBeVisible();

    await page.goto('/app/job-matching', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Pessoa × Cargo disponível em plano superior/i)).toBeVisible();
  });
});
