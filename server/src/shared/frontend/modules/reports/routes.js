export function buildAssessmentReportPath(assessmentId = '') {
  const id = String(assessmentId || '').trim();
  if (!id) return '/assessments/unknown/report';
  return `/assessments/${encodeURIComponent(id)}/report`;
}

export function buildAssessmentReportAliasPath(assessmentId = '') {
  const id = String(assessmentId || '').trim();
  if (!id) return '/assessment/unknown/report';
  return `/assessment/${encodeURIComponent(id)}/report`;
}

export function buildReportByIdPath(assessmentId = '') {
  const id = String(assessmentId || '').trim();
  if (!id) return '/reports/unknown';
  return `/reports/${encodeURIComponent(id)}`;
}
