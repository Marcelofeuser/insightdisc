import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssessmentReportViewModel } from '../../src/modules/reports/reportViewModel.js';
import { renderAssessmentReportPdfHtml } from '../../src/modules/reportExport/pdf/reportPdfDocument.js';

test('renderAssessmentReportPdfHtml gera documento premium com seções essenciais', () => {
  const viewModel = buildAssessmentReportViewModel({
    id: 'assessment-pdf-test',
    candidateName: 'Pessoa PDF',
    completedAt: '2026-03-11T09:00:00.000Z',
    results: {
      summary_profile: { D: 38, I: 24, S: 22, C: 16 },
      dominant_factor: 'D',
      secondary_factor: 'I',
    },
  });

  const html = renderAssessmentReportPdfHtml({
    viewModel,
    meta: { generatedAt: '2026-03-11T10:00:00.000Z' },
  });

  assert.match(html, /Relatório Oficial InsightDISC/i);
  assert.match(html, /Radar DISC/i);
  assert.match(html, /Resumo executivo/i);
  assert.match(html, /Forças e pontos de atenção/i);
  assert.match(html, /Análise dos fatores D, I, S, C/i);
  assert.match(html, /Análise da combinação DISC/i);
  assert.match(html, /Desenvolvimento e próximos passos/i);
  assert.match(html, /Resumo técnico final/i);
  assert.match(html, /Estilo de aprendizagem/i);
  assert.match(html, /<svg[^>]*aria-label="Radar DISC"/i);
  assert.match(html, /class="page-footer"/i);
});
