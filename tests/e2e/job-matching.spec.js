import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test('Job Matching em português responde sem erro fatal', async ({ page }, testInfo) => {
  await loginAsProfessional(page);
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
