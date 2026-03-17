import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOSSIER_BASE_PATH,
  buildDossierPath,
  resolveDossierRouteContext,
} from '../../src/modules/dossier/routes.js';

test('buildDossierPath returns base path without params', () => {
  assert.equal(buildDossierPath(), DOSSIER_BASE_PATH);
});

test('buildDossierPath uses candidate id in the path and keeps extra query params', () => {
  assert.equal(
    buildDossierPath({
      candidateId: 'cand-123',
      assessmentId: 'assess-9',
      candidateName: 'Joao Silva',
      candidateEmail: 'joao@empresa.com',
    }),
    '/app/dossier/cand-123?assessmentId=assess-9&candidateName=Joao+Silva&candidateEmail=joao%40empresa.com',
  );
});

test('resolveDossierRouteContext accepts candidate id from params and assessment id from query', () => {
  const result = resolveDossierRouteContext({
    paramsCandidateId: 'cand-abc',
    searchParams: new URLSearchParams('assessmentId=assess-42'),
    locationState: null,
  });

  assert.deepEqual(result, {
    candidateId: 'cand-abc',
    assessmentId: 'assess-42',
    candidateName: '',
    candidateEmail: '',
  });
});

test('resolveDossierRouteContext falls back to query and location state', () => {
  const result = resolveDossierRouteContext({
    paramsCandidateId: '',
    searchParams: new URLSearchParams('candidateId=cand-query&candidateName=Maria'),
    locationState: {
      assessmentId: 'assess-state',
      candidateEmail: 'maria@empresa.com',
      candidate: {
        id: 'cand-state',
        name: 'Maria Souza',
      },
    },
  });

  assert.deepEqual(result, {
    candidateId: 'cand-query',
    assessmentId: 'assess-state',
    candidateName: 'Maria',
    candidateEmail: 'maria@empresa.com',
  });
});
