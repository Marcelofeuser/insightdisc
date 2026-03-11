import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamBalanceAnalysis } from '../../src/modules/teamIntelligence/engine/teamBalanceEngine.js';

test('buildTeamBalanceAnalysis identifica risco de D alto com S baixo e recomenda equilíbrio', () => {
  const analysis = buildTeamBalanceAnalysis({
    distribution: { D: 38, I: 18, S: 14, C: 30 },
    dimensions: [
      { key: 'leadership', label: 'Liderança', score: 78, status: 'forte' },
      { key: 'stability', label: 'Estabilidade', score: 39, status: 'vulneravel' },
    ],
    profileFrequencies: [{ profile: 'DI', count: 6 }],
    balance: { level: 'concentrada', score: 52 },
    totalMembers: 10,
  });

  assert.equal(Array.isArray(analysis.teamRisks), true);
  assert.equal(analysis.teamRisks.some((item) => /Dominância|conflito/i.test(item)), true);
  assert.equal(Array.isArray(analysis.autoCompositionRecommendations), true);
  assert.equal(analysis.recommendedProfiles.length > 0, true);
});
