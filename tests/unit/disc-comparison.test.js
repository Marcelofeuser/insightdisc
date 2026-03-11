import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIdealRoleProfile,
  buildScoreDifferences,
  buildTeamBenchmarkProfile,
  COMPARISON_MODE,
  compareMemberToTeam,
  compareDiscProfiles,
  getCommunicationDynamics,
  getSynergyPoints,
  getTensionPoints,
  listIdealRoleProfiles,
  normalizeComparableProfile,
} from '../../src/modules/discComparison/index.js';

test('normalizeComparableProfile gera estrutura semantica com fallback seguro', () => {
  const profile = normalizeComparableProfile({
    assessmentId: 'abc-1',
    name: 'Perfil Teste',
    scores: { D: 42, I: 26, S: 18, C: 14 },
  });

  assert.equal(profile.assessmentId, 'abc-1');
  assert.equal(profile.name, 'Perfil Teste');
  assert.equal(profile.hasValidScores, true);
  assert.match(profile.profileCode, /^D/);
  assert.ok(profile.styleLabel.length > 3);
  assert.ok(profile.summaryShort.length > 10);
});

test('buildScoreDifferences calcula gaps por fator e agregados tecnicos', () => {
  const left = normalizeComparableProfile({ scores: { D: 40, I: 20, S: 25, C: 15 } });
  const right = normalizeComparableProfile({ scores: { D: 20, I: 35, S: 25, C: 20 } });
  const diffs = buildScoreDifferences(left, right);

  assert.equal(diffs.D.delta, 20);
  assert.equal(diffs.I.delta, -15);
  assert.equal(diffs.S.delta, 0);
  assert.equal(diffs.C.delta, -5);
  assert.ok(diffs.totalAbsDelta > 0);
  assert.ok(diffs.meanAbsDelta > 0);
  assert.ok(['D', 'I', 'S', 'C'].includes(diffs.strongestGapFactor));
});

test('compareDiscProfiles retorna saida robusta para tela comparativa', () => {
  const comparison = compareDiscProfiles(
    {
      assessmentId: 'a-1',
      name: 'Lider A',
      scores: { D: 45, I: 18, S: 17, C: 20 },
    },
    {
      assessmentId: 'b-1',
      name: 'Lider B',
      scores: { D: 20, I: 24, S: 36, C: 20 },
    },
  );

  const requiredFields = [
    'profileA',
    'profileB',
    'summaryShort',
    'summaryMedium',
    'compatibilityScore',
    'compatibilityLevel',
    'synergyPoints',
    'tensionPoints',
    'communicationDynamics',
    'decisionDynamics',
    'workStyleDynamics',
    'collaborationDynamics',
    'leadershipDynamics',
    'workRhythmDynamics',
    'qualityDynamics',
    'riskToleranceDynamics',
    'pressureDynamics',
    'conflictRisks',
    'practicalRecommendations',
    'scoreDifferences',
    'factorHighlights',
    'technicalNotes',
    'visualization',
    'comparativeReport',
    'modeLabel',
  ];

  requiredFields.forEach((field) => {
    assert.ok(Object.hasOwn(comparison, field), `campo ausente: ${field}`);
  });

  assert.ok(comparison.summaryShort.length > 20);
  assert.ok(comparison.summaryMedium.length > 20);
  assert.ok(comparison.compatibilityScore >= 0);
  assert.ok(comparison.compatibilityScore <= 100);
  assert.ok(['Baixa', 'Moderada', 'Alta'].includes(comparison.compatibilityLevel));
  assert.ok(Array.isArray(comparison.synergyPoints));
  assert.ok(Array.isArray(comparison.tensionPoints));
  assert.ok(Array.isArray(comparison.practicalRecommendations));
  assert.ok(Array.isArray(comparison?.visualization?.radar));
  assert.equal(comparison?.visualization?.radar?.length, 4);
});

test('motor reconhece tensao classica entre Dominancia e Estabilidade', () => {
  const left = normalizeComparableProfile({ scores: { D: 50, I: 20, S: 10, C: 20 } });
  const right = normalizeComparableProfile({ scores: { D: 10, I: 15, S: 55, C: 20 } });
  const diffs = buildScoreDifferences(left, right);

  const tensionPoints = getTensionPoints(left, right, diffs).join(' | ');
  assert.match(tensionPoints, /Dominancia|aceleracao|estabilidade/i);
});

test('motor reconhece dinamica de comunicacao em contraste I alto vs C alto', () => {
  const left = normalizeComparableProfile({ scores: { D: 20, I: 48, S: 22, C: 10 } });
  const right = normalizeComparableProfile({ scores: { D: 20, I: 10, S: 22, C: 48 } });
  const diffs = buildScoreDifferences(left, right);

  const communication = getCommunicationDynamics(left, right, diffs);
  assert.match(communication, /espontaneidade|formalidade|comunicacao/i);
});

test('motor sugere sinergias mesmo em perfis diferentes quando ha complementaridade', () => {
  const left = normalizeComparableProfile({ scores: { D: 38, I: 30, S: 16, C: 16 } });
  const right = normalizeComparableProfile({ scores: { D: 18, I: 16, S: 34, C: 32 } });
  const diffs = buildScoreDifferences(left, right);
  const synergyPoints = getSynergyPoints(left, right, diffs);

  assert.ok(Array.isArray(synergyPoints));
  assert.ok(synergyPoints.length > 0);
});

test('compareDiscProfiles aplica modo candidato x cargo ideal com leitura contextual', () => {
  const ideal = buildIdealRoleProfile('quality_analyst');
  const candidate = normalizeComparableProfile({
    assessmentId: 'candidate-qa',
    name: 'Candidato QA',
    scores: { D: 16, I: 14, S: 30, C: 40 },
  });

  const comparison = compareDiscProfiles(candidate, ideal, {
    mode: COMPARISON_MODE.CANDIDATE_TO_ROLE,
  });

  assert.equal(comparison.mode, COMPARISON_MODE.CANDIDATE_TO_ROLE);
  assert.match(comparison.summaryMedium, /candidato-cargo|onboarding|funcao/i);
  assert.ok(comparison.comparativeReport?.sections?.practicalRecommendations?.length > 0);
});

test('buildTeamBenchmarkProfile e compareMemberToTeam suportam modo membro x equipe', () => {
  const teamProfiles = [
    { assessmentId: 'm-1', name: 'M1', scores: { D: 36, I: 24, S: 20, C: 20 } },
    { assessmentId: 'm-2', name: 'M2', scores: { D: 18, I: 20, S: 36, C: 26 } },
    { assessmentId: 'm-3', name: 'M3', scores: { D: 22, I: 30, S: 28, C: 20 } },
  ];

  const benchmark = buildTeamBenchmarkProfile(teamProfiles, { excludedId: 'm-1' });
  assert.ok(benchmark?.profile);
  assert.equal(benchmark.memberCount, 2);

  const comparison = compareMemberToTeam(teamProfiles[0], teamProfiles);
  assert.ok(comparison);
  assert.equal(comparison.mode, COMPARISON_MODE.MEMBER_TO_TEAM);
  assert.ok(comparison?.technicalNotes?.some((item) => /0-40 baixa, 40-70 moderada, 70-100 alta/i.test(item)));
});

test('listIdealRoleProfiles expoe templates para modo candidato x cargo', () => {
  const templates = listIdealRoleProfiles();
  assert.ok(Array.isArray(templates));
  assert.ok(templates.length >= 3);
  assert.ok(templates.some((item) => item.key === 'project_lead'));
});
