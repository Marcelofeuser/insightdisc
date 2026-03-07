import { prisma } from '../../lib/prisma.js';
import { canManageOrganization } from '../../middleware/rbac.js';
import { isSuperAdminUser } from '../auth/super-admin-access.js';

const REQUIRED_DOSSIER_DELEGATES = [
  'behavioralDossier',
  'dossierNote',
  'dossierInsight',
  'developmentPlan',
  'reassessmentReminder',
];

function serviceError(code, message = code) {
  const error = new Error(message);
  error.code = String(code || 'DOSSIER_SERVICE_ERROR').toUpperCase();
  return error;
}

function assertDossierClient() {
  for (const delegate of REQUIRED_DOSSIER_DELEGATES) {
    if (!prisma[delegate]) {
      throw serviceError(
        'DOSSIER_PRISMA_CLIENT_OUTDATED',
        `Prisma delegate "${delegate}" não está disponível. Execute prisma generate.`,
      );
    }
  }
}

function normalizeRequiredId(value, code) {
  const normalized = String(value || '').trim();
  if (!normalized) throw serviceError(code);
  return normalized;
}

function monthRange(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export async function resolveWorkspaceId({
  userId,
  requestedWorkspaceId = '',
  authUser = {},
}) {
  const normalizedUserId = normalizeRequiredId(userId, 'UNAUTHORIZED');
  const requested = String(requestedWorkspaceId || '').trim();
  const isSuperAdmin = isSuperAdminUser(authUser || {});

  if (requested) {
    const allowed = await canManageOrganization(normalizedUserId, requested);
    if (allowed) return requested;
    throw serviceError('FORBIDDEN_WORKSPACE');
  }

  const owned = await prisma.organization.findFirst({
    where: { ownerId: normalizedUserId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (owned?.id) return owned.id;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: normalizedUserId },
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true },
  });
  if (membership?.organizationId) return membership.organizationId;

  if (isSuperAdmin) {
    const firstOrg = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (firstOrg?.id) return firstOrg.id;
  }

  throw serviceError('WORKSPACE_NOT_FOUND');
}

async function ensureCandidate(candidateId) {
  const normalizedCandidateId = normalizeRequiredId(candidateId, 'CANDIDATE_ID_REQUIRED');
  const candidate = await prisma.user.findUnique({
    where: { id: normalizedCandidateId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!candidate) throw serviceError('CANDIDATE_NOT_FOUND');
  return candidate;
}

function normalizeDateValue(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw serviceError('INVALID_REMINDER_DATE');
  }
  return date;
}

async function listAssessmentsHistory({ candidate, workspaceId }) {
  const candidateEmail = String(candidate?.email || '').trim();
  const where = {
    organizationId: workspaceId,
    OR: candidateEmail
      ? [{ candidateUserId: candidate.id }, { candidateEmail }]
      : [{ candidateUserId: candidate.id }],
  };

  const assessments = await prisma.assessment.findMany({
    where,
    include: {
      report: {
        select: {
          id: true,
          discProfile: true,
          pdfUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return (assessments || []).map((assessment) => {
    const disc = assessment?.report?.discProfile || {};
    const profileKey =
      String(disc?.profile?.key || disc?.profileKey || disc?.profile?.primary || '').trim() || null;
    const natural = disc?.scores?.natural || null;

    return {
      id: assessment.id,
      status: assessment.status,
      candidateName: assessment.candidateName,
      candidateEmail: assessment.candidateEmail,
      createdAt: assessment.createdAt,
      completedAt: assessment.completedAt,
      reportId: assessment?.report?.id || null,
      reportPdfUrl: assessment?.report?.pdfUrl || null,
      profileKey,
      natural,
    };
  });
}

function buildOverview({ assessmentsHistory = [], reminders = [] }) {
  const latest = assessmentsHistory[0] || null;
  const { start, end } = monthRange(new Date());
  const remindersThisMonth = reminders.filter((item) => {
    const date = new Date(item.date);
    return date >= start && date < end;
  });

  return {
    currentProfile: latest?.profileKey || null,
    lastAssessmentAt: latest?.completedAt || latest?.createdAt || null,
    assessmentsCount: assessmentsHistory.length,
    remindersCount: reminders.length,
    remindersThisMonth: remindersThisMonth.length,
  };
}

async function loadDossierSnapshot({ candidate, workspaceId }) {
  assertDossierClient();

  const dossier = await prisma.behavioralDossier.findUnique({
    where: {
      candidateId_workspaceId: {
        candidateId: candidate.id,
        workspaceId,
      },
    },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      insights: { orderBy: { createdAt: 'desc' } },
      plans: { orderBy: { createdAt: 'desc' } },
      reminders: { orderBy: { date: 'asc' } },
    },
  });

  if (!dossier) {
    throw serviceError('DOSSIER_NOT_FOUND');
  }

  const assessmentsHistory = await listAssessmentsHistory({ candidate, workspaceId });
  const overview = buildOverview({ assessmentsHistory, reminders: dossier.reminders || [] });

  return {
    workspaceId,
    candidate,
    dossier,
    assessmentsHistory,
    overview,
  };
}

export async function getOrCreateDossier(candidateId, workspaceId, createdBy) {
  assertDossierClient();
  const normalizedCandidateId = normalizeRequiredId(candidateId, 'CANDIDATE_ID_REQUIRED');
  const normalizedWorkspaceId = normalizeRequiredId(workspaceId, 'WORKSPACE_ID_REQUIRED');
  const normalizedCreatedBy = normalizeRequiredId(createdBy, 'CREATED_BY_REQUIRED');

  return prisma.behavioralDossier.upsert({
    where: {
      candidateId_workspaceId: {
        candidateId: normalizedCandidateId,
        workspaceId: normalizedWorkspaceId,
      },
    },
    update: {},
    create: {
      candidateId: normalizedCandidateId,
      workspaceId: normalizedWorkspaceId,
      createdBy: normalizedCreatedBy,
    },
    select: {
      id: true,
      candidateId: true,
      workspaceId: true,
      createdBy: true,
    },
  });
}

export async function getDossierByCandidate(candidateId, workspaceId, createdBy = '') {
  const candidate = await ensureCandidate(candidateId);
  const authorId = String(createdBy || '').trim() || candidate.id;
  await getOrCreateDossier(candidate.id, workspaceId, authorId);
  return loadDossierSnapshot({ candidate, workspaceId });
}

export async function addDossierNote(candidateId, workspaceId, authorId, content) {
  const candidate = await ensureCandidate(candidateId);
  const normalizedAuthor = normalizeRequiredId(authorId, 'AUTHOR_ID_REQUIRED');
  const normalizedContent = String(content || '').trim();
  if (!normalizedContent) throw serviceError('NOTE_CONTENT_REQUIRED');

  const dossier = await getOrCreateDossier(candidate.id, workspaceId, normalizedAuthor);
  const createdNote = await prisma.dossierNote.create({
    data: {
      dossierId: dossier.id,
      authorId: normalizedAuthor,
      content: normalizedContent,
    },
  });

  const snapshot = await loadDossierSnapshot({ candidate, workspaceId });
  return { ...snapshot, createdNote };
}

export async function addDossierInsight(candidateId, workspaceId, authorId, insight) {
  const candidate = await ensureCandidate(candidateId);
  const normalizedAuthor = normalizeRequiredId(authorId, 'AUTHOR_ID_REQUIRED');
  const normalizedInsight = String(insight || '').trim();
  if (!normalizedInsight) throw serviceError('INSIGHT_CONTENT_REQUIRED');

  const dossier = await getOrCreateDossier(candidate.id, workspaceId, normalizedAuthor);
  const createdInsight = await prisma.dossierInsight.create({
    data: {
      dossierId: dossier.id,
      authorId: normalizedAuthor,
      insight: normalizedInsight,
    },
  });

  const snapshot = await loadDossierSnapshot({ candidate, workspaceId });
  return { ...snapshot, createdInsight };
}

export async function addDevelopmentPlan(candidateId, workspaceId, goal, description, authorId = '') {
  const candidate = await ensureCandidate(candidateId);
  const normalizedGoal = String(goal || '').trim();
  const normalizedDescription = String(description || '').trim();
  if (!normalizedGoal) throw serviceError('PLAN_GOAL_REQUIRED');
  if (!normalizedDescription) throw serviceError('PLAN_DESCRIPTION_REQUIRED');

  const dossier = await getOrCreateDossier(candidate.id, workspaceId, String(authorId || candidate.id));
  const createdPlan = await prisma.developmentPlan.create({
    data: {
      dossierId: dossier.id,
      goal: normalizedGoal,
      description: normalizedDescription,
    },
  });

  const snapshot = await loadDossierSnapshot({ candidate, workspaceId });
  return { ...snapshot, createdPlan };
}

export async function addReassessmentReminder(candidateId, workspaceId, date, note, authorId = '') {
  const candidate = await ensureCandidate(candidateId);
  const normalizedNote = String(note || '').trim();
  if (!normalizedNote) throw serviceError('REMINDER_NOTE_REQUIRED');
  const normalizedDate = normalizeDateValue(date);

  const dossier = await getOrCreateDossier(candidate.id, workspaceId, String(authorId || candidate.id));
  const createdReminder = await prisma.reassessmentReminder.create({
    data: {
      dossierId: dossier.id,
      date: normalizedDate,
      note: normalizedNote,
    },
  });

  const snapshot = await loadDossierSnapshot({ candidate, workspaceId });
  return { ...snapshot, createdReminder };
}

export async function getDossierReminderSummary(workspaceId) {
  assertDossierClient();
  const normalizedWorkspaceId = normalizeRequiredId(workspaceId, 'WORKSPACE_ID_REQUIRED');
  const { start, end } = monthRange(new Date());

  const [scheduledThisMonth, activeDossiers, upcoming] = await Promise.all([
    prisma.reassessmentReminder.count({
      where: {
        dossier: { workspaceId: normalizedWorkspaceId },
        date: { gte: start, lt: end },
      },
    }),
    prisma.behavioralDossier.count({
      where: { workspaceId: normalizedWorkspaceId },
    }),
    prisma.reassessmentReminder.findMany({
      where: {
        dossier: { workspaceId: normalizedWorkspaceId },
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 5,
      select: {
        id: true,
        date: true,
        note: true,
        dossier: {
          select: {
            candidate: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    workspaceId: normalizedWorkspaceId,
    scheduledThisMonth,
    activeDossiers,
    upcoming,
  };
}

