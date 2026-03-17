export const DOSSIER_BASE_PATH = '/app/dossier';

function normalizeValue(value) {
  return String(value || '').trim();
}

function readSearchParam(searchParams, key) {
  if (!searchParams || !key) return '';

  if (typeof searchParams.get === 'function') {
    return normalizeValue(searchParams.get(key));
  }

  if (typeof searchParams === 'object') {
    return normalizeValue(searchParams[key]);
  }

  return '';
}

export function buildDossierPath({
  candidateId = '',
  assessmentId = '',
  candidateName = '',
  candidateEmail = '',
} = {}) {
  const normalizedCandidateId = normalizeValue(candidateId);
  const path = normalizedCandidateId
    ? `${DOSSIER_BASE_PATH}/${encodeURIComponent(normalizedCandidateId)}`
    : DOSSIER_BASE_PATH;

  const query = new URLSearchParams();
  const normalizedAssessmentId = normalizeValue(assessmentId);
  const normalizedCandidateName = normalizeValue(candidateName);
  const normalizedCandidateEmail = normalizeValue(candidateEmail);

  if (normalizedAssessmentId) query.set('assessmentId', normalizedAssessmentId);
  if (normalizedCandidateName) query.set('candidateName', normalizedCandidateName);
  if (normalizedCandidateEmail) query.set('candidateEmail', normalizedCandidateEmail);

  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function resolveDossierRouteContext({
  paramsCandidateId = '',
  searchParams = null,
  locationState = null,
} = {}) {
  const state = locationState && typeof locationState === 'object' ? locationState : {};
  const candidate = state.candidate && typeof state.candidate === 'object' ? state.candidate : {};
  const assessment = state.assessment && typeof state.assessment === 'object' ? state.assessment : {};

  return {
    candidateId:
      normalizeValue(paramsCandidateId) ||
      readSearchParam(searchParams, 'candidateId') ||
      normalizeValue(state.candidateId) ||
      normalizeValue(candidate.id),
    assessmentId:
      readSearchParam(searchParams, 'assessmentId') ||
      normalizeValue(state.assessmentId) ||
      normalizeValue(assessment.id),
    candidateName:
      readSearchParam(searchParams, 'candidateName') ||
      normalizeValue(state.candidateName) ||
      normalizeValue(candidate.name),
    candidateEmail:
      readSearchParam(searchParams, 'candidateEmail') ||
      normalizeValue(state.candidateEmail) ||
      normalizeValue(candidate.email),
  };
}
