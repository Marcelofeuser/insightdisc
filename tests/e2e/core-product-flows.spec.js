import { expect, test } from '@playwright/test';
import { loginAsProfessional, loginAsSuperAdmin } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Fluxos principais do produto', () => {
  test('fluxo 1: fazer avaliacao', async ({ page }) => {
    await page.goto('/avaliacoes', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Avaliações comportamentais para decisões mais seguras/i })).toBeVisible();
  });

  test('fluxo 2: ver resultado oficial', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/assessments/assessment-1/result', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Seu Resultado DISC/i })).toBeVisible();
  });

  test('fluxo 3 e 4: gerar relatorio e acao de exportar PDF', async ({ page }) => {
    test.skip(!process.env.PW_PUBLIC_REPORT_URL, 'Requires real assessments in DB');
    await loginAsProfessional(page);
    await page.goto('/assessments/assessment-1/report', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Relatório comportamental/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exportar PDF|Gerando PDF/i })).toBeVisible();
  });

  test('fluxo 5: comparar perfis', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/compare-profiles', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
  });

  test('fluxo 6: candidato x cargo e team map', async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.goto('/JobMatching', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Compatibilidade DISC para Vagas/i })).toBeVisible();

    await page.goto('/team-map', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByRole('heading', { name: /Mapa de Equipes/i }).first()).toBeVisible();
  });
});
