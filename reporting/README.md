# InsightDISC Reporting (Determinístico)

Módulo editorial sem IA para geração de relatório DISC com:

- Biblioteca de conteúdo modular (`content/`)
- Engine determinística (`buildReportModel.js`)
- Template premium de 30 páginas fixas (`renderReportHtml.js`)
- Pipeline HTML → PDF com Puppeteer (fallback Playwright) (`generatePdf.js`)
- Smoke test local (`smoke.js`)

## Estrutura

```txt
reporting/
  content/
    combos/      # 12 combinações top2 (DI, ID, DS...)
    pure/        # 4 perfis puros fallback (D, I, S, C)
    factors/     # D/I/S/C com níveis low/mid/high
    snippets/    # blocos reutilizáveis
    rules.json   # regras de bandas e seleção top2
  buildReportModel.js
  renderReportHtml.js
  generatePdf.js
  sample-data.json
  smoke.js
```

## Regras determinísticas

- Bandas por fator:
  - `low`: `0-33`
  - `mid`: `34-66`
  - `high`: `67-100`
- Banda de adaptação (Natural vs Adaptado):
  - `low`: `avgAbsDelta < 8`
  - `mid`: `8 <= avgAbsDelta <= 15`
  - `high`: `avgAbsDelta > 15`
- Seleção de perfil:
  - Ordena top2 por `scores.natural`
  - Se `top1 - top2 >= 18` => perfil puro (`D|I|S|C`)
  - Caso contrário => combinação (`DI`, `IS`, etc.)

## Execução

Gerar um PDF sample:

```bash
npm run report:sample
```

Gerar a partir de JSON customizado:

```bash
npm run report:build -- reporting/sample-data.json
```

Smoke test (3 variações):

```bash
node reporting/smoke.js
```

