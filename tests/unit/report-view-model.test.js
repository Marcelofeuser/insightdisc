import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssessmentReportViewModel } from '../../src/modules/reports/reportViewModel.js';

test('buildAssessmentReportViewModel monta estrutura completa para relatório HTML oficial', () => {
  const viewModel = buildAssessmentReportViewModel({
    id: 'assessment-report-e2e',
    candidateName: 'Pessoa Teste',
    completedAt: '2026-03-11T10:00:00.000Z',
    results: {
      summary_profile: { D: 44, I: 28, S: 18, C: 10 },
      dominant_factor: 'D',
      secondary_factor: 'I',
    },
  });

  assert.equal(viewModel.identity.id, 'assessment-report-e2e');
  assert.equal(viewModel.discSnapshot.hasValidScores, true);
  assert.ok(viewModel.interpretation.profileCode.length >= 1);
  assert.equal(viewModel.factorAnalysis.length, 4);
  assert.equal(viewModel.executiveSummary.length, 4);
  assert.equal(typeof viewModel.leadershipInsights?.leadershipStyle, 'string');
  assert.equal(Array.isArray(viewModel.leadershipInsights?.recommendations), true);
  assert.ok(Array.isArray(viewModel.strengths));
  assert.ok(Array.isArray(viewModel.developmentRecommendations));
  assert.ok(viewModel.technical.balanceNote.length > 10);
});

test('buildAssessmentReportViewModel mantém fallback seguro quando não há scores válidos', () => {
  const viewModel = buildAssessmentReportViewModel({ id: 'assessment-empty' });

  assert.equal(viewModel.identity.id, 'assessment-empty');
  assert.equal(viewModel.discSnapshot.hasValidScores, false);
  assert.equal(viewModel.interpretation.profileCode, 'DISC');
  assert.equal(viewModel.factorAnalysis.length, 4);
  assert.equal(viewModel.technical.hasValidInput, false);
  assert.equal(typeof viewModel.leadershipInsights?.summaryShort, 'string');
  assert.match(viewModel.technical.balanceNote, /consolidação/i);
});

test('buildAssessmentReportViewModel prioriza modelo premium (report.discProfile) quando disponível', () => {
  // Simula estrutura do reportModel gerado pelo backend (buildPremiumReportModel)
  const premiumProfile = {
    discSnapshot: { summary: { D: 40, I: 30, S: 15, C: 15 }, hasValidScores: true },
    interpretation: {
      profileCode: 'DI',
      styleLabel: 'Dominante Influente',
      summaryShort: 'Síntese do modelo premium persistido.',
    },
    leadershipInsights: {
      leadershipStyle: 'Estilo de liderança premium',
    },
    executiveSummary: 'Resumo executivo premium',
  };

  const viewModel = buildAssessmentReportViewModel({
    id: 'assessment-premium-flow',
    candidateName: 'Premium User',
    completedAt: '2026-03-12T10:00:00.000Z',
    results: {
      summary_profile: { D: 10, I: 10, S: 70, C: 10 }, // Legado (deve ser ignorado)
    },
    report: {
      id: 'rep-123',
      discProfile: premiumProfile,
    },
  });

  assert.equal(viewModel.discSnapshot.summary.D, 40);
  assert.equal(viewModel.interpretation.summaryShort, 'Síntese do modelo premium persistido.');
  assert.equal(viewModel.leadershipInsights.leadershipStyle, 'Estilo de liderança premium');
});
