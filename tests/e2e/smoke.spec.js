import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';
import { loginAsAdmin } from './helpers/auth';

const PUBLIC_ROUTES = [
  { path: '/', assertion: /InsightDISC|DISC/i, name: 'home' },
  { path: '/avaliacoes', assertion: /Avaliações comportamentais|InsightDISC/i, name: 'avaliacoes' },
  { path: '/Pricing', assertion: /Plano|Crédito|Pricing|Preços/i, name: 'pricing' },
];

test.describe('Smoke', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`carrega ${route.path} sem tela branca`, async ({ page }, testInfo) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await expect(page.locator('body')).toContainText(route.assertion);
      await page.screenshot({
        path: testInfo.outputPath(`smoke-${route.name}.png`),
        fullPage: true,
      });
    });
  }

  test('carrega /JobMatching sem erro fatal', async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await page.goto('/JobMatching', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(
      page.getByRole('heading', { name: /Compatibilidade DISC para Vagas|Compatibilidade de Vagas/i })
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('smoke-job-matching.png'),
      fullPage: true,
    });
  });

  test('login público não exibe atalhos de desenvolvimento', async ({ page }, testInfo) => {
    await page.goto('/Login', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByText(/Atalhos de desenvolvimento/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Entrar como Admin/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Entrar como Profissional/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Entrar como Usuário/i })).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath('smoke-login-no-dev-shortcuts.png'),
      fullPage: true,
    });
  });
});
