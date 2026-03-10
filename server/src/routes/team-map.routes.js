import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireActiveCustomer, requireRole } from '../middleware/rbac.js';
import { analyzeTeamMap, listTeamMapAssessments } from '../modules/team-map/team-map.service.js';

const router = Router();

const analyzeSchema = z.object({
  assessmentIds: z.array(z.string().trim().min(1)).min(1).max(40),
});

const ERROR_STATUS = Object.freeze({
  AUTH_REQUIRED: 401,
  ASSESSMENT_IDS_REQUIRED: 400,
  ASSESSMENTS_NOT_ACCESSIBLE: 403,
  INVALID_PAYLOAD: 400,
});

function resolveErrorCode(error, fallback = 'TEAM_MAP_FAILED') {
  if (error instanceof z.ZodError) return 'INVALID_PAYLOAD';
  return String(error?.code || error?.message || fallback)
    .trim()
    .toUpperCase();
}

function sendError(res, error, fallback = 'TEAM_MAP_FAILED') {
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
    const assessments = await listTeamMapAssessments({
      userId: req.auth.userId,
      user: req.user || {},
    });

    return res.status(200).json({
      ok: true,
      assessments,
    });
  } catch (error) {
    return sendError(res, error, 'TEAM_MAP_ASSESSMENTS_FAILED');
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const input = analyzeSchema.parse(req.body || {});
    const teamMap = await analyzeTeamMap({
      userId: req.auth.userId,
      user: req.user || {},
      assessmentIds: input.assessmentIds,
    });

    return res.status(200).json({
      ok: true,
      teamMap,
    });
  } catch (error) {
    return sendError(res, error, 'TEAM_MAP_ANALYZE_FAILED');
  }
});

export default router;
