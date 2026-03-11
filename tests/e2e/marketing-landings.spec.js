import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';

const PERSONA_ROUTES = Object.freeze([
  { path: '/empresa', expected: /Inteligencia comportamental para cultura, lideranca/i },
  { path: '/rh', expected: /Recrutamento e desenvolvimento com leitura comportamental/i },
  { path: '/lideres', expected: /Lidere com clareza comportamental/i },
  { path: '/consultores', expected: /Escalone entregas de consultoria DISC/i },
  { path: '/autoconhecimento', expected: /Entenda seu estilo comportamental/i },
  { path: '/recrutamento', expected: /Contrate com mais seguranca/i },
]);

const USE_CASE_ROUTES = Object.freeze([
  { path: '/disc-para-empresas', expected: /DISC para empresas/i },
  { path: '/analise-disc-para-rh', expected: /Analise DISC para RH/i },
  { path: '/teste-disc-com-relatorio', expected: /Teste DISC com relatorio premium/i },
  { path: '/comparacao-de-perfis-disc', expected: /Comparacao de perfis DISC/i },
  { path: '/mapa-comportamental-de-equipe', expected: /Mapa comportamental de equipe/i },
  { path: '/analise-comportamental-para-lideres', expected: /Analise comportamental para lideres/i },
  { path: '/disc-para-recrutamento', expected: /DISC para recrutamento/i },
]);

test.describe('Landing marketing', () => {
  test('home principal reforca posicionamento de plataforma', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: /Transforme perfil comportamental em decisao pratica/i })).toBeVisible();
    await expect(page.getByText(/Muito alem de um teste DISC/i).first()).toBeVisible();
  });

  for (const route of PERSONA_ROUTES) {
    test(`landing de publico ${route.path} abre com copy correta`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await expect(page.getByRole('heading', { name: route.expected })).toBeVisible();
    });
  }

  for (const route of USE_CASE_ROUTES) {
    test(`landing de caso de uso ${route.path} abre com copy correta`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await expect(page.getByRole('heading', { name: route.expected })).toBeVisible();
    });
  }
});

