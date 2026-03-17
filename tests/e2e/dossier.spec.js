import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';

test.describe('Dossiê Comportamental', () => {
  test('criação de nota, insight, plano e lembrete', async ({ page }) => {
    const seed = Date.now();
    const candidateId = `e2e-candidate-${seed}`;
    const workspaceId = 'workspace-1';

    const dossierState = {
      candidate: {
        id: candidateId,
        name: 'Avaliado E2E',
        email: `avaliado-${seed}@example.com`,
      },
      dossier: {
        id: `dossier-${seed}`,
        notes: [],
        insights: [],
        plans: [],
        reminders: [],
      },
      assessmentsHistory: [],
      overview: {
        currentProfile: null,
        lastAssessmentAt: null,
        assessmentsCount: 0,
        remindersCount: 0,
        remindersThisMonth: 0,
      },
    };

    await page.addInitScript(() => {
      window.localStorage.setItem('insightdisc_api_token', 'e2e-token');
      window.localStorage.setItem('insightdisc_api_email', 'admin@example.com');
      window.localStorage.setItem('disc_mock_user_email', 'admin@example.com');
      window.localStorage.setItem('disc_mock_active_tenant', 'workspace-1');
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user: {
            id: 'e2e-admin-user',
            email: 'admin@example.com',
            name: 'Admin E2E',
            role: 'ADMIN',
            lifecycle_status: 'customer_active',
            active_workspace_id: workspaceId,
            tenant_id: workspaceId,
            global_role: 'PLATFORM_ADMIN',
            tenant_role: 'TENANT_ADMIN',
            entitlements: ['report.pro'],
            plan: 'professional',
            credits: 20,
          },
        }),
      });
    });

    await page.route('**/api/dossier/reminders/summary**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          summary: {
            workspaceId,
            scheduledThisMonth: 0,
            activeDossiers: 1,
            upcoming: [],
          },
        }),
      });
    });

    await page.route(`**/api/dossier/${candidateId}**`, async (route) => {
      const method = route.request().method().toUpperCase();
      const url = route.request().url();

      if (method === 'GET' && !url.includes('/note') && !url.includes('/insight') && !url.includes('/plan') && !url.includes('/reminder')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            workspaceId,
            ...dossierState,
          }),
        });
        return;
      }

      if (method === 'POST' && url.includes('/note')) {
        const payload = route.request().postDataJSON();
        dossierState.dossier.notes.unshift({
          id: `note-${Date.now()}`,
          authorId: 'e2e-admin-user',
          content: payload.content,
          createdAt: new Date().toISOString(),
        });
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }

      if (method === 'POST' && url.includes('/insight')) {
        const payload = route.request().postDataJSON();
        dossierState.dossier.insights.unshift({
          id: `insight-${Date.now()}`,
          authorId: 'e2e-admin-user',
          insight: payload.insight,
          createdAt: new Date().toISOString(),
        });
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }

      if (method === 'POST' && url.includes('/plan')) {
        const payload = route.request().postDataJSON();
        dossierState.dossier.plans.unshift({
          id: `plan-${Date.now()}`,
          goal: payload.goal,
          description: payload.description,
          createdAt: new Date().toISOString(),
        });
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }

      if (method === 'POST' && url.includes('/reminder')) {
        const payload = route.request().postDataJSON();
        dossierState.dossier.reminders.push({
          id: `reminder-${Date.now()}`,
          date: new Date(payload.date).toISOString(),
          note: payload.note,
          createdAt: new Date().toISOString(),
        });
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return;
      }

      await route.continue();
    });

    await page.goto(`/app/dossier/e2e-candidate-${seed}?candidateName=Avaliado+E2E`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForApp(page);

    await expect(page.getByRole('heading', { name: /Dossiê Comportamental/i }).first()).toBeVisible();

    await page.getByRole('tab', { name: /Anotações/i }).click();
    const note = `Nota E2E ${seed}`;
    await page.getByPlaceholder(/Alta dominância/i).fill(note);
    await page.getByRole('button', { name: /Salvar anotação/i }).click();
    await expect(page.getByText(note)).toBeVisible();

    await page.getByRole('tab', { name: /Insights/i }).click();
    const insight = `Insight E2E ${seed}`;
    await page
      .getByPlaceholder(/Perfil dominante pode performar melhor/i)
      .fill(insight);
    await page.getByRole('button', { name: /Salvar insight/i }).click();
    await expect(page.getByText(insight)).toBeVisible();

    await page.getByRole('tab', { name: /Plano de Desenvolvimento/i }).click();
    const goal = `Objetivo E2E ${seed}`;
    const description = `Descrição do plano E2E ${seed}`;
    await page.getByPlaceholder(/Objetivo/i).fill(goal);
    await page.getByPlaceholder(/Descrição/i).fill(description);
    await page.getByRole('button', { name: /Salvar plano/i }).click();
    await expect(page.getByText(goal)).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();

    await page.getByRole('tab', { name: /Agendamentos/i }).click();
    await page.locator('input[type="datetime-local"]').fill('2026-12-01T09:30');
    const reminder = `Reavaliação E2E ${seed}`;
    await page.getByPlaceholder(/Reavaliar em 6 meses/i).fill(reminder);
    await page.getByRole('button', { name: /Salvar agendamento/i }).click();
    await expect(page.getByText(reminder)).toBeVisible();
  });
});
