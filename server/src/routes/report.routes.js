import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getRequestBaseUrl } from '../lib/request-base-url.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, canAccessOrganization, requireActiveCustomer } from '../middleware/rbac.js';
import { requireReportExport } from '../middleware/require-report-export.js';
import { buildPremiumReportModel } from '../modules/report/build-report.js';
import { generatePremiumPdf } from '../modules/report/generate-pdf.js';
import { renderReportHtml } from '../modules/report/render-report-html.js';

const router = Router();

function normalizeReportType(value) {
  return String(value || '').toLowerCase() === 'premium' ? 'premium' : 'standard';
}

router.get(
  '/:assessmentId/html',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  requireReportExport,
  async (req, res) => {
    try {
      const assetBaseUrl = getRequestBaseUrl(req);
      const assessment = await prisma.assessment.findUnique({
        where: { id: req.params.assessmentId },
        include: {
          report: true,
          creator: true,
          organization: { include: { owner: true } },
          quickContext: true,
        },
      });

      if (!assessment) {
        return res.status(404).json({ ok: false, error: 'Assessment não encontrado.' });
      }

      const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const reportModel = await buildPremiumReportModel({
        assessment,
        discResult: assessment.report?.discProfile || {},
        assetBaseUrl,
        currentUser: req.user || null,
        reportType: normalizeReportType(req.query?.type || req.query?.reportType),
      });
      const html = renderReportHtml({ assessment, reportModel });

      return res.status(200).json({ ok: true, html });
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      return res
        .status(status)
        .json({ ok: false, error: error?.message || 'Falha ao gerar HTML do relatório.' });
    }
  }
);

router.post(
  '/generate',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  requireReportExport,
  async (req, res) => {
    try {
      const assetBaseUrl = getRequestBaseUrl(req);
      const schema = z.object({
        assessmentId: z.string().min(1),
        reportType: z.enum(['standard', 'premium']).optional(),
      });
      const input = schema.parse(req.body || {});
      const reportType = normalizeReportType(input.reportType);

      const assessment = await prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        include: {
          report: true,
          creator: true,
          organization: { include: { owner: true } },
          quickContext: true,
        },
      });
      if (!assessment) {
        return res.status(404).json({ ok: false, error: 'Assessment não encontrado.' });
      }

      const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
      if (!allowed) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const reportModel = await buildPremiumReportModel({
        assessment,
        discResult: assessment.report?.discProfile || {},
        assetBaseUrl,
        currentUser: req.user || null,
        reportType,
      });

      console.info('[report/generate] generating report', {
        assessmentId: assessment.id,
        reportType,
        userId: req.auth.userId,
      });

      const pdf = await generatePremiumPdf(reportModel, assessment.id, assessment);

      const report = await prisma.report.upsert({
        where: { assessmentId: assessment.id },
        create: {
          assessmentId: assessment.id,
          discProfile: reportModel,
          pdfUrl: pdf.pdfUrl || null,
        },
        update: {
          discProfile: reportModel,
          pdfUrl: pdf.pdfUrl || null,
        },
      });

      console.info('[report/generate] report generated', {
        assessmentId: assessment.id,
        reportId: report.id,
        reportType,
      });

      return res.status(200).json({
        ok: true,
        report,
        html: pdf.html,
        pdfUrl: report.pdfUrl,
      });
    } catch (error) {
      const status = Number(error?.statusCode) || 400;
      return res.status(status).json({ ok: false, error: error?.message || 'Falha ao gerar relatório.' });
    }
  }
);

router.get('/:id', requireAuth, attachUser, requireActiveCustomer, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { assessment: true },
    });

    if (!report) {
      return res.status(404).json({ ok: false, error: 'Relatório não encontrado.' });
    }

    const allowed = await canAccessOrganization(req.auth.userId, report.assessment.organizationId);
    if (!allowed) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Falha ao carregar relatório.' });
  }
});

export default router;
