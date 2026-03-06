import { readJsonBody, sendJson } from '../_lib/http.js';
import { signPublicReportToken } from '../_lib/public-report-token.js';
import { upsertAssessmentSnapshot } from '../_lib/dev-store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const assessmentId = body?.assessmentId;
    const assessmentSnapshot = body?.assessmentSnapshot || {};

    if (!assessmentId) {
      return sendJson(res, 400, { ok: false, error: 'assessmentId é obrigatório.' });
    }

    const token = signPublicReportToken({ assessmentId, scope: 'public-report' });

    await upsertAssessmentSnapshot(assessmentId, {
      ...assessmentSnapshot,
      id: assessmentId,
      public_share_token: token,
    });

    return sendJson(res, 200, { ok: true, token });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Falha ao criar token público.',
    });
  }
}
