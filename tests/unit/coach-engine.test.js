import test from 'node:test';
import assert from 'node:assert/strict';
import { answerDiscCoachQuestion } from '../../src/modules/coach/index.js';

test('answerDiscCoachQuestion responde intenção conhecida de conflito D x S', () => {
  const result = answerDiscCoachQuestion({
    question: 'Como lidar com conflito D x S no time?',
    scores: { D: 39, I: 22, S: 21, C: 18 },
  });

  assert.equal(typeof result.response, 'string');
  assert.equal(result.response.length > 30, true);
  assert.equal(Array.isArray(result.recommendedActions), true);
  assert.equal(result.recommendedActions.length > 0, true);
});

test('answerDiscCoachQuestion retorna resposta genérica quando intenção não casa', () => {
  const result = answerDiscCoachQuestion({
    question: 'Como melhorar minha rotina com o time?',
    scores: { D: 22, I: 33, S: 27, C: 18 },
  });

  assert.equal(typeof result.summary, 'string');
  assert.equal(typeof result.profileCode, 'string');
  assert.equal(Array.isArray(result.recommendedActions), true);
});
