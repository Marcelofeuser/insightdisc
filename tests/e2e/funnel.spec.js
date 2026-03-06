import { expect, test } from '@playwright/test';
import { loginAsAdmin, loginAsProfessional, loginAsUser } from './helpers/auth';

test('Home CTA leva para StartFree', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Fazer Teste Grátis|Começar Gratuitamente/i }).first().click();
  await expect(page).toHaveURL(/\/StartFree(?:\?|$)/);
});

test('StartFree sem LGPD não avança', async ({ page }) => {
  await page.goto('/StartFree');
  await page.getByPlaceholder('Seu nome').fill('Teste E2E');
  await page.getByPlaceholder('seuemail@exemplo.com').fill('teste.e2e@example.com');
  await expect(page.getByRole('button', { name: /Começar teste/i })).toBeDisabled();
  await expect(page).toHaveURL(/\/StartFree(?:\?|$)/);
});

test('StartFree preenchido libera FreeAssessment', async ({ page }) => {
  await page.goto('/StartFree');
  await page.getByPlaceholder('Seu nome').fill('Teste E2E');
  await page.getByPlaceholder('seuemail@exemplo.com').fill('teste.e2e@example.com');
  await page.getByRole('checkbox').first().click();
  await page.getByRole('button', { name: /Começar teste/i }).click();
  await expect(page).toHaveURL(/\/FreeAssessment(?:\?|$)/);
});

test('Guard bloqueia acesso direto ao FreeAssessment sem lead', async ({ page }) => {
  await page.goto('/FreeAssessment');
  await expect(page).toHaveURL(/\/StartFree(?:\?|$)/);
});

test('FreeResults compartilhar sempre habilitado e desbloqueio leva para Pricing', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'freeAssessmentResults',
      JSON.stringify({
        natural_profile: { D: 65, I: 20, S: 10, C: 5 },
        dominant_factor: 'D',
      })
    );
  });

  await page.goto('/FreeResults');
  const shareButton = page.getByRole('button', { name: /Compartilhar Resultado/i });
  await expect(shareButton).toBeEnabled();
  await shareButton.click();
  await page.getByRole('button', { name: /Desbloquear Relatório Completo|Desbloquear por/i }).first().click();
  await expect(page).toHaveURL(/\/Pricing(?:\?|$)/);
});

test('Links legais do footer abrem páginas públicas', async ({ page }) => {
  await page.goto('/');
  const privacyLink = page.getByRole('link', { name: /Privacidade/i }).first();
  await privacyLink.scrollIntoViewIfNeeded();
  await privacyLink.click();
  await expect(page).toHaveURL(/\/Privacy(?:\?|$)/);

  await page.goto('/');
  const termsLink = page.getByRole('link', { name: /Termos de Uso/i }).first();
  await termsLink.scrollIntoViewIfNeeded();
  await termsLink.click();
  await expect(page).toHaveURL(/\/Terms(?:\?|$)/);

  await page.goto('/');
  const lgpdLink = page.getByRole('link', { name: /^LGPD$/i }).first();
  await lgpdLink.scrollIntoViewIfNeeded();
  await lgpdLink.click();
  await expect(page).toHaveURL(/\/Lgpd(?:\?|$)/);
});

test('Admin mock consegue abrir report do mesmo workspace sem acesso negado', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/MyAssessments');
  await page.getByRole('link', { name: /Ver relatório/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Relatório DISC', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Acesso negado/i })).toHaveCount(0);
});

test('TeamMapping adicionar membro abre modal e salva', async ({ page }) => {
  const uniqueName = `Membro E2E ${Date.now()}`;
  const uniqueEmail = `membro.e2e.${Date.now()}@example.com`;

  await loginAsProfessional(page);

  await page.goto('/TeamMapping');
  await page.getByText('Time Comercial').first().click();
  await page.getByRole('button', { name: /Adicionar Membro/i }).click();

  await expect(page.getByRole('heading', { name: /Adicionar Membro/i })).toBeVisible();
  await page.getByPlaceholder('Nome do membro').fill(uniqueName);
  await page.getByPlaceholder('email@empresa.com').fill(uniqueEmail);
  await page.getByPlaceholder('Ex: SDR').fill('SDR');
  await page.getByRole('button', { name: /Salvar membro/i }).click();

  await expect(page.getByText('Membro adicionado')).toBeVisible();
  await expect(page.getByText(uniqueName).first()).toBeVisible();
});

test('CheckoutSuccess mock mantém página estável e abre fluxo público quando solicitado', async ({ page }) => {
  await page.goto('/CheckoutSuccess?session_id=mock_e2e_checkout&assessmentId=assessment-2&token=tok-2&flow=candidate');
  await expect(page.getByRole('heading', { name: /Relatório liberado/i })).toBeVisible();
  await page.getByRole('button', { name: /Abrir relatório/i }).click();
  await expect(page).toHaveURL(/\/c\/upgrade|\/c\/assessment|\/c\/report/);
});

test('Respondente consegue abrir o próprio report', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/MyAssessments');
  await page.getByRole('link', { name: /Ver relatório/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Relatório DISC', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Acesso negado/i })).toHaveCount(0);
});

test('Link público /r/:token abre relatório público', async ({ page }) => {
  await page.goto('/r/mock:assessment-2');
  await expect(page.getByRole('heading', { name: /Relatório DISC Público/i })).toBeVisible();
});
