import { getAssessmentSnapshot } from '../_lib/dev-store.js';
import { sendJson } from '../_lib/http.js';
import { verifyPublicReportToken } from '../_lib/public-report-token.js';

function sanitizeAssessment(assessment = {}) {
  return {
    id: assessment?.id || '',
    created_date: assessment?.created_date || null,
    completed_at: assessment?.completed_at || null,
    dominant_factor: assessment?.dominant_factor || assessment?.results?.dominant_factor || null,
    natural_profile: assessment?.natural_profile || assessment?.results?.natural_profile || null,
    adapted_profile: assessment?.adapted_profile || assessment?.results?.adapted_profile || null,
    report_unlocked: Boolean(assessment?.report_unlocked),
    unlocked_tier: assessment?.unlocked_tier || null,
    results: assessment?.results || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const token = req?.query?.token || req?.query?.t;
    const payload = verifyPublicReportToken(token);
    const assessmentId = payload?.assessmentId;

    if (!assessmentId) {
      return sendJson(res, 400, { ok: false, error: 'Token sem assessmentId.' });
    }

    const assessment = await getAssessmentSnapshot(assessmentId);
    if (!assessment) {
      return sendJson(res, 404, { ok: false, error: 'Assessment não encontrado.' });
    }

    return sendJson(res, 200, {
      ok: true,
      assessment: sanitizeAssessment(assessment),
    });
  } catch (error) {
    return sendJson(res, 401, {
      ok: false,
      error: error?.message || 'Token inválido.',
    });
  }
}
