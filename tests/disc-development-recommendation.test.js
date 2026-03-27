import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDiscDevelopmentRecommendation } from '../server/src/modules/disc/development-recommendation.service.js';

test('recomendação resolve perfil sempre pelo top-2 real dos scores', async () => {
  const result = await resolveDiscDevelopmentRecommendation({
    scores: { D: 1, I: 10, S: 35, C: 54 },
    profile: {
      primary: 'D',
      secondary: 'I',
      compactCode: 'DI',
      slashCode: 'D/I',
    },
  });

  assert.equal(result.profile.code, 'CS');
  assert.equal(result.profile.slashCode, 'C/S');
});

test('recomendação evita repetição recente quando há alternativa no catálogo', async () => {
  const result = await resolveDiscDevelopmentRecommendation({
    scores: { D: 1, I: 10, S: 35, C: 54 },
    history: {
      lastRecommendedBooks: ['Essencialismo'],
      lastRecommendedFilms: ['Moneyball'],
    },
  });

  assert.notEqual(result.book?.title, 'Essencialismo');
  assert.notEqual(result.film?.title, 'Moneyball');
});

test('racional segue limite e tom profissional determinístico', async () => {
  const result = await resolveDiscDevelopmentRecommendation({
    scores: { D: 1, I: 10, S: 35, C: 54 },
  });

  assert.ok(result.rationale.length <= 300);
  assert.doesNotMatch(result.rationale, /\bmuito bom\b|inspirador|transformador|incr[ií]vel/i);
});

test('disponibilidade permanece nula sem lookup habilitado', async () => {
  const previous = process.env.DISC_RECOMMENDATION_AVAILABILITY_LOOKUP;
  process.env.DISC_RECOMMENDATION_AVAILABILITY_LOOKUP = 'false';

  try {
    const result = await resolveDiscDevelopmentRecommendation({
      scores: { D: 1, I: 10, S: 35, C: 54 },
    });

    assert.equal(result.book?.availability, null);
    assert.equal(result.metadata?.availabilityLookupEnabled, false);
    assert.equal(result.metadata?.availabilityChecks?.book?.consulted, false);
  } finally {
    process.env.DISC_RECOMMENDATION_AVAILABILITY_LOOKUP = previous;
  }
});
