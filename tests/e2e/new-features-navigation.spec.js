import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Novas features - navegação', () => {
  test('rota /team-map abre para usuário autenticado elegível', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Mapa de Equipes/i }).first()).toBeVisible();
    await expect(page.getByText(/Mapa Comportamental de Equipes/i).first()).toBeVisible();
  });

  test('rota /compare-profiles abre para usuário autenticado elegível', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/compare-profiles', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
    await expect(page.getByText(/Comparador de Perfis DISC/i).first()).toBeVisible();
  });

  test('rota /checkout abre sem quebrar fluxo autenticado', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Checkout simples de créditos/i })).toBeVisible();
  });

  test('menu autenticado exibe atalhos das novas features', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByRole('link', { name: /Mapa de Equipes/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Comparar Perfis/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Comprar Créditos/i }).first()).toBeVisible();
  });

  test('rota legado /TeamMapping permanece funcional', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/TeamMapping', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Mapeamento de Equipes/i }).first()).toBeVisible();
  });

  test('alias legado /compare redireciona para /compare-profiles', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/compare', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/compare-profiles(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
    await expect(page.getByText(/Comparador de Perfis DISC/i).first()).toBeVisible();
  });
});
