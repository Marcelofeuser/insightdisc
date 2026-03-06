import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import assessmentsRoutes from './routes/assessments.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import reportRoutes from './routes/report.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import healthRoutes from './routes/health.routes.js';
import brandingRoutes from './routes/branding.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/reports', express.static(path.resolve(__dirname, '../generated/reports')));
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/assessments', assessmentsRoutes);
  app.use('/assessment', assessmentRoutes);
  app.use('/candidate', candidateRoutes);
  app.use('/report', reportRoutes);
  app.use('/branding', brandingRoutes);
  app.use('/payments', paymentsRoutes);

  app.get('/', (_req, res) => {
    res.status(200).json({
      ok: true,
      name: 'InsightDISC API',
      env: env.nodeEnv,
      docs: {
        login: 'POST /auth/login',
        register: 'POST /auth/register',
        createAssessment: 'POST /assessments/create',
        generateLink: 'POST /assessments/generate-link',
        validateToken: 'GET /assessment/validate-token?token=...',
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
        getBranding: 'GET /branding/:workspaceId',
        saveBranding: 'PUT /branding/:workspaceId',
        uploadLogo: 'POST /branding/:workspaceId/logo',
        getReport: 'GET /report/:id',
        createCheckout: 'POST /payments/create-checkout',
      },
    });
  });

  app.use((error, _req, res, _next) => {
    res.status(500).json({ ok: false, error: error?.message || 'Erro interno.' });
  });

  return app;
}
