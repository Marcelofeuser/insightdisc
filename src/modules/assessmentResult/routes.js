export function buildAssessmentResultPath(assessmentId = '') {
  const id = String(assessmentId || '').trim();
  if (!id) return '/assessments/unknown/result';
  return `/assessments/${encodeURIComponent(id)}/result`;
}

export function buildAssessmentResultAliasPath(assessmentId = '') {
  const id = String(assessmentId || '').trim();
  if (!id) return '/assessment/unknown/result';
  return `/assessment/${encodeURIComponent(id)}/result`;
}
