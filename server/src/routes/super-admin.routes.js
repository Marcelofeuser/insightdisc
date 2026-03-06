import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireSuperAdmin } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth, attachUser, requireSuperAdmin);

async function safeQuery(label, queryFn, fallbackValue) {
  try {
    return await queryFn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[super-admin/overview] ${label} unavailable: ${error?.message || error}`);
    return fallbackValue;
  }
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

router.get('/overview', async (_req, res) => {
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
    credits: Number(user.credits?.[0]?.balance || 0),
    status: 'ativo',
  }));

  const latestReports = latestReportsRaw.map((report) => ({
    id: report.id,
    assessmentId: report.assessmentId,
    participant:
      report.assessment?.candidateName ||
      report.assessment?.candidateEmail ||
      'Participante sem nome',
    profile:
      report.discProfile?.profile?.key ||
      report.discProfile?.profileKey ||
      report.discProfile?.profile?.title ||
      '-',
    createdAt: report.createdAt,
    pdfUrl: report.pdfUrl || '',
    organization: report.assessment?.organization?.name || '-',
    publicLink: report.assessmentId ? `/Report?id=${report.assessmentId}` : '',
  }));

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
    creditsAvailable: Number(workspace.owner?.credits?.[0]?.balance || 0),
    brandingConfigured: Boolean(workspace.companyName && workspace.logoUrl),
    createdAt: workspace.createdAt,
  }));

  const latestAssessments = latestAssessmentsRaw.map((assessment) => ({
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
    pdfUrl: assessment.report?.pdfUrl || '',
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
