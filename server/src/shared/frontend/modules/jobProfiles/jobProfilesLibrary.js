import { normalizeDiscScores } from '../discEngine/index.js';

const JOB_PROFILE_LIBRARY = Object.freeze([
  {
    key: 'sales',
    label: 'Vendas',
    category: 'comercial',
    description: 'Prospecção, negociação e fechamento com foco em ritmo de resultado.',
    scores: { D: 36, I: 34, S: 14, C: 16 },
    suitableFor: ['DI', 'ID', 'DC'],
  },
  {
    key: 'sales_hunter',
    label: 'Comercial Hunter',
    category: 'comercial',
    description: 'Prospecção ativa e negociação com alto foco em tração de resultado.',
    scores: { D: 38, I: 34, S: 16, C: 12 },
    suitableFor: ['DI', 'ID', 'DC'],
  },
  {
    key: 'manager',
    label: 'Gestor',
    category: 'lideranca',
    description: 'Coordenação de pessoas, priorização e gestão de performance.',
    scores: { D: 33, I: 24, S: 19, C: 24 },
    suitableFor: ['DC', 'DI', 'SC'],
  },
  {
    key: 'analyst',
    label: 'Analista',
    category: 'analitico',
    description: 'Análise técnica, consistência, organização e qualidade de entrega.',
    scores: { D: 14, I: 12, S: 30, C: 44 },
    suitableFor: ['CD', 'CS', 'SC'],
  },
  {
    key: 'quality_analyst',
    label: 'Analista de Qualidade',
    category: 'analitico',
    description: 'Critério técnico, padronização e melhoria contínua.',
    scores: { D: 14, I: 12, S: 30, C: 44 },
    suitableFor: ['CD', 'CS', 'SC'],
  },
  {
    key: 'support',
    label: 'Suporte',
    category: 'atendimento',
    description: 'Atendimento contínuo, estabilidade de rotina e cuidado relacional.',
    scores: { D: 14, I: 28, S: 40, C: 18 },
    suitableFor: ['SI', 'IS', 'SC'],
  },
  {
    key: 'operations',
    label: 'Operações',
    category: 'operacional',
    description: 'Execução previsível, controle de processo e confiabilidade operacional.',
    scores: { D: 24, I: 14, S: 36, C: 26 },
    suitableFor: ['SC', 'CS', 'DC'],
  },
  {
    key: 'operations_manager',
    label: 'Gestão Operacional',
    category: 'operacional',
    description: 'Execução previsível com controle de processo e consistência de qualidade.',
    scores: { D: 24, I: 14, S: 36, C: 26 },
    suitableFor: ['SC', 'DC', 'CS'],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    category: 'criativo',
    description: 'Comunicação, influência, mobilização e adaptação rápida ao mercado.',
    scores: { D: 24, I: 40, S: 16, C: 20 },
    suitableFor: ['ID', 'IC', 'DI'],
  },
  {
    key: 'project_lead',
    label: 'Liderança de Projetos',
    category: 'lideranca',
    description: 'Orquestração de prioridades, alinhamento entre áreas e cadência de entrega.',
    scores: { D: 32, I: 22, S: 22, C: 24 },
    suitableFor: ['DC', 'DI', 'SC'],
  },
  {
    key: 'customer_success',
    label: 'Customer Success',
    category: 'atendimento',
    description: 'Retenção, relacionamento contínuo e expansão com base em confiança.',
    scores: { D: 16, I: 32, S: 34, C: 18 },
    suitableFor: ['IS', 'SI', 'IC'],
  },
]);

function safeText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toSimpleScores(rawScores = {}) {
  const normalized = normalizeDiscScores(rawScores);
  return normalized.normalized;
}

function toRangeScores(rawScores = {}) {
  const normalized = toSimpleScores(rawScores);
  return Object.entries(normalized).reduce((acc, [factor, value]) => {
    const min = Math.max(0, Math.round(value - 15));
    const max = Math.min(100, Math.round(value + 15));
    acc[factor] = {
      min,
      max,
      ideal: Math.round(value),
    };
    return acc;
  }, {});
}

function normalizeJobProfileEntry(entry = {}) {
  return {
    key: safeText(entry?.key),
    label: safeText(entry?.label, 'Cargo'),
    category: safeText(entry?.category, 'geral'),
    description: safeText(entry?.description),
    scores: toSimpleScores(entry?.scores || {}),
    ideal_profile: toRangeScores(entry?.scores || {}),
    suitableFor: Array.isArray(entry?.suitableFor) ? entry.suitableFor.filter(Boolean) : [],
  };
}

export function listJobProfiles() {
  return JOB_PROFILE_LIBRARY.map((entry) => normalizeJobProfileEntry(entry));
}

export function getJobProfileByKey(rawKey = '') {
  const key = safeText(rawKey).toLowerCase();
  if (!key) return null;
  const found = JOB_PROFILE_LIBRARY.find((entry) => safeText(entry?.key).toLowerCase() === key);
  return found ? normalizeJobProfileEntry(found) : null;
}

export function getJobProfileByLabel(rawLabel = '') {
  const label = safeText(rawLabel).toLowerCase();
  if (!label) return null;
  const found = JOB_PROFILE_LIBRARY.find((entry) => safeText(entry?.label).toLowerCase() === label);
  return found ? normalizeJobProfileEntry(found) : null;
}

export function getJobProfilesByCategory(rawCategory = '') {
  const category = safeText(rawCategory).toLowerCase();
  if (!category) return listJobProfiles();
  return JOB_PROFILE_LIBRARY
    .filter((entry) => safeText(entry?.category).toLowerCase() === category)
    .map((entry) => normalizeJobProfileEntry(entry));
}

export function normalizeJobIdealProfile(rawProfile = {}) {
  const direct =
    rawProfile?.scores ||
    rawProfile?.idealProfile ||
    rawProfile?.ideal_profile ||
    rawProfile?.disc ||
    rawProfile;

  const hasRangeShape =
    direct &&
    ['D', 'I', 'S', 'C'].every((factor) => typeof direct?.[factor] === 'object' && direct?.[factor] !== null);

  if (!hasRangeShape) {
    return {
      scores: toSimpleScores(direct || {}),
      idealProfile: toRangeScores(direct || {}),
    };
  }

  const simpleScores = ['D', 'I', 'S', 'C'].reduce((acc, factor) => {
    const min = Number(direct?.[factor]?.min ?? 0);
    const max = Number(direct?.[factor]?.max ?? 100);
    const ideal = Number(direct?.[factor]?.ideal ?? (min + max) / 2);
    const boundedMin = Math.max(0, Math.min(100, Math.min(min, max)));
    const boundedMax = Math.max(0, Math.min(100, Math.max(min, max)));
    const boundedIdeal = Math.max(boundedMin, Math.min(boundedMax, ideal));
    acc[factor] = Math.round(boundedIdeal);
    return acc;
  }, {});

  return {
    scores: toSimpleScores(simpleScores),
    idealProfile: ['D', 'I', 'S', 'C'].reduce((acc, factor) => {
      const min = Number(direct?.[factor]?.min ?? 0);
      const max = Number(direct?.[factor]?.max ?? 100);
      const ideal = Number(direct?.[factor]?.ideal ?? simpleScores[factor]);
      const boundedMin = Math.max(0, Math.min(100, Math.min(min, max)));
      const boundedMax = Math.max(0, Math.min(100, Math.max(min, max)));
      const boundedIdeal = Math.max(boundedMin, Math.min(boundedMax, ideal));
      acc[factor] = {
        min: Math.round(boundedMin),
        max: Math.round(boundedMax),
        ideal: Math.round(boundedIdeal),
      };
      return acc;
    }, {}),
  };
}

export const JOB_PROFILE_KEYS = Object.freeze(JOB_PROFILE_LIBRARY.map((entry) => entry.key));
