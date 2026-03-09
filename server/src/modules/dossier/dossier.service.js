import { prisma } from '../../lib/prisma.js';
import { canManageOrganization } from '../../middleware/rbac.js';
import { isSuperAdminUser } from '../auth/super-admin-access.js';

const REQUIRED_DOSSIER_DELEGATES = [
  'behavioralDossier',
  'dossierNote',
  'dossierInsight',
  'developmentPlan',
  'reassessmentReminder',
  'dossierAnamnesis',
  'assessment',
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

function normalizeItemId(itemId) {
  return normalizeRequiredId(itemId, 'ITEM_ID_REQUIRED');
}

function normalizeOptionalString(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
}

function normalizeOptionalInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function normalizeOptionalDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'sim', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'não', 'no'].includes(normalized)) return false;
  return null;
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

async function deleteDossierEntity({
  candidateId,
  workspaceId,
  itemId,
  entityName,
  notFoundCode,
}) {
  const candidate = await ensureCandidate(candidateId);
  const normalizedItemId = normalizeItemId(itemId);
  const dossier = await prisma.behavioralDossier.findUnique({
    where: {
      candidateId_workspaceId: {
        candidateId: candidate.id,
        workspaceId,
      },
    },
    select: { id: true },
  });

  if (!dossier?.id) {
    throw serviceError('DOSSIER_NOT_FOUND');
  }

  const delegate = prisma[entityName];
  const item = await delegate.findFirst({
    where: {
      id: normalizedItemId,
      dossierId: dossier.id,
    },
    select: { id: true },
  });

  if (!item?.id) {
    throw serviceError(notFoundCode);
  }

  await delegate.delete({
    where: { id: normalizedItemId },
  });

  const snapshot = await loadDossierSnapshot({ candidate, workspaceId });
  return {
    ...snapshot,
    deletedItemId: normalizedItemId,
  };
}

export async function deleteDossierNote(candidateId, workspaceId, noteId) {
  return deleteDossierEntity({
    candidateId,
    workspaceId,
    itemId: noteId,
    entityName: 'dossierNote',
    notFoundCode: 'NOTE_NOT_FOUND',
  });
}

export async function deleteDossierInsight(candidateId, workspaceId, insightId) {
  return deleteDossierEntity({
    candidateId,
    workspaceId,
    itemId: insightId,
    entityName: 'dossierInsight',
    notFoundCode: 'INSIGHT_NOT_FOUND',
  });
}

export async function deleteDevelopmentPlan(candidateId, workspaceId, planId) {
  return deleteDossierEntity({
    candidateId,
    workspaceId,
    itemId: planId,
    entityName: 'developmentPlan',
    notFoundCode: 'PLAN_NOT_FOUND',
  });
}

export async function deleteReassessmentReminder(candidateId, workspaceId, reminderId) {
  return deleteDossierEntity({
    candidateId,
    workspaceId,
    itemId: reminderId,
    entityName: 'reassessmentReminder',
    notFoundCode: 'REMINDER_NOT_FOUND',
  });
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

async function resolveAssessmentForWorkspace(assessmentId, workspaceId) {
  const normalizedAssessmentId = normalizeRequiredId(assessmentId, 'ASSESSMENT_ID_REQUIRED');
  const normalizedWorkspaceId = normalizeRequiredId(workspaceId, 'WORKSPACE_ID_REQUIRED');

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: normalizedAssessmentId,
      organizationId: normalizedWorkspaceId,
    },
    select: {
      id: true,
      organizationId: true,
      candidateUserId: true,
      candidateName: true,
      candidateEmail: true,
      completedAt: true,
      createdAt: true,
      report: {
        select: {
          discProfile: true,
        },
      },
    },
  });

  if (!assessment) {
    throw serviceError('ASSESSMENT_NOT_FOUND');
  }

  return assessment;
}

function normalizeDossierAnamnesisInput(input = {}) {
  return {
    fullName: normalizeOptionalString(input.fullName),
    birthDate: normalizeOptionalDate(input.birthDate),
    age: normalizeOptionalInteger(input.age),
    sex: normalizeOptionalString(input.sex),
    maritalStatus: normalizeOptionalString(input.maritalStatus),
    spouseName: normalizeOptionalString(input.spouseName),
    spouseAge: normalizeOptionalInteger(input.spouseAge),
    hasChildren: normalizeOptionalBoolean(input.hasChildren),
    childrenCount: normalizeOptionalInteger(input.childrenCount),
    childrenInfo: normalizeOptionalString(input.childrenInfo),
    city: normalizeOptionalString(input.city),
    address: normalizeOptionalString(input.address),
    profession: normalizeOptionalString(input.profession),
    education: normalizeOptionalString(input.education),
    stressLevel: normalizeOptionalString(input.stressLevel),
    sleepQuality: normalizeOptionalString(input.sleepQuality),
    physicalActivity: normalizeOptionalString(input.physicalActivity),
    smoker: normalizeOptionalString(input.smoker),
    alcoholConsumption: normalizeOptionalString(input.alcoholConsumption),
    usesMedication: normalizeOptionalString(input.usesMedication),
    medicationList: normalizeOptionalString(input.medicationList),
    healthConditions: normalizeOptionalString(input.healthConditions),
    familyHealthHistory: normalizeOptionalString(input.familyHealthHistory),
    psychologicalHistory: normalizeOptionalString(input.psychologicalHistory),
    mainComplaint: normalizeOptionalString(input.mainComplaint),
    evaluationReason: normalizeOptionalString(input.evaluationReason),
    professionalNotes: normalizeOptionalString(input.professionalNotes),
  };
}

function hasAnyAnamnesisValue(anamnesis = null) {
  if (!anamnesis || typeof anamnesis !== 'object') return false;
  const ignored = new Set(['id', 'assessmentId', 'createdAt', 'updatedAt']);
  return Object.entries(anamnesis).some(([key, value]) => {
    if (ignored.has(key)) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && !value.trim()) return false;
    return true;
  });
}

function buildAssessmentSummary(assessment = {}) {
  const profile =
    String(
      assessment?.report?.discProfile?.profile?.key ||
        assessment?.report?.discProfile?.profileKey ||
        '',
    ).trim() || 'DISC';

  return {
    assessmentId: assessment.id,
    candidateId: assessment.candidateUserId || '',
    candidateName: assessment.candidateName || 'Participante',
    candidateEmail: assessment.candidateEmail || '',
    profile,
    completedAt: assessment.completedAt || null,
    createdAt: assessment.createdAt || null,
  };
}

export async function getDossierAnamnesisByAssessment(assessmentId, workspaceId) {
  assertDossierClient();
  const assessment = await resolveAssessmentForWorkspace(assessmentId, workspaceId);
  const anamnesis = await prisma.dossierAnamnesis.findUnique({
    where: { assessmentId: assessment.id },
  });

  return {
    workspaceId,
    assessment: buildAssessmentSummary(assessment),
    anamnesis,
    hasData: hasAnyAnamnesisValue(anamnesis),
  };
}

export async function saveDossierAnamnesisByAssessment({
  assessmentId,
  workspaceId,
  input = {},
}) {
  assertDossierClient();
  const assessment = await resolveAssessmentForWorkspace(assessmentId, workspaceId);
  const payload = normalizeDossierAnamnesisInput(input);

  if (payload.hasChildren === false) {
    payload.childrenCount = null;
    payload.childrenInfo = null;
  }

  if (payload.usesMedication === 'não' || payload.usesMedication === 'nao') {
    payload.medicationList = null;
  }

  const anamnesis = await prisma.dossierAnamnesis.upsert({
    where: { assessmentId: assessment.id },
    create: {
      assessmentId: assessment.id,
      ...payload,
    },
    update: payload,
  });

  return {
    workspaceId,
    assessment: buildAssessmentSummary(assessment),
    anamnesis,
    hasData: hasAnyAnamnesisValue(anamnesis),
  };
}
