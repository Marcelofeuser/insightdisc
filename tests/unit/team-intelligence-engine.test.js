import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTeamFilters,
  buildLocalTeamMapFromAssessments,
  buildTeamFilterOptions,
  buildTeamIntelligence,
} from '../../src/modules/teamIntelligence/engine/teamIntelligenceEngine.js';

const SAMPLE_ASSESSMENTS = [
  {
    assessmentId: 'a-1',
    candidateName: 'Carlos',
    candidateEmail: 'carlos@example.com',
    completedAt: '2026-03-10T10:00:00.000Z',
    createdAt: '2026-03-10T10:00:00.000Z',
    dominantFactor: 'D',
    profileCode: 'DI',
    department: 'Comercial',
    role: 'Closer',
    manager: 'Marina',
    city: 'Sao Paulo',
    disc: { D: 42, I: 31, S: 17, C: 10 },
  },
  {
    assessmentId: 'a-2',
    candidateName: 'Ana',
    candidateEmail: 'ana@example.com',
    completedAt: '2026-03-02T10:00:00.000Z',
    createdAt: '2026-03-02T10:00:00.000Z',
    dominantFactor: 'S',
    profileCode: 'SC',
    department: 'Operacoes',
    role: 'Analista',
    manager: 'Marina',
    city: 'Curitiba',
    disc: { D: 15, I: 20, S: 41, C: 24 },
  },
  {
    assessmentId: 'a-3',
    candidateName: 'Pedro',
    candidateEmail: 'pedro@example.com',
    completedAt: '2025-11-10T10:00:00.000Z',
    createdAt: '2025-11-10T10:00:00.000Z',
    dominantFactor: 'C',
    profileCode: 'CD',
    department: 'Produto',
    role: 'Especialista',
    manager: 'Eduardo',
    city: 'Sao Paulo',
    disc: { D: 28, I: 14, S: 18, C: 40 },
  },
];

test('buildLocalTeamMapFromAssessments gera payload coerente para análise local', () => {
  const payload = buildLocalTeamMapFromAssessments(SAMPLE_ASSESSMENTS, ['a-1', 'a-2']);

  assert.equal(payload.selectedCount, 2);
  assert.equal(Array.isArray(payload.members), true);
  assert.equal(payload.members.length, 2);
  assert.equal(typeof payload.predominantFactor, 'string');
  assert.equal(Object.keys(payload.collectivePercentages).length, 4);
});

test('buildTeamIntelligence consolida visão executiva, gaps e dimensões', () => {
  const teamMap = buildLocalTeamMapFromAssessments(SAMPLE_ASSESSMENTS, ['a-1', 'a-2', 'a-3']);
  const intelligence = buildTeamIntelligence(teamMap);

  assert.equal(intelligence.totalMembers, 3);
  assert.equal(Array.isArray(intelligence.insights), true);
  assert.equal(Array.isArray(intelligence.profileFrequencies), true);
  assert.equal(Array.isArray(intelligence.dimensions), true);
  assert.equal(intelligence.dimensions.length >= 6, true);
  assert.equal(typeof intelligence.balance.score, 'number');
  assert.equal(typeof intelligence.balanceIntelligence?.executiveNote, 'string');
  assert.equal(Array.isArray(intelligence.balanceIntelligence?.teamRisks), true);
  assert.equal(Array.isArray(intelligence.balanceIntelligence?.autoCompositionRecommendations), true);
  assert.equal(typeof intelligence.executiveSummary, 'string');
});

test('applyTeamFilters e buildTeamFilterOptions suportam segmentação sem quebrar', () => {
  const options = buildTeamFilterOptions(SAMPLE_ASSESSMENTS);
  assert.equal(options.departments.includes('Comercial'), true);
  assert.equal(options.roles.includes('Analista'), true);

  const filtered = applyTeamFilters(SAMPLE_ASSESSMENTS, {
    dominantFactor: 'D',
    department: 'Comercial',
    role: 'Closer',
    manager: 'Marina',
    city: 'Sao Paulo',
    period: '365',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].assessmentId, 'a-1');
});
