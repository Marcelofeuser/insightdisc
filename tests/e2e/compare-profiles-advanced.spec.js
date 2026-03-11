import { expect, test } from '@playwright/test';
import { loginAsProfessional } from './helpers/auth';
import { waitForApp } from './helpers/waitForApp';

test.describe('Comparador avancado DISC (3G)', () => {
  test('rota /compare-profiles renderiza estrutura principal com estados seguros', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/compare-profiles', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: /Comparar Perfis/i }).first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/Comparador de Perfis DISC/i);
    await expect(page.locator('body')).toContainText(/Selecao de perfis/i);
    await expect(page.getByLabel(/Modo de comparacao/i)).toBeVisible();
    await expect(page.locator('body')).toContainText(/Perfil A|Nenhum perfil disponivel|Selecione dois perfis/i);
  });

  test('comparador suporta modos de contexto estrategico', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/compare-profiles', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const modeSelect = page.getByLabel(/Modo de comparacao/i);
    await modeSelect.selectOption('leader_to_member');
    await expect(page.locator('body')).toContainText(/Lider x liderado/i);

    await modeSelect.selectOption('candidate_to_role');
    await expect(page.locator('body')).toContainText(/Cargo ideal/i);

    await modeSelect.selectOption('member_to_team');
    await expect(page.locator('body')).toContainText(/Equipe \(media\)|Equipe de referencia/i);
  });

  test('comparador suporta selecao de perfis quando ha base disponivel', async ({ page }) => {
    await loginAsProfessional(page);
    await page.goto('/compare-profiles?assessmentId=e2e-left', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const selectA = page.locator('#profile-a-select');
    const selectB = page.locator('#profile-b-select');

    const hasSelectA = await selectA.count();
    const hasSelectB = await selectB.count();

    if (hasSelectA && hasSelectB) {
      const optionsA = await selectA.locator('option').count();
      const optionsB = await selectB.locator('option').count();
      if (optionsA > 1) {
        await selectA.selectOption({ index: 1 });
      }
      if (optionsB > 1) {
        await selectB.selectOption({ index: Math.min(2, optionsB - 1) });
      }
    }

    await expect(page.locator('body')).toContainText(
      /Radar comparativo|Relatorio comparativo|Comparacao invalida|Nenhum perfil disponivel|Selecione perfis/i,
    );
  });
});
