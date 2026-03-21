import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPublicAppBaseUrl } from '../lib/request-base-url.js';
import { signPublicReportToken } from '../lib/public-report-token.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireSuperAdmin } from '../middleware/rbac.js';
import { getUserCreditsBalance } from '../modules/auth/user-credits.js';
import { normalizeReportType, resolveStoredReportType } from '../modules/report/report-type.js';

const router = Router();
const PUBLIC_REPORT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

router.use(requireAuth, attachUser, requireSuperAdmin);

async function safeQuery(label, queryFn, fallbackValue) {
  try {
    return await queryFn();
  } catch (error) {
    console.warn(`[super-admin/overview] ${label} unavailable: ${error?.message || error}`);
    return fallbackValue;
  }
}

function issuePublicReportAccess({
  assessmentId,
  accountId = '',
  organizationId = '',
  reportType,
  appBaseUrl = '',
  ttlSeconds = PUBLIC_REPORT_TOKEN_TTL_SECONDS,
} = {}) {
  const normalizedAssessmentId = String(assessmentId || '').trim();
  const normalizedAccountId = String(accountId || organizationId || '').trim();
  const normalizedReportType = normalizeReportType(reportType);
  const normalizedBaseUrl = String(appBaseUrl || '').trim().replace(/\/+$/, '');
  const token = signPublicReportToken(
    {
      assessmentId: normalizedAssessmentId,
      id: normalizedAssessmentId,
      assessment_id: normalizedAssessmentId,
      accountId: normalizedAccountId,
      organizationId: normalizedAccountId,
      account_id: normalizedAccountId,
      reportType: normalizedReportType,
    },
    ttlSeconds,
  );
  const previewPath = `/c/report?token=${encodeURIComponent(token)}&type=${encodeURIComponent(normalizedReportType)}`;
  const pdfPath = `/api/report/pdf?token=${encodeURIComponent(token)}&type=${encodeURIComponent(normalizedReportType)}`;

  return {
    token,
    reportType: normalizedReportType,
    previewPath,
    pdfPath,
    previewUrl: normalizedBaseUrl ? `${normalizedBaseUrl}${previewPath}` : previewPath,
    pdfUrl: normalizedBaseUrl ? `${normalizedBaseUrl}${pdfPath}` : pdfPath,
  };
}

function mapPaymentPlan(creditsAdded = 0) {
  const value = Number(creditsAdded || 0);
  if (value === 10) return 'Pacote 10 créditos';
  if (value === 50) return 'Pacote 50 créditos';
  if (value === 100) return 'Pacote 100 créditos';
  return value > 0 ? `${value} créditos` : 'Plano não identificado';
}

router.get('/', async (req, res) => {
  return res.status(200).json({
    ok: true,
    scope: 'super_admin',
    user: {
      id: req.user?.id || req.auth?.userId || '',
      email: req.user?.email || req.auth?.email || '',
      role: req.user?.role || req.auth?.role || '',
      name: req.user?.name || '',
    },
  });
});

router.get('/overview', async (req, res) => {
  const appBaseUrl = getPublicAppBaseUrl(req);
  const toAbsoluteUrl = (rawPath = '') => {
    const normalized = String(rawPath || '').trim();
    if (!normalized) return '';
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `${appBaseUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  };

  const [usersTotal, assessmentsTotal, reportsTotal, leadsTotal, paymentsTotal, workspacesTotal] =
    await Promise.all([
      safeQuery('usersTotal', () => prisma.user.count(), 0),
      safeQuery('assessmentsTotal', () => prisma.assessment.count(), 0),
      safeQuery('reportsTotal', () => prisma.report.count(), 0),
      safeQuery('leadsTotal', () => prisma.lead.count(), 0),
      safeQuery('paymentsTotal', () => prisma.payment.count(), 0),
      safeQuery('workspacesTotal', () => prisma.organization.count(), 0),
    ]);

  const [paymentsApproved, revenueTotal, creditsPurchasedTotal, creditsBalanceTotal] =
    await Promise.all([
      safeQuery('paymentsApproved', () => prisma.payment.count({ where: { status: 'PAID' } }), 0),
      safeQuery(
        'revenueTotal',
        async () => Number((await prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }))?._sum?.amount || 0),
        0,
      ),
      safeQuery(
        'creditsPurchasedTotal',
        async () =>
          Number(
            (
              await prisma.payment.aggregate({
                where: { status: 'PAID' },
                _sum: { creditsAdded: true },
              })
            )?._sum?.creditsAdded || 0,
          ),
        0,
      ),
      safeQuery(
        'creditsBalanceTotal',
        async () => Number((await prisma.credit.aggregate({ _sum: { balance: true } }))?._sum?.balance || 0),
        0,
      ),
    ]);

  const [latestUsersRaw, latestReportsRaw, latestLeadsRaw, latestPaymentsRaw, latestWorkspacesRaw, latestAssessmentsRaw] =
    await Promise.all([
      safeQuery(
        'latestUsers',
        () =>
          prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              credits: true,
              memberships: { include: { organization: { select: { id: true, name: true } } } },
            },
          }),
        [],
      ),
      safeQuery(
        'latestReports',
        () =>
          prisma.report.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              assessment: {
                select: {
                  id: true,
                  organizationId: true,
                  candidateName: true,
                  candidateEmail: true,
                  createdAt: true,
                  organization: { select: { id: true, name: true } },
                },
              },
            },
          }),
        [],
      ),
      safeQuery(
        'latestLeads',
        () =>
          prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
          }),
        [],
      ),
      safeQuery(
        'latestPayments',
        () =>
          prisma.payment.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: { user: { select: { id: true, email: true, name: true } } },
          }),
        [],
      ),
      safeQuery(
        'latestWorkspaces',
        () =>
          prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: {
              owner: { select: { id: true, name: true, email: true, credits: true } },
              _count: { select: { memberships: true, assessments: true } },
            },
          }),
        [],
      ),
      safeQuery(
        'latestAssessments',
        () =>
          prisma.assessment.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              organizationId: true,
              candidateName: true,
              candidateEmail: true,
              status: true,
              createdAt: true,
              organization: { select: { id: true, name: true } },
              report: { select: { id: true, pdfUrl: true, discProfile: true, createdAt: true } },
            },
          }),
        [],
      ),
    ]);

  const latestUsers = latestUsersRaw.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    workspace: user.memberships?.[0]?.organization?.name || '-',
    credits: getUserCreditsBalance(user),
    status: 'ativo',
  }));

  const latestReports = latestReportsRaw.map((report) => {
    const assessmentId = String(report.assessmentId || '').trim();
    const publicAccess = issuePublicReportAccess({
      assessmentId,
      accountId: report.assessment?.organizationId || report.assessment?.organization?.id,
      reportType: resolveStoredReportType(report, 'business'),
      appBaseUrl,
    });

    return {
      id: report.id,
      reportId: report.id,
      assessmentId,
      participant:
        report.assessment?.candidateName ||
        report.assessment?.candidateEmail ||
        'Participante sem nome',
      candidateEmail: report.assessment?.candidateEmail || '',
      profile:
        report.discProfile?.profile?.key ||
        report.discProfile?.profileKey ||
        report.discProfile?.profile?.title ||
        '-',
      createdAt: report.createdAt,
      organization: report.assessment?.organization?.name || '-',
      reportType: publicAccess.reportType,
      previewPath: publicAccess.previewPath,
      previewUrl: publicAccess.previewUrl,
      publicLink: publicAccess.previewPath,
      publicUrl: publicAccess.previewUrl,
      pdfUrl: publicAccess.pdfUrl,
      pdfPath: publicAccess.pdfPath,
      pdfAbsoluteUrl: publicAccess.pdfUrl,
      hasStoredPdf: true,
    };
  });

  const latestLeads = latestLeadsRaw.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone || '',
    source: lead.source || 'chatbot',
    interest: lead.interest || '-',
    status: lead.status || 'new',
    createdAt: lead.createdAt,
    company: lead.company || '',
  }));

  const latestPayments = latestPaymentsRaw.map((payment) => ({
    id: payment.id,
    customerEmail: payment.user?.email || '-',
    customerName: payment.user?.name || '-',
    status: payment.status,
    amount: Number(payment.amount || 0),
    creditsAdded: Number(payment.creditsAdded || 0),
    plan: mapPaymentPlan(payment.creditsAdded),
    createdAt: payment.createdAt,
  }));

  const latestWorkspaces = latestWorkspacesRaw.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    ownerName: workspace.owner?.name || '-',
    ownerEmail: workspace.owner?.email || '-',
    usersCount: Number(workspace._count?.memberships || 0),
    assessmentsCount: Number(workspace._count?.assessments || 0),
    creditsAvailable: getUserCreditsBalance(workspace.owner),
    brandingConfigured: Boolean(workspace.companyName && workspace.logoUrl),
    createdAt: workspace.createdAt,
  }));

  const latestAssessments = latestAssessmentsRaw.map((assessment) => ({
    ...assessment,
    id: assessment.id,
    participant:
      assessment.candidateName || assessment.candidateEmail || 'Participante sem nome',
    status: assessment.status,
    organization: assessment.organization?.name || '-',
    createdAt: assessment.createdAt,
    profile:
      assessment.report?.discProfile?.profile?.key ||
      assessment.report?.discProfile?.profileKey ||
      assessment.report?.discProfile?.profile?.title ||
      '-',
    pdfUrl: issuePublicReportAccess({
      assessmentId: assessment.id,
      accountId: assessment.organizationId || assessment.organization?.id,
      reportType: resolveStoredReportType(assessment, 'business'),
      appBaseUrl,
    }).pdfUrl,
    reportId: assessment.report?.id || '',
  }));

  const creditsConsumed = Math.max(creditsPurchasedTotal - creditsBalanceTotal, 0);

  return res.status(200).json({
    ok: true,
    usersTotal,
    assessmentsTotal,
    reportsTotal,
    leadsTotal,
    paymentsTotal,
    paymentsApproved,
    revenueTotal,
    workspacesTotal,
    creditsConsumed,
    metrics: {
      users: usersTotal,
      organizations: workspacesTotal,
      assessments: assessmentsTotal,
      reports: reportsTotal,
      creditsConsumed,
      leads: leadsTotal,
      paymentsApproved,
      revenueTotal,
    },
    latestUsers,
    latestReports,
    latestLeads,
    latestPayments,
    latestWorkspaces,
    latestAssessments,
    monitor: {
      generatedAt: new Date().toISOString(),
      datasets: {
        users: latestUsers.length,
        reports: latestReports.length,
        leads: latestLeads.length,
        payments: latestPayments.length,
        workspaces: latestWorkspaces.length,
      },
    },
  });
});

export default router;
