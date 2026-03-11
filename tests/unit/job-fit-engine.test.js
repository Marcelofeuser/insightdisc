import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateJobFit } from '../../src/modules/jobFit/index.js';

test('calculateJobFit calcula aderência alta para candidato próximo do perfil ideal', () => {
  const result = calculateJobFit(
    {
      id: 'cand-1',
      name: 'Candidato A',
      scores: { D: 58, I: 38, S: 28, C: 68 },
    },
    {
      key: 'role-1',
      label: 'Gestão Operacional',
      scores: { D: 60, I: 40, S: 30, C: 70 },
    },
  );

  assert.equal(typeof result.jobFitScore, 'number');
  assert.equal(result.jobFitScore >= 70, true);
  assert.equal(result.compatibilityLevel, 'Alta aderência');
  assert.equal(result.hiringRecommendation, 'recomendada');
  assert.equal(Array.isArray(result.strengths), true);
});

test('calculateJobFit suporta perfil ideal em formato de faixa e sinaliza baixa aderência', () => {
  const result = calculateJobFit(
    {
      id: 'cand-2',
      name: 'Candidato B',
      scores: { D: 10, I: 18, S: 52, C: 20 },
    },
    {
      label: 'Vendas Hunter',
      ideal_profile: {
        D: { min: 45, max: 80, ideal: 62 },
        I: { min: 35, max: 70, ideal: 50 },
        S: { min: 5, max: 25, ideal: 14 },
        C: { min: 10, max: 35, ideal: 22 },
      },
    },
  );

  assert.equal(result.jobFitScore < 50, true);
  assert.equal(result.compatibilityLevel, 'Baixa aderência');
  assert.equal(result.hiringRecommendation, 'nao_recomendada');
  assert.equal(Array.isArray(result.riskPoints), true);
  assert.equal(result.riskPoints.length > 0, true);
});
