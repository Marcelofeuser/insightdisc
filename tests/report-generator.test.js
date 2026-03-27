import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportHtmlPreview,
  generateHtmlPreview,
  invalidateTemplateCache,
  storagePath,
  templateCache,
  templateInflight,
} from '../server/src/services/reportGenerator.js';

function getErrorCode(error) {
  return error?.code || error?.cause?.code || '';
}

function extractRecommendationBlock(html = '') {
  const match = String(html || '').match(
    /<!-- DISC_RECOMMENDATION_BLOCK_START -->[\s\S]*?<!-- DISC_RECOMMENDATION_BLOCK_END -->/,
  );
  return match?.[0] || '';
}

test.beforeEach(() => {
  invalidateTemplateCache();
});

test('reportGenerator gera HTML válido no happy path', async () => {
  const result = await buildReportHtmlPreview({
    reportType: 'business',
    scores: { D: 40, I: 30, S: 20, C: 10 },
    payload: {
      nome: 'Ana Souza',
      cargo: 'Diretora Comercial',
      empresa: 'Acme Labs',
      data: '20/03/2026',
    },
    templateHtml:
      '<html><body><h1>{{name}}</h1><p>{{profile}}</p><p>{{disc_d}}/{{disc_i}}/{{disc_s}}/{{disc_c}}</p></body></html>',
  });

  assert.match(result.html, /Ana Souza/);
  assert.match(result.html, /DI \(Dominante Influente\)/);
  assert.match(result.html, /40\/30\/20\/10/);
  assert.doesNotMatch(result.html, /\{\{name\}\}|\{\{profile\}\}|\{\{disc_[disc]\}\}/);
});

test('reportGenerator falha com UNKNOWN_PLACEHOLDER', async () => {
  await assert.rejects(
    () =>
      buildReportHtmlPreview({
        reportType: 'business',
        templateHtml:
          '<html><body>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}} {{disc_c}} {{unknown}}</body></html>',
      }),
    (error) => getErrorCode(error) === 'UNKNOWN_PLACEHOLDER',
  );
});

test('reportGenerator falha com MISSING_REQUIRED_PLACEHOLDER no template', async () => {
  await assert.rejects(
    () =>
      buildReportHtmlPreview({
        reportType: 'business',
        templateHtml:
          '<html><body>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}}</body></html>',
      }),
    (error) => getErrorCode(error) === 'MISSING_REQUIRED_PLACEHOLDER',
  );
});

test('reportGenerator falha com MISSING_REQUIRED_PLACEHOLDER no valor', async () => {
  await assert.rejects(
    () =>
      buildReportHtmlPreview({
        reportType: 'business',
        allowDefaultValues: false,
        templateHtml: '<html><body>{{name}}</body></html>',
        template_snapshot: {
          required_placeholders: ['name'],
        },
      }),
    (error) => getErrorCode(error) === 'MISSING_REQUIRED_PLACEHOLDER',
  );
});

test('reportGenerator falha com TEMPLATE_NOT_FOUND', async () => {
  await assert.rejects(
    () =>
      buildReportHtmlPreview({
        reportType: 'business',
        templatePath: 'templates/reports/__missing__.html',
      }),
    (error) => getErrorCode(error) === 'TEMPLATE_NOT_FOUND',
  );
});

test('reportGenerator falha com INVALID_REPORT_TYPE', async () => {
  await assert.rejects(
    () =>
      buildReportHtmlPreview({
        reportType: 'enterprise',
        templateHtml:
          '<html><body>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}} {{disc_c}}</body></html>',
      }),
    (error) => getErrorCode(error) === 'INVALID_REPORT_TYPE',
  );
});

test('reportGenerator sempre deriva o profile dos scores reais no preview simples', async () => {
  const scenarios = [
    { payload: { disc: { profile: 'DISC Alpha' } }, expected: 'DISC Alpha' },
    { payload: { disc: { perfil: 'DISC Beta' } }, expected: 'DISC Beta' },
    { payload: { report: { profile: 'DISC Gamma' } }, expected: 'DISC Gamma' },
  ];

  for (const scenario of scenarios) {
    const result = await buildReportHtmlPreview({
      reportType: 'business',
      payload: scenario.payload,
      templateHtml:
        '<html><body>{{name}}|{{profile}}|{{disc_d}}|{{disc_i}}|{{disc_s}}|{{disc_c}}</body></html>',
    });

    assert.match(result.html, /DI \(Dominante Influente\)/);
    assert.doesNotMatch(result.html, new RegExp(scenario.expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('reportGenerator aplica fallback de scores via disc_d/d/DISC_D equivalentes', async () => {
  const scenarios = [
    {
      payload: { disc: { disc_d: 40, disc_i: 30, disc_s: 20, disc_c: 10 } },
      expected: '40|30|20|10',
    },
    {
      payload: { disc: { d: 41, i: 29, s: 20, c: 10 } },
      expected: '41|29|20|10',
    },
    {
      payload: { disc: { DISC_D: 42, DISC_I: 28, DISC_S: 20, DISC_C: 10 } },
      expected: '42|28|20|10',
    },
  ];

  for (const scenario of scenarios) {
    const result = await buildReportHtmlPreview({
      reportType: 'business',
      payload: scenario.payload,
      templateHtml:
        '<html><body>{{name}}|{{profile}}|{{disc_d}}|{{disc_i}}|{{disc_s}}|{{disc_c}}</body></html>',
    });

    assert.match(result.html, new RegExp(scenario.expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('storagePath retorna valor quando todos os dados existem', () => {
  assert.equal(
    storagePath({
      accountId: 'acc_123',
      reportId: 'rep_456',
      reportType: 'business',
    }),
    'reports/acc_123/rep_456/business.pdf',
  );
});

test('storagePath retorna null quando faltam dados obrigatórios', () => {
  assert.equal(
    storagePath({
      accountId: 'acc_123',
      reportId: '',
      reportType: 'business',
    }),
    null,
  );
});

test('invalidateTemplateCache limpa templateCache e templateInflight', async () => {
  await buildReportHtmlPreview({
    reportType: 'business',
    templateHtml:
      '<html><body>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}} {{disc_c}}</body></html>',
  });

  templateInflight.set('manual', Promise.resolve());

  assert.ok(templateCache.size >= 0);
  assert.ok(templateInflight.size > 0);

  invalidateTemplateCache();

  assert.equal(templateCache.size, 0);
  assert.equal(templateInflight.size, 0);
});

test('integração HTML gera conteúdo substituído para personal, professional e business', async () => {
  const scenarios = [
    { mode: 'personal', name: 'Pessoa Personal' },
    { mode: 'professional', name: 'Pessoa Professional' },
    { mode: 'business', name: 'Pessoa Business' },
  ];

  for (const scenario of scenarios) {
    const html = await generateHtmlPreview({
      mode: scenario.mode,
      scores: { D: 40, I: 30, S: 20, C: 10 },
      payload: {
        nome: scenario.name,
        cargo: 'Líder de Operações',
        empresa: 'Empresa & Filhos',
        data: '20/03/2026',
      },
    });

    assert.ok(typeof html === 'string' && html.length > 1000);
    assert.doesNotMatch(
      html,
      /\{\{name\}\}|\{\{profile\}\}|\{\{disc_d\}\}|\{\{disc_i\}\}|\{\{disc_s\}\}|\{\{disc_c\}\}/,
    );
    assert.match(html, new RegExp(scenario.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /D\/I \(Dominante Influente\)/);
    assert.match(html, /40%/);
    assert.match(html, /30%/);
    assert.match(html, /20%/);
    assert.match(html, /10%/);
  }
});

test('relatórios personal, professional e business mantêm coerência C/S no caso crítico', async () => {
  for (const mode of ['personal', 'professional', 'business']) {
    const html = await generateHtmlPreview({
      mode,
      scores: { D: 1, I: 10, S: 35, C: 54 },
      payload: {
        nome: `Modo ${mode}`,
        cargo: 'Analista',
        empresa: 'InsightDISC',
        data: '25/03/2026',
      },
    });

    assert.match(html, /C\/S/);
    assert.doesNotMatch(html, /D\/I|Dominante Influente|executivo de alta energia|CEO|Diretor Comercial/);
    assert.match(html, /Conformidade/);
    assert.match(html, /Estabilidade/);
  }
});

test('resolver DISC mantém regra top-2 nos casos extremos sem regressão', async () => {
  const scenarios = [
    { scores: { D: 70, I: 12, S: 10, C: 8 }, expected: 'D/I' },
    { scores: { I: 68, D: 14, S: 10, C: 8 }, expected: 'I/D' },
    { scores: { S: 72, C: 15, I: 8, D: 5 }, expected: 'S/C' },
    { scores: { C: 68, S: 14, I: 10, D: 8 }, expected: 'C/S' },
  ];

  for (const scenario of scenarios) {
    const html = await generateHtmlPreview({
      mode: 'business',
      scores: scenario.scores,
      payload: {
        nome: 'Teste Extremo',
        cargo: 'Cargo',
        empresa: 'Empresa',
        data: '25/03/2026',
      },
    });

    assert.match(html, new RegExp(scenario.expected.replace('/', '\\/')));
  }
});

test('bloco de indicação personalizada mantém coerência nos 5 casos em personal/professional/business', async () => {
  const scenarios = [
    {
      label: 'CS crítico',
      scores: { D: 1, I: 10, S: 35, C: 54 },
      expectedCode: /C\/S/,
      expectedWork: /(Essencialismo|Rápido e Devagar|A Única Coisa|Moneyball|O Jogo da Imitação)/,
      forbidden: /(Princípios|Como Fazer Amigos e Influenciar Pessoas|agressiv|liderança de ataque)/i,
    },
    {
      label: 'D alto',
      scores: { D: 70, I: 12, S: 10, C: 8 },
      expectedCode: /D\/I/,
      expectedWork: /(Princípios|O Poder do Hábito|O Lobo de Wall Street|Steve Jobs)/,
      forbidden: /(Comunicação Não Violenta|Trabalho Focado|Rápido e Devagar)/i,
    },
    {
      label: 'I alto',
      scores: { I: 68, D: 14, S: 10, C: 8 },
      expectedCode: /I\/D/,
      expectedWork: /(Como Fazer Amigos e Influenciar Pessoas|Mindset|À Procura da Felicidade|O Discurso do Rei)/,
      forbidden: /(Antifrágil|Trabalho Focado|Rápido e Devagar)/i,
    },
    {
      label: 'S alto',
      scores: { S: 72, C: 15, I: 8, D: 5 },
      expectedCode: /S\/C/,
      expectedWork: /(Trabalho Focado|Organize-se|Interestelar|O Jogo da Imitação)/,
      forbidden: /(Princípios|Como Fazer Amigos e Influenciar Pessoas|Antifrágil)/i,
    },
    {
      label: 'C alto',
      scores: { C: 68, S: 14, I: 10, D: 8 },
      expectedCode: /C\/S/,
      expectedWork: /(Essencialismo|Rápido e Devagar|A Única Coisa|Moneyball|O Jogo da Imitação)/,
      forbidden: /(Princípios|Como Fazer Amigos e Influenciar Pessoas|Antifrágil)/i,
    },
  ];

  for (const mode of ['personal', 'professional', 'business']) {
    for (const scenario of scenarios) {
      const html = await generateHtmlPreview({
        mode,
        scores: scenario.scores,
        payload: {
          nome: `${scenario.label} ${mode}`,
          cargo: 'Especialista',
          empresa: 'InsightDISC',
          data: '25/03/2026',
        },
      });
      const block = extractRecommendationBlock(html);

      assert.ok(block, `bloco de indicação ausente para ${scenario.label} em ${mode}`);
      assert.match(block, scenario.expectedCode);
      assert.match(block, /Livro recomendado:/);
      assert.match(block, /Filme recomendado:/);
      assert.match(block, scenario.expectedWork);
      assert.doesNotMatch(block, scenario.forbidden);
    }
  }
});
