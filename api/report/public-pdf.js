import { verifyPublicReportToken } from '../_lib/public-report-token.js';
import { prisma } from '../../server/src/lib/prisma.js';
import { sendJson } from '../_lib/http.js';
import { buildPremiumReportModel } from '../../server/src/modules/report/build-report.js';
import { generatePremiumPdf } from '../../server/src/modules/report/generate-pdf.js';

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


    // Busca assessment real via Prisma
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        report: true,
        responses: true,
        organization: true,
        user: true,
      },
    });
    if (!assessment) {
      return sendJson(res, 404, { ok: false, error: 'Assessment não encontrado.' });
    }

    // Monta o modelo oficial
    const reportModel = await buildPremiumReportModel({
      assessment,
      discResult: assessment?.report?.discProfile || assessment?.results || {},
      assetBaseUrl: req.headers.origin || '',
      currentUser: null,
      reportType: 'premium',
    });

    // Gera o PDF oficial
    const pdf = await generatePremiumPdf(reportModel, assessmentId, assessment);
    const buffer = pdf?.pdfBuffer;
    if (!buffer || !buffer.length) {
      return sendJson(res, 503, { ok: false, error: 'PDF_UNAVAILABLE', message: 'Não foi possível gerar o PDF agora.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio_DISC_${assessmentId}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (error) {
    return sendJson(res, 401, {
      ok: false,
      error: error?.message || 'Token inválido.',
    });
  }
}
