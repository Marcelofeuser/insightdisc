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

function resolveFriendlyErrorMessage(code, fallback = 'Não foi possível carregar os perfis para comparação.') {
  if (code === 'AUTH_REQUIRED') {
    return 'Sua sessão expirou. Faça login novamente para acessar o comparador.';
  }
  if (code === 'ASSESSMENTS_NOT_ACCESSIBLE') {
    return 'Você não possui permissão para comparar uma ou mais avaliações selecionadas.';
  }
  if (code === 'ASSESSMENTS_MIN_REQUIRED' || code === 'INVALID_PAYLOAD') {
    return 'Selecione avaliações válidas para gerar a comparação.';
  }
  return fallback;
}

function sendError(res, error, fallback = 'PROFILE_COMPARISON_FAILED') {
  const code = resolveErrorCode(error, fallback);
  const status = ERROR_STATUS[code] || 500;

  return res.status(status).json({
    ok: false,
    error: code,
    message: resolveFriendlyErrorMessage(
      code,
      error?.message || 'Não foi possível concluir a comparação de perfis.',
    ),
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
