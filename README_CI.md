# CI do InsightDISC

## O que a CI valida
O workflow executa validações de qualidade e regressão no frontend:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run build`
6. `npm run test:e2e`

## Quando roda
O workflow roda automaticamente em:

- `push`
- `pull_request`
- `workflow_dispatch` (manual)

Arquivo do workflow:
- `.github/workflows/ci.yml`

## Artefatos em caso de falha
Mesmo com erro, a CI faz upload de:

- `playwright-report`
- `test-results`

No GitHub:
1. Abra a execução em `Actions`
2. Entre no job `quality-and-e2e`
3. Baixe os artifacts no fim da página

## Como reproduzir localmente
Rode os mesmos comandos da pipeline:

```bash
npm ci
npx playwright install --with-deps chromium
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Para simular comportamento de CI (ex.: retries/workers):

```bash
CI=true npm run test:e2e
```
