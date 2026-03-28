import { expect, test } from '@playwright/test';
import { loginAsAdmin, loginAsProfessional, loginAsSuperAdmin, loginAsUser } from './helpers/auth';

const IS_API_MODE = String(process.env.PW_ENABLE_API_MODE || '').trim().toLowerCase() === 'true';

test('Visitante público não acessa dashboard premium', async ({ page }) => {
  await page.goto('/Dashboard');
  await expect(page).toHaveURL(/\/Login(?:\?|$)/);
});

test('Home CTA leva para StartFree', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Escolher meu plano/i }).first().click();
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

test('FreeResults exibe desbloqueio único e leva para checkout provisório', async ({ page }) => {
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
  await page.getByRole('button', { name: /Desbloquear Relatório Completo/i }).first().click();
  await expect(page).toHaveURL(/\/checkout\?product=report-unlock/);
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
  test.skip(!process.env.PW_PUBLIC_REPORT_URL, 'Requires real assessments in DB');
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

test('Cliente ativo vê botão Fazer minha avaliação no dashboard', async ({ page }) => {
  await loginAsProfessional(page);
  await page.goto('/Dashboard');
  await expect(page.getByTestId('dashboard-self-assessment-btn')).toBeVisible();
});

test('Fazer minha avaliação inicia fluxo de autoavaliação', async ({ page }) => {
  await loginAsProfessional(page);
  await page.goto('/Dashboard');
  await page.getByTestId('dashboard-self-assessment-btn').click();
  if (IS_API_MODE) {
    await expect(page).toHaveURL(/\/c\/assessment\?token=/);
    return;
  }
  await expect(page).toHaveURL(/\/PremiumAssessment|\/c\/assessment/);
});

test('Super admin sempre consegue iniciar autoavaliação', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/Dashboard');
  await page.getByTestId('dashboard-self-assessment-btn').click();
  await expect(page).toHaveURL(/\/PremiumAssessment|\/c\/assessment/);
});

test('Token válido carrega fluxo de avaliação sem redirecionar para login', async ({ page }) => {
  test.skip(!IS_API_MODE, 'Validação de token é coberta no modo API.');
  await loginAsProfessional(page);

  await page.route('**/assessment/validate-token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: true,
        reason: 'VALID',
        assessment: {
          id: 'asm-e2e-token-valid',
          status: 'IN_PROGRESS',
          candidateEmail: 'pro@example.com',
          candidateName: 'Profissional E2E',
        },
      }),
    });
  });
  await page.route('**/assessment/report-by-token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        assessment: {
          id: 'asm-e2e-token-valid',
          candidateName: 'Profissional E2E',
          candidateEmail: 'pro@example.com',
        },
        answers: [],
      }),
    });
  });

  await page.goto('/PremiumAssessment?token=tok-e2e-valid', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/Login(?:\?|$)/);
  await expect(page.getByText(/Contexto Pessoal \(Opcional\)|Pergunta 1 de 40/i).first()).toBeVisible();
});

test('Usuário sem créditos vai para checkout ao iniciar autoavaliação (API)', async ({ page }) => {
  test.skip(!IS_API_MODE, 'Fluxo de créditos depende do modo API.');

  await loginAsProfessional(page);
  await page.route('**/assessment/credits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, credits: 0, isSuperAdmin: false }),
    });
  });

  await page.goto('/Dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('dashboard-self-assessment-btn').click();
  await expect(page).toHaveURL(/\/checkout(?:\?|$)/);
});

test('CheckoutSuccess mock mantém página estável e abre fluxo público quando solicitado', async ({ page }) => {
  await page.goto('/CheckoutSuccess?session_id=mock_e2e_checkout&assessmentId=assessment-2&token=tok-2&flow=candidate');
  await expect(page.getByRole('heading', { name: /Relatório liberado/i })).toBeVisible();
  await page.getByRole('button', { name: /Abrir relatório/i }).click();
  await expect(page).toHaveURL(/\/c\/upgrade|\/c\/assessment|\/c\/report/);
});

for (const reportType of ['personal', 'professional', 'business']) {
  test(`CheckoutSuccess preserva o type=${reportType} no link de continuação`, async ({ page }) => {
    await page.goto(
      `/CheckoutSuccess?session_id=mock_e2e_checkout_${reportType}&assessmentId=assessment-${reportType}&token=tok-${reportType}&flow=candidate&type=${reportType}`,
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page.getByRole('heading', { name: /Relatório liberado/i })).toBeVisible();

    const reportLink = page.getByRole('link', { name: /Abrir relatório/i });
    await expect(reportLink).toHaveAttribute(
      'href',
      new RegExp(`/c/upgrade\\?token=tok-${reportType}.*type=${reportType}`),
    );
  });
}

test('Usuário sem compra é redirecionado para planos/desbloqueio', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/Dashboard');
  await expect(page).toHaveURL(/\/Pricing(?:\?|$)/);

  await page.goto('/JobMatching');
  await expect(page).toHaveURL(/\/Pricing(?:\?|$)/);

  await page.goto('/LeadsDashboard');
  await expect(page).toHaveURL(/\/Pricing(?:\?|$)/);

  await page.goto('/MyAssessments');
  await expect(page).toHaveURL(/\/Pricing(?:\?|$)/);
});

test('Link público /r/:token abre relatório público', async ({ page }) => {
  test.skip(!process.env.PW_PUBLIC_REPORT_URL, 'Requires real assessments in DB');
  await page.goto('/r/mock:assessment-2');
  await expect(page.getByRole('heading', { name: /Relatório DISC Público/i })).toBeVisible();
});
