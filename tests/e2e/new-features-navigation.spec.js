import { expect, test } from '@playwright/test';
import { loginAsProfessional, loginAsSuperAdmin } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Novas features - navegação', () => {
  test('rota /team-map exibe upgrade para plano Professional', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText(/Mapa comportamental organizacional bloqueado/i)).toBeVisible();
    await expect(page.getByText(/Plano recomendado: Business/i)).toBeVisible();
  });

  test('rota /team-map abre para super admin com acesso total', async ({ page }) => {
    await loginAsSuperAdmin(page);
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

  test('rota /painel abre landing V2 com modos de experiência', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/painel', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Escolha a experiência do seu painel/i })).toBeVisible();
    await expect(page.getByText(/Business Mode/i).first()).toBeVisible();
    await expect(page.getByText(/Professional Mode/i).first()).toBeVisible();
    await expect(page.getByText(/Personal Mode/i).first()).toBeVisible();
  });

  test('alias /panel redireciona para /painel', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/panel', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/painel(?:\?|$)/);
  });

  test('alias /organization-map redireciona para /team-map', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/organization-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/team-map(?:\?|$)/);
    await expect(page.getByText(/Mapa comportamental organizacional bloqueado/i)).toBeVisible();
  });

  test('painel alterna entre modos e atualiza conteúdo principal', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/painel', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: /Produtividade analítica para especialistas DISC/i })).toBeVisible();

    const modeSelect = page.getByLabel(/Selecionar modo do painel/i);
    await modeSelect.selectOption('business');
    await expect(page.getByText(/Inteligência comportamental da sua organização em tempo real/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Organização/i }).first()).toBeVisible();

    await modeSelect.selectOption('personal');
    await expect(page.getByRole('heading', { name: /Autoconhecimento com clareza e próximos passos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Meu Desenvolvimento/i }).first()).toBeVisible();
  });

  test('menu autenticado exibe atalhos das novas features', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByRole('link', { name: /Comparador/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Arquétipos/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Biblioteca DISC/i }).first()).toBeVisible();
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

  test('alias /profile-compatibility redireciona para /compare-profiles', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/profile-compatibility', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/compare-profiles(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
  });

  test('alias /comparison-report redireciona para /compare-profiles', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/comparison-report', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page).toHaveURL(/\/compare-profiles(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
  });
});
