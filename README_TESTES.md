# Testes Automatizados (E2E + Smoke) - InsightDISC

## Pré-requisitos
- Node.js 18+
- Dependências instaladas: `npm install`
- Playwright browsers instalados (se necessário): `npx playwright install chromium`

## Configuração
- A suíte usa `http://localhost:5173` como `baseURL`.
- O próprio Playwright sobe o frontend com `npm run dev -- --host 127.0.0.1 --port 5173`.
- Para testar relatório público específico, configure:
  - `PW_PUBLIC_REPORT_URL` (opcional)
  - padrão: `http://localhost:5173/c/report?id=assessment-2&token=tok-2`

## Comandos
- Rodar tudo: `npm run test:e2e`
- UI mode: `npm run test:e2e:ui`
- Headed: `npm run test:e2e:headed`
- Abrir relatório HTML: `npm run test:e2e:report`

## Suites focadas
- Smoke: `npm run test:smoke`
- Relatório público: `npm run test:public-report`
- Claim/salvar no portal: `npm run test:portal-claim`
- Job Matching: `npm run test:job-matching`

## Estrutura
- `tests/e2e/helpers/`
  - `waitForApp.js`: aguarda render inicial sem condição de corrida
  - `downloads.js`: captura e valida download de PDF
  - `report.js`: ações de relatório público
  - `auth.js`: login/logout helper para mock auth
  - `styles.js`: valida estilos premium (CTA translúcido)
- `tests/e2e/fixtures/publicReport.js`: URL pública de relatório para os testes

## Debug rápido
- Rodar um arquivo: `npx playwright test tests/e2e/public-report.spec.js`
- Rodar um teste pelo título: `npx playwright test -g "fluxo público do relatório"`
- Em falha, os artefatos ficam em:
  - `test-results/` (screenshots/videos/traces)
  - `playwright-report/` (relatório HTML)

## Ajuste da fixture de relatório
Edite `tests/e2e/fixtures/publicReport.js` ou exporte env:

```bash
PW_PUBLIC_REPORT_URL="http://localhost:5173/c/report?id=...&token=..." npm run test:public-report
```
