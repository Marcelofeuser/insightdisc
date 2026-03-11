import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDevelopmentPlan3090 } from '../../src/modules/developmentPlan/developmentPlanEngine.js';

test('buildDevelopmentPlan3090 gera checkpoints 30-60-90 com objetivos', () => {
  const plan = buildDevelopmentPlan3090(
    {
      primaryFactor: 'D',
      strengths: ['Decisão rápida', 'Direção de resultado'],
      attentionPoints: ['Escuta ativa'],
      developmentRecommendations: ['Praticar perguntas abertas em reuniões críticas'],
    },
    { D: 42, I: 24, S: 18, C: 16 },
  );

  assert.equal(typeof plan.summary, 'string');
  assert.equal(Array.isArray(plan.checkpoints), true);
  assert.equal(plan.checkpoints.length, 3);
  assert.equal(plan.checkpoints.every((item) => Array.isArray(item.goals) && item.goals.length > 0), true);
});
