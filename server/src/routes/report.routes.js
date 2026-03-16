import { existsSync } from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { sendSafeJsonError } from '../lib/http-security.js';
import { prisma } from '../lib/prisma.js';
import { getRequestBaseUrl } from '../lib/request-base-url.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, canAccessOrganization, requireActiveCustomer } from '../middleware/rbac.js';
import { requireReportExport } from '../middleware/require-report-export.js';
import { buildPremiumReportModel } from '../modules/report/build-report.js';
import { generateAssessmentReportPdf } from '../modules/report-export/generate-assessment-report-pdf.js';
import { generatePremiumPdf } from '../modules/report/generate-pdf.js';
import { renderReportHtml } from '../modules/report/render-report-html.js';
import { gerarRelatorio, normalizeMode as normalizeDiscMode } from '../services/reportGenerator.js';

const router = Router();

function normalizeReportType(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === 'business') return 'premium';
  if (normalized === 'professional') return 'professional';
  if (normalized === 'premium') return 'premium';
  return 'standard';
}

const reportGenerateSchema = z.object({
  assessmentId: z.string().min(1),
  reportType: z.enum(['standard', 'premium', 'professional', 'business']).optional(),
});

const reportGenerateGetSchema = z.object({
  assessmentId: z.string().trim().optional(),
  reportType: z.enum(['standard', 'premium', 'professional', 'business']).optional(),
});

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }

  return value;
}, z.boolean());

const discReportGetSchema = z.object({
  mode: z.enum(['personal', 'professional', 'business']).optional(),
  d: z.coerce.number().optional(),
  i: z.coerce.number().optional(),
  s: z.coerce.number().optional(),
  c: z.coerce.number().optional(),
  nome: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  empresa: z.string().trim().optional(),
  data: z.string().trim().optional(),
  useAi: booleanLikeSchema.optional(),
});

const discReportPostSchema = z.object({
  D: z.coerce.number(),
  I: z.coerce.number(),
  S: z.coerce.number(),
  C: z.coerce.number(),
  mode: z.enum(['personal', 'professional', 'business']).optional(),
  nome: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  empresa: z.string().trim().optional(),
  data: z.string().trim().optional(),
  download: z.boolean().optional(),
  useAi: booleanLikeSchema.optional(),
});

function ensureDiscDevRouteEnabled(res) {
  if (env.nodeEnv === 'production') {
    sendSafeJsonError(res, {
      status: 403,
      error: 'DISC_ROUTE_DISABLED_IN_PRODUCTION',
      message: 'A rota de geração DISC sem autenticação fica disponível apenas para desenvolvimento local.',
    });
    return false;
  }

  return true;
}

function buildDiscDownloadUrl(baseUrl, input) {
  const query = new URLSearchParams({
    mode: normalizeDiscMode(input.mode),
    d: String(input.D),
    i: String(input.I),
    s: String(input.S),
    c: String(input.C),
  });

  if (input.nome) query.set('nome', input.nome);
  if (input.cargo) query.set('cargo', input.cargo);
  if (input.empresa) query.set('empresa', input.empresa);
  if (input.data) query.set('data', input.data);
  if (input.useAi) query.set('useAi', 'true');

  return `${baseUrl}/report/generate-disc-report?${query.toString()}`;
}

function cleanupGeneratedArtifact(generated) {
  if (typeof generated?.cleanup !== 'function') return;

  try {
    generated.cleanup();
  } catch (error) {
    console.warn('[report/disc] cleanup failed', {
      error: String(error?.message || error).slice(0, 240),
    });
  }
}

function sendGeneratedDiscPdf(res, generated) {
  if (!existsSync(generated?.pdfPath || '')) {
    cleanupGeneratedArtifact(generated);
    return res.status(500).json({
      ok: false,
      error: 'PDF_NOT_GENERATED',
    });
  }

  console.info('[disc-report] sending pdf to client', {
    pdf: generated.pdf,
    pdfPath: generated.pdfPath,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${generated.pdf}"`);

  return res.sendFile(generated.pdfPath, (error) => {
    cleanupGeneratedArtifact(generated);

    if (!error) return;

    console.warn('[disc-report] failed to send pdf', {
      pdfPath: generated.pdfPath,
      error: String(error?.message || error).slice(0, 240),
    });

    if (!res.headersSent) {
      res.status(error.statusCode || 500).json({
        ok: false,
        error: 'DISC_REPORT_DOWNLOAD_FAILED',
      });
    }
  });
}

async function resolveAssessmentIdForGeneration({ assessmentId, req }) {
  const normalizedAssessmentId = String(assessmentId || '').trim();
  if (normalizedAssessmentId) return normalizedAssessmentId;

  const userRole = String(req.user?.role || '').trim().toUpperCase();
  const whereClause =
    userRole === 'SUPER_ADMIN'
      ? {}
      : {
          OR: [{ createdBy: req.auth.userId }, { candidateUserId: req.auth.userId }],
        };

  const fallback = await prisma.assessment.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (fallback?.id) return fallback.id;

  const error = new Error('ASSESSMENT_ID_REQUIRED');
  error.statusCode = 400;
  throw error;
}

async function generateReportPayload({ assessmentId, reportType, req }) {
  const assetBaseUrl = getRequestBaseUrl(req);
  const normalizedReportType = normalizeReportType(reportType);
  const resolvedAssessmentId = await resolveAssessmentIdForGeneration({ assessmentId, req });
  const assessment = await prisma.assessment.findUnique({
    where: { id: resolvedAssessmentId },
    include: {
      report: true,
      creator: true,
      organization: { include: { owner: true } },
      quickContext: true,
    },
  });
  if (!assessment) {
    const error = new Error('Assessment não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
  if (!allowed) {
    const error = new Error('FORBIDDEN');
    error.statusCode = 403;
    throw error;
  }

  const reportModel = await buildPremiumReportModel({
    assessment,
    discResult: assessment.report?.discProfile || {},
    assetBaseUrl,
    currentUser: req.user || null,
    reportType: normalizedReportType,
  });

  console.info('[report/generate] generating report', {
    assessmentId: assessment.id,
    reportType: normalizedReportType,
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
    reportType: normalizedReportType,
  });

  return {
    report,
    html: pdf.html,
    pdfUrl: report.pdfUrl,
  };
}

router.get('/generate-disc-report', async (req, res) => {
  if (!ensureDiscDevRouteEnabled(res)) return;

  try {
    const input = discReportGetSchema.parse(req.query || {});
    const generated = await gerarRelatorio({
      mode: input.mode,
      scores: {
        D: input.d,
        I: input.i,
        S: input.s,
        C: input.c,
      },
      payload: {
        nome: input.nome,
        cargo: input.cargo,
        empresa: input.empresa,
        data: input.data,
      },
      useAi: input.useAi,
    });

    return sendGeneratedDiscPdf(res, generated);
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 400,
      error: 'DISC_REPORT_GENERATION_FAILED',
      message: 'Falha ao gerar relatório DISC.',
    });
  }
});

router.post('/auto-generate-disc', async (req, res) => {
  if (!ensureDiscDevRouteEnabled(res)) return;

  try {
    const input = discReportPostSchema.parse(req.body || {});
    const generated = await gerarRelatorio({
      mode: input.mode,
      scores: {
        D: input.D,
        I: input.I,
        S: input.S,
        C: input.C,
      },
      payload: {
        nome: input.nome,
        cargo: input.cargo,
        empresa: input.empresa,
        data: input.data,
      },
      useAi: input.useAi,
    });

    const shouldDownload =
      input.download === true || String(req.query?.download || '').trim().toLowerCase() === 'true';

    if (shouldDownload) {
      return sendGeneratedDiscPdf(res, generated);
    }

    const baseUrl = getRequestBaseUrl(req);
    return res.status(200).json({
      ok: true,
      mode: generated.mode,
      html: generated.html,
      pdf: generated.pdf,
      htmlPath: generated.htmlPath,
      pdfPath: generated.pdfPath,
      ai: generated.ai,
      downloadUrl: buildDiscDownloadUrl(baseUrl, input),
    });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 400,
      error: 'DISC_REPORT_AUTO_GENERATION_FAILED',
      message: 'Falha ao gerar relatório DISC automaticamente.',
    });
  }
});

router.get(
  '/generate',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  requireReportExport,
  async (req, res) => {
    try {
      const input = reportGenerateGetSchema.parse(req.query || {});
      const payload = await generateReportPayload({
        assessmentId: input.assessmentId,
        reportType: input.reportType,
        req,
      });
      return res.status(200).json({ ok: true, ...payload });
    } catch (error) {
      const status = Number(error?.statusCode) || 400;
      return sendSafeJsonError(res, {
        status,
        error: status === 403 ? 'FORBIDDEN' : 'REPORT_GENERATION_FAILED',
        message: 'Falha ao gerar relatório.',
      });
    }
  },
);

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
        return sendSafeJsonError(res, {
          status: 404,
          error: 'NOT_FOUND',
          message: 'Assessment não encontrado.',
        });
      }

      const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
      if (!allowed) {
        return sendSafeJsonError(res, {
          status: 403,
          error: 'FORBIDDEN',
          message: 'Acesso negado.',
        });
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
      return sendSafeJsonError(res, {
        status,
        error: status === 403 ? 'FORBIDDEN' : 'REPORT_HTML_FAILED',
        message: 'Falha ao gerar HTML do relatório.',
      });
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
      const input = reportGenerateSchema.parse(req.body || {});
      const payload = await generateReportPayload({
        assessmentId: input.assessmentId,
        reportType: input.reportType,
        req,
      });
      return res.status(200).json({ ok: true, ...payload });
    } catch (error) {
      const status = Number(error?.statusCode) || 400;
      return sendSafeJsonError(res, {
        status,
        error: status === 403 ? 'FORBIDDEN' : 'REPORT_GENERATION_FAILED',
        message: 'Falha ao gerar relatório.',
      });
    }
  }
);

router.get(
  '/:assessmentId/pdf',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  requireReportExport,
  async (req, res) => {
    try {
      const assessmentId = String(req.params.assessmentId || '').trim();
      if (!assessmentId) {
        return res.status(400).json({
          ok: false,
          reason: 'ASSESSMENT_ID_REQUIRED',
          message: 'assessmentId é obrigatório para exportar o PDF.',
        });
      }

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          report: true,
          creator: true,
          organization: { include: { owner: true } },
          quickContext: true,
        },
      });

      if (!assessment) {
        return res.status(404).json({ ok: false, reason: 'NOT_FOUND', message: 'Assessment não encontrado.' });
      }

      const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
      if (!allowed) {
        return res.status(403).json({ ok: false, reason: 'FORBIDDEN', message: 'Sem permissão para exportar este PDF.' });
      }

      const generated = await generateAssessmentReportPdf({ assessment });
      const buffer = generated?.pdfBuffer;
      if (!buffer || !buffer.length) {
        return res.status(503).json({
          ok: false,
          reason: 'PDF_UNAVAILABLE',
          message: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${generated.fileName}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(buffer);
    } catch (error) {
      const status = Number(error?.statusCode) || 500;
      return sendSafeJsonError(res, {
        status,
        error: status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'REPORT_EXPORT_FAILED',
        message: 'Não foi possível exportar o PDF do relatório oficial no momento.',
      });
    }
  },
);

router.get('/:id', requireAuth, attachUser, requireActiveCustomer, async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { assessment: true },
    });

    if (!report) {
      return sendSafeJsonError(res, {
        status: 404,
        error: 'NOT_FOUND',
        message: 'Relatório não encontrado.',
      });
    }

    const allowed = await canAccessOrganization(req.auth.userId, report.assessment.organizationId);
    if (!allowed) {
      return sendSafeJsonError(res, {
        status: 403,
        error: 'FORBIDDEN',
        message: 'Acesso negado.',
      });
    }

    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 500,
      error: 'REPORT_LOAD_FAILED',
      message: 'Falha ao carregar relatório.',
    });
  }
});

export default router;
