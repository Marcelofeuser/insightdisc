import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBehaviorAnalytics,
  buildBenchmarkComparison,
  buildBehaviorHistory,
} from '../../src/modules/behaviorAnalytics/behaviorAnalyticsEngine.js';

const SAMPLE_MEMBERS = [
  { scores: { D: 42, I: 28, S: 18, C: 12 } },
  { scores: { D: 18, I: 22, S: 36, C: 24 } },
  { scores: { D: 24, I: 32, S: 20, C: 24 } },
];

test('buildBenchmarkComparison retorna deltas por fator', () => {
  const result = buildBenchmarkComparison(
    { D: 40, I: 22, S: 20, C: 18 },
    { D: 28, I: 31, S: 24, C: 17 },
  );

  assert.equal(Array.isArray(result.factors), true);
  assert.equal(result.factors.length, 4);
  assert.equal(typeof result.factors[0].delta, 'number');
});

test('buildBehaviorHistory detecta transicoes de perfil', () => {
  const result = buildBehaviorHistory([
    { id: '1', date: '2024-02-01', profileCode: 'DI', scores: { D: 40, I: 30, S: 15, C: 15 } },
    { id: '2', date: '2025-02-01', profileCode: 'DC', scores: { D: 37, I: 17, S: 18, C: 28 } },
  ]);

  assert.equal(result.items.length, 2);
  assert.equal(result.transitions.length, 1);
});

test('buildBehaviorAnalytics gera visão executiva com benchmark e dimensões', () => {
  const analytics = buildBehaviorAnalytics({
    members: SAMPLE_MEMBERS,
    history: [
      { id: 'h-1', date: '2024-01-01', profileCode: 'DI', scores: { D: 41, I: 29, S: 16, C: 14 } },
      { id: 'h-2', date: '2025-01-01', profileCode: 'DC', scores: { D: 36, I: 19, S: 21, C: 24 } },
    ],
  });

  assert.equal(analytics.sampleSize, 3);
  assert.equal(typeof analytics.executiveSummary, 'string');
  assert.equal(Array.isArray(analytics.dimensions), true);
  assert.equal(analytics.dimensions.length >= 4, true);
  assert.equal(Array.isArray(analytics.benchmarkComparison.factors), true);
  assert.equal(Array.isArray(analytics.evolution.items), true);
});
