import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireActiveCustomer } from '../middleware/rbac.js';
import { analyzeTeamMap, listTeamMapAssessments } from '../modules/team-map/team-map.service.js';
import {
  hasFeatureAccess,
  resolveFeatureMinimumPlan,
  resolveUserPlan,
} from '../modules/plans/feature-access.js';

const router = Router();

const analyzeSchema = z.object({
  assessmentIds: z.array(z.string().trim().min(1)).min(1).max(40),
});

const ERROR_STATUS = Object.freeze({
  AUTH_REQUIRED: 401,
  ASSESSMENT_IDS_REQUIRED: 400,
  ASSESSMENTS_NOT_ACCESSIBLE: 403,
  FEATURE_PLAN_REQUIRED: 403,
  INVALID_PAYLOAD: 400,
});

function resolveErrorCode(error, fallback = 'TEAM_MAP_FAILED') {
  if (error instanceof z.ZodError) return 'INVALID_PAYLOAD';
  return String(error?.code || error?.message || fallback)
    .trim()
    .toUpperCase();
}

function resolveFriendlyErrorMessage(code, fallback = 'Não foi possível carregar os dados do mapa de equipe.') {
  if (code === 'AUTH_REQUIRED') {
    return 'Sua sessão expirou. Faça login novamente para acessar o mapa de equipe.';
  }
  if (code === 'ASSESSMENTS_NOT_ACCESSIBLE') {
    return 'Você não possui permissão para analisar uma ou mais avaliações selecionadas.';
  }
  if (code === 'ASSESSMENT_IDS_REQUIRED' || code === 'INVALID_PAYLOAD') {
    return 'Selecione avaliações válidas para gerar o mapa organizacional.';
  }
  if (code === 'FEATURE_PLAN_REQUIRED') {
    return 'Mapa de equipe disponível apenas no plano Business.';
  }
  return fallback;
}

function sendError(res, error, fallback = 'TEAM_MAP_FAILED') {
  const code = resolveErrorCode(error, fallback);
  const status = ERROR_STATUS[code] || 500;

  return res.status(status).json({
    ok: false,
    error: code,
    message: resolveFriendlyErrorMessage(
      code,
      error?.message || 'Não foi possível concluir a análise do mapa de equipe.',
    ),
  });
}

router.use(requireAuth, attachUser, requireActiveCustomer);
router.use((req, res, next) => {
  const userPlan = resolveUserPlan(req.user || {});
  if (hasFeatureAccess(userPlan, 'team_map')) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: 'FEATURE_PLAN_REQUIRED',
    feature: 'team_map',
    plan: userPlan,
    requiredPlan: resolveFeatureMinimumPlan('team_map'),
    message: 'Mapa de equipe disponível apenas no plano Business.',
  });
});

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
