import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requirePremiumFeature, requireRole } from '../middleware/rbac.js';
import {
  addDevelopmentPlan,
  getDossierAnamnesisByAssessment,
  addDossierInsight,
  addDossierNote,
  addReassessmentReminder,
  deleteDevelopmentPlan,
  deleteDossierInsight,
  deleteDossierNote,
  deleteReassessmentReminder,
  getDossierByCandidate,
  getDossierReminderSummary,
  resolveWorkspaceId,
  saveDossierAnamnesisByAssessment,
} from '../modules/dossier/dossier.service.js';

const router = Router();

const workspaceSchema = z.object({
  workspaceId: z.string().trim().optional(),
});

const noteSchema = workspaceSchema.extend({
  content: z.string().trim().min(2).max(4000),
});

const insightSchema = workspaceSchema.extend({
  insight: z.string().trim().min(2).max(4000),
});

const planSchema = workspaceSchema.extend({
  goal: z.string().trim().min(2).max(280),
  description: z.string().trim().min(2).max(4000),
});

const reminderSchema = workspaceSchema.extend({
  date: z.coerce.date(),
  note: z.string().trim().min(2).max(500),
});

const dossierAnamnesisSchema = workspaceSchema.extend({
  assessmentId: z.string().trim().min(1),
  fullName: z.string().trim().max(180).optional().or(z.literal('')),
  birthDate: z.string().trim().optional().or(z.literal('')),
  age: z.coerce.number().int().min(0).max(120).optional(),
  sex: z.string().trim().max(80).optional().or(z.literal('')),
  maritalStatus: z.string().trim().max(120).optional().or(z.literal('')),
  spouseName: z.string().trim().max(180).optional().or(z.literal('')),
  spouseAge: z.coerce.number().int().min(0).max(120).optional(),
  hasChildren: z.union([z.boolean(), z.string()]).optional(),
  childrenCount: z.coerce.number().int().min(0).max(20).optional(),
  childrenInfo: z.string().trim().max(4000).optional().or(z.literal('')),
  city: z.string().trim().max(180).optional().or(z.literal('')),
  address: z.string().trim().max(280).optional().or(z.literal('')),
  profession: z.string().trim().max(180).optional().or(z.literal('')),
  education: z.string().trim().max(180).optional().or(z.literal('')),
  stressLevel: z.string().trim().max(120).optional().or(z.literal('')),
  sleepQuality: z.string().trim().max(120).optional().or(z.literal('')),
  physicalActivity: z.string().trim().max(120).optional().or(z.literal('')),
  smoker: z.string().trim().max(120).optional().or(z.literal('')),
  alcoholConsumption: z.string().trim().max(120).optional().or(z.literal('')),
  usesMedication: z.string().trim().max(120).optional().or(z.literal('')),
  medicationList: z.string().trim().max(4000).optional().or(z.literal('')),
  healthConditions: z.string().trim().max(4000).optional().or(z.literal('')),
  familyHealthHistory: z.string().trim().max(4000).optional().or(z.literal('')),
  psychologicalHistory: z.string().trim().max(4000).optional().or(z.literal('')),
  mainComplaint: z.string().trim().max(4000).optional().or(z.literal('')),
  evaluationReason: z.string().trim().max(4000).optional().or(z.literal('')),
  professionalNotes: z.string().trim().max(8000).optional().or(z.literal('')),
});

const ERROR_STATUS = {
  UNAUTHORIZED: 401,
  CANDIDATE_ID_REQUIRED: 400,
  CANDIDATE_NOT_FOUND: 404,
  WORKSPACE_ID_REQUIRED: 400,
  WORKSPACE_NOT_FOUND: 404,
  FORBIDDEN_WORKSPACE: 403,
  CREATED_BY_REQUIRED: 400,
  AUTHOR_ID_REQUIRED: 400,
  NOTE_CONTENT_REQUIRED: 400,
  INSIGHT_CONTENT_REQUIRED: 400,
  PLAN_GOAL_REQUIRED: 400,
  PLAN_DESCRIPTION_REQUIRED: 400,
  REMINDER_NOTE_REQUIRED: 400,
  INVALID_REMINDER_DATE: 400,
  ITEM_ID_REQUIRED: 400,
  NOTE_NOT_FOUND: 404,
  INSIGHT_NOT_FOUND: 404,
  PLAN_NOT_FOUND: 404,
  REMINDER_NOT_FOUND: 404,
  DOSSIER_NOT_FOUND: 404,
  DOSSIER_PRISMA_CLIENT_OUTDATED: 500,
  ASSESSMENT_ID_REQUIRED: 400,
  ASSESSMENT_NOT_FOUND: 404,
};

function readCandidateId(req) {
  return String(req.params.candidateId || '').trim();
}

function resolveErrorCode(error, fallback) {
  if (error instanceof z.ZodError) return 'INVALID_PAYLOAD';
  const code = String(error?.code || error?.message || '').trim().toUpperCase();
  if (code) return code;
  return fallback;
}

function sendDossierError(res, error, fallback = 'DOSSIER_REQUEST_FAILED') {
  const code = resolveErrorCode(error, fallback);
  const status = ERROR_STATUS[code] || (code.startsWith('INVALID_') ? 400 : 500);

  return res.status(status).json({
    ok: false,
    error: code,
  });
}

function dossierSuccessPayload(payload = {}) {
  return {
    ok: true,
    workspaceId: payload.workspaceId,
    candidate: payload.candidate,
    dossier: payload.dossier,
    assessmentsHistory: payload.assessmentsHistory || [],
    overview: payload.overview || {},
    createdNote: payload.createdNote || null,
    createdInsight: payload.createdInsight || null,
    createdPlan: payload.createdPlan || null,
    createdReminder: payload.createdReminder || null,
    deletedItemId: payload.deletedItemId || null,
  };
}

router.use(
  requireAuth,
  attachUser,
  requireRole('ADMIN', 'PRO'),
  requirePremiumFeature('DOSSIER_PREMIUM_REQUIRED'),
);

router.get('/reminders/summary', async (req, res) => {
  try {
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const summary = await getDossierReminderSummary(workspaceId);
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_SUMMARY_FAILED');
  }
});

router.get('/anamnesis/:assessmentId', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    if (!assessmentId) {
      return res.status(400).json({ ok: false, error: 'ASSESSMENT_ID_REQUIRED' });
    }

    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const payload = await getDossierAnamnesisByAssessment(assessmentId, workspaceId);
    return res.status(200).json({
      ok: true,
      workspaceId: payload.workspaceId,
      assessment: payload.assessment,
      anamnesis: payload.anamnesis,
      hasData: payload.hasData,
    });
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_ANAMNESIS_FETCH_FAILED');
  }
});

router.post('/anamnesis/save', async (req, res) => {
  try {
    const input = dossierAnamnesisSchema.parse(req.body || {});
    const assessmentId = String(input.assessmentId || '').trim();
    if (!assessmentId) {
      return res.status(400).json({ ok: false, error: 'ASSESSMENT_ID_REQUIRED' });
    }

    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: input.workspaceId || '',
      authUser: req.user || req.auth || {},
    });

    const payload = await saveDossierAnamnesisByAssessment({
      assessmentId,
      workspaceId,
      input,
    });

    return res.status(200).json({
      ok: true,
      workspaceId: payload.workspaceId,
      assessment: payload.assessment,
      anamnesis: payload.anamnesis,
      hasData: payload.hasData,
    });
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_ANAMNESIS_SAVE_FAILED');
  }
});

router.get('/:candidateId', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const payload = await getDossierByCandidate(candidateId, workspaceId, req.auth.userId);
    return res.status(200).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_FETCH_FAILED');
  }
});

router.post('/:candidateId/note', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const input = noteSchema.parse(req.body || {});
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: input.workspaceId || '',
      authUser: req.user || req.auth || {},
    });

    const payload = await addDossierNote(
      candidateId,
      workspaceId,
      req.auth.userId,
      input.content,
    );
    return res.status(201).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_NOTE_CREATE_FAILED');
  }
});

router.post('/:candidateId/insight', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const input = insightSchema.parse(req.body || {});
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: input.workspaceId || '',
      authUser: req.user || req.auth || {},
    });

    const payload = await addDossierInsight(
      candidateId,
      workspaceId,
      req.auth.userId,
      input.insight,
    );
    return res.status(201).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_INSIGHT_CREATE_FAILED');
  }
});

router.post('/:candidateId/plan', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const input = planSchema.parse(req.body || {});
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: input.workspaceId || '',
      authUser: req.user || req.auth || {},
    });

    const payload = await addDevelopmentPlan(
      candidateId,
      workspaceId,
      input.goal,
      input.description,
      req.auth.userId,
    );
    return res.status(201).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_PLAN_CREATE_FAILED');
  }
});

router.post('/:candidateId/reminder', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const input = reminderSchema.parse(req.body || {});
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: input.workspaceId || '',
      authUser: req.user || req.auth || {},
    });

    const payload = await addReassessmentReminder(
      candidateId,
      workspaceId,
      input.date,
      input.note,
      req.auth.userId,
    );
    return res.status(201).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_REMINDER_CREATE_FAILED');
  }
});

router.delete('/:candidateId/note/:noteId', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const noteId = String(req.params.noteId || '').trim();
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const payload = await deleteDossierNote(candidateId, workspaceId, noteId);
    console.info('[dossier/delete-note] success', {
      candidateId,
      workspaceId,
      noteId,
      deletedItemId: payload?.deletedItemId || null,
    });
    return res.status(200).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_NOTE_DELETE_FAILED');
  }
});

router.delete('/:candidateId/insight/:insightId', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const insightId = String(req.params.insightId || '').trim();
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const payload = await deleteDossierInsight(candidateId, workspaceId, insightId);
    console.info('[dossier/delete-insight] success', {
      candidateId,
      workspaceId,
      insightId,
      deletedItemId: payload?.deletedItemId || null,
    });
    return res.status(200).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_INSIGHT_DELETE_FAILED');
  }
});

router.delete('/:candidateId/plan/:planId', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const planId = String(req.params.planId || '').trim();
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const payload = await deleteDevelopmentPlan(candidateId, workspaceId, planId);
    console.info('[dossier/delete-plan] success', {
      candidateId,
      workspaceId,
      planId,
      deletedItemId: payload?.deletedItemId || null,
    });
    return res.status(200).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_PLAN_DELETE_FAILED');
  }
});

router.delete('/:candidateId/reminder/:reminderId', async (req, res) => {
  try {
    const candidateId = readCandidateId(req);
    if (!candidateId) {
      return res.status(400).json({ ok: false, error: 'CANDIDATE_ID_REQUIRED' });
    }

    const reminderId = String(req.params.reminderId || '').trim();
    const workspaceId = await resolveWorkspaceId({
      userId: req.auth.userId,
      requestedWorkspaceId: String(req.query.workspaceId || ''),
      authUser: req.user || req.auth || {},
    });

    const payload = await deleteReassessmentReminder(candidateId, workspaceId, reminderId);
    console.info('[dossier/delete-reminder] success', {
      candidateId,
      workspaceId,
      reminderId,
      deletedItemId: payload?.deletedItemId || null,
    });
    return res.status(200).json(dossierSuccessPayload(payload));
  } catch (error) {
    return sendDossierError(res, error, 'DOSSIER_REMINDER_DELETE_FAILED');
  }
});

export default router;
