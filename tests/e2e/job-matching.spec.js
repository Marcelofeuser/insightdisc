import { expect, test } from '@playwright/test';
import { loginAsAdmin, loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test('Job Matching exige Business para profissional', async ({ page }) => {
  await loginAsProfessional(page);
  await page.goto('/JobMatching', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  await expect(page.getByText(/Pessoa × Cargo disponível em plano superior/i)).toBeVisible();
  await expect(page.getByText(/Plano recomendado: Business/i)).toBeVisible();
});

test('Job Matching abre no plano Business sem erro fatal', async ({ page }, testInfo) => {
  await loginAsAdmin(page);
  await page.goto('/JobMatching', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  await expect(
    page.getByRole('heading', { name: /Compatibilidade DISC para Vagas|Compatibilidade de Vagas/i })
  ).toBeVisible();
  await expect(page.getByPlaceholder('Buscar vaga...')).toBeVisible();

  const createButton = page.getByTestId('job-matching-create-vaga');
  await expect(createButton).toBeVisible();
  await createButton.click();

  await expect(page.getByRole('heading', { name: /Criar Nova Vaga|Criar vaga/i })).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath('job-matching.png'),
    fullPage: true,
  });
});
