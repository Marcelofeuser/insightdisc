import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireActiveCustomer, requireRole } from '../middleware/rbac.js';
import {
  compareAssessmentProfiles,
  listComparisonAssessments,
} from '../modules/profile-comparison/profile-comparison.service.js';

const router = Router();

const compareSchema = z.object({
  assessmentIds: z.array(z.string().trim().min(1)).min(2).max(12),
});

const ERROR_STATUS = Object.freeze({
  AUTH_REQUIRED: 401,
  ASSESSMENTS_MIN_REQUIRED: 400,
  ASSESSMENTS_NOT_ACCESSIBLE: 403,
  INVALID_PAYLOAD: 400,
});

function resolveErrorCode(error, fallback = 'PROFILE_COMPARISON_FAILED') {
  if (error instanceof z.ZodError) return 'INVALID_PAYLOAD';
  return String(error?.code || error?.message || fallback)
    .trim()
    .toUpperCase();
}

function sendError(res, error, fallback = 'PROFILE_COMPARISON_FAILED') {
  const code = resolveErrorCode(error, fallback);
  const status = ERROR_STATUS[code] || 500;

  return res.status(status).json({
    ok: false,
    error: code,
    message: error?.message || code,
  });
}

router.use(requireAuth, attachUser, requireRole('ADMIN', 'PRO'), requireActiveCustomer);

router.get('/assessments', async (req, res) => {
  try {
    const assessments = await listComparisonAssessments({
      userId: req.auth.userId,
      user: req.user || {},
    });

    return res.status(200).json({
      ok: true,
      assessments,
    });
  } catch (error) {
    return sendError(res, error, 'PROFILE_COMPARISON_ASSESSMENTS_FAILED');
  }
});

router.post('/compare', async (req, res) => {
  try {
    const input = compareSchema.parse(req.body || {});

    const comparison = await compareAssessmentProfiles({
      userId: req.auth.userId,
      user: req.user || {},
      assessmentIds: input.assessmentIds,
    });

    return res.status(200).json({
      ok: true,
      comparison,
    });
  } catch (error) {
    return sendError(res, error, 'PROFILE_COMPARISON_COMPARE_FAILED');
  }
});

export default router;
