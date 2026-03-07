import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requirePremiumFeature, requireRole } from '../middleware/rbac.js';
import {
  addDevelopmentPlan,
  addDossierInsight,
  addDossierNote,
  addReassessmentReminder,
  getDossierByCandidate,
  getDossierReminderSummary,
  resolveWorkspaceId,
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
  DOSSIER_PRISMA_CLIENT_OUTDATED: 500,
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

export default router;

