import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScoreBalanceNote,
  resolveAssessmentDiscSnapshot,
  resolveAssessmentIdentity,
} from '../../src/modules/assessmentResult/assessmentResultData.js';

test('resolveAssessmentDiscSnapshot normaliza perfil com base em results.natural_profile', () => {
  const snapshot = resolveAssessmentDiscSnapshot({
    results: {
      natural_profile: { D: 40, I: 20, S: 20, C: 20 },
      dominant_factor: 'D',
      secondary_factor: 'I',
    },
  });

  assert.equal(snapshot.hasValidScores, true);
  assert.equal(snapshot.primaryFactor, 'D');
  assert.equal(snapshot.secondaryFactor, 'I');
  assert.equal(snapshot.summary.D, 40);
  assert.equal(snapshot.summary.I, 20);
  assert.equal(snapshot.summary.S, 20);
  assert.equal(snapshot.summary.C, 20);
});

test('resolveAssessmentDiscSnapshot usa fallback de disc_profile.summary quando necessário', () => {
  const snapshot = resolveAssessmentDiscSnapshot({
    disc_profile: {
      summary: { D: 18, I: 32, S: 30, C: 20 },
    },
  });

  assert.equal(snapshot.hasValidScores, true);
  assert.equal(snapshot.primaryFactor, 'I');
  assert.equal(snapshot.secondaryFactor, 'S');
  assert.equal(snapshot.summary.I, 32);
  assert.equal(snapshot.summary.S, 30);
});

test('resolveAssessmentDiscSnapshot retorna estado sem scores quando dados são ausentes', () => {
  const snapshot = resolveAssessmentDiscSnapshot({});

  assert.equal(snapshot.hasValidScores, false);
  assert.equal(snapshot.summary, null);
  assert.equal(snapshot.primaryFactor, '');
  assert.equal(snapshot.secondaryFactor, '');
  assert.deepEqual(snapshot.ranking, []);
});

test('resolveAssessmentIdentity prioriza dados de avaliação e fallback de id', () => {
  const identity = resolveAssessmentIdentity(
    {
      assessmentId: 'abc-123',
      respondent_name: 'Pessoa Teste',
      lead_email: 'teste@example.com',
      completed_at: '2026-03-10T10:00:00.000Z',
    },
    'fallback-id',
  );

  assert.equal(identity.id, 'abc-123');
  assert.equal(identity.respondentName, 'Pessoa Teste');
  assert.equal(identity.respondentEmail, 'teste@example.com');
  assert.equal(identity.completedAt, '2026-03-10T10:00:00.000Z');
});

test('buildScoreBalanceNote gera mensagens coerentes por cenário', () => {
  assert.match(buildScoreBalanceNote({ hasValidInput: false }), /consolidação/i);
  assert.match(buildScoreBalanceNote({ hasValidInput: true, topGap: 22 }), /Predominância clara/i);
  assert.match(buildScoreBalanceNote({ hasValidInput: true, topGap: 6 }), /equilibrada/i);
});

