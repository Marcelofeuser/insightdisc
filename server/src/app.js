import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { isOriginAllowed, sanitizeLogText, sendSafeJsonError } from './lib/http-security.js';
import { createConcurrencyLimiter, createIpRateLimiter } from './middleware/request-security.js';
import authRoutes from './routes/auth.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';
import assessmentsRoutes from './routes/assessments.routes.js';
import assessmentRoutes, { handlePublicReportPdf } from './routes/assessment.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import reportRoutes from './routes/report.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import healthRoutes from './routes/health.routes.js';
import brandingRoutes from './routes/branding.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import superAdminRoutes from './routes/super-admin.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import dossierRoutes from './routes/dossier.routes.js';
import teamMapRoutes from './routes/team-map.routes.js';
import profileComparisonRoutes from './routes/profile-comparison.routes.js';
import billingRoutes from './routes/billing.routes.js';
import campaignsRoutes from './routes/campaigns.routes.js';
import anamnesisRoutes from './routes/anamnesis.routes.js';
import saasRouter from './saas/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  const authLimiter = createIpRateLimiter({
    keyPrefix: 'auth',
    windowMs: 15 * 60 * 1000,
    maxRequests: 60,
    message: 'Muitas tentativas de autenticação. Tente novamente em instantes.',
  });
  const authLoginLimiter = createIpRateLimiter({
    keyPrefix: 'auth-login',
    windowMs: 15 * 60 * 1000,
    maxRequests: 12,
    message: 'Limite de tentativas de login excedido. Tente novamente em instantes.',
  });
  const aiLimiter = createIpRateLimiter({
    keyPrefix: 'ai',
    windowMs: 5 * 60 * 1000,
    maxRequests: 90,
    message: 'Limite de uso de IA excedido. Tente novamente em instantes.',
  });
  const reportLimiter = createIpRateLimiter({
    keyPrefix: 'report',
    windowMs: 10 * 60 * 1000,
    maxRequests: 120,
    message: 'Limite de geração de relatórios excedido. Tente novamente em instantes.',
  });
  const aiConcurrencyLimiter = createConcurrencyLimiter({
    maxConcurrent: 12,
    maxQueue: 120,
    errorCode: 'AI_SERVER_BUSY',
    message: 'Fila de IA temporariamente cheia. Tente novamente em instantes.',
  });
  const reportConcurrencyLimiter = createConcurrencyLimiter({
    maxConcurrent: 3,
    maxQueue: 120,
    errorCode: 'REPORT_SERVER_BUSY',
    message: 'Fila de geração de relatórios temporariamente cheia. Tente novamente em instantes.',
  });
  const corsOptions = {
    origin(origin, callback) {
      if (isOriginAllowed(origin, env.corsAllowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-insight-user-email'],
    optionsSuccessStatus: 204,
    maxAge: 600,
  };

  function shouldThrottleHeavyReportRoute(req) {
    const currentPath = String(req.path || '').trim().toLowerCase();
    return (
      currentPath.startsWith('/generate') ||
      currentPath.startsWith('/generate-disc-report') ||
      currentPath.startsWith('/auto-generate-disc') ||
      currentPath.endsWith('/pdf')
    );
  }

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'https:', 'http:'],
          fontSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
  app.use('/auth', authLimiter);
  app.use('/auth/login', authLoginLimiter);
  app.use('/auth/super-admin-login', authLoginLimiter);
  app.use('/candidate', authLimiter);
  app.use('/candidate/login', authLoginLimiter);
  app.use('/candidate/register', authLoginLimiter);
  app.use('/ai', aiLimiter, aiConcurrencyLimiter);
  app.use('/report', reportLimiter, (req, res, next) => {
    if (!shouldThrottleHeavyReportRoute(req)) {
      return next();
    }

    return reportConcurrencyLimiter(req, res, next);
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  app.use('/brand', express.static(path.resolve(__dirname, '../../public/brand')));
  app.use('/report-assets', express.static(path.resolve(__dirname, '../../public/report-assets')));
  app.use('/reports', express.static(path.resolve(__dirname, '../generated/reports')));
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.use('/health', healthRoutes);
  app.use('/ai', aiRoutes);
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/assessments', assessmentsRoutes);
  app.use('/assessment', assessmentRoutes);
  app.get('/api/report/pdf', handlePublicReportPdf);
  app.use('/candidate', candidateRoutes);
  app.use('/report', reportRoutes);
  app.use('/branding', brandingRoutes);
  app.use('/payments', paymentsRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/jobs', jobsRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/dossier', dossierRoutes);
  app.use('/api/campaigns', campaignsRoutes);
  app.use('/api/anamnesis', anamnesisRoutes);
  app.use('/saas', saasRouter);
  app.use('/api/team-map', teamMapRoutes);
  app.use('/api/profile-comparison', profileComparisonRoutes);
  app.use('/billing', billingRoutes);
  app.use('/super-admin', superAdminRoutes);

  app.get('/', (_req, res) => {
    res.status(200).json({
      ok: true,
      name: 'InsightDISC API',
      env: env.nodeEnv,
      docs: {
        login: 'POST /auth/login',
        aiDiscInsights: 'POST /ai/disc-insights',
        aiReportPreview: 'POST /ai/report-preview',
        aiCoach: 'POST /ai/coach',
        register: 'POST /auth/register',
        createAssessment: 'POST /assessments/create',
        generateLink: 'POST /assessments/generate-link',
        validateToken: 'GET /assessment/validate-token?token=...',
        publicToken: 'GET /assessment/public-token/:id',
        reportPdfByToken: 'GET /api/report/pdf?token=...',
        publicReportPdf: 'GET /assessment/public-report-pdf?token=...',
        consumeInvite: 'POST /assessment/consume',
        submitAssessment: 'POST /assessment/submit',
        reportByToken: 'GET /assessment/report-by-token?token=...',
        candidateRegister: 'POST /candidate/register',
        candidateLogin: 'POST /candidate/login',
        claimCandidate: 'POST /candidate/claim',
        claimCandidateReport: 'POST /candidate/claim-report',
        candidateReportsLegacy: 'GET /candidate/reports',
        candidateReports: 'GET /candidate/me/reports',
        reportHtml: 'GET /report/:assessmentId/html',
        generateReport: 'POST /report/generate',
        generateDiscReport: 'GET /report/generate-disc-report?mode=business&useAi=true',
        getBranding: 'GET /branding/:workspaceId',
        saveBranding: 'PUT /branding/:workspaceId',
        uploadLogo: 'POST /branding/:workspaceId/logo',
        listJobs: 'GET /jobs',
        createJob: 'POST /jobs',
        getReport: 'GET /report/:id',
        createCheckout: 'POST /payments/create-checkout',
        confirmCheckout: 'POST /payments/confirm',
        billingPlans: 'GET /billing/plans',
        billingPortal: 'POST /billing/portal',
        billingChangePlan: 'POST /billing/change-plan',
        createLead: 'POST /api/leads',
        listLeads: 'GET /api/leads',
        exportLeadsCsv: 'GET /api/leads/export/csv',
        teamMapAssessments: 'GET /api/team-map/assessments',
        teamMapAnalyze: 'POST /api/team-map/analyze',
        profileComparisonAssessments: 'GET /api/profile-comparison/assessments',
        profileComparisonCompare: 'POST /api/profile-comparison/compare',
        dossierByCandidate: 'GET /api/dossier/:candidateId',
        dossierCreateNote: 'POST /api/dossier/:candidateId/note',
        dossierCreateInsight: 'POST /api/dossier/:candidateId/insight',
        dossierCreatePlan: 'POST /api/dossier/:candidateId/plan',
        dossierCreateReminder: 'POST /api/dossier/:candidateId/reminder',
        dossierRemindersSummary: 'GET /api/dossier/reminders/summary',
        superAdminLogin: 'POST /auth/super-admin-login',
        superAdminSession: 'GET /auth/super-admin/me',
        superAdminOverview: 'GET /super-admin/overview',
      },
    });
  });

  app.use((error, _req, res, _next) => {
    const code = String(error?.message || error?.code || '').trim().toUpperCase();

    if (code.includes('CORS_NOT_ALLOWED')) {
      return sendSafeJsonError(res, {
        status: 403,
        error: 'CORS_NOT_ALLOWED',
        message: 'Origem não permitida.',
      });
    }

    if (error?.type === 'entity.too.large') {
      return sendSafeJsonError(res, {
        status: 413,
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Payload excede o tamanho permitido.',
      });
    }

    if (error instanceof SyntaxError && String(error?.message || '').toLowerCase().includes('json')) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_JSON',
        message: 'JSON inválido.',
      });
    }

    // eslint-disable-next-line no-console
    console.error('[app/error]', {
      message: sanitizeLogText(error?.message || error),
      code: sanitizeLogText(error?.code || 'INTERNAL_ERROR', 64),
    });

    return sendSafeJsonError(res, {
      status: 500,
      error: 'INTERNAL_ERROR',
      message: 'Erro interno.',
    });
  });

  return app;
}
