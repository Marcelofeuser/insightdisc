import { expect, test } from '@playwright/test';

test('Pricing separa trilhas Social e Business com CTAs corretos', async ({ page }) => {
  await page.goto('/Pricing');

  await expect(page.getByRole('heading', { name: /Escolha o plano certo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Individual' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Profissional e Empresas/i }).first()).toBeVisible();

  await expect(page.getByRole('button', { name: 'Comprar DISC Individual' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assinar Personal' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assinar Insider' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assinar Professional' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assinar Business' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Falar com Vendas/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Falar com Consultor/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comprar 10 Avaliações' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comprar 50 Avaliações' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comprar 100 Avaliações' })).toBeVisible();
});

test('Landing de presente /gift/:token exibe mensagem personalizada', async ({ page }) => {
  await page.goto('/gift/e2e-token?from=Ana&to=Bruno&msg=Mensagem%20personalizada%20de%20teste');

  await expect(page.getByRole('heading', { name: /Você recebeu uma avaliação DISC de Ana/i })).toBeVisible();
  await expect(page.getByText(/Mensagem personalizada de teste/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Realizar meu teste/i })).toBeVisible();
});
