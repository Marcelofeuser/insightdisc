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
import leadsRoutes from './routes/leads.routes.js';
import superAdminRoutes from './routes/super-admin.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import dossierRoutes from './routes/dossier.routes.js';
import anamnesisRoutes from './routes/anamnesis.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = process.env.VERCEL
  ? '/tmp/insightdisc-reports'
  : path.resolve(__dirname, '../generated/reports');

export function createApp() {
  const app = express();

  app.set('trust proxy', true);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/brand', express.static(path.resolve(__dirname, '../../public/brand')));
  app.use('/report-assets', express.static(path.resolve(__dirname, '../../public/report-assets')));
  app.use('/reports', express.static(REPORTS_DIR));
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
  app.use('/jobs', jobsRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/dossier', dossierRoutes);
  app.use('/api/anamnesis', anamnesisRoutes);
  app.use('/super-admin', superAdminRoutes);

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
        reportPdfByToken: 'GET /assessment/report-pdf-by-token?token=...',
        consumeInvite: 'POST /assessment/consume',
        submitAssessment: 'POST /assessment/submit',
        reportByToken: 'GET /assessment/report-by-token?token=...',
        reportData: 'GET /assessment/report-data?id=...',
        assessmentHistory: 'GET /assessment/history',
        generateAssessmentReport: 'POST /assessment/generate-report',
        reportPdf: 'GET /assessment/report-pdf?assessmentId=...&type=standard|premium',
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
        listJobs: 'GET /jobs',
        createJob: 'POST /jobs',
        getReport: 'GET /report/:id',
        createCheckout: 'POST /payments/create-checkout',
        confirmCheckout: 'POST /payments/confirm',
        createLead: 'POST /api/leads',
        listLeads: 'GET /api/leads',
        exportLeadsCsv: 'GET /api/leads/export/csv',
        dossierByCandidate: 'GET /api/dossier/:candidateId',
        dossierCreateNote: 'POST /api/dossier/:candidateId/note',
        dossierCreateInsight: 'POST /api/dossier/:candidateId/insight',
        dossierCreatePlan: 'POST /api/dossier/:candidateId/plan',
        dossierCreateReminder: 'POST /api/dossier/:candidateId/reminder',
        dossierRemindersSummary: 'GET /api/dossier/reminders/summary',
        quickContextSave: 'POST /api/anamnesis/quick',
        quickContextFetch: 'GET /api/anamnesis/quick/:assessmentId',
        dossierAnamnesisSave: 'POST /api/dossier/anamnesis/save',
        dossierAnamnesisFetch: 'GET /api/dossier/anamnesis/:assessmentId',
        superAdminLogin: 'POST /auth/super-admin-login',
        superAdminSession: 'GET /auth/super-admin/me',
        superAdminOverview: 'GET /super-admin/overview',
      },
    });
  });

  app.use((error, _req, res, _next) => {
    res.status(500).json({ ok: false, error: error?.message || 'Erro interno.' });
  });

  return app;
}

const app = createApp();

export default app;
