import { readJsonBody, sendJson } from '../_lib/http.js';
import { addPaymentRecord } from '../_lib/dev-store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const workspaceId = body?.workspaceId || body?.tenantId;
    const assessmentId = body?.assessmentId || '';
    const amount = Number(body?.amount || 1);
    const reason = body?.reason || 'report_export';

    if (!workspaceId) {
      return sendJson(res, 400, { ok: false, error: 'workspaceId é obrigatório.' });
    }

    await addPaymentRecord({
      sessionId: `credit_${Date.now()}`,
      assessmentId,
      email: '',
      amount: -Math.abs(amount),
      status: 'consumed',
      workspaceId,
      reason,
    });

    return sendJson(res, 200, {
      ok: true,
      workspaceId,
      consumed: Math.abs(amount),
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Falha ao consumir crédito.',
    });
  }
}
