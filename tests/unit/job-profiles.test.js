import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getJobProfileByKey,
  listJobProfiles,
  suggestCompatibleJobFunctions,
} from '../../src/modules/jobProfiles/index.js';

test('biblioteca de perfis ideais expõe cargos base da fase 4K', () => {
  const profiles = listJobProfiles();
  const keys = profiles.map((item) => item.key);

  assert.equal(keys.includes('sales'), true);
  assert.equal(keys.includes('manager'), true);
  assert.equal(keys.includes('analyst'), true);
  assert.equal(keys.includes('support'), true);
  assert.equal(keys.includes('operations'), true);
  assert.equal(keys.includes('marketing'), true);
});

test('suggestCompatibleJobFunctions sugere funções ordenadas por aderência', () => {
  const analystProfile = getJobProfileByKey('analyst');
  const result = suggestCompatibleJobFunctions(
    { scores: analystProfile?.scores || { D: 14, I: 12, S: 30, C: 44 } },
    { limit: 4 },
  );

  assert.equal(result.hasValidScores, true);
  assert.equal(Array.isArray(result.recommendations), true);
  assert.equal(result.recommendations.length > 0, true);
  assert.equal(result.recommendations[0].fitScore >= result.recommendations[result.recommendations.length - 1].fitScore, true);
});
