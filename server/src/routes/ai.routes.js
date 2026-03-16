import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { sendSafeJsonError } from '../lib/http-security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import { generateAiDiscContent } from '../modules/ai/ai-report.service.js';

const router = Router();

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }

  return value;
}, z.boolean());

const discInputSchema = z.object({
  mode: z.enum(['personal', 'professional', 'business']).optional(),
  nome: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  empresa: z.string().trim().optional(),
  D: z.coerce.number(),
  I: z.coerce.number(),
  S: z.coerce.number(),
  C: z.coerce.number(),
  includeMeta: booleanLikeSchema.optional(),
});

function requireAiAccess(req, res, next) {
  if (env.nodeEnv !== 'production') {
    return next();
  }

  return requireAuth(req, res, () => attachUser(req, res, next));
}

router.post('/disc-insights', requireAiAccess, async (req, res) => {
  try {
    const input = discInputSchema.parse(req.body || {});
    const result = await generateAiDiscContent({
      mode: input.mode,
      nome: input.nome,
      cargo: input.cargo,
      empresa: input.empresa,
      scores: {
        D: input.D,
        I: input.I,
        S: input.S,
        C: input.C,
      },
    });

    return res.status(200).json({
      ok: true,
      provider: result.provider,
      model: result.model,
      source: result.source,
      usedFallback: result.usedFallback,
      attempts: result.attempts,
      content: result.content,
      meta: input.includeMeta ? result.input : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_AI_DISC_PAYLOAD',
        message: 'Payload inválido para insights DISC.',
      });
    }

    return sendSafeJsonError(res, {
      status: 400,
      error: 'AI_DISC_INSIGHTS_FAILED',
      message: 'Falha ao gerar insights DISC com IA.',
    });
  }
});

router.post('/report-preview', requireAiAccess, async (req, res) => {
  try {
    const input = discInputSchema.parse(req.body || {});
    const result = await generateAiDiscContent({
      mode: input.mode,
      nome: input.nome,
      cargo: input.cargo,
      empresa: input.empresa,
      scores: {
        D: input.D,
        I: input.I,
        S: input.S,
        C: input.C,
      },
    });

    return res.status(200).json({
      ok: true,
      provider: result.provider,
      model: result.model,
      source: result.source,
      usedFallback: result.usedFallback,
      attempts: result.attempts,
      preview: {
        summary: result.content.summary,
        executiveSummary: result.content.executiveSummary,
        strengths: result.content.strengths,
        limitations: result.content.limitations,
        developmentRecommendations: result.content.developmentRecommendations,
      },
      content: result.content,
      meta: result.input,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_AI_REPORT_PREVIEW_PAYLOAD',
        message: 'Payload inválido para preview de relatório.',
      });
    }

    return sendSafeJsonError(res, {
      status: 400,
      error: 'AI_REPORT_PREVIEW_FAILED',
      message: 'Falha ao gerar preview de relatório com IA.',
    });
  }
});

export default router;
