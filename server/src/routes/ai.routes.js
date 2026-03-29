import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { sendSafeJsonError } from '../lib/http-security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import { generateAiDiscContent } from '../modules/ai/ai-report.service.js';
import { buildAiProviderChain } from '../modules/ai/provider.js';

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

const coachContextSchema = z.object({
  reportId: z.string().trim().optional(),
  assessmentId: z.string().trim().optional(),
  reportType: z.string().trim().optional(),
  profileCode: z.string().trim().optional(),
  dominantFactor: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  strengths: z.array(z.string().trim()).optional(),
  limitations: z.array(z.string().trim()).optional(),
  developmentRecommendations: z.array(z.string().trim()).optional(),
});

const coachInputSchema = discInputSchema.extend({
  question: z.string().trim().min(4).max(1200),
  context: coachContextSchema.optional(),
});

function toText(value) {
  return String(value || '').trim();
}

function normalizeList(value = [], maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => toText(item)).filter(Boolean))].slice(0, maxItems);
}

function normalizeCoachContext(raw = {}) {
  const context = raw || {};
  return {
    reportId: toText(context.reportId),
    assessmentId: toText(context.assessmentId),
    reportType: toText(context.reportType || 'business') || 'business',
    profileCode: toText(context.profileCode),
    dominantFactor: toText(context.dominantFactor).toUpperCase(),
    summary: toText(context.summary),
    strengths: normalizeList(context.strengths, 6),
    limitations: normalizeList(context.limitations, 6),
    developmentRecommendations: normalizeList(context.developmentRecommendations, 6),
  };
}

function buildCoachSystemInstruction() {
  return [
    'Você é o Coach DISC do InsightDISC.',
    'Responda sempre em português brasileiro.',
    'Use o relatório informado como contexto principal.',
    'Evite generalidades: priorize o que está no perfil, pontos fortes, pontos de atenção e recomendações.',
    'Estruture a resposta em 3 blocos curtos:',
    '1) Insight principal',
    '2) Riscos e atenção',
    '3) Ações práticas (3 bullets objetivos)',
  ].join('\n');
}

function buildCoachUserPrompt({ input, context, aiContent }) {
  const strengths = normalizeList([
    ...(context.strengths || []),
    ...(aiContent?.strengths || []),
  ]);
  const limitations = normalizeList([
    ...(context.limitations || []),
    ...(aiContent?.limitations || []),
  ]);
  const recommendations = normalizeList([
    ...(context.developmentRecommendations || []),
    ...(aiContent?.developmentRecommendations || []),
  ]);

  return [
    'PERGUNTA DO USUÁRIO:',
    input.question,
    '',
    'DADOS BASE DO RELATÓRIO:',
    `Nome: ${toText(input.nome || 'Pessoa avaliada')}`,
    `Cargo: ${toText(input.cargo || 'Profissional')}`,
    `Empresa: ${toText(input.empresa || 'InsightDISC')}`,
    `Modo: ${toText(input.mode || 'business')}`,
    `Fatores DISC: D=${input.D}, I=${input.I}, S=${input.S}, C=${input.C}`,
    `Perfil: ${toText(context.profileCode || 'n/d')}`,
    `Fator dominante: ${toText(context.dominantFactor || 'n/d')}`,
    `Tipo do relatório: ${toText(context.reportType || 'business')}`,
    '',
    'RESUMO:',
    toText(context.summary || aiContent?.summary),
    '',
    'PONTOS FORTES:',
    strengths.length ? strengths.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'PONTOS DE ATENÇÃO:',
    limitations.length ? limitations.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'RECOMENDAÇÕES:',
    recommendations.length ? recommendations.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'INSTRUÇÃO FINAL:',
    'Responda de forma aplicada ao contexto acima, com foco em decisão prática para o usuário.',
  ].join('\n');
}

function buildDeterministicCoachAnswer({ question, context, aiContent }) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();
  const summary = toText(context.summary || aiContent?.summary);
  const pressureBehavior = toText(aiContent?.pressureBehavior);
  const communicationStyle = toText(aiContent?.communicationStyle);
  const development = normalizeList(
    context.developmentRecommendations?.length
      ? context.developmentRecommendations
      : aiContent?.developmentRecommendations || [],
    3,
  );
  const limitations = normalizeList(context.limitations?.length ? context.limitations : aiContent?.limitations || [], 2);

  const guidance =
    normalizedQuestion.includes('press')
      ? pressureBehavior || summary
      : normalizedQuestion.includes('comunica')
        ? communicationStyle || summary
        : summary;

  const actionItems = development.length
    ? development.map((item) => `- ${item}`).join('\n')
    : '- Defina um comportamento-alvo e acompanhe por 30 dias.\n- Aplique feedback semanal com exemplos concretos.\n- Revise progresso com métrica simples de evolução.';

  const risks = limitations.length
    ? limitations.map((item) => `- ${item}`).join('\n')
    : '- Observe sinais de rigidez comportamental em cenários de pressão.\n- Alinhe expectativa de comunicação antes de reuniões críticas.';

  return [
    'Insight principal:',
    guidance || 'Use o padrão DISC predominante como referência para ajustar comunicação e priorização.',
    '',
    'Riscos e atenção:',
    risks,
    '',
    'Ações práticas:',
    actionItems,
  ].join('\n');
}

async function resolveCoachAnswerFromProviders({ systemInstruction, userPrompt }) {
  const providers = buildAiProviderChain();
  const attempts = [];

  for (const provider of providers) {
    if (typeof provider?.generateCoachAnswer !== 'function') {
      continue;
    }

    try {
      const result = await provider.generateCoachAnswer({
        systemInstruction,
        userPrompt,
      });
      const text = toText(result?.text);
      if (text) {
        return {
          ok: true,
          answer: text,
          provider: toText(result?.provider || provider?.name || 'unknown'),
          model: toText(result?.model || provider?.name || 'unknown'),
          attempts,
        };
      }
      attempts.push({
        provider: toText(provider?.name || 'unknown'),
        model: toText(provider?.getModel?.() || provider?.name || 'unknown'),
        status: 'empty',
      });
    } catch (error) {
      attempts.push({
        provider: toText(provider?.name || 'unknown'),
        model: toText(provider?.getModel?.() || provider?.name || 'unknown'),
        status: 'error',
        error: toText(error?.message || error).slice(0, 200),
      });
    }
  }

  return {
    ok: false,
    answer: '',
    provider: '',
    model: '',
    attempts,
  };
}

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

router.post('/coach-answer', requireAiAccess, async (req, res) => {
  try {
    const input = coachInputSchema.parse(req.body || {});
    const context = normalizeCoachContext(input.context);
    const aiDiscResult = await generateAiDiscContent({
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

    const systemInstruction = buildCoachSystemInstruction();
    const userPrompt = buildCoachUserPrompt({
      input,
      context,
      aiContent: aiDiscResult.content,
    });
    const coachResult = await resolveCoachAnswerFromProviders({
      systemInstruction,
      userPrompt,
    });

    const answer = coachResult.ok
      ? coachResult.answer
      : buildDeterministicCoachAnswer({
          question: input.question,
          context,
          aiContent: aiDiscResult.content,
        });

    return res.status(200).json({
      ok: true,
      provider: coachResult.provider || aiDiscResult.provider,
      model: coachResult.model || aiDiscResult.model,
      source: coachResult.ok ? 'ai_provider' : 'deterministic_fallback',
      usedFallback: !coachResult.ok,
      question: input.question,
      answer,
      context: {
        reportId: context.reportId,
        assessmentId: context.assessmentId,
        reportType: context.reportType,
        profileCode: context.profileCode,
        dominantFactor: context.dominantFactor,
        respondentName: toText(input.nome),
        cargo: toText(input.cargo),
      },
      disc: aiDiscResult.input,
      supporting: {
        summary: toText(context.summary || aiDiscResult.content?.summary),
        strengths: normalizeList([
          ...(context.strengths || []),
          ...(aiDiscResult.content?.strengths || []),
        ], 6),
        limitations: normalizeList([
          ...(context.limitations || []),
          ...(aiDiscResult.content?.limitations || []),
        ], 6),
        developmentRecommendations: normalizeList([
          ...(context.developmentRecommendations || []),
          ...(aiDiscResult.content?.developmentRecommendations || []),
        ], 6),
      },
      attempts: coachResult.attempts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_AI_COACH_PAYLOAD',
        message: 'Payload inválido para o Coach DISC.',
      });
    }

    return sendSafeJsonError(res, {
      status: 400,
      error: 'AI_COACH_ANSWER_FAILED',
      message: 'Falha ao gerar resposta contextual do Coach DISC.',
    });
  }
});

export default router;
