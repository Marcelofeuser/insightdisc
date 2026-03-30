import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { sendSafeJsonError } from '../lib/http-security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import { generateAiDiscContent } from '../modules/ai/ai-report.service.js';
import { parseProviderJsonSafely } from '../modules/ai/json-utils.js';
import { generateWithGroq } from '../modules/ai/groq-provider.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';
import { buildCoachReportContext } from '../shared/frontend/modules/coach/reportContext.js';
import {
  hasFeatureAccess,
  resolveFeatureMinimumPlan,
  resolveUserPlan,
} from '../modules/plans/feature-access.js';
import {
  AI_STRATEGIC_MODULES,
  normalizeAiSegment,
  normalizeStrategicModule,
  resolveCoachSystemPrompt,
  resolveReportPreviewSystemPrompt,
  resolveStrategicSystemPrompt,
} from '../modules/ai/system-prompts.js';

const router = Router();
const DISC_FACTORS = ['D', 'I', 'S', 'C'];

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
  secondaryFactor: z.string().trim().optional(),
  respondentName: z.string().trim().optional(),
  candidateEmail: z.string().trim().optional(),
  completedAt: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  strengths: z.array(z.string().trim()).optional(),
  limitations: z.array(z.string().trim()).optional(),
  riskSignals: z.array(z.string().trim()).optional(),
  riskProfile: z.string().trim().optional(),
  developmentRecommendations: z.array(z.string().trim()).optional(),
});

const coachInputSchema = discInputSchema.extend({
  question: z.string().trim().min(4).max(1200),
  segment: z.string().trim().optional(),
  context: coachContextSchema.optional(),
});

const reportPreviewInputSchema = discInputSchema.extend({
  segment: z.string().trim().optional(),
  context: coachContextSchema.optional(),
});

const strategicModuleValues = Object.freeze([
  AI_STRATEGIC_MODULES.DEVELOPMENT_PLAN,
  AI_STRATEGIC_MODULES.MANAGER_FEEDBACK,
  AI_STRATEGIC_MODULES.DEBRIEF_SCRIPT,
  AI_STRATEGIC_MODULES.BEHAVIORAL_RISK,
  AI_STRATEGIC_MODULES.TEAM_ALLOCATION,
  AI_STRATEGIC_MODULES.IDEAL_ROLE_PROFILE,
  AI_STRATEGIC_MODULES.PROFILE_FIT,
]);

const strategicModuleSchema = z.preprocess(
  (value) => normalizeStrategicModule(value),
  z.enum(strategicModuleValues),
);

const strategicHistoryItemSchema = z.object({
  question: z.string().trim().max(1200).optional(),
  answer: z.string().trim().max(3000).optional(),
  createdAt: z.string().trim().max(120).optional(),
});

const strategicInputSchema = z.object({
  module: strategicModuleSchema,
  segment: z.string().trim().optional(),
  mode: z.enum(['personal', 'professional', 'business']).optional(),
  context: coachContextSchema,
  compareContext: coachContextSchema.optional(),
  history: z.array(strategicHistoryItemSchema).max(12).optional(),
  jobContext: z.object({
    roleTitle: z.string().trim().max(180).optional(),
    seniority: z.string().trim().max(120).optional(),
    teamScope: z.string().trim().max(320).optional(),
    businessGoal: z.string().trim().max(320).optional(),
  }).optional(),
});

function toText(value) {
  return String(value || '').trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeList(value = [], maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => toText(item)).filter(Boolean))].slice(0, maxItems);
}

function normalizeDiscScores(raw = {}) {
  const candidate = {
    D: Math.max(0, toNumber(raw?.D, 34)),
    I: Math.max(0, toNumber(raw?.I, 32)),
    S: Math.max(0, toNumber(raw?.S, 23)),
    C: Math.max(0, toNumber(raw?.C, 11)),
  };

  const total = candidate.D + candidate.I + candidate.S + candidate.C;
  if (!Number.isFinite(total) || total <= 0) {
    return { D: 34, I: 32, S: 23, C: 11 };
  }

  const normalized = {
    D: Math.round((candidate.D / total) * 100),
    I: Math.round((candidate.I / total) * 100),
    S: Math.round((candidate.S / total) * 100),
    C: 0,
  };
  normalized.C = Math.max(0, 100 - normalized.D - normalized.I - normalized.S);
  return normalized;
}

function rankDiscFactors(scores = {}) {
  return DISC_FACTORS
    .map((factor) => ({ factor, value: toNumber(scores?.[factor], 0) }))
    .sort((left, right) => right.value - left.value);
}

function normalizeCoachContext(raw = {}) {
  const context = raw || {};
  return {
    reportId: toText(context.reportId),
    assessmentId: toText(context.assessmentId),
    reportType: toText(context.reportType || 'business') || 'business',
    profileCode: toText(context.profileCode).toUpperCase(),
    dominantFactor: toText(context.dominantFactor).toUpperCase(),
    secondaryFactor: toText(context.secondaryFactor).toUpperCase(),
    respondentName: toText(context.respondentName),
    candidateEmail: toText(context.candidateEmail),
    completedAt: toText(context.completedAt),
    summary: toText(context.summary),
    strengths: normalizeList(context.strengths, 6),
    limitations: normalizeList(context.limitations, 6),
    riskSignals: normalizeList(context.riskSignals, 6),
    riskProfile: toText(context.riskProfile),
    developmentRecommendations: normalizeList(context.developmentRecommendations, 6),
  };
}

function buildRiskSignals(scores = {}, context = {}) {
  const base = normalizeList([
    ...(context.riskSignals || []),
    ...(context.limitations || []),
  ], 6);

  const generated = [];
  if (scores.D >= 45 && scores.C <= 18) {
    generated.push('Pode acelerar decisões sem detalhar critérios de qualidade quando há urgência.');
  }
  if (scores.S >= 42 && scores.D <= 20) {
    generated.push('Pode adiar conversas de confronto para preservar estabilidade do relacionamento.');
  }
  if (scores.I >= 45 && scores.C <= 15) {
    generated.push('Pode priorizar adesão rápida e reduzir profundidade de alinhamento operacional.');
  }
  if (scores.C >= 42 && scores.I <= 18) {
    generated.push('Pode elevar rigor técnico e reduzir fluidez de comunicação em grupos heterogêneos.');
  }

  return normalizeList([...base, ...generated], 6);
}

function buildCoachUserPrompt({ input, context, scores, primaryFactor, secondaryFactor, riskSignals }) {
  const strengths = normalizeList(context.strengths, 6);
  const limitations = normalizeList(context.limitations, 6);
  const recommendations = normalizeList(context.developmentRecommendations, 6);
  const riskList = normalizeList([
    ...(riskSignals || []),
    ...(context.riskProfile ? [context.riskProfile] : []),
  ], 6);

  const reportProfileCode =
    toText(context.profileCode) || `${primaryFactor}/${secondaryFactor}`;

  return [
    'PERGUNTA DO USUÁRIO:',
    input.question,
    '',
    'CONTEXTO DO RELATÓRIO SELECIONADO (REAL):',
    `Assessment ID: ${toText(context.assessmentId) || 'n/d'}`,
    `Report ID: ${toText(context.reportId) || 'n/d'}`,
    `Respondente: ${toText(context.respondentName || input.nome || 'Pessoa avaliada')}`,
    `Email: ${toText(context.candidateEmail) || 'n/d'}`,
    `Tipo do relatório: ${toText(context.reportType || input.mode || 'business')}`,
    `Data de conclusão: ${toText(context.completedAt) || 'n/d'}`,
    '',
    'PERFIL DISC:',
    `Perfil predominante: ${primaryFactor}`,
    `Perfil secundário: ${secondaryFactor}`,
    `Código de perfil: ${reportProfileCode}`,
    `Scores: D=${scores.D}% | I=${scores.I}% | S=${scores.S}% | C=${scores.C}%`,
    '',
    'RESUMO COMPORTAMENTAL:',
    toText(context.summary) || 'Não informado no relatório.',
    '',
    'PONTOS FORTES:',
    strengths.length ? strengths.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'PONTOS DE ATENÇÃO:',
    limitations.length ? limitations.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'RISCOS COMPORTAMENTAIS:',
    riskList.length ? riskList.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'RECOMENDAÇÕES JÁ REGISTRADAS:',
    recommendations.length ? recommendations.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'OBJETIVO DA RESPOSTA:',
    'Entregar orientação acionável para liderança, feedback, comunicação e desenvolvimento com base neste relatório específico.',
  ].join('\n');
}

function normalizePreviewField(value, minimumLength = 24) {
  const normalized = toText(value);
  return normalized.length >= minimumLength ? normalized : '';
}

function normalizePreviewList(value, maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => toText(item)).filter(Boolean))].slice(0, maxItems);
}

function normalizePreviewContent(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  return {
    summary: normalizePreviewField(source.summary, 32),
    executiveSummary: normalizePreviewField(source.executiveSummary || source.summary, 32),
    strengths: normalizePreviewList(source.strengths, 6),
    limitations: normalizePreviewList(source.limitations, 6),
    developmentRecommendations: normalizePreviewList(source.developmentRecommendations, 6),
    riskProfile: normalizePreviewField(source.riskProfile, 24),
    pressureBehavior: normalizePreviewField(source.pressureBehavior, 24),
    communicationStyle: normalizePreviewField(source.communicationStyle, 24),
    leadershipStyle: normalizePreviewField(source.leadershipStyle, 24),
    performanceInsights: normalizePreviewList(source.performanceInsights, 4),
  };
}

function buildReportPreviewUserPrompt({ input, context, scores, segment }) {
  const normalizedSegment = normalizeAiSegment(segment);
  const profileCode = toText(context.profileCode || `${context.dominantFactor}/${context.secondaryFactor}`);
  const strengths = normalizeList(context.strengths, 6);
  const limitations = normalizeList(context.limitations, 6);
  const recommendations = normalizeList(context.developmentRecommendations, 6);

  return [
    'CONTEXTO REAL DO RELATÓRIO:',
    `Segmento solicitado: ${normalizedSegment}`,
    `Respondente: ${toText(context.respondentName || input.nome || 'Pessoa avaliada')}`,
    `Email: ${toText(context.candidateEmail) || 'n/d'}`,
    `Assessment ID: ${toText(context.assessmentId) || 'n/d'}`,
    `Report ID: ${toText(context.reportId) || 'n/d'}`,
    `Tipo: ${toText(context.reportType || input.mode || 'business')}`,
    `Perfil predominante: ${toText(context.dominantFactor || 'D')}`,
    `Perfil secundário: ${toText(context.secondaryFactor || 'I')}`,
    `Código de perfil: ${profileCode}`,
    `Scores: D=${scores.D}% | I=${scores.I}% | S=${scores.S}% | C=${scores.C}%`,
    '',
    'Resumo comportamental existente:',
    toText(context.summary) || 'Não informado.',
    '',
    'Pontos fortes existentes:',
    strengths.length ? strengths.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'Pontos de atenção existentes:',
    limitations.length ? limitations.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'Recomendações existentes:',
    recommendations.length ? recommendations.map((item) => `- ${item}`).join('\n') : '- Não informado',
    '',
    'TAREFA:',
    'Gerar uma prévia executiva orientada ao segmento solicitado com foco em aplicação prática.',
    'Entregar conteúdo coerente com o perfil DISC e pronto para uso profissional.',
  ].join('\n');
}

function normalizeStrategicText(value, maxLength = 1200) {
  return toText(value).slice(0, maxLength);
}

function normalizeStrategicList(value, maxItems = 8, maxLength = 320) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeStrategicText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function normalizePlanStage(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const normalized = {
        focus: normalizeStrategicText(entry.focus, 220),
        behavior: normalizeStrategicText(entry.behavior, 320),
        action: normalizeStrategicText(entry.action, 320),
        frequency: normalizeStrategicText(entry.frequency, 160),
        progressIndicator: normalizeStrategicText(
          entry.progressIndicator || entry.progress_indicator,
          240,
        ),
      };
      if (!normalized.focus && !normalized.behavior && !normalized.action) return null;
      return normalized;
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeStrategicModulePayload(moduleKey, parsed = {}) {
  const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};

  if (moduleKey === AI_STRATEGIC_MODULES.DEVELOPMENT_PLAN) {
    return {
      executiveSummary: normalizeStrategicText(source.executiveSummary || source.summary, 900),
      shortTerm: normalizePlanStage(source.shortTerm || source.short_term),
      mediumTerm: normalizePlanStage(source.mediumTerm || source.medium_term),
      longTerm: normalizePlanStage(source.longTerm || source.long_term),
      suggestions: normalizeStrategicList(source.suggestions, 8, 260),
    };
  }

  if (moduleKey === AI_STRATEGIC_MODULES.MANAGER_FEEDBACK) {
    return {
      opening: normalizeStrategicText(source.opening, 800),
      positivePoints: normalizeStrategicList(source.positivePoints || source.positive_points, 8, 240),
      attentionPoints: normalizeStrategicList(source.attentionPoints || source.attention_points, 8, 240),
      guidance: normalizeStrategicText(source.guidance, 1200),
      closing: normalizeStrategicText(source.closing, 600),
    };
  }

  if (moduleKey === AI_STRATEGIC_MODULES.DEBRIEF_SCRIPT) {
    return {
      opening: normalizeStrategicText(source.opening, 800),
      keyMessages: normalizeStrategicList(source.keyMessages || source.key_messages, 8, 260),
      conversationFlow: normalizeStrategicList(source.conversationFlow || source.conversation_flow, 10, 260),
      resistancePrevention: normalizeStrategicList(source.resistancePrevention || source.resistance_prevention, 8, 260),
      questions: normalizeStrategicList(source.questions, 12, 220),
      closing: normalizeStrategicText(source.closing, 600),
    };
  }

  if (moduleKey === AI_STRATEGIC_MODULES.BEHAVIORAL_RISK) {
    return {
      summary: normalizeStrategicText(source.summary, 900),
      conflictRisk: normalizeStrategicText(source.conflictRisk || source.conflict_risk, 500),
      communicationRisk: normalizeStrategicText(source.communicationRisk || source.communication_risk, 500),
      pressureRisk: normalizeStrategicText(source.pressureRisk || source.pressure_risk, 500),
      alignmentRisk: normalizeStrategicText(source.alignmentRisk || source.alignment_risk, 500),
      mitigations: normalizeStrategicList(source.mitigations, 10, 260),
    };
  }

  if (moduleKey === AI_STRATEGIC_MODULES.TEAM_ALLOCATION) {
    return {
      summary: normalizeStrategicText(source.summary, 900),
      bestContexts: normalizeStrategicList(source.bestContexts || source.best_contexts, 8, 260),
      avoidContexts: normalizeStrategicList(source.avoidContexts || source.avoid_contexts, 8, 260),
      roleSuggestions: normalizeStrategicList(source.roleSuggestions || source.role_suggestions, 8, 260),
      collaborationGuidelines: normalizeStrategicList(
        source.collaborationGuidelines || source.collaboration_guidelines,
        10,
        260,
      ),
    };
  }

  if (moduleKey === AI_STRATEGIC_MODULES.IDEAL_ROLE_PROFILE) {
    return {
      summary: normalizeStrategicText(source.summary, 900),
      idealProfile: normalizeStrategicText(source.idealProfile || source.ideal_profile, 700),
      fitSignals: normalizeStrategicList(source.fitSignals || source.fit_signals, 8, 260),
      mismatchRisks: normalizeStrategicList(source.mismatchRisks || source.mismatch_risks, 8, 260),
      interviewFocus: normalizeStrategicList(source.interviewFocus || source.interview_focus, 10, 260),
      recommendedEnvironments: normalizeStrategicList(
        source.recommendedEnvironments || source.recommended_environments,
        8,
        260,
      ),
    };
  }

  return {
    summary: normalizeStrategicText(source.summary, 900),
    compatibilityScore: Math.max(0, Math.min(100, toNumber(source.compatibilityScore || source.compatibility_score, 0))),
    synergies: normalizeStrategicList(source.synergies, 10, 260),
    potentialConflicts: normalizeStrategicList(source.potentialConflicts || source.potential_conflicts, 10, 260),
    coexistenceRecommendations: normalizeStrategicList(
      source.coexistenceRecommendations || source.coexistence_recommendations,
      10,
      260,
    ),
    leadershipGuidance: normalizeStrategicText(source.leadershipGuidance || source.leadership_guidance, 900),
  };
}

function hasMeaningfulStrategicPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return false;
  return Object.values(payload).some((value) => {
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.values(value).some((entry) => Boolean(toText(entry)));
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    return false;
  });
}

function formatStrategicContextBlock(context = {}, scores = {}) {
  return [
    `Assessment ID: ${toText(context.assessmentId) || 'n/d'}`,
    `Report ID: ${toText(context.reportId) || 'n/d'}`,
    `Respondente: ${toText(context.respondentName) || 'n/d'}`,
    `Email: ${toText(context.candidateEmail) || 'n/d'}`,
    `Tipo: ${toText(context.reportType) || 'business'}`,
    `Perfil: ${toText(context.profileCode || `${context.dominantFactor}/${context.secondaryFactor}`) || 'n/d'}`,
    `Predominante: ${toText(context.dominantFactor) || 'n/d'}`,
    `Secundário: ${toText(context.secondaryFactor) || 'n/d'}`,
    `Scores: D=${toNumber(scores.D, 0)}% | I=${toNumber(scores.I, 0)}% | S=${toNumber(scores.S, 0)}% | C=${toNumber(scores.C, 0)}%`,
    `Resumo: ${toText(context.summary) || 'Não informado.'}`,
    `Forças: ${(context.strengths || []).length ? context.strengths.join(' | ') : 'Não informado.'}`,
    `Atenções: ${(context.limitations || []).length ? context.limitations.join(' | ') : 'Não informado.'}`,
    `Riscos: ${(context.riskSignals || []).length ? context.riskSignals.join(' | ') : toText(context.riskProfile) || 'Não informado.'}`,
    `Recomendações: ${(context.developmentRecommendations || []).length ? context.developmentRecommendations.join(' | ') : 'Não informado.'}`,
  ].join('\n');
}

function buildStrategicUserPrompt({
  moduleKey,
  segment,
  primaryContext,
  primaryScores,
  compareContext,
  compareScores,
  history = [],
  jobContext = {},
}) {
  const normalizedHistory = Array.isArray(history)
    ? history
      .map((entry, index) => {
        const question = normalizeStrategicText(entry?.question, 240);
        const answer = normalizeStrategicText(entry?.answer, 320);
        if (!question && !answer) return '';
        return `Histórico ${index + 1}: Q=${question || 'n/d'} | A=${answer || 'n/d'}`;
      })
      .filter(Boolean)
      .slice(0, 8)
    : [];

  const jobDetails = [
    `Cargo alvo: ${normalizeStrategicText(jobContext?.roleTitle, 180) || 'n/d'}`,
    `Senioridade: ${normalizeStrategicText(jobContext?.seniority, 120) || 'n/d'}`,
    `Escopo de equipe: ${normalizeStrategicText(jobContext?.teamScope, 320) || 'n/d'}`,
    `Objetivo do negócio: ${normalizeStrategicText(jobContext?.businessGoal, 320) || 'n/d'}`,
  ].join('\n');

  return [
    `MÓDULO SOLICITADO: ${moduleKey}`,
    `SEGMENTO: ${segment}`,
    '',
    'CONTEXTO PRINCIPAL (REAL):',
    formatStrategicContextBlock(primaryContext, primaryScores),
    '',
    compareContext
      ? [
          'CONTEXTO SECUNDÁRIO PARA FIT (REAL):',
          formatStrategicContextBlock(compareContext, compareScores),
          '',
        ].join('\n')
      : '',
    'CONTEXTO COMPLEMENTAR DE VAGA/EQUIPE:',
    jobDetails,
    '',
    'HISTÓRICO DISPONÍVEL:',
    normalizedHistory.length ? normalizedHistory.join('\n') : 'Sem histórico adicional.',
    '',
    'Instrução final: entregue orientação prática de gestão de pessoas baseada exclusivamente nesses dados.',
  ].join('\n');
}

function buildStrategicJsonShape(moduleKey) {
  if (moduleKey === AI_STRATEGIC_MODULES.DEVELOPMENT_PLAN) {
    return [
      '{',
      '  "executiveSummary": "string",',
      '  "shortTerm": [{"focus":"string","behavior":"string","action":"string","frequency":"string","progressIndicator":"string"}],',
      '  "mediumTerm": [{"focus":"string","behavior":"string","action":"string","frequency":"string","progressIndicator":"string"}],',
      '  "longTerm": [{"focus":"string","behavior":"string","action":"string","frequency":"string","progressIndicator":"string"}],',
      '  "suggestions": ["string"]',
      '}',
    ].join('\n');
  }

  if (moduleKey === AI_STRATEGIC_MODULES.MANAGER_FEEDBACK) {
    return [
      '{',
      '  "opening": "string",',
      '  "positivePoints": ["string"],',
      '  "attentionPoints": ["string"],',
      '  "guidance": "string",',
      '  "closing": "string"',
      '}',
    ].join('\n');
  }

  if (moduleKey === AI_STRATEGIC_MODULES.DEBRIEF_SCRIPT) {
    return [
      '{',
      '  "opening": "string",',
      '  "keyMessages": ["string"],',
      '  "conversationFlow": ["string"],',
      '  "resistancePrevention": ["string"],',
      '  "questions": ["string"],',
      '  "closing": "string"',
      '}',
    ].join('\n');
  }

  if (moduleKey === AI_STRATEGIC_MODULES.BEHAVIORAL_RISK) {
    return [
      '{',
      '  "summary": "string",',
      '  "conflictRisk": "string",',
      '  "communicationRisk": "string",',
      '  "pressureRisk": "string",',
      '  "alignmentRisk": "string",',
      '  "mitigations": ["string"]',
      '}',
    ].join('\n');
  }

  if (moduleKey === AI_STRATEGIC_MODULES.TEAM_ALLOCATION) {
    return [
      '{',
      '  "summary": "string",',
      '  "bestContexts": ["string"],',
      '  "avoidContexts": ["string"],',
      '  "roleSuggestions": ["string"],',
      '  "collaborationGuidelines": ["string"]',
      '}',
    ].join('\n');
  }

  if (moduleKey === AI_STRATEGIC_MODULES.IDEAL_ROLE_PROFILE) {
    return [
      '{',
      '  "summary": "string",',
      '  "idealProfile": "string",',
      '  "fitSignals": ["string"],',
      '  "mismatchRisks": ["string"],',
      '  "interviewFocus": ["string"],',
      '  "recommendedEnvironments": ["string"]',
      '}',
    ].join('\n');
  }

  return [
    '{',
    '  "summary": "string",',
    '  "compatibilityScore": 0,',
    '  "synergies": ["string"],',
    '  "potentialConflicts": ["string"],',
    '  "coexistenceRecommendations": ["string"],',
    '  "leadershipGuidance": "string"',
    '}',
  ].join('\n');
}

async function resolveAuthorizedCoachAssessment(user = {}, context = {}) {
  const assessmentId = toText(context.assessmentId);
  const reportId = toText(context.reportId);

  if (!assessmentId && !reportId) {
    return null;
  }

  const identityFilters = [];
  if (assessmentId) identityFilters.push({ id: assessmentId });
  if (reportId) identityFilters.push({ report: { id: reportId } });

  const role = toText(user?.role).toUpperCase();
  const email = toText(user?.email).toLowerCase();
  const isSuperAdmin = isSuperAdminUser(user);

  let scopeFilter = {};

  if (!isSuperAdmin) {
    if (role === 'CANDIDATE' || role === 'USER') {
      scopeFilter = {
        OR: [
          ...(toText(user?.id) ? [{ candidateUserId: toText(user.id) }] : []),
          ...(email ? [{ candidateEmail: email }] : []),
        ],
      };
    } else {
      const [ownedOrganizations, memberships] = await Promise.all([
        prisma.organization.findMany({
          where: { ownerId: toText(user?.id) },
          select: { id: true },
        }),
        prisma.organizationMember.findMany({
          where: { userId: toText(user?.id) },
          select: { organizationId: true },
        }),
      ]);

      const allowedOrganizationIds = Array.from(
        new Set([
          ...ownedOrganizations.map((item) => item.id),
          ...memberships.map((item) => item.organizationId),
        ].filter(Boolean)),
      );

      if (!allowedOrganizationIds.length) {
        return null;
      }

      scopeFilter = {
        organizationId: {
          in: allowedOrganizationIds,
        },
      };
    }
  }

  const where = {
    AND: [
      { OR: identityFilters },
      scopeFilter,
      { report: { isNot: null } },
    ],
  };

  return prisma.assessment.findFirst({
    where,
    include: { report: true },
    orderBy: { createdAt: 'desc' },
  });
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function resolveAuthorizedStrategicContext({ user, input, requestContext }) {
  if (!requestContext.assessmentId && !requestContext.reportId) {
    throw createHttpError(
      400,
      'COACH_CONTEXT_REPORT_REQUIRED',
      'Selecione um relatório válido antes de gerar insights estratégicos.',
    );
  }

  const assessment = await resolveAuthorizedCoachAssessment(user, requestContext);
  if (!assessment || !assessment.report) {
    throw createHttpError(
      404,
      'COACH_REPORT_NOT_FOUND',
      'Não foi possível localizar o relatório selecionado para este usuário.',
    );
  }

  const reportContext = buildCoachReportContext({
    id: assessment.id,
    assessmentId: assessment.id,
    reportId: assessment.report?.id,
    reportType: requestContext.reportType || input.mode || 'business',
    type: requestContext.reportType || input.mode || 'business',
    candidateName: assessment.candidateName,
    candidateEmail: assessment.candidateEmail,
    completedAt: assessment.completedAt,
    createdAt: assessment.createdAt,
    discProfile: assessment.report?.discProfile || {},
  });

  const context = mergeRealCoachContext({
    input,
    requestContext,
    reportContext,
  });

  const scores = normalizeDiscScores(reportContext?.scores || {
    D: input.D,
    I: input.I,
    S: input.S,
    C: input.C,
  });
  const rankedFactors = rankDiscFactors(scores);
  const primaryFactor = toText(context.dominantFactor || rankedFactors[0]?.factor || 'D').toUpperCase();
  const secondaryFactor = toText(context.secondaryFactor || rankedFactors[1]?.factor || 'I').toUpperCase();
  const profileCode = toText(context.profileCode || `${primaryFactor}/${secondaryFactor}`).toUpperCase();

  return {
    context: {
      ...context,
      dominantFactor: primaryFactor,
      secondaryFactor,
      profileCode,
    },
    scores,
    primaryFactor,
    secondaryFactor,
    profileCode,
  };
}

function mergeRealCoachContext({ input, requestContext, reportContext }) {
  return normalizeCoachContext({
    ...requestContext,
    reportId: reportContext?.reportId || requestContext.reportId,
    assessmentId: reportContext?.assessmentId || requestContext.assessmentId,
    reportType: reportContext?.reportType || requestContext.reportType || input.mode || 'business',
    profileCode: reportContext?.profileCode || requestContext.profileCode,
    dominantFactor: reportContext?.dominantFactor || requestContext.dominantFactor,
    secondaryFactor: reportContext?.secondaryFactor || requestContext.secondaryFactor,
    respondentName: reportContext?.respondentName || requestContext.respondentName || toText(input.nome),
    candidateEmail: reportContext?.candidateEmail || requestContext.candidateEmail,
    completedAt: toText(reportContext?.completedAt || requestContext.completedAt),
    summary: reportContext?.summary || requestContext.summary,
    strengths: (reportContext?.strengths || []).length
      ? reportContext.strengths
      : requestContext.strengths,
    limitations: (reportContext?.limitations || []).length
      ? reportContext.limitations
      : requestContext.limitations,
    developmentRecommendations: (reportContext?.developmentRecommendations || []).length
      ? reportContext.developmentRecommendations
      : requestContext.developmentRecommendations,
    riskSignals: requestContext.riskSignals,
    riskProfile: requestContext.riskProfile,
  });
}

function requireAiAccess(req, res, next) {
  if (env.nodeEnv !== 'production') {
    return next();
  }

  return requireAuth(req, res, () => attachUser(req, res, next));
}

function requireAiFeature(feature) {
  return (req, res, next) => {
    if (!req.user?.id) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    const currentPlan = resolveUserPlan(req.user || {});
    if (hasFeatureAccess(currentPlan, feature)) {
      return next();
    }

    return sendSafeJsonError(res, {
      status: 403,
      error: 'FEATURE_PLAN_REQUIRED',
      message: 'Plano atual sem acesso ao recurso solicitado.',
      details: {
        feature,
        plan: currentPlan,
        requiredPlan: resolveFeatureMinimumPlan(feature),
      },
    });
  };
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
    const input = reportPreviewInputSchema.parse(req.body || {});
    const context = normalizeCoachContext(input.context);
    const scores = normalizeDiscScores({
      D: input.D,
      I: input.I,
      S: input.S,
      C: input.C,
    });
    const rankedFactors = rankDiscFactors(scores);
    const dominantFactor = toText(context.dominantFactor || rankedFactors[0]?.factor || 'D').toUpperCase();
    const secondaryFactor = toText(context.secondaryFactor || rankedFactors[1]?.factor || 'I').toUpperCase();
    const normalizedSegment = normalizeAiSegment(input.segment);
    const userPrompt = buildReportPreviewUserPrompt({
      input,
      context: {
        ...context,
        dominantFactor,
        secondaryFactor,
        reportType: context.reportType || input.mode || 'business',
      },
      scores,
      segment: normalizedSegment,
    });
    const systemPrompt = resolveReportPreviewSystemPrompt(normalizedSegment);

    const groqResult = await generateWithGroq({
      userPrompt,
      systemPrompt,
      maxTokens: 1400,
      temperature: 0.28,
      responseFormat: 'json_object',
      logLabel: `report_preview:${normalizedSegment}`,
    });

    const parsedContent = parseProviderJsonSafely(groqResult.text, {
      provider: 'groq',
      model: groqResult.model,
    });
    const normalizedContent = normalizePreviewContent(parsedContent);

    return res.status(200).json({
      ok: true,
      provider: 'groq',
      model: toText(groqResult.model || env.groqModel || 'llama3-70b-8192'),
      source: 'groq',
      segment: normalizedSegment,
      usedFallback: false,
      attempts: [
        {
          provider: 'groq',
          model: toText(groqResult.model || env.groqModel || 'llama3-70b-8192'),
          status: 'ok',
        },
      ],
      preview: {
        summary: normalizedContent.summary,
        executiveSummary: normalizedContent.executiveSummary,
        strengths: normalizedContent.strengths,
        limitations: normalizedContent.limitations,
        developmentRecommendations: normalizedContent.developmentRecommendations,
      },
      content: normalizedContent,
      meta: {
        mode: input.mode || 'business',
        segment: normalizedSegment,
        scores,
      },
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
      status: 503,
      error: 'AI_REPORT_PREVIEW_FAILED',
      message: 'Não foi possível gerar o insight agora. Tente novamente.',
    });
  }
});

router.post('/strategic-insights', requireAuth, attachUser, requireAiFeature('ai_lab'), async (req, res) => {
  const startedAt = Date.now();

  try {
    const input = strategicInputSchema.parse(req.body || {});
    const moduleKey = normalizeStrategicModule(input.module);
    const segment = normalizeAiSegment(input.segment);

    if (!req.user?.id) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    const primaryRequestContext = normalizeCoachContext(input.context);
    const primaryResolved = await resolveAuthorizedStrategicContext({
      user: req.user,
      input: {
        ...input,
        D: toNumber(input?.D, 0),
        I: toNumber(input?.I, 0),
        S: toNumber(input?.S, 0),
        C: toNumber(input?.C, 0),
      },
      requestContext: primaryRequestContext,
    });
    const primaryRiskSignals = buildRiskSignals(primaryResolved.scores, primaryResolved.context);

    let compareResolved = null;
    if (moduleKey === AI_STRATEGIC_MODULES.PROFILE_FIT) {
      const compareRequestContext = normalizeCoachContext(input.compareContext);
      if (!compareRequestContext.assessmentId && !compareRequestContext.reportId) {
        throw createHttpError(
          400,
          'STRATEGIC_COMPARE_CONTEXT_REQUIRED',
          'Selecione dois relatórios para gerar análise de fit entre perfis.',
        );
      }

      compareResolved = await resolveAuthorizedStrategicContext({
        user: req.user,
        input: {
          ...input,
          D: toNumber(input?.D, 0),
          I: toNumber(input?.I, 0),
          S: toNumber(input?.S, 0),
          C: toNumber(input?.C, 0),
        },
        requestContext: compareRequestContext,
      });
      compareResolved = {
        ...compareResolved,
        context: {
          ...compareResolved.context,
          riskSignals: buildRiskSignals(compareResolved.scores, compareResolved.context),
        },
      };
    }

    const userPromptBase = buildStrategicUserPrompt({
      moduleKey,
      segment,
      primaryContext: {
        ...primaryResolved.context,
        riskSignals: primaryRiskSignals,
      },
      primaryScores: primaryResolved.scores,
      compareContext: compareResolved?.context || null,
      compareScores: compareResolved?.scores || null,
      history: input.history || [],
      jobContext: input.jobContext || {},
    });
    const userPrompt = [
      userPromptBase,
      '',
      'Retorne apenas JSON válido, sem markdown, neste formato:',
      buildStrategicJsonShape(moduleKey),
    ].join('\n');
    const systemPrompt = resolveStrategicSystemPrompt({
      segment,
      moduleKey,
    });

    const groqResult = await generateWithGroq({
      systemPrompt,
      userPrompt,
      maxTokens: 1700,
      temperature: 0.24,
      responseFormat: 'json_object',
      logLabel: `strategic:${moduleKey}:${segment}`,
    });

    const parsed = parseProviderJsonSafely(groqResult.text, {
      provider: 'groq',
      model: groqResult.model,
    });
    const normalizedData = normalizeStrategicModulePayload(moduleKey, parsed);

    if (!hasMeaningfulStrategicPayload(normalizedData)) {
      throw createHttpError(
        503,
        'AI_STRATEGIC_EMPTY_RESPONSE',
        'Não foi possível gerar o insight agora. Tente novamente.',
      );
    }

    return res.status(200).json({
      ok: true,
      provider: 'groq',
      model: toText(groqResult?.model || env.groqModel || 'llama3-70b-8192'),
      source: 'groq',
      usedFallback: false,
      module: moduleKey,
      segment,
      durationMs: Date.now() - startedAt,
      data: normalizedData,
      context: {
        primary: {
          reportId: primaryResolved.context.reportId,
          assessmentId: primaryResolved.context.assessmentId,
          respondentName: primaryResolved.context.respondentName,
          profileCode: primaryResolved.profileCode,
          dominantFactor: primaryResolved.primaryFactor,
          secondaryFactor: primaryResolved.secondaryFactor,
          scores: primaryResolved.scores,
        },
        compare: compareResolved
          ? {
              reportId: compareResolved.context.reportId,
              assessmentId: compareResolved.context.assessmentId,
              respondentName: compareResolved.context.respondentName,
              profileCode: compareResolved.profileCode,
              dominantFactor: compareResolved.primaryFactor,
              secondaryFactor: compareResolved.secondaryFactor,
              scores: compareResolved.scores,
            }
          : null,
      },
      attempts: [
        {
          provider: 'groq',
          model: toText(groqResult?.model || env.groqModel || 'llama3-70b-8192'),
          status: 'ok',
        },
      ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_AI_STRATEGIC_PAYLOAD',
        message: 'Payload inválido para insights estratégicos.',
      });
    }

    if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
      return sendSafeJsonError(res, {
        status: Number(error.status),
        error: toText(error?.code || 'AI_STRATEGIC_INPUT_INVALID'),
        message: toText(error?.message || 'Não foi possível processar esta solicitação.'),
      });
    }

    return sendSafeJsonError(res, {
      status: 503,
      error: 'AI_STRATEGIC_PROVIDER_FAILED',
      message: 'Não foi possível gerar o insight agora. Tente novamente.',
    });
  }
});

async function handleCoachRequest(req, res) {
  try {
    const input = coachInputSchema.parse(req.body || {});
    const requestContext = normalizeCoachContext(input.context);

    if (!req.user?.id) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    const resolved = await resolveAuthorizedStrategicContext({
      user: req.user,
      input,
      requestContext,
    });
    const { context, scores, primaryFactor, secondaryFactor, profileCode } = resolved;
    const riskSignals = buildRiskSignals(scores, context);
    const segment = normalizeAiSegment(input.segment);

    const systemInstruction = resolveCoachSystemPrompt(segment);
    const userPrompt = buildCoachUserPrompt({
      input,
      context: {
        ...context,
        profileCode,
        dominantFactor: primaryFactor,
        secondaryFactor,
      },
      scores,
      primaryFactor,
      secondaryFactor,
      riskSignals,
    });

    const coachResult = await generateWithGroq({
      systemPrompt: systemInstruction,
      userPrompt,
      temperature: 0.32,
      maxTokens: 1100,
      logLabel: `coach:${segment}`,
    });

    return res.status(200).json({
      ok: true,
      provider: 'groq',
      model: toText(coachResult?.model || env.groqModel || 'llama3-70b-8192'),
      source: 'groq',
      usedFallback: false,
      segment,
      question: input.question,
      answer: toText(coachResult?.text),
      context: {
        reportId: context.reportId,
        assessmentId: context.assessmentId,
        reportType: context.reportType,
        profileCode,
        dominantFactor: primaryFactor,
        secondaryFactor,
        respondentName: context.respondentName,
        candidateEmail: context.candidateEmail,
        completedAt: context.completedAt,
      },
      disc: {
        mode: toText(context.reportType || input.mode || 'business'),
        scores,
        primaryFactor,
        secondaryFactor,
      },
      supporting: {
        summary: context.summary,
        strengths: context.strengths,
        limitations: context.limitations,
        riskSignals,
        developmentRecommendations: context.developmentRecommendations,
      },
      attempts: [
        {
          provider: 'groq',
          model: toText(coachResult?.model || env.groqModel || 'llama3-70b-8192'),
          status: 'ok',
        },
      ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_AI_COACH_PAYLOAD',
        message: 'Payload inválido para o Coach AI.',
      });
    }

    if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
      return sendSafeJsonError(res, {
        status: Number(error.status),
        error: toText(error?.code || 'AI_COACH_INPUT_INVALID'),
        message: toText(error?.message || 'Não foi possível processar esta solicitação.'),
      });
    }

    return sendSafeJsonError(res, {
      status: 503,
      error: 'AI_COACH_PROVIDER_FAILED',
      message: 'Não foi possível gerar o insight agora. Tente novamente.',
    });
  }
}

router.post('/coach', requireAuth, attachUser, requireAiFeature('coach'), handleCoachRequest);
router.post('/coach-answer', requireAuth, attachUser, requireAiFeature('coach'), handleCoachRequest);

export default router;
