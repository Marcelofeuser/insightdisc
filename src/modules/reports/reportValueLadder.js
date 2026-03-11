import { normalizePlan } from '../billing/planConfig.js';

export const REPORT_TIER = Object.freeze({
  STANDARD: 'standard',
  PREMIUM: 'premium',
  PROFESSIONAL: 'professional',
});

export const REPORT_TIER_ORDER = Object.freeze([
  REPORT_TIER.STANDARD,
  REPORT_TIER.PREMIUM,
  REPORT_TIER.PROFESSIONAL,
]);

export const REPORT_TIER_META = Object.freeze({
  [REPORT_TIER.STANDARD]: Object.freeze({
    key: REPORT_TIER.STANDARD,
    label: 'Standard Report',
    audience: 'Personal',
    toneClassName: 'border-slate-200 bg-white text-slate-900',
    summary: 'Leitura essencial do perfil predominante com visao inicial de comportamento.',
    highlights: ['Resumo curto do estilo', 'Radar base DISC', 'Forcas iniciais e pontos de atencao'],
    ctaLabel: 'Comecar no Personal',
    ctaTo: '/StartFree',
    plan: 'personal',
  }),
  [REPORT_TIER.PREMIUM]: Object.freeze({
    key: REPORT_TIER.PREMIUM,
    label: 'Premium Report',
    audience: 'Professional',
    toneClassName: 'border-indigo-200 bg-indigo-50/50 text-slate-900',
    summary: 'Leitura aprofundada para operacao profissional com recomendacoes praticas.',
    highlights: ['Resumo executivo e leitura longa', 'Secoes comportamentais completas', 'Comparacao avancada integrada'],
    ctaLabel: 'Ativar Professional',
    ctaTo: '/Pricing',
    plan: 'professional',
  }),
  [REPORT_TIER.PROFESSIONAL]: Object.freeze({
    key: REPORT_TIER.PROFESSIONAL,
    label: 'Professional Report',
    audience: 'Business',
    toneClassName: 'border-sky-200 bg-sky-50/50 text-slate-900',
    summary: 'Camada executiva para inteligencia organizacional e decisoes corporativas.',
    highlights: ['Inteligencia de equipe e contexto organizacional', 'Leituras para RH, lideranca e cultura', 'Preparado para operacao empresarial em escala'],
    ctaLabel: 'Ativar Business',
    ctaTo: '/empresa',
    plan: 'business',
  }),
});

export function resolveReportTierByPlan(plan) {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan === 'business') return REPORT_TIER.PROFESSIONAL;
  if (normalizedPlan === 'professional') return REPORT_TIER.PREMIUM;
  return REPORT_TIER.STANDARD;
}

export function getReportTierMeta(tier) {
  return REPORT_TIER_META[tier] || REPORT_TIER_META[REPORT_TIER.STANDARD];
}

export function getReportTierProgress(currentTier) {
  const currentIndex = REPORT_TIER_ORDER.indexOf(currentTier);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  return REPORT_TIER_ORDER.map((tier, index) => {
    const meta = getReportTierMeta(tier);
    return {
      ...meta,
      tier,
      state: index < safeIndex ? 'passed' : index === safeIndex ? 'current' : 'upcoming',
    };
  });
}
