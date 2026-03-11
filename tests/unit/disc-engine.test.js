import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiscInterpretation,
  getDevelopmentRecommendations,
  getPrimarySecondary,
  getProfileArchetype,
  getProfileSummary,
  resolveProfileCode,
  validateProfileCode,
} from '../../src/modules/discEngine/index.js';

test('resolveProfileCode identifica perfil puro quando há grande distância entre fatores', () => {
  const profileCode = resolveProfileCode({ D: 70, I: 10, S: 10, C: 10 });
  assert.equal(profileCode, 'D');
});

test('resolveProfileCode identifica combinação quando fatores líderes estão próximos', () => {
  const profileCode = resolveProfileCode({ D: 32, I: 18, S: 29, C: 21 });
  assert.equal(profileCode, 'DS');

  const ranking = getPrimarySecondary({ D: 32, I: 18, S: 29, C: 21 });
  assert.equal(ranking.primaryFactor, 'D');
  assert.equal(ranking.secondaryFactor, 'S');
  assert.equal(ranking.isPure, false);
});

test('buildDiscInterpretation retorna saída estruturada com campos semânticos esperados', () => {
  const interpretation = buildDiscInterpretation({ D: 45, I: 20, S: 20, C: 15 });

  const requiredFields = [
    'profileCode',
    'primaryFactor',
    'secondaryFactor',
    'styleLabel',
    'summaryShort',
    'summaryMedium',
    'summaryLong',
    'strengths',
    'attentionPoints',
    'communicationStyle',
    'decisionMaking',
    'leadershipStyle',
    'pressureResponse',
    'idealEnvironment',
    'motivators',
    'potentialChallenges',
    'developmentRecommendations',
    'workStyle',
    'relationshipStyle',
    'learningStyle',
    'adaptationNotes',
    'scoreSummary',
  ];

  requiredFields.forEach((field) => {
    assert.ok(Object.hasOwn(interpretation, field), `campo ausente: ${field}`);
  });

  assert.ok(Array.isArray(interpretation.strengths));
  assert.ok(Array.isArray(interpretation.developmentRecommendations));
  assert.ok(interpretation.summaryShort.length > 20);
});

test('regras de intensidade refletem combinação D alto + C alto', () => {
  const interpretation = buildDiscInterpretation({ D: 44, I: 8, S: 10, C: 38 });
  const notes = interpretation.adaptationNotes.join(' | ');

  assert.match(notes, /D alto com C alto/i);
  assert.match(interpretation.decisionMaking, /criteriosa|critério|análise/i);
});

test('regras de intensidade refletem C alto com I baixo', () => {
  const interpretation = buildDiscInterpretation({ D: 20, I: 8, S: 27, C: 45 });
  const attention = interpretation.attentionPoints.join(' | ');

  assert.match(attention, /reservada/i);
  assert.ok(interpretation.developmentRecommendations.length > 0);
});

test('motor não quebra com dados ausentes e retorna fallback semântico', () => {
  const interpretation = buildDiscInterpretation({});

  assert.equal(interpretation.profileCode, 'DISC');
  assert.equal(interpretation.scoreSummary.hasValidInput, false);
  assert.ok(interpretation.summaryShort.length > 10);
  assert.ok(interpretation.adaptationNotes.length > 0);
});

test('archetype, summary e recomendações seguem API pública do motor', () => {
  const archetype = getProfileArchetype('DI');
  assert.equal(archetype.profileCode, 'DI');
  assert.ok(archetype.styleLabel.length > 0);

  const shortSummary = getProfileSummary('DI', 'short');
  const longSummary = getProfileSummary('DI', 'long');
  assert.ok(shortSummary.length > 20);
  assert.ok(longSummary.length > shortSummary.length);

  const recommendations = getDevelopmentRecommendations('DI', { D: 40, I: 35, S: 15, C: 10 });
  assert.ok(Array.isArray(recommendations));
  assert.ok(recommendations.length > 0);
});

test('validateProfileCode protege contra códigos inválidos', () => {
  assert.equal(validateProfileCode('XX'), 'DISC');
  assert.equal(validateProfileCode('di'), 'DI');
  assert.equal(validateProfileCode('S'), 'S');
});
