import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadershipInsights } from '../../src/modules/leadershipInsights/index.js';

test('buildLeadershipInsights retorna leitura estruturada para perfil dominante em D', () => {
  const insights = buildLeadershipInsights({ D: 46, I: 24, S: 14, C: 16 });

  assert.equal(insights.primaryFactor, 'D');
  assert.equal(typeof insights.leadershipStyle, 'string');
  assert.equal(typeof insights.decisionStyle, 'string');
  assert.equal(typeof insights.conflictManagement, 'string');
  assert.equal(typeof insights.pressureManagement, 'string');
  assert.equal(typeof insights.teamManagement, 'string');
  assert.equal(Array.isArray(insights.recommendations), true);
  assert.equal(insights.recommendations.length > 0, true);
});

test('buildLeadershipInsights mantém fallback seguro com dados incompletos', () => {
  const insights = buildLeadershipInsights({});

  assert.equal(typeof insights.summaryShort, 'string');
  assert.equal(Array.isArray(insights.leadershipRisks), true);
  assert.equal(Array.isArray(insights.differentProfilesGuidance), true);
  assert.equal(typeof insights.profileCode, 'string');
});
