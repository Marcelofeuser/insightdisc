import { addPaymentRecord, findPaymentBySession, unlockAssessment } from '../_lib/dev-store.js';
import { readJsonBody, sendJson } from '../_lib/http.js';
import { signPublicReportToken } from '../_lib/public-report-token.js';
import { fetchStripeCheckoutSession } from '../_lib/stripe.js';

function getAssessmentId(payload = {}) {
  return (
    payload?.assessmentId ||
    payload?.metadata?.assessmentId ||
    ''
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const sessionId = body?.sessionId || body?.session_id;
    if (!sessionId) {
      return sendJson(res, 400, { ok: false, error: 'sessionId é obrigatório.' });
    }

    const mockPayment = await findPaymentBySession(sessionId);
    let paid = false;
    let amount = 0;
    let email = body?.email || '';
    let assessmentId = body?.assessmentId || '';
    let token = body?.token || '';
    let flow = body?.flow || '';

    if (mockPayment) {
      paid = true;
      amount = Number(mockPayment.amount || 0);
      email = mockPayment.email || email;
      assessmentId = mockPayment.assessmentId || assessmentId;
      token = mockPayment.token || token;
      flow = mockPayment.flow || flow;
    } else {
      const stripeSession = await fetchStripeCheckoutSession(sessionId).catch(() => null);
      if (stripeSession) {
        paid = stripeSession.payment_status === 'paid';
        amount = Number(stripeSession.amount_total || 0);
        email = stripeSession.customer_details?.email || stripeSession.customer_email || email;
        assessmentId = getAssessmentId({
          assessmentId,
          metadata: stripeSession.metadata || {},
        }) || assessmentId;
        token = String(stripeSession.metadata?.token || token || '');
        flow = String(stripeSession.metadata?.flow || flow || '');
      } else if (String(sessionId).startsWith('mock_')) {
        paid = true;
      }
    }

    if (!paid) {
      return sendJson(res, 400, { ok: false, error: 'Pagamento ainda não confirmado.' });
    }

    if (assessmentId) {
      await unlockAssessment({
        assessmentId,
        email,
        sessionId,
      });
    }

    await addPaymentRecord({
      sessionId,
      assessmentId,
      email,
      token,
      flow,
      amount,
      status: 'paid',
    });

    const publicToken = assessmentId
      ? signPublicReportToken({ assessmentId, scope: 'public-report' })
      : '';

    return sendJson(res, 200, {
      ok: true,
      sessionId,
      assessmentId,
      publicToken,
      token,
      flow,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Falha ao verificar checkout.',
    });
  }
}
