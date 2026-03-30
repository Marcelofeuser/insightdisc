import { exec } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import { verifyPublicReportToken } from '../lib/public-report-token.js';
import { generateAiDiscContent, generateAiRecommendationRationale } from '../modules/ai/ai-report.service.js';
import { sendEmail } from './email.service.js';
import { reportReadyEmail } from '../emails/reportReady.js';
import { normalizeBrandingFromOrganization } from '../modules/branding/branding-service.js';
import { calculateDiscFromAnswers } from '../modules/disc/calculate-disc.js';
import { resolveDiscDevelopmentRecommendation } from '../modules/disc/development-recommendation.service.js';
import { resolveDiscProfile } from '../modules/disc/report-profile-resolver.js';
import {
  REPORT_TYPE,
  normalizeReportType as normalizeCanonicalReportType,
  resolveStoredReportType,
} from '../modules/report/report-type.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveProjectRoot() {
  const candidates = [
    path.resolve(__dirname, '../../..'),
    path.resolve(__dirname, '../..'),
  ];

  for (const candidate of candidates) {
    if (
      existsSync(path.join(candidate, 'lib/pdf/build-report-html.ts')) ||
      existsSync(path.join(candidate, 'public/relatorio_teste/disc_engine.js'))
    ) {
      return candidate;
    }
  }

  return path.resolve(__dirname, '../..');
}

function resolveTemplateApprovedRoot() {
  const candidates = [
    path.resolve(__dirname, '../../..', 'server/report-templates/approved'),
    path.resolve(__dirname, '../..', 'report-templates/approved'),
    path.resolve(process.cwd(), 'server/report-templates/approved'),
    path.resolve(process.cwd(), 'report-templates/approved'),
  ];

  for (const candidate of candidates) {
    if (
      existsSync(path.join(candidate, 'html')) &&
      existsSync(path.join(candidate, 'engine'))
    ) {
      return candidate;
    }
  }

  return path.resolve(__dirname, '../../..', 'server/report-templates/approved');
}

const PROJECT_ROOT = resolveProjectRoot();
const REPORT_TEMPLATE_APPROVED_ROOT = resolveTemplateApprovedRoot();
const basePath = path.join(REPORT_TEMPLATE_APPROVED_ROOT, 'html');
const MASTER_TEMPLATE_PATH = path.join(basePath, 'relatorio_disc_business.html');
const DISC_ENGINE_RUNTIME_PATH = path.join(REPORT_TEMPLATE_APPROVED_ROOT, 'engine/disc_engine.js');
const REPORT_PLACEHOLDER_KEYS = Object.freeze([
  'name',
  'profile',
  'disc_d',
  'disc_i',
  'disc_s',
  'disc_c',
]);
const PROFILE_NAMES = Object.freeze({
  DD: 'Dominante Puro',
  DI: 'Dominante Influente',
  DS: 'Dominante Estável',
  DC: 'Dominante Analítico',
  ID: 'Influente Dominante',
  II: 'Influente Puro',
  IS: 'Influente Estável',
  IC: 'Influente Analítico',
  SD: 'Estável Dominante',
  SI: 'Estável Influente',
  SS: 'Estável Puro',
  SC: 'Estável Analítico',
  CD: 'Analítico Dominante',
  CI: 'Analítico Influente',
  CS: 'Analítico Estável',
  CC: 'Analítico Puro',
});
const DISC_FACTOR_KEYS = Object.freeze(['D', 'I', 'S', 'C']);
const FACTOR_META = Object.freeze({
  D: Object.freeze({
    name: 'Dominância',
    shortName: 'Dominância',
    archetype: 'Dominante',
    icon: 'D',
  }),
  I: Object.freeze({
    name: 'Influência',
    shortName: 'Influência',
    archetype: 'Influente',
    icon: 'I',
  }),
  S: Object.freeze({
    name: 'Estabilidade',
    shortName: 'Estabilidade',
    archetype: 'Estável',
    icon: 'S',
  }),
  C: Object.freeze({
    name: 'Conformidade',
    shortName: 'Conformidade',
    archetype: 'Analítico',
    icon: 'C',
  }),
});
const DISC_RANK_LABELS_LOWER = Object.freeze([
  'Perfil primário',
  'Perfil secundário',
  'Terciário',
  'Quaternário',
]);
const DISC_RANK_LABELS_TITLE = Object.freeze([
  'Perfil Primário',
  'Perfil Secundário',
  'Terciário',
  'Quaternário',
]);
const REPORT_LIB_TS_FILES = Object.freeze([
  'lib/domain/reports/report-types.ts',
  'lib/domain/reports/report-template-map.ts',
  'lib/pdf/load-report-template.ts',
  'lib/pdf/report-placeholder-schema.ts',
  'lib/pdf/build-report-html.ts',
]);

const REPORT_OUTPUTS = {
  personal: {
    html: 'relatorio_disc_personal.html',
    pdf: 'relatorio_disc_personal.pdf',
  },
  professional: {
    html: 'relatorio_disc_professional.html',
    pdf: 'relatorio_disc_professional.pdf',
  },
  business: {
    html: 'relatorio_disc_business.html',
    pdf: 'relatorio_disc_business.pdf',
  },
};
const OFFICIAL_TEMPLATE_PATHS = Object.freeze({
  personal: 'relatorio_disc_personal.html',
  professional: 'relatorio_disc_professional.html',
  business: 'relatorio_disc_business.html',
});
const OFFICIAL_TEMPLATE_VALIDATION_HTML =
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" /></head><body>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}} {{disc_c}}</body></html>';
const modeLocks = new Map();
const templateCache = new Map();
const templateInflight = new Map();
const GENERATED_REPORT_CACHE_TTL_MS = 10 * 60 * 1000;
const generatedReportCache = new Map();
let reportHtmlEnginePromise = null;
let discEngineRuntimePromise = null;
let premiumReportPipelinePromise = null;

function normalizeMode(mode = 'business') {
  const normalized = String(mode || '').trim().toLowerCase();
  return REPORT_OUTPUTS[normalized] ? normalized : 'business';
}

function sanitizeLogValue(value, maximumLength = 400) {
  return String(value || '')
    .trim()
    .slice(0, maximumLength);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildArg(name, value) {
  if (value === undefined || value === null || value === '') return '';
  return ` --${name}=${shellEscape(value)}`;
}

function hasMeaningfulAiSourceContent(content) {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      Object.entries(content).some(([field, value]) => {
        if (field === 'tone') return false;
        if (typeof value === 'string') return Boolean(value.trim());
        if (Array.isArray(value)) return value.some((item) => Boolean(String(item || '').trim()));
        return false;
      }),
  );
}

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function toPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createReportGeneratorError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;

  if (details && Object.keys(details).length > 0) {
    error.details = details;
  }

  return error;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeScoresSnapshot(scores = {}, options = {}) {
  const allowDefaultValues = options.allowDefaultValues !== false;
  const fallback = allowDefaultValues
    ? { D: 34, I: 32, S: 23, C: 11 }
    : { D: 0, I: 0, S: 0, C: 0 };
  const raw = {
    D: Math.max(0, toNumber(getFactorValue(scores, 'D'), fallback.D)),
    I: Math.max(0, toNumber(getFactorValue(scores, 'I'), fallback.I)),
    S: Math.max(0, toNumber(getFactorValue(scores, 'S'), fallback.S)),
    C: Math.max(0, toNumber(getFactorValue(scores, 'C'), fallback.C)),
  };
  const hasAnyScore = Object.values(raw).some((value) => value > 0);

  if (!hasAnyScore) {
    return fallback;
  }

  return {
    D: clampPercentage(raw.D),
    I: clampPercentage(raw.I),
    S: clampPercentage(raw.S),
    C: clampPercentage(raw.C),
  };
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value, 0))));
}

function getLevel(value) {
  const normalized = clampPercentage(value);
  if (normalized <= 10) return 'muito baixo';
  if (normalized <= 30) return 'baixo';
  if (normalized <= 60) return 'moderado';
  return 'alto';
}

function isHighD(value) {
  return toNumber(value, 0) > 60;
}

function capitalize(text = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return '';
  return `${normalized[0].toUpperCase()}${normalized.slice(1)}`;
}

function joinWithAnd(items = []) {
  const filtered = items.map((item) => toText(item)).filter(Boolean);
  if (filtered.length <= 1) {
    return filtered[0] || '';
  }

  if (filtered.length === 2) {
    return `${filtered[0]} e ${filtered[1]}`;
  }

  return `${filtered.slice(0, -1).join(', ')} e ${filtered.at(-1)}`;
}

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFactorValue(source = {}, factor = 'D') {
  const normalized = toPlainObject(source);
  const upper = String(factor || '').trim().toUpperCase();
  const lower = upper.toLowerCase();

  return pickFirstDefined(
    normalized[upper],
    normalized[lower],
    normalized[`disc_${lower}`],
    normalized[`DISC_${upper}`],
    normalized[`disc_${upper}`],
  );
}

function resolveNormalizedDiscScoreMap(...candidates) {
  for (const candidate of candidates) {
    const source = toPlainObject(candidate);
    if (!Object.keys(source).length) continue;

    const raw = {};
    let hasAnyScore = false;

    for (const factor of DISC_FACTOR_KEYS) {
      const value = getFactorValue(source, factor);
      if (value === undefined || value === null || value === '') {
        continue;
      }

      raw[factor] = Math.max(0, toNumber(value, 0));
      hasAnyScore = true;
    }

    if (hasAnyScore) {
      return normalizeScoresSnapshot(raw, { allowDefaultValues: false });
    }
  }

  return null;
}

function buildOrderedFactors(scores = {}) {
  const normalizedScores = Object.fromEntries(
    DISC_FACTOR_KEYS.map((factor) => [factor, clampPercentage(getFactorValue(scores, factor))]),
  );
  return resolveDiscProfile(normalizedScores).factors;
}

function buildRankLabels(orderedFactors = []) {
  const lower = {};
  const title = {};

  orderedFactors.forEach((factor, index) => {
    lower[factor.key] = DISC_RANK_LABELS_LOWER[index] || 'Quaternário';
    title[factor.key] = DISC_RANK_LABELS_TITLE[index] || 'Quaternário';
  });

  return { lower, title };
}

function resolveProfileName(primaryKey = 'D', secondaryKey = 'I', isCombined = true) {
  if (!isCombined) {
    return FACTOR_META[primaryKey]?.name || primaryKey;
  }

  const compactCode = `${primaryKey}${secondaryKey}`;
  return (
    PROFILE_NAMES[compactCode] ||
    `${FACTOR_META[primaryKey]?.name || primaryKey} / ${FACTOR_META[secondaryKey]?.name || secondaryKey}`
  );
}

function buildDiscProfile(scores = {}) {
  const normalizedScores = Object.fromEntries(
    DISC_FACTOR_KEYS.map((factor) => [factor, clampPercentage(getFactorValue(scores, factor))]),
  );
  const resolved = resolveDiscProfile(normalizedScores);

  return {
    factors: resolved.factors,
    primary: resolved.primary,
    secondary: resolved.secondary,
    tertiary: resolved.tertiary,
    quaternary: resolved.quaternary,
    isCombined: true,
    isBalanced: resolved.isBalanced,
    primaryGap: resolved.primaryGap,
    compactCode: resolved.compactCode,
    code: resolved.code,
    label: resolved.slashCode,
    slashCode: resolved.slashCode,
    name: resolved.name,
    ranks: buildRankLabels(resolved.factors),
  };
}

function computeProfileLabel(scores = {}) {
  const profile = buildDiscProfile(scores);
  return `${profile.compactCode} (${profile.name})`;
}

function buildRuntimeProfileLabel(profile = {}) {
  const slashCode = toText(profile.slashCode || profile.label || 'D/I');
  const profileName = toText(profile.name || 'Perfil DISC');
  return `${slashCode} (${profileName})`;
}

function formatFactorSnapshot(scores = {}) {
  const orderedFactors = buildOrderedFactors(scores);
  return joinWithAnd(
    orderedFactors.map(
      (factor) => `${FACTOR_META[factor.key].name} ${getLevel(factor.value)}`,
    ),
  );
}

function getFactorNarrative(factor = 'D', value = 0) {
  const level = getLevel(value);

  if (factor === 'D') {
    if (level === 'alto') {
      return 'Alta orientação a resultados, assertividade e conforto para decidir com rapidez.';
    }

    if (level === 'moderado') {
      return 'Assertividade em faixa equilibrada, com espaço para decisão sem excesso de imposição.';
    }

    if (level === 'baixo') {
      return 'Baixa tendência a confronto e comando direto; prefere influenciar sem impor ritmo ao grupo.';
    }

    return 'Dominância muito baixa: comando diretivo e postura dominante não aparecem como eixo central deste perfil.';
  }

  if (factor === 'I') {
    if (level === 'alto') {
      return 'Alta expressividade relacional, persuasão e facilidade para engajar pessoas.';
    }

    if (level === 'moderado') {
      return 'Boa sociabilidade, com comunicação acessível sem depender de exposição constante.';
    }

    if (level === 'baixo') {
      return 'Relacionamento mais seletivo e comunicação menos expansiva no contato social.';
    }

    return 'Influência muito baixa: prefere baixa exposição social e menor necessidade de persuasão pública.';
  }

  if (factor === 'S') {
    if (level === 'alto') {
      return 'Alta constância, cooperação e tolerância a rotinas estáveis.';
    }

    if (level === 'moderado') {
      return 'Boa estabilidade para sustentar acordos sem abrir mão de alguma flexibilidade.';
    }

    if (level === 'baixo') {
      return 'Baixa preferência por cadência lenta; tende a buscar movimento e mudança com mais frequência.';
    }

    return 'Estabilidade muito baixa: baixa tolerância a repetição, lentidão ou contextos excessivamente previsíveis.';
  }

  if (level === 'alto') {
    return 'Alta atenção a qualidade, critérios, método e redução de risco.';
  }

  if (level === 'moderado') {
    return 'Boa capacidade de análise e organização, com equilíbrio entre rigor e agilidade.';
  }

  if (level === 'baixo') {
    return 'Baixa necessidade de formalismo; tende a priorizar fluidez sobre regras e detalhes extensos.';
  }

  return 'Conformidade muito baixa: prefere flexibilidade e autonomia a normas rígidas, processos detalhados ou alto controle procedimental.';
}

function getPrimaryFocusNarrative(profile = {}) {
  const primaryFactor = profile.primary?.key || 'D';

  if (primaryFactor === 'D') {
    return 'O foco predominante está em direção, desafio e entrega de resultado.';
  }

  if (primaryFactor === 'I') {
    return 'O foco predominante está em conexão, influência social e mobilização de pessoas.';
  }

  if (primaryFactor === 'S') {
    return 'O foco predominante está em estabilidade, suporte e manutenção de confiança.';
  }

  return 'O foco predominante está em análise, previsibilidade e qualidade técnica.';
}

function buildExecutiveSummary(profile = {}) {
  const primary = profile.primary || { key: 'D', value: 0 };
  const secondary = profile.secondary || { key: 'I', value: 0 };
  const primaryName = FACTOR_META[primary.key]?.name || primary.key;
  const secondaryName = FACTOR_META[secondary.key]?.name || secondary.key;
  const primaryLevel = getLevel(primary.value);
  const secondaryLevel = getLevel(secondary.value);
  const distance = Math.abs(primary.value - secondary.value);
  const focusText = getPrimaryFocusNarrative(profile);
  const dGuard = isHighD(profile.scores?.D)
    ? ''
    : ' Com D abaixo de 30, o relatório não deve interpretar este perfil como dominador ou de liderança fortemente assertiva.';
  const balanceText =
    distance < 10
      ? `${primaryName} e ${secondaryName} aparecem próximas, sustentando uma combinação bastante equilibrada.`
      : `${primaryName} conduz a leitura geral, enquanto ${secondaryName} funciona como fator de apoio relevante com diferença de ${distance} pontos.`;

  return `O perfil ${profile.label} combina ${primaryName} em nível ${primaryLevel} com ${secondaryName} em nível ${secondaryLevel}. ${balanceText} ${focusText}${dGuard}`;
}

function buildCommunicationStyle(profile = {}) {
  const iLevel = getLevel(profile.scores?.I);
  const cLevel = getLevel(profile.scores?.C);

  if (iLevel === 'alto') {
    return 'Comunica-se de forma aberta, calorosa e persuasiva, ganhando tração pela proximidade com as pessoas.';
  }

  if (iLevel === 'moderado') {
    return `A comunicação tende a equilibrar clareza relacional com alguma reserva analítica em nível ${cLevel}.`;
  }

  if (cLevel === 'alto') {
    return 'A comunicação tende a ser mais objetiva, técnica e apoiada em critérios claros.';
  }

  return 'A comunicação tende a ser direta e econômica, com menor necessidade de exposição social.';
}

function buildLeadershipStyle(profile = {}) {
  const dScore = profile.scores?.D;
  const primaryFactor = profile.primary?.key || 'D';

  if (!isHighD(dScore)) {
    if (primaryFactor === 'I') {
      return 'Quando lidera, tende a mobilizar pelo relacionamento, visibilidade e entusiasmo, e não por comando duro.';
    }

    if (primaryFactor === 'S') {
      return 'A liderança, quando necessária, tende a aparecer por suporte, consistência e construção de confiança.';
    }

    if (primaryFactor === 'C') {
      return 'A liderança, quando necessária, tende a aparecer por critério, análise e definição de padrão.';
    }

    return 'A liderança não se apoia em dominância alta; o estilo tende a ser mais situacional do que diretivo.';
  }

  if (primaryFactor === 'D') {
    return 'A liderança tende a ser direta, orientada a metas e confortável com decisões rápidas.';
  }

  return 'Há base de assertividade suficiente para sustentar liderança mais firme quando o contexto exige decisão.';
}

function buildWorkStyle(profile = {}) {
  const sLevel = getLevel(profile.scores?.S);
  const cLevel = getLevel(profile.scores?.C);

  if (cLevel === 'alto') {
    return 'No trabalho, tende a valorizar estrutura, previsibilidade e qualidade antes de acelerar.';
  }

  if (sLevel === 'alto') {
    return 'No trabalho, tende a sustentar ritmo estável, colaboração contínua e confiabilidade operacional.';
  }

  if (profile.primary?.key === 'I') {
    return 'No trabalho, tende a ganhar energia em ambientes dinâmicos, com interação, visibilidade e movimento.';
  }

  if (profile.primary?.key === 'D') {
    return 'No trabalho, tende a preferir autonomia, desafio e ciclos curtos de decisão.';
  }

  return 'No trabalho, tende a alternar foco situacional conforme o contexto pede mais análise, relação ou velocidade.';
}

function classifyDelta(delta = 0) {
  const absoluteDelta = Math.abs(toNumber(delta, 0));
  if (absoluteDelta > 20) return 'mudança alta';
  if (absoluteDelta > 10) return 'mudança moderada';
  return 'mudança leve';
}

function formatSignedDelta(delta = 0) {
  const normalized = Math.round(toNumber(delta, 0));
  return `${normalized >= 0 ? '+' : ''}${normalized}`;
}

function buildPressureBehavior(profile = {}) {
  const factorChanges = DISC_FACTOR_KEYS
    .map((factor) => ({
      factor,
      delta: toNumber(profile.deltas?.[factor], 0),
      level: classifyDelta(profile.deltas?.[factor]),
    }))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  const strongestChange = factorChanges[0] || { factor: profile.primary?.key || 'D', delta: 0, level: 'mudança leve' };

  if (Math.abs(strongestChange.delta) <= 0) {
    return 'Os dados disponíveis mostram pouca diferença entre o estilo natural e o adaptado, indicando baixa tensão de ajuste.';
  }

  const factorName = FACTOR_META[strongestChange.factor]?.name || strongestChange.factor;
  const verb = strongestChange.delta > 0 ? 'aumentou' : 'reduziu';

  return `${factorName} ${verb} ${Math.abs(Math.round(strongestChange.delta))} pontos no perfil adaptado, caracterizando ${strongestChange.level}.`;
}

function buildRelationshipStyle(profile = {}) {
  if (profile.primary?.key === 'I') {
    return 'Tende a criar proximidade rapidamente, circular bem em redes e buscar adesão pela relação.';
  }

  if (profile.primary?.key === 'S') {
    return 'Tende a construir vínculos pela confiança, constância e cooperação.';
  }

  if (profile.primary?.key === 'C') {
    return 'Tende a construir relação com mais reserva inicial, apoiando-se em consistência e credibilidade.';
  }

  if (isHighD(profile.scores?.D)) {
    return 'Tende a construir relação com objetividade e senso de direção, valorizando clareza e resultado.';
  }

  return 'Tende a se relacionar com objetividade, mas sem buscar protagonismo dominante no vínculo.';
}

function getPrimaryProfileRows(primaryFactor = 'D') {
  if (primaryFactor === 'I') {
    return {
      strengths: [
        { title: 'Engajamento', text: 'Constrói conexão e adesão com facilidade em interações e apresentações.' },
        { title: 'Persuasão', text: 'Defende ideias com entusiasmo e influência social.' },
        { title: 'Networking', text: 'Amplia relações e oportunidades por meio de contato frequente.' },
        { title: 'Comunicação', text: 'Torna mensagens acessíveis, leves e mobilizadoras.' },
        { title: 'Energia social', text: 'Sustenta presença alta em ambientes dinâmicos e colaborativos.' },
      ],
      limitations: [
        { title: 'Foco disperso', text: 'Pode abrir frentes demais e reduzir profundidade na execução.' },
        { title: 'Confronto direto', text: 'Com D baixo, tende a suavizar mensagens duras ou adiar posicionamentos.' },
        { title: 'Rotina detalhada', text: 'Pode perder energia em tarefas repetitivas ou muito procedimentais.' },
        { title: 'Follow-up', text: 'Precisa de disciplina para fechar combinados e acompanhar entregas.' },
        { title: 'Critério analítico', text: 'Pode decidir pelo vínculo antes de sustentar o mesmo rigor técnico.' },
      ],
      development: [
        { title: 'Priorização', text: 'Reduzir frentes simultâneas e explicitar o que é prioridade real.' },
        { title: 'Assertividade', text: 'Treinar posicionamento claro sem depender apenas de aprovação relacional.' },
        { title: 'Fechamento', text: 'Criar rituais curtos de confirmação, prazo e responsável por entrega.' },
        { title: 'Processo leve', text: 'Adotar checklists simples para manter ritmo com qualidade mínima.' },
        { title: 'Critério', text: 'Separar simpatia de decisão e sustentar acordos com evidência objetiva.' },
      ],
      careers: [
        { icon: '🤝', title: 'Relacionamento comercial', text: 'Atuações com prospecção, negociação relacional e expansão de carteira.' },
        { icon: '📣', title: 'Marketing e comunicação', text: 'Posições com narrativa, presença pública e influência de audiência.' },
        { icon: '🤝', title: 'Parcerias e customer success', text: 'Funções centradas em vínculo, confiança e expansão por relacionamento.' },
        { icon: '🖥️', title: 'Facilitação e educação', text: 'Contextos com mediação, treinamento, apresentação e condução de grupos.' },
      ],
      recommendations: [
        { title: 'Eleve a Assertividade', text: 'Pratique mensagens curtas e firmes para não depender apenas de clima relacional.' },
        { title: 'Proteja o Foco', text: 'Defina poucos objetivos por ciclo para manter energia alta com entrega concreta.' },
        { title: 'Estruture o Follow-up', text: 'Transforme promessas em prazos, responsáveis e check-ins objetivos.' },
        { title: 'Una Influência e Critério', text: 'Combine persuasão com critérios claros para ganhar consistência nas decisões.' },
      ],
    };
  }

  if (primaryFactor === 'S') {
    return {
      strengths: [
        { title: 'Confiabilidade', text: 'Sustenta rotina, previsibilidade e suporte constante ao time.' },
        { title: 'Colaboração', text: 'Favorece clima estável, escuta e cooperação madura.' },
        { title: 'Consistência', text: 'Mantém padrão de entrega sem oscilações bruscas.' },
        { title: 'Paciência', text: 'Tolera processos longos e relações que exigem continuidade.' },
        { title: 'Apoio', text: 'Facilita integração e reduz atrito em ambientes de equipe.' },
      ],
      limitations: [
        { title: 'Velocidade crítica', text: 'Pode hesitar quando o contexto pede mudança ou decisão rápida.' },
        { title: 'Conflito', text: 'Tende a evitar tensão direta e adiar conversas difíceis.' },
        { title: 'Excesso de acomodação', text: 'Pode sustentar arranjos pouco eficientes por preservar estabilidade.' },
        { title: 'Autopromoção', text: 'Pode comunicar pouco o próprio valor e impacto.' },
        { title: 'Risco calculado', text: 'Pode demorar a testar alternativas novas ou mais ousadas.' },
      ],
      development: [
        { title: 'Velocidade', text: 'Treinar decisão em janelas curtas com critérios mínimos definidos.' },
        { title: 'Assertividade', text: 'Praticar conversas firmes sem perder respeito e constância.' },
        { title: 'Prioridade', text: 'Reduzir acomodação e explicitar o que precisa mudar primeiro.' },
        { title: 'Visibilidade', text: 'Comunicar mais o impacto da própria entrega para não ficar invisível.' },
        { title: 'Experimentação', text: 'Testar ajustes menores com frequência em vez de esperar cenário ideal.' },
      ],
      careers: [
        { icon: '🤲', title: 'Customer success e suporte', text: 'Funções com continuidade de relação, escuta e manutenção de confiança.' },
        { icon: '🧩', title: 'Operações de pessoas', text: 'Ambientes que valorizam rotina, suporte e coordenação de fluxo.' },
        { icon: '📅', title: 'Coordenação operacional', text: 'Posições que exigem estabilidade, organização e acompanhamento constante.' },
        { icon: '🏥', title: 'Cuidado e serviço', text: 'Atuações com acolhimento, suporte e consistência na experiência.' },
      ],
      recommendations: [
        { title: 'Aumente a Assertividade', text: 'Treine pedidos claros e limites objetivos em momentos de tensão.' },
        { title: 'Ganhe Ritmo', text: 'Defina prazos curtos para decisões que hoje ficam lentas demais.' },
        { title: 'Dê Visibilidade ao Valor', text: 'Comunique entregas e resultados com mais frequência e clareza.' },
        { title: 'Teste Mudanças Menores', text: 'Use experimentos pequenos para crescer sem perder estabilidade.' },
      ],
    };
  }

  if (primaryFactor === 'C') {
    return {
      strengths: [
        { title: 'Análise', text: 'Decide com base em lógica, critério e redução de risco.' },
        { title: 'Qualidade', text: 'Eleva padrão técnico, consistência e atenção a detalhe relevante.' },
        { title: 'Organização', text: 'Estrutura processos, evidências e rastreabilidade com facilidade.' },
        { title: 'Precisão', text: 'Identifica desvios e inconsistências antes que virem retrabalho.' },
        { title: 'Responsabilidade', text: 'Tende a cumprir acordos com rigor e previsibilidade.' },
      ],
      limitations: [
        { title: 'Excesso de análise', text: 'Pode alongar decisão quando busca certeza acima do necessário.' },
        { title: 'Simplicidade', text: 'Pode sofisticar demais processos ou mensagens para públicos diversos.' },
        { title: 'Flexibilidade', text: 'Pode reagir com resistência a mudanças pouco estruturadas.' },
        { title: 'Exposição social', text: 'Pode evitar visibilidade excessiva ou improviso em público.' },
        { title: 'Velocidade', text: 'Pode perder timing quando o contexto pede resposta curta e objetiva.' },
      ],
      development: [
        { title: 'Decisão', text: 'Definir critérios mínimos para encerrar análise e seguir em frente.' },
        { title: 'Comunicação', text: 'Simplificar mensagens sem perder a qualidade do raciocínio.' },
        { title: 'Flexibilidade', text: 'Aceitar margens controladas de incerteza em cenários dinâmicos.' },
        { title: 'Presença', text: 'Ganhar conforto para expor ideias com mais síntese e segurança.' },
        { title: 'Ritmo', text: 'Criar checkpoints curtos para não transformar rigor em lentidão.' },
      ],
      careers: [
        { icon: '📊', title: 'Análise e planejamento', text: 'Funções com diagnóstico, estrutura, modelagem e tomada de decisão baseada em dados.' },
        { icon: '🛡️', title: 'Qualidade e compliance', text: 'Papéis que exigem controle, padrão, risco e aderência a processo.' },
        { icon: '🧠', title: 'Pesquisa e inteligência', text: 'Contextos com investigação, profundidade técnica e consistência analítica.' },
        { icon: '🧾', title: 'Processos e governança', text: 'Ambientes que dependem de método, previsibilidade e confiabilidade.' },
      ],
      recommendations: [
        { title: 'Decida com Janela Clara', text: 'Defina o ponto de bom-enough para não alongar análise sem ganho real.' },
        { title: 'Simplifique a Mensagem', text: 'Transforme complexidade em comunicação mais curta e acionável.' },
        { title: 'Tolere Mais Movimento', text: 'Aumente a flexibilidade quando o contexto pede adaptação rápida.' },
        { title: 'Exponha Mais Valor', text: 'Traga presença e visibilidade para que a qualidade técnica seja percebida.' },
      ],
    };
  }

  return {
    strengths: [
      { title: 'Direção', text: 'Assume frente quando o contexto exige decisão, clareza e ritmo.' },
      { title: 'Resultado', text: 'Mantém foco em meta, avanço e solução concreta de problema.' },
      { title: 'Coragem', text: 'Tolera tensão e competição melhor do que a média.' },
      { title: 'Velocidade', text: 'Reduz paralisia e acelera execução em cenários de pressão.' },
      { title: 'Iniciativa', text: 'Tende a agir antes de depender de validação excessiva.' },
    ],
    limitations: [
      { title: 'Impaciência', text: 'Pode pressionar o ritmo e reduzir escuta em processos lentos.' },
      { title: 'Detalhe', text: 'Pode subestimar etapas analíticas ou regras quando quer avançar rápido.' },
      { title: 'Tom relacional', text: 'Pode soar duro demais se não calibrar forma e contexto.' },
      { title: 'Delegação', text: 'Pode centralizar decisões quando não confia plenamente na cadência do grupo.' },
      { title: 'Persistência de processo', text: 'Pode abandonar rotina útil quando ela reduz velocidade aparente.' },
    ],
    development: [
      { title: 'Escuta', text: 'Ampliar perguntas antes de fechar direção em temas sensíveis.' },
      { title: 'Processo', text: 'Respeitar critérios mínimos de qualidade para não trocar velocidade por retrabalho.' },
      { title: 'Delegação', text: 'Distribuir decisão e acompanhamento com combinados explícitos.' },
      { title: 'Tom', text: 'Ajustar firmeza sem elevar atrito desnecessário.' },
      { title: 'Sustentação', text: 'Combinar impulso de resultado com constância operacional.' },
    ],
    careers: [
      { icon: '🎯', title: 'Gestão por resultado', text: 'Funções com meta clara, autonomia e responsabilidade sobre avanço.' },
      { icon: '🚀', title: 'Expansão e novos negócios', text: 'Ambientes que pedem iniciativa, tração e decisão rápida.' },
      { icon: '🧭', title: 'Liderança de frente', text: 'Papéis em que direção e clareza precisam acontecer com velocidade.' },
      { icon: '⚙️', title: 'Operação crítica', text: 'Contextos em que pressão, prioridade e resolução objetiva importam.' },
    ],
    recommendations: [
      { title: 'Calibre a Escuta', text: 'Pergunte mais antes de decidir quando o tema exige adesão do grupo.' },
      { title: 'Proteja a Qualidade', text: 'Inclua critérios mínimos para não trocar velocidade por retrabalho.' },
      { title: 'Delegue Melhor', text: 'Converta autonomia em combinação clara de meta, prazo e acompanhamento.' },
      { title: 'Sustente o Ritmo', text: 'Equilibre pressão por resultado com consistência do time e do processo.' },
    ],
  };
}

function buildStrengthRows(profile = {}) {
  return getPrimaryProfileRows(profile.primary?.key).strengths;
}

function buildLimitationRows(profile = {}) {
  return getPrimaryProfileRows(profile.primary?.key).limitations;
}

function buildDevelopmentRows(profile = {}) {
  return getPrimaryProfileRows(profile.primary?.key).development;
}

function buildCareerCards(profile = {}) {
  return getPrimaryProfileRows(profile.primary?.key).careers;
}

function buildRecommendationItems(profile = {}) {
  return getPrimaryProfileRows(profile.primary?.key).recommendations;
}

function computeWeightedMetric(scores = {}, weights = {}) {
  return Math.round(
    DISC_FACTOR_KEYS.reduce(
      (total, factor) => total + toNumber(scores?.[factor], 0) * toNumber(weights?.[factor], 0),
      0,
    ),
  );
}

function classifyMetric(value = 0) {
  const normalized = clampPercentage(value);
  if (normalized >= 40) return { label: 'Alto', color: 'var(--d)' };
  if (normalized >= 20) return { label: 'Moderado', color: 'var(--i)' };
  return { label: 'Baixo', color: 'var(--d)' };
}

function buildBehavioralIndices(profile = {}) {
  const scores = profile.scores || {};
  const hasHighRelationalCommunication =
    toNumber(scores?.I, 0) >= 40 && toNumber(scores?.S, 0) >= 35;

  const leadership = computeWeightedMetric(scores, {
    D: 0.42,
    I: 0.23,
    S: 0.12,
    C: 0.23,
  });
  const communication = computeWeightedMetric(scores, {
    D: 0.14,
    I: 0.48,
    S: 0.14,
    C: 0.24,
  });
  const execution = computeWeightedMetric(scores, {
    D: 0.26,
    I: 0.14,
    S: 0.28,
    C: 0.32,
  });
  const emotionalStability = computeWeightedMetric(scores, {
    D: 0.08,
    I: 0.12,
    S: 0.46,
    C: 0.34,
  });

  return [
    {
      title: 'Índice de Liderança',
      value: leadership,
      description:
        leadership >= 50
          ? 'Lidera com presença clara e boa capacidade de organizar direção e prioridade.'
          : leadership >= 30
            ? 'Tende a liderar mais por critério, suporte ou influência do que por comando direto.'
            : 'Prefere contribuir por especialidade, análise ou suporte antes de assumir liderança frontal.',
    },
    {
      title: 'Índice de Comunicação',
      value: communication,
      description:
        hasHighRelationalCommunication
          ? 'Comunicação expressiva e relacional. Conecta com facilidade, adapta a mensagem ao contexto e engaja pessoas com entusiasmo e clareza.'
          : communication >= 50
          ? 'Comunicação com boa tração relacional e facilidade para engajar pessoas.'
          : communication >= 30
            ? 'Comunicação equilibrada, com clareza suficiente sem depender de alta exposição social.'
            : 'Comunicação mais reservada, técnica ou seletiva, com menor necessidade de persuasão pública.',
    },
    {
      title: 'Índice de Execução',
      value: execution,
      description:
        execution >= 50
          ? 'Consegue transformar intenção em entrega com bom ritmo e constância operacional.'
          : execution >= 30
            ? 'Executa com consistência quando há prioridade clara, método e contexto definido.'
            : 'Prefere avançar após estruturar premissas, reduzindo improviso e aceleração excessiva.',
    },
    {
      title: 'Estabilidade Emocional',
      value: emotionalStability,
      description:
        emotionalStability >= 50
          ? 'Tende a sustentar regulação emocional e constância mesmo em contexto de pressão.'
          : emotionalStability >= 30
            ? 'Mantém estabilidade razoável, mas pode sentir tensão quando há conflito ou ambiguidade alta.'
            : 'Pode intensificar reações quando o ambiente combina pressão, incerteza e pouco espaço de ajuste.',
    },
  ];
}

function buildCoverIndicators(profile = {}) {
  const indices = buildBehavioralIndices(profile);
  const leadership = classifyMetric(indices[0]?.value);
  let communication = classifyMetric(indices[1]?.value);
  const organization = classifyMetric(
    computeWeightedMetric(profile.scores, { D: 0.05, I: 0.05, S: 0.2, C: 0.7 }),
  );
  let patience = classifyMetric(
    computeWeightedMetric(profile.scores, { D: 0.05, I: 0.05, S: 0.75, C: 0.15 }),
  );
  const detail = classifyMetric(
    computeWeightedMetric(profile.scores, { D: 0.0, I: 0.05, S: 0.15, C: 0.8 }),
  );

  if (toNumber(profile?.scores?.I, 0) >= 40) {
    communication = { label: 'Alto', color: 'var(--d)' };
  }
  if (toNumber(profile?.scores?.S, 0) >= 40 && communication.label !== 'Baixo') {
    patience = { label: 'Moderado', color: 'var(--i)' };
  }

  return [
    { title: 'Liderança', ...leadership },
    { title: 'Comunicação', ...communication },
    { title: 'Organização', ...organization },
    { title: 'Paciência', ...patience },
    { title: 'Atenção a detalhes', ...detail },
  ];
}

function buildScaleRows(profile = {}) {
  return [
    {
      title: 'Assertividade',
      value: computeWeightedMetric(profile.scores, { D: 0.75, I: 0.15, S: 0.0, C: 0.1 }),
    },
    {
      title: 'Persuasão',
      value: computeWeightedMetric(profile.scores, { D: 0.15, I: 0.7, S: 0.05, C: 0.1 }),
    },
    {
      title: 'Paciência',
      value: computeWeightedMetric(profile.scores, { D: 0.05, I: 0.05, S: 0.75, C: 0.15 }),
    },
    {
      title: 'Conformidade',
      value: computeWeightedMetric(profile.scores, { D: 0.0, I: 0.05, S: 0.1, C: 0.85 }),
    },
    {
      title: 'Adaptabilidade',
      value: computeWeightedMetric(profile.scores, { D: 0.25, I: 0.25, S: 0.25, C: 0.25 }),
    },
    {
      title: 'Empatia',
      value: computeWeightedMetric(profile.scores, { D: 0.0, I: 0.35, S: 0.55, C: 0.1 }),
    },
  ];
}

function getProfilePlaybook(profile = {}) {
  const primaryFactor = profile.primary?.key || 'D';
  const secondaryFactor = profile.secondary?.key || 'I';
  const slashCode = profile.slashCode || `${primaryFactor}/${secondaryFactor}`;

  if (primaryFactor === 'C') {
    return {
      motivators: [
        { icon: '📏', title: 'Critérios claros', text: 'Decisões sustentadas por lógica, padrão e consistência de avaliação.' },
        { icon: '🛡️', title: 'Qualidade e segurança', text: 'Ambientes em que precisão, risco controlado e confiabilidade importam.' },
        { icon: '🧠', title: 'Autonomia técnica', text: 'Espaço para aprofundar análise e sustentar recomendações com evidência.' },
        { icon: '⏱️', title: 'Tempo para pensar', text: 'Janela adequada para estruturar raciocínio antes de executar.' },
      ],
      environment: [
        { title: 'Estrutura previsível', text: 'Processos claros, papéis definidos e expectativa objetiva de qualidade.' },
        { title: 'Ambiente profissional maduro', text: 'Times que respeitam critério, preparação e consistência de entrega.' },
        { title: 'Liderança com método', text: 'Gestores que contextualizam prioridade, risco e critério de decisão.' },
      ],
      communicationRows: [
        { title: 'Tom', text: secondaryFactor === 'S' ? 'Objetivo, técnico e estável' : 'Objetivo, técnico e criterioso' },
        { title: 'Velocidade', text: 'Cadenciada, com espaço para precisão' },
        { title: 'Canal preferido', text: 'Contexto escrito, pauta clara e conversa estruturada' },
        { title: 'Escuta', text: 'Analítica — busca consistência e coerência no conteúdo' },
      ],
      decisionIntro:
        'Decide melhor quando consegue organizar fatos, risco e critério de qualidade antes de assumir posição final.',
      decisionSteps: [
        { title: 'Reúne evidências', text: 'Organiza dados, restrições e premissas relevantes.' },
        { title: 'Testa consistência', text: 'Compara cenários, risco e impacto antes de concluir.' },
        { title: 'Fecha com critério', text: 'Decide quando o nível de segurança é suficiente para avançar.' },
      ],
      conflict:
        'Costuma buscar resolução por critério, clareza de regra e separação entre fato e interpretação. Pode soar rígido se não explicitar abertura ao diálogo.',
      pressure: {
        normal: [
          { title: 'Analítico e cuidadoso', text: 'Avalia cenário antes de agir e reduz improviso.' },
          { title: 'Organizado', text: 'Mantém padrão, rastreabilidade e atenção a detalhe crítico.' },
          { title: 'Consistente', text: 'Preserva método mesmo com demandas paralelas.' },
          { title: 'Reservado', text: 'Prefere falar com base em evidência, e não em impulso.' },
        ],
        stressed: [
          { title: 'Perfeccionista', text: 'Eleva exigência e pode demorar mais para concluir.' },
          { title: 'Rígido com processo', text: 'Aumenta apego a regra quando percebe risco ou caos.' },
          { title: 'Crítico', text: 'Passa a apontar falhas com menos amortecimento relacional.' },
          { title: 'Mais lento para decidir', text: 'Tende a buscar segurança adicional antes de se comprometer.' },
        ],
      },
      perception: [
        { title: 'Pelos pares', text: 'Confiável, criterioso e técnico — com reserva inicial maior.' },
        { title: 'Pelos liderados', text: 'Claro em padrão e qualidade — pode parecer exigente ou distante.' },
        { title: 'Pelos superiores', text: 'Forte para risco, processo e consistência — precisa sintetizar mais ao expor valor.' },
      ],
      nva: [
        { icon: '🤝', title: 'Estilo de Negociação', text: 'Negocia com base em dado, margem clara e lógica de risco. Prefere acordos sustentáveis a decisões apressadas ou ambíguas.' },
        { icon: '💼', title: 'Estilo de Vendas', text: 'Atua melhor em venda consultiva, técnica ou de confiança, onde profundidade, precisão e credibilidade pesam mais do que pressão comercial.' },
        { icon: '📚', title: 'Estilo de Aprendizado', text: 'Aprende com estrutura, profundidade e repertório consistente. Valoriza método, referência concreta e aplicação bem fundamentada.' },
      ],
      dna: [
        { title: 'Critério', text: 'Busca coerência antes de concluir.' },
        { title: 'Precisão', text: 'Reduz erro por atenção ao detalhe relevante.' },
        { title: 'Consistência', text: 'Sustenta padrão com previsibilidade.' },
        { title: 'Prudência', text: 'Prefere segurança suficiente antes de acelerar.' },
      ],
      developmentCards: [
        { icon: '🔍', title: 'Autoconhecimento', text: 'Observar quando o rigor protege qualidade e quando passa a atrasar decisão sem ganho real.' },
        { icon: '🗣️', title: 'Comunicação Executiva', text: 'Treinar síntese, mensagem curta e visibilidade do valor técnico para públicos menos analíticos.' },
        { icon: '🔄', title: 'Flexibilidade', text: 'Aceitar margens controladas de incerteza quando o contexto exige adaptação mais rápida.' },
        { icon: '🤝', title: 'Influência com Credibilidade', text: 'Ganhar presença relacional sem perder método, usando clareza e contexto para gerar adesão.' },
      ],
      plan: [
        'Mapear gatilhos de excesso de análise, critérios mínimos e pontos de travamento na decisão.',
        'Praticar síntese em reuniões, definir janelas de decisão e encerrar análises com checklists curtos.',
        'Consolidar flexibilidade, exposição de valor e ritmo sustentável sem abrir mão de qualidade.',
      ],
      planFooter:
        'O plano de 90 dias busca manter a força analítica do perfil enquanto reduz excesso de análise, melhora síntese e amplia flexibilidade aplicada.',
      advanced: {
        tag: 'Analítico-Estruturado',
        summary:
          'Lidera ou influencia melhor por clareza de critério, padrão e consistência técnica. Prefere decisões com contexto, risco explícito e caminho verificável.',
        bullets: [
          'Definir critério de decisão antes de aprofundar discussão',
          'Transformar análise em recomendação objetiva',
          'Fechar conversas com próximos passos e responsável',
        ],
      },
      communicationAdvice: [
        { situation: '1:1 com liderados', recommendation: 'Explique contexto, critério e espaço para dúvida antes de cobrar execução.' },
        { situation: 'Reuniões de equipe', recommendation: 'Comece pela síntese e só depois aprofunde o racional.' },
        { situation: 'Com perfil D', recommendation: 'Leve cenário, risco e recomendação objetiva em poucos pontos.' },
        { situation: 'Com perfil S', recommendation: 'Alinhe ritmo, estabilidade e expectativa de continuidade.' },
        { situation: 'Com perfil I', recommendation: 'Traduza complexidade em impacto prático e mensagem curta.' },
      ],
      relationships: [
        { profile: 'D', synergy: 'Decisão + critério', challenge: 'Pressa versus precisão', strategy: 'Combinar velocidade com critérios mínimos explícitos.' },
        { profile: 'I', synergy: 'Criatividade + profundidade', challenge: 'Superficialidade e dispersão', strategy: 'Traduzir ideias em prioridade, dado e próximo passo.' },
        { profile: 'S', synergy: 'Constância + método', challenge: 'Excesso de cautela', strategy: 'Alinhar ritmo, prioridade e definição de bom-enough.' },
        { profile: 'C', synergy: 'Padrão + qualidade', challenge: 'Análise excessiva', strategy: 'Definir prazo e critério de fechamento para evitar alongamento.' },
      ],
      relationshipTip:
        'Defina o ponto de bom-enough para não alongar análise sem ganho real.',
    };
  }

  if (primaryFactor === 'S') {
    return {
      motivators: [
        { icon: '🤝', title: 'Relações estáveis', text: 'Ambientes de confiança, cooperação e baixa volatilidade relacional.' },
        { icon: '🧩', title: 'Clareza de papel', text: 'Rotinas consistentes, prioridades compreensíveis e expectativas sustentáveis.' },
        { icon: '🌿', title: 'Ritmo saudável', text: 'Espaço para executar com continuidade sem pressão abrupta constante.' },
        { icon: '🛠️', title: 'Utilidade prática', text: 'Sentir que sua contribuição apoia pessoas, fluxo e estabilidade do time.' },
      ],
      environment: [
        { title: 'Ambiente previsível', text: 'Mudanças bem explicadas, transições graduais e contexto suficiente para adaptação.' },
        { title: 'Equipe colaborativa', text: 'Espaços em que parceria, constância e suporte são valorizados.' },
        { title: 'Liderança respeitosa', text: 'Gestores que cobram com clareza sem gerar pressão desnecessária.' },
      ],
      communicationRows: [
        { title: 'Tom', text: 'Calmo, respeitoso e consistente' },
        { title: 'Velocidade', text: 'Cadenciada, com espaço para alinhamento' },
        { title: 'Canal preferido', text: 'Conversas claras, acompanhamento e previsibilidade' },
        { title: 'Escuta', text: 'Atenta — procura compreender impacto nas pessoas antes de reagir' },
      ],
      decisionIntro:
        'Costuma decidir melhor quando entende impacto humano, sequência de execução e grau de estabilidade esperado após a escolha.',
      decisionSteps: [
        { title: 'Observa impacto', text: 'Considera efeito da decisão nas pessoas e no fluxo.' },
        { title: 'Compara segurança', text: 'Busca caminho estável e executável antes de fechar.' },
        { title: 'Implementa com constância', text: 'Prefere avançar com ritmo sustentável e acompanhamento.' },
      ],
      conflict:
        'Tende a reduzir atrito, proteger vínculo e buscar acordo viável. Pode adiar confronto difícil por preservar estabilidade demais.',
      pressure: {
        normal: [
          { title: 'Colaborativo', text: 'Sustenta apoio e confiança nas interações.' },
          { title: 'Constante', text: 'Mantém cadência e previsibilidade na execução.' },
          { title: 'Paciente', text: 'Tolera processo e continuidade melhor do que a média.' },
          { title: 'Cuidadoso', text: 'Evita rupturas desnecessárias e busca composição.' },
        ],
        stressed: [
          { title: 'Resistente à mudança', text: 'Pode aumentar cautela e demorar a aceitar novo ritmo.' },
          { title: 'Silencia incômodo', text: 'Guarda desconforto até que a tensão fique alta demais.' },
          { title: 'Evita confronto', text: 'Adia conversa difícil para preservar clima ou vínculo.' },
          { title: 'Ritmo cai', text: 'Pode perder velocidade quando a pressão sobe abruptamente.' },
        ],
      },
      perception: [
        { title: 'Pelos pares', text: 'Confiável, estável e cooperativo — às vezes discreto demais.' },
        { title: 'Pelos liderados', text: 'Acessível, respeitoso e paciente — pode demorar a endurecer quando necessário.' },
        { title: 'Pelos superiores', text: 'Sustenta operação e continuidade — precisa ganhar visibilidade em contexto acelerado.' },
      ],
      nva: [
        { icon: '🤝', title: 'Estilo de Negociação', text: 'Negocia melhor com calma, escuta e compromisso sustentável. Procura reduzir atrito e construir acordo de longo prazo.' },
        { icon: '💼', title: 'Estilo de Vendas', text: 'Vai melhor em relacionamento, retenção e continuidade do que em pressão comercial agressiva. Gera confiança e previsibilidade.' },
        { icon: '📚', title: 'Estilo de Aprendizado', text: 'Aprende com repetição útil, acompanhamento e ambiente seguro para testar sem exposição excessiva.' },
      ],
      dna: [
        { title: 'Constância', text: 'Mantém ritmo e previsibilidade.' },
        { title: 'Cooperação', text: 'Constrói vínculo por suporte e lealdade.' },
        { title: 'Paciência', text: 'Tolera continuidade melhor do que aceleração brusca.' },
        { title: 'Confiabilidade', text: 'Entrega com estabilidade e baixo ruído.' },
      ],
      developmentCards: [
        { icon: '🔍', title: 'Autoconhecimento', text: 'Perceber quando a busca por estabilidade vira acomodação ou postergação de conversa difícil.' },
        { icon: '🗣️', title: 'Assertividade', text: 'Treinar pedido claro, limite objetivo e posicionamento firme sem perder respeito.' },
        { icon: '⚙️', title: 'Ritmo e Prioridade', text: 'Decidir em janelas menores quando o contexto pede resposta mais rápida.' },
        { icon: '📣', title: 'Visibilidade', text: 'Comunicar mais o próprio impacto para não ficar invisível em cenários competitivos.' },
      ],
      plan: [
        'Mapear situações em que evita confronto ou mantém arranjos que já perderam eficiência.',
        'Praticar assertividade em conversas curtas, com prazo, pedido e limite explícitos.',
        'Consolidar decisões mais ágeis e maior visibilidade do valor entregue ao time.',
      ],
      planFooter:
        'O plano de 90 dias ajuda a preservar a estabilidade do perfil sem transformar cautela em lentidão ou invisibilidade.',
      advanced: {
        tag: 'Colaborativo-Constante',
        summary:
          'Influencia pelo vínculo, confiança e continuidade. Funciona melhor quando a cobrança respeita ritmo, contexto e previsibilidade de execução.',
        bullets: [
          'Dar feedback firme sem perder gentileza',
          'Definir prioridades com prazo e ordem de execução',
          'Ganhar conforto para sustentar conversas difíceis',
        ],
      },
      communicationAdvice: [
        { situation: '1:1 com liderados', recommendation: 'Explicite expectativa e acolha dúvidas antes de cobrar mudança.' },
        { situation: 'Reuniões de equipe', recommendation: 'Antecipe pauta e preserve espaço para alinhamento gradual.' },
        { situation: 'Com perfil D', recommendation: 'Vá ao ponto sem perder contexto e peça clareza de prioridade.' },
        { situation: 'Com perfil S', recommendation: 'Construa acordo por constância, respeito e previsibilidade.' },
        { situation: 'Com perfil I', recommendation: 'Mantenha leveza, mas feche combinados com prazo e responsável.' },
      ],
      relationships: [
        { profile: 'D', synergy: 'Tração + estabilidade', challenge: 'Pressão excessiva', strategy: 'Negociar ritmo e critério de urgência de forma explícita.' },
        { profile: 'I', synergy: 'Clima + continuidade', challenge: 'Dispersão e falta de follow-up', strategy: 'Fechar combinados por escrito e com prazo claro.' },
        { profile: 'S', synergy: 'Cooperação + confiança', challenge: 'Acomodação', strategy: 'Introduzir mudanças pequenas com acompanhamento objetivo.' },
        { profile: 'C', synergy: 'Método + constância', challenge: 'Lentidão combinada', strategy: 'Definir prioridade, prazo e critério de fechamento.' },
      ],
      relationshipTip:
        'Ganhe firmeza sem perder constância; clareza evita tensão acumulada.',
    };
  }

  if (primaryFactor === 'I') {
    return {
      motivators: [
        { icon: '🎤', title: 'Visibilidade e conexão', text: 'Ambientes em que interação, presença e engajamento fazem diferença.' },
        { icon: '🤝', title: 'Relacionamento vivo', text: 'Trocas frequentes, abertura social e espaço para construir adesão.' },
        { icon: '💡', title: 'Variedade', text: 'Mudança, novidade e repertório relacional com pouca rigidez excessiva.' },
        { icon: '🏁', title: 'Reconhecimento', text: 'Feedback percebido, celebração de avanço e senso de impacto visível.' },
      ],
      environment: [
        { title: 'Ambiente dinâmico', text: 'Espaços com movimento, interação e abertura para iniciativa relacional.' },
        { title: 'Autonomia para engajar', text: 'Liberdade para circular, influenciar e mobilizar pessoas.' },
        { title: 'Liderança acessível', text: 'Gestores que trocam ideia, dão palco e valorizam energia de conexão.' },
      ],
      communicationRows: [
        { title: 'Tom', text: 'Aberto, caloroso e persuasivo' },
        { title: 'Velocidade', text: 'Rápida, espontânea e interativa' },
        { title: 'Canal preferido', text: 'Conversas ao vivo, apresentações e trocas fluidas' },
        { title: 'Escuta', text: 'Relacional — reage bem quando sente vínculo e adesão' },
      ],
      decisionIntro:
        'Costuma decidir com boa leitura de contexto social, energia de mobilização e abertura para experimentar soluções em movimento.',
      decisionSteps: [
        { title: 'Lê o clima', text: 'Percebe audiência, adesão e oportunidade de influência.' },
        { title: 'Escolhe pela tração', text: 'Prioriza caminho com energia, engajamento e avanço.' },
        { title: 'Ajusta pelo retorno', text: 'Refina a decisão a partir de reação, conversa e visibilidade.' },
      ],
      conflict:
        'Tende a negociar, circular e buscar reconexão antes de endurecer posição. Pode suavizar demais a mensagem para não perder vínculo.',
      pressure: {
        normal: [
          { title: 'Comunicativo', text: 'Traz energia e mobiliza participação com facilidade.' },
          { title: 'Persuasivo', text: 'Constrói adesão por entusiasmo e narrativa acessível.' },
          { title: 'Relacional', text: 'Ganha força quando há troca, presença e rede.' },
          { title: 'Flexível', text: 'Ajusta a mensagem para manter conexão com o grupo.' },
        ],
        stressed: [
          { title: 'Disperso', text: 'Pode abrir muitas frentes e perder profundidade na entrega.' },
          { title: 'Busca aprovação', text: 'Hesita quando sente queda de adesão ou clima relacional ruim.' },
          { title: 'Evita dureza', text: 'Adia posicionamento firme para não romper vínculo.' },
          { title: 'Oscila foco', text: 'Pode trocar continuidade por estímulo novo em excesso.' },
        ],
      },
      perception: [
        { title: 'Pelos pares', text: 'Leve, acessível e mobilizador — às vezes difuso demais.' },
        { title: 'Pelos liderados', text: 'Inspirador e próximo — precisa sustentar follow-up com mais firmeza.' },
        { title: 'Pelos superiores', text: 'Bom para adesão e ambiente — precisa consolidar consistência de fechamento.' },
      ],
      nva: [
        { icon: '🤝', title: 'Estilo de Negociação', text: 'Negocia por conexão, leitura de audiência e construção de adesão. Funciona melhor com abertura e espaço para composição.' },
        { icon: '📣', title: 'Estilo de Vendas', text: 'Vai bem em prospecção, relacionamento e narrativa comercial. Ganha tração quando consegue unir presença, confiança e contexto.' },
        { icon: '📚', title: 'Estilo de Aprendizado', text: 'Aprende por troca, experimentação e aplicação com pessoas. Engaja melhor quando há conversa, repertório e visibilidade de uso.' },
      ],
      dna: [
        { title: 'Conexão', text: 'Gera vínculo com naturalidade.' },
        { title: 'Expressividade', text: 'Transforma ideia em narrativa acessível.' },
        { title: 'Mobilização', text: 'Puxa adesão e energia do grupo.' },
        { title: 'Leveza', text: 'Facilita interação e clima relacional.' },
      ],
      developmentCards: [
        { icon: '🔍', title: 'Autoconhecimento', text: 'Perceber quando entusiasmo vira dispersão ou dependência excessiva de aprovação.' },
        { icon: '🎯', title: 'Foco', text: 'Reduzir frentes paralelas e fechar prioridades por ciclo de execução.' },
        { icon: '🗣️', title: 'Assertividade', text: 'Treinar mensagem firme sem depender apenas de clima relacional positivo.' },
        { icon: '📌', title: 'Follow-up', text: 'Converter conversa boa em prazo, responsável e confirmação de entrega.' },
      ],
      plan: [
        'Mapear situações em que abre frentes demais ou suaviza posicionamento necessário.',
        'Praticar comunicação curta, fechamento de combinados e priorização de poucas entregas por vez.',
        'Consolidar assertividade, critério e rotina de follow-up sem perder energia relacional.',
      ],
      planFooter:
        'O plano de 90 dias preserva a força de influência do perfil enquanto melhora foco, assertividade e consistência de execução.',
      advanced: {
        tag: 'Relacional-Mobilizador',
        summary:
          'Influencia pela conexão e pela capacidade de gerar adesão. Funciona melhor quando combina energia social com foco e fechamento explícito.',
        bullets: [
          'Fechar conversas com prazo, responsável e critério',
          'Treinar mensagem firme em temas sensíveis',
          'Reduzir dispersão para proteger a entrega',
        ],
      },
      communicationAdvice: [
        { situation: '1:1 com liderados', recommendation: 'Comece pela conexão, mas feche pedido e combinado com clareza.' },
        { situation: 'Reuniões de equipe', recommendation: 'Use energia para engajar e síntese para não dispersar.' },
        { situation: 'Com perfil D', recommendation: 'Traga ideia com objetividade e impacto claro.' },
        { situation: 'Com perfil S', recommendation: 'Dê contexto, acolha tempo de resposta e confirme próximos passos.' },
        { situation: 'Com perfil I', recommendation: 'Aproveite a troca, mas documente decisão para não perder fechamento.' },
      ],
      relationships: [
        { profile: 'D', synergy: 'Energia + tração', challenge: 'Impulsividade relacional', strategy: 'Alinhar expectativa e critério de decisão antes de acelerar.' },
        { profile: 'I', synergy: 'Conexão + criatividade', challenge: 'Dispersão', strategy: 'Definir foco, prazo e dono da entrega.' },
        { profile: 'S', synergy: 'Clima + acolhimento', challenge: 'Ritmo desigual', strategy: 'Equilibrar entusiasmo com constância e previsibilidade.' },
        { profile: 'C', synergy: 'Narrativa + profundidade', challenge: 'Choque entre leveza e rigor', strategy: 'Traduzir ideia em evidência e síntese objetiva.' },
      ],
      relationshipTip:
        'Transforme boa conversa em prioridade clara, prazo e confirmação.',
    };
  }

  return {
    motivators: [
      { icon: '🎯', title: 'Desafio e meta', text: 'Contextos com direção clara, resultado e espaço para avançar rápido.' },
      { icon: '🔓', title: 'Autonomia', text: 'Liberdade para decidir, priorizar e agir sem excesso de intermediação.' },
      { icon: '⚡', title: 'Velocidade', text: 'Ambientes que valorizam resposta rápida e senso de urgência.' },
      { icon: '🏆', title: 'Impacto visível', text: 'Cenários em que a entrega aparece e move o resultado do negócio.' },
    ],
    environment: [
      { title: 'Estrutura de decisão', text: 'Prioridade clara, espaço para autonomia e pouca burocracia desnecessária.' },
      { title: 'Meta e tração', text: 'Ambientes com ritmo, responsabilidade e foco em avanço concreto.' },
      { title: 'Liderança objetiva', text: 'Gestores que alinham resultado, margem de decisão e critério de cobrança.' },
    ],
    communicationRows: [
      { title: 'Tom', text: 'Direto, firme e objetivo' },
      { title: 'Velocidade', text: 'Rápida, orientada a decisão' },
      { title: 'Canal preferido', text: 'Conversa curta, alinhamento direto e decisão prática' },
      { title: 'Escuta', text: 'Seletiva — busca o que acelera decisão e entrega' },
    ],
    decisionIntro:
      'Costuma decidir com rapidez, foco em avanço e boa tolerância a tensão, sobretudo quando há clareza de meta e responsabilidade.',
    decisionSteps: [
      { title: 'Lê o cenário', text: 'Identifica ponto crítico, prioridade e bloqueio principal.' },
      { title: 'Escolhe direção', text: 'Fecha caminho de avanço com rapidez e clareza.' },
      { title: 'Ajusta em movimento', text: 'Corrige rota sem perder ritmo de execução.' },
    ],
    conflict:
      'Enfrenta conflito com objetividade e senso de direção. Precisa calibrar forma e escuta para não gerar atrito maior do que o necessário.',
    pressure: {
      normal: [
        { title: 'Assertivo', text: 'Define direção e prioridade com clareza.' },
        { title: 'Decisivo', text: 'Age com rapidez diante de bloqueio ou urgência.' },
        { title: 'Focado', text: 'Mantém orientação para meta e entrega concreta.' },
        { title: 'Corajoso', text: 'Tolera tensão e disputa melhor do que a média.' },
      ],
      stressed: [
        { title: 'Impaciente', text: 'Aumenta ritmo e pode pressionar o grupo além do necessário.' },
        { title: 'Duro no tom', text: 'Reduz amortecimento relacional em momentos de tensão.' },
        { title: 'Centralizador', text: 'Assume decisão sozinho quando sente pouca resposta do entorno.' },
        { title: 'Atropela processo', text: 'Pode trocar qualidade por velocidade aparente.' },
      ],
    },
    perception: [
      { title: 'Pelos pares', text: 'Objetivo, corajoso e resolutivo — pode soar duro em momentos de tensão.' },
      { title: 'Pelos liderados', text: 'Claro em direção e cobrança — precisa calibrar escuta e ritmo do time.' },
      { title: 'Pelos superiores', text: 'Forte para avanço e decisão — deve equilibrar velocidade com consistência.' },
    ],
    nva: [
      { icon: '🤝', title: 'Estilo de Negociação', text: 'Negocia com firmeza, foco em ganho e baixa tolerância a rodeio. Funciona melhor quando objetivo, margem e critério estão explícitos.' },
      { icon: '💼', title: 'Estilo de Vendas', text: 'Vai bem em contexto de tração, fechamento e prioridade comercial clara. Precisa equilibrar pressão com leitura de momento e audiência.' },
      { icon: '📚', title: 'Estilo de Aprendizado', text: 'Aprende pela prática, por teste rápido e por aplicação imediata em desafio concreto.' },
    ],
    dna: [
      { title: 'Direção', text: 'Busca avanço com clareza.' },
      { title: 'Coragem', text: 'Tolera tensão e decisão difícil.' },
      { title: 'Velocidade', text: 'Age antes de ficar preso à hesitação.' },
      { title: 'Resultado', text: 'Mede valor por impacto concreto.' },
    ],
    developmentCards: [
      { icon: '🔍', title: 'Autoconhecimento', text: 'Observar quando a firmeza resolve e quando passa do ponto em pressão ou tom.' },
      { icon: '🎓', title: 'Escuta e Contexto', text: 'Treinar perguntas curtas antes de fechar direção em temas que exigem adesão.' },
      { icon: '🤝', title: 'Relacionamentos Estratégicos', text: 'Ajustar velocidade para integrar perfis mais estáveis ou analíticos sem perder tração.' },
      { icon: '⚖️', title: 'Sustentação', text: 'Combinar urgência com processo mínimo para reduzir retrabalho e desgaste.' },
    ],
    plan: [
      'Mapear gatilhos de impaciência, decisões apressadas e situações em que o tom eleva atrito.',
      'Praticar escuta curta antes de decidir, delegação com critério claro e checkpoints de qualidade.',
      'Consolidar liderança mais sustentável, com ritmo alto e menor custo relacional.',
    ],
    planFooter:
      'O plano de 90 dias mantém a força de direção do perfil enquanto fortalece escuta, delegação e consistência na execução.',
    advanced: {
      tag: 'Diretivo-Executivo',
      summary:
        'Influencia pelo senso de direção, clareza de prioridade e velocidade de decisão. Ganha mais escala quando combina firmeza com escuta e processo mínimo.',
      bullets: [
        'Explicitar prioridade e critério de fechamento',
        'Calibrar o tom para reduzir atrito desnecessário',
        'Delegar com meta, prazo e acompanhamento',
      ],
    },
    communicationAdvice: [
      { situation: '1:1 com liderados', recommendation: 'Seja direto, mas abra espaço para dúvida e alinhamento de expectativa.' },
      { situation: 'Reuniões de equipe', recommendation: 'Comece pela decisão, contexto e próximo passo.' },
      { situation: 'Com perfil C', recommendation: 'Traga direção com dado e critério mínimo de qualidade.' },
      { situation: 'Com perfil S', recommendation: 'Ajuste ritmo e reduza pressão desnecessária.' },
      { situation: 'Com perfil I', recommendation: 'Alinhe impacto, narrativa e fechamento objetivo.' },
    ],
    relationships: [
      { profile: 'D', synergy: 'Tração + decisão', challenge: 'Disputa por controle', strategy: 'Definir domínio, critério e ponto de decisão.' },
      { profile: 'I', synergy: 'Ritmo + adesão', challenge: 'Impulso sem fechamento', strategy: 'Unir energia com prioridade e follow-up.' },
      { profile: 'S', synergy: 'Velocidade + constância', challenge: 'Pressão excessiva', strategy: 'Negociar ritmo e explicar urgência com clareza.' },
      { profile: 'C', synergy: 'Direção + critério', challenge: 'Choque entre pressa e precisão', strategy: 'Combinar decisão com qualidade mínima explícita.' },
    ],
    relationshipTip:
      'Use velocidade com critério; firmeza ganha escala quando vem acompanhada de clareza e escuta.',
  };
}

function buildCombinationPrimaryText(profile = {}) {
  const primary = profile.primary || { key: 'D', value: 0 };
  return `${FACTOR_META[primary.key].name} aparece como fator principal em nível ${getLevel(primary.value)}. ${getFactorNarrative(primary.key, primary.value)}`;
}

function buildCombinationSecondaryText(profile = {}) {
  const secondary = profile.secondary || { key: 'I', value: 0 };
  return `${FACTOR_META[secondary.key].name} aparece como fator secundário em nível ${getLevel(secondary.value)}. ${getFactorNarrative(secondary.key, secondary.value)}`;
}

function buildCombinationSynergyText(profile = {}) {
  const primaryName = FACTOR_META[profile.primary?.key]?.name || profile.primary?.key || 'D';
  const secondaryName = FACTOR_META[profile.secondary?.key]?.name || profile.secondary?.key || 'I';
  const distance = Math.abs((profile.primary?.value || 0) - (profile.secondary?.value || 0));
  const balanceText =
    distance < 10
      ? `${primaryName} e ${secondaryName} aparecem muito próximos, o que mantém a combinação ${profile.label} bem balanceada.`
      : `${primaryName} permanece mais forte, mas ${secondaryName} complementa a leitura e ajuda a explicar como este perfil se expressa no dia a dia.`;

  return `A combinação ${profile.label} reúne ${primaryName} e ${secondaryName}. ${balanceText}`;
}

function buildBenchmarkText(profile = {}) {
  const primary = profile.primary || { key: 'D', value: 0 };
  const secondary = profile.secondary || { key: 'I', value: 0 };
  return `Sem base normativa externa nesta execução, o benchmark usa o próprio score como percentil proporcional. ${FACTOR_META[primary.key].name} marca percentil ${primary.value}, enquanto ${FACTOR_META[secondary.key].name} marca percentil ${secondary.value}.`;
}

function buildBenchmarkCards(profile = {}) {
  return [profile.primary, profile.secondary].map((factor) => ({
    title: `${FACTOR_META[factor?.key]?.name || factor?.key} ${capitalize(getLevel(factor?.value))}`,
    text: `${FACTOR_META[factor?.key]?.name || factor?.key} em ${factor?.value || 0}% na referência proporcional desta leitura.`,
  }));
}

function buildNaturalSummaryText(scores = {}) {
  const ordered = buildOrderedFactors(scores);
  const primary = ordered[0] || { key: 'D', value: 0 };
  const secondary = ordered[1] || { key: 'I', value: 0 };

  return `Predomínio de ${FACTOR_META[primary.key].name} em nível ${getLevel(primary.value)}, com ${FACTOR_META[secondary.key].name} em nível ${getLevel(secondary.value)}. ${formatFactorSnapshot(scores)}.`;
}

function buildAdaptedSummaryText(scores = {}) {
  const ordered = buildOrderedFactors(scores);
  const primary = ordered[0] || { key: 'D', value: 0 };
  const secondary = ordered[1] || { key: 'I', value: 0 };

  return `No contexto adaptado, ${FACTOR_META[primary.key].name} permanece em destaque em nível ${getLevel(primary.value)}, seguida por ${FACTOR_META[secondary.key].name} em nível ${getLevel(secondary.value)}. ${formatFactorSnapshot(scores)}.`;
}

function buildNaturalAdaptedInterpretation(profile = {}) {
  const changes = DISC_FACTOR_KEYS.map((factor) => {
    const delta = toNumber(profile.deltas?.[factor], 0);
    const action = delta >= 0 ? 'aumentou' : 'reduziu';
    return `${FACTOR_META[factor].name} ${action} ${Math.abs(Math.round(delta))} ponto${Math.abs(Math.round(delta)) === 1 ? '' : 's'} (${classifyDelta(delta)}).`;
  });
  const strongest = DISC_FACTOR_KEYS
    .map((factor) => ({ factor, delta: Math.abs(toNumber(profile.deltas?.[factor], 0)) }))
    .sort((left, right) => right.delta - left.delta)[0];

  if (!strongest || strongest.delta === 0) {
    return 'Os perfis Natural e Adaptado apresentam alta congruência neste caso, indicando comportamento consistente independentemente do contexto profissional — característica positiva de autenticidade.';
  }

  return `${changes.join(' ')} A maior diferença aparece em ${FACTOR_META[strongest.factor].name}.`;
}

function resolveQuadrant(profile = {}) {
  const primaryFactor = profile.primary?.key || 'D';

  if (primaryFactor === 'D') {
    return {
      label: 'Ativo-Voltado a Tarefas',
      summary: 'ritmo alto com foco principal em direção, entrega e desafio',
    };
  }

  if (primaryFactor === 'I') {
    return {
      label: 'Ativo-Voltado a Pessoas',
      summary: 'ritmo visível com foco principal em relacionamento, influência e presença social',
    };
  }

  if (primaryFactor === 'S') {
    return {
      label: 'Passivo-Voltado a Pessoas',
      summary: 'ritmo mais estável com foco em suporte, continuidade e cooperação',
    };
  }

  return {
    label: 'Passivo-Voltado a Tarefas',
    summary: 'ritmo mais contido com foco em análise, qualidade e previsibilidade',
  };
}

function buildMapSummary(profile = {}) {
  const quadrant = resolveQuadrant(profile);
  return `O ponto ${profile.label} situa-se no quadrante ${quadrant.label}, indicando ${quadrant.summary}.`;
}

function buildMapHighlight(profile = {}) {
  const quadrant = resolveQuadrant(profile);
  return `Quadrante ${profile.label} — este perfil. A leitura central privilegia ${quadrant.summary}.`;
}

function buildDeterministicDiscRawContent(profile = {}) {
  return {
    summary: buildExecutiveSummary(profile),
    executiveSummary: buildExecutiveSummary(profile),
    professionalPositioning: buildCombinationSynergyText(profile),
    communicationStyle: buildCommunicationStyle(profile),
    leadershipStyle: buildLeadershipStyle(profile),
    workStyle: buildWorkStyle(profile),
    pressureBehavior: buildPressureBehavior(profile),
    relationshipStyle: buildRelationshipStyle(profile),
    strengths: buildStrengthRows(profile).map((row) => row.text),
    limitations: buildLimitationRows(profile).map((row) => row.text),
    developmentRecommendations: buildDevelopmentRows(profile).map((row) => row.text),
    careerRecommendations: buildCareerCards(profile).map((row) => row.text),
    businessRecommendations: buildRecommendationItems(profile).map((row) => row.text),
  };
}

function buildDiscInterpretation({
  summaryScores = {},
  naturalScores = {},
  adaptedScores = {},
  logOrder = false,
} = {}) {
  const normalizedSummaryScores = normalizeScoresSnapshot(summaryScores, { allowDefaultValues: true });
  const normalizedNaturalScores =
    resolveNormalizedDiscScoreMap(naturalScores, normalizedSummaryScores) || normalizedSummaryScores;
  const normalizedAdaptedScores =
    resolveNormalizedDiscScoreMap(adaptedScores, normalizedNaturalScores) || normalizedNaturalScores;
  const profile = buildDiscProfile(normalizedSummaryScores);
  const deltas = Object.fromEntries(
    DISC_FACTOR_KEYS.map((factor) => [
      factor,
      toNumber(normalizedAdaptedScores[factor], normalizedSummaryScores[factor]) -
        toNumber(normalizedNaturalScores[factor], normalizedSummaryScores[factor]),
    ]),
  );
  const interpretation = {
    ...profile,
    scores: normalizedSummaryScores,
    naturalScores: normalizedNaturalScores,
    adaptedScores: normalizedAdaptedScores,
    deltas,
    rawContent: {},
  };

  interpretation.rawContent = buildDeterministicDiscRawContent(interpretation);

  if (logOrder) {
    console.log({
      primary: interpretation.primary,
      secondary: interpretation.secondary,
      tertiary: interpretation.tertiary,
      quaternary: interpretation.quaternary,
    });
  }

  return interpretation;
}

function rewriteTranspiledTsSpecifiers(source = '') {
  return String(source || '')
    .replaceAll(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2')
    .replaceAll(/(import\(\s*['"][^'"]+)\.ts(['"]\s*\))/g, '$1.js$2')
    .replaceAll(
      /(from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g,
      (match, prefix, specifier, suffix) =>
        /\.[a-z]+$/i.test(specifier) ? match : `${prefix}${specifier}.js${suffix}`,
    )
    .replaceAll(
      /(import\(\s*['"])(\.{1,2}\/[^'"]+?)(['"]\s*\))/g,
      (match, prefix, specifier, suffix) =>
        /\.[a-z]+$/i.test(specifier) ? match : `${prefix}${specifier}.js${suffix}`,
    );
}

function placeholderizeLegacyMasterTemplate(rawTemplate = '') {
  return String(rawTemplate || '')
    .replaceAll('João Silva', '{{name}}')
    .replaceAll('DI (Dominante Influente)', '{{profile}}')
    .replaceAll('34%', '{{disc_d}}%')
    .replaceAll('32%', '{{disc_i}}%')
    .replaceAll('23%', '{{disc_s}}%')
    .replaceAll('11%', '{{disc_c}}%');
}

function resolveAssessmentSnapshot(inputSnapshot = {}) {
  const normalized = toPlainObject(inputSnapshot);
  const assessment = toPlainObject(normalized.assessment);
  return Object.keys(assessment).length > 0 ? assessment : normalized;
}

function resolveScoringResultSnapshot(scoringSnapshot = {}) {
  const normalized = toPlainObject(scoringSnapshot);
  const assessmentResult = toPlainObject(normalized.assessment_result);
  const nestedResult = toPlainObject(assessmentResult.result);
  const result = toPlainObject(normalized.result);

  if (Object.keys(nestedResult).length > 0) {
    return nestedResult;
  }

  if (Object.keys(result).length > 0) {
    return result;
  }

  return normalized;
}

function filterRequiredPlaceholders(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => REPORT_PLACEHOLDER_KEYS.includes(item));
}

function resolveRequiredPlaceholders(templateSnapshot = {}) {
  const normalized = toPlainObject(templateSnapshot);
  const configured = pickFirstDefined(
    normalized.required_placeholders,
    normalized.requiredPlaceholders,
    normalized.placeholders,
  );
  const filtered = filterRequiredPlaceholders(configured);
  return filtered.length > 0 ? filtered : REPORT_PLACEHOLDER_KEYS;
}

function resolveAssessmentValues({
  payload = {},
  inputSnapshot = {},
  normalizedScores = {},
  allowDefaultValues = true,
} = {}) {
  const normalizedPayload = toPlainObject(payload);
  const assessment = resolveAssessmentSnapshot(inputSnapshot);
  const disc = toPlainObject(normalizedPayload.disc);
  const report = toPlainObject(normalizedPayload.report);
  const computedProfile = computeProfileLabel(normalizedScores);
  const fallbackProfile = allowDefaultValues ? computedProfile : '';

  return {
    name:
      toText(
        pickFirstDefined(
          normalizedPayload.nome,
          normalizedPayload.name,
          assessment.name,
          assessment.nome,
        ),
      ) || (allowDefaultValues ? 'João Silva' : ''),
    profile:
      computedProfile ||
      toText(
        pickFirstDefined(
          disc.profile,
          disc.perfil,
          report.profile,
          normalizedPayload.profile,
          assessment.profile,
          assessment.profile_name,
          assessment.profileName,
        ),
      ) ||
      fallbackProfile,
    cargo:
      toText(
        pickFirstDefined(
          normalizedPayload.cargo,
          normalizedPayload.role,
          assessment.cargo,
          assessment.role,
          assessment.job_title,
          assessment.jobTitle,
        ),
      ) || (allowDefaultValues ? 'Gerente Comercial' : ''),
    empresa:
      toText(
        pickFirstDefined(
          normalizedPayload.empresa,
          normalizedPayload.company,
          assessment.empresa,
          assessment.company,
          assessment.company_name,
          assessment.companyName,
        ),
      ) || (allowDefaultValues ? 'Empresa XYZ' : ''),
    data:
      toText(
        pickFirstDefined(
          normalizedPayload.data,
          normalizedPayload.date,
          assessment.data,
          assessment.date,
          assessment.assessment_date,
          assessment.assessmentDate,
        ),
      ) || (allowDefaultValues ? '15/03/2026' : ''),
  };
}

function resolveScoreInputs({
  scores = {},
  payload = {},
  scoringSnapshot = {},
  allowDefaultValues = true,
} = {}) {
  const normalizedScores = toPlainObject(scores);
  const normalizedPayload = toPlainObject(payload);
  const disc = toPlainObject(normalizedPayload.disc);
  const result = resolveScoringResultSnapshot(scoringSnapshot);

  const pickScore = (factor) => {
    const upper = factor.toUpperCase();
    const lower = factor.toLowerCase();

    return pickFirstDefined(
      normalizedScores[upper],
      normalizedScores[lower],
      normalizedScores[`DISC_${upper}`],
      normalizedScores[`disc_${lower}`],
      normalizedPayload[`disc_${lower}`],
      normalizedPayload[lower],
      normalizedPayload[`DISC_${upper}`],
      disc[`disc_${lower}`],
      disc[lower],
      disc[`DISC_${upper}`],
      result[`disc_${lower}`],
      result[lower],
      result[upper],
      result[`DISC_${upper}`],
      result[`disc_${upper}`],
    );
  };

  return normalizeScoresSnapshot(
    {
      D: pickScore('D'),
      I: pickScore('I'),
      S: pickScore('S'),
      C: pickScore('C'),
    },
    { allowDefaultValues },
  );
}

function buildRuntimeSnapshots({
  scores = {},
  payload = {},
  input_snapshot: inputSnapshot = {},
  scoring_snapshot: scoringSnapshot = {},
  allowDefaultValues = true,
} = {}) {
  const normalizedScores = resolveScoreInputs({
    scores,
    payload,
    scoringSnapshot,
    allowDefaultValues,
  });
  const assessment = resolveAssessmentValues({
    payload,
    inputSnapshot,
    normalizedScores,
    allowDefaultValues,
  });

  return {
    normalizedScores,
    assessment,
    input_snapshot: {
      assessment,
    },
    scoring_snapshot: {
      assessment_result: {
        result: {
          disc_d: normalizedScores.D,
          disc_i: normalizedScores.I,
          disc_s: normalizedScores.S,
          disc_c: normalizedScores.C,
        },
      },
    },
  };
}

function buildPlaceholderValues({ assessment = {}, normalizedScores = {} } = {}) {
  return {
    name: toText(assessment.name),
    profile: computeProfileLabel(normalizedScores) || toText(assessment.profile),
    disc_d: toText(normalizedScores.D),
    disc_i: toText(normalizedScores.I),
    disc_s: toText(normalizedScores.S),
    disc_c: toText(normalizedScores.C),
  };
}

function assertRequiredPlaceholderValues(values = {}, requiredPlaceholders = REPORT_PLACEHOLDER_KEYS) {
  const missing = requiredPlaceholders.filter((key) => !toText(values[key]));

  if (missing.length > 0) {
    throw createReportGeneratorError(
      'MISSING_REQUIRED_PLACEHOLDER',
      'Missing required placeholder value.',
      { placeholders: missing },
    );
  }
}

function assertKnownTemplatePlaceholders(templateHtml = '') {
  const matches = String(templateHtml || '').matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g);
  const unknown = [];

  for (const match of matches) {
    const key = String(match?.[1] || '').trim();
    if (key && !REPORT_PLACEHOLDER_KEYS.includes(key)) {
      unknown.push(key);
    }
  }

  if (unknown.length > 0) {
    throw createReportGeneratorError(
      'UNKNOWN_PLACEHOLDER',
      'Unknown placeholder found in template.',
      { placeholders: [...new Set(unknown)] },
    );
  }
}

function assertRequiredTemplatePlaceholders(templateHtml = '', requiredPlaceholders = REPORT_PLACEHOLDER_KEYS) {
  const present = new Set(
    Array.from(String(templateHtml || '').matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g))
      .map((match) => String(match?.[1] || '').trim())
      .filter(Boolean),
  );
  const missing = requiredPlaceholders.filter((key) => !present.has(key));

  if (missing.length > 0) {
    throw createReportGeneratorError(
      'MISSING_REQUIRED_PLACEHOLDER',
      'Missing required placeholder in template.',
      { placeholders: missing },
    );
  }
}

function applyWhitelistedPlaceholders(templateHtml = '', values = {}) {
  return String(templateHtml || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key) => {
    if (!REPORT_PLACEHOLDER_KEYS.includes(key)) {
      return match;
    }

    return escapeHtml(values[key] ?? '');
  });
}

function createFallbackReportHtmlRuntime() {
  return {
    buildReportHtml(input = {}) {
      const reportType = normalizeMode(input.reportType);
      const templateSnapshot = toPlainObject(input.template_snapshot);
      const inputSnapshot = toPlainObject(input.input_snapshot);
      const scoringSnapshot = toPlainObject(input.scoring_snapshot);
      const assessment = resolveAssessmentSnapshot(inputSnapshot);
      const result = resolveScoringResultSnapshot(scoringSnapshot);
      const templateHtml = toText(
        pickFirstDefined(
          templateSnapshot.html,
          templateSnapshot.template_html,
          templateSnapshot.templateHtml,
        ),
      );

      if (!templateHtml) {
        throw createReportGeneratorError(
          'TEMPLATE_NOT_FOUND',
          'Report template not found.',
          {
            reportType,
            templatePath:
              toText(
                pickFirstDefined(templateSnapshot.templatePath, templateSnapshot.path),
              ) || resolveOfficialTemplatePath(reportType),
          },
        );
      }

      const requiredPlaceholders = resolveRequiredPlaceholders(templateSnapshot);
      const placeholderValues = {
        name: toText(assessment.name),
        profile:
          computeProfileLabel({
            D: pickFirstDefined(result.disc_d, result.d, result.D),
            I: pickFirstDefined(result.disc_i, result.i, result.I),
            S: pickFirstDefined(result.disc_s, result.s, result.S),
            C: pickFirstDefined(result.disc_c, result.c, result.C),
          }) || toText(assessment.profile),
        disc_d: toText(
          pickFirstDefined(result.disc_d, result.d, result.D),
        ),
        disc_i: toText(
          pickFirstDefined(result.disc_i, result.i, result.I),
        ),
        disc_s: toText(
          pickFirstDefined(result.disc_s, result.s, result.S),
        ),
        disc_c: toText(
          pickFirstDefined(result.disc_c, result.c, result.C),
        ),
      };

      assertKnownTemplatePlaceholders(templateHtml);
      assertRequiredTemplatePlaceholders(templateHtml, requiredPlaceholders);
      assertRequiredPlaceholderValues(placeholderValues, requiredPlaceholders);

      const language =
        toText(
          pickFirstDefined(input.language, templateSnapshot.language, templateSnapshot.lang, 'pt-BR'),
        ) || 'pt-BR';
      const templatePath =
        toText(
          pickFirstDefined(templateSnapshot.templatePath, templateSnapshot.path),
        ) || resolveOfficialTemplatePath(reportType);
      const cacheKey =
        toText(templateSnapshot.cacheKey) || `inline:report.v1:${language}:${reportType}`;

      return {
        reportType,
        html: applyWhitelistedPlaceholders(templateHtml, placeholderValues),
        language,
        version: 'report.v1',
        templatePath,
        cacheKey,
        template_snapshot: {
          templatePath,
          language,
          version: 'report.v1',
          placeholders: requiredPlaceholders,
        },
      };
    },
  };
}

async function loadReportHtmlEngine() {
  if (reportHtmlEnginePromise) {
    return reportHtmlEnginePromise;
  }

  reportHtmlEnginePromise = (async () => {
    try {
      const ts = await import('typescript');
      const runtimeRoot = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-report-lib-'));

      for (const relativePath of REPORT_LIB_TS_FILES) {
        const sourcePath = path.resolve(PROJECT_ROOT, relativePath);
        const outputPath = path.join(runtimeRoot, relativePath.replace(/\.ts$/i, '.js'));
        const source = readFileSync(sourcePath, 'utf8');
        const transpiled = ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ES2022,
            target: ts.ScriptTarget.ES2022,
          },
          fileName: sourcePath,
        });

        mkdirSync(path.dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, rewriteTranspiledTsSpecifiers(transpiled.outputText), 'utf8');
      }

      const moduleUrl = pathToFileURL(
        path.join(runtimeRoot, 'lib/pdf/build-report-html.js'),
      ).href;
      const runtimeModule = await import(moduleUrl);

      if (typeof runtimeModule.buildReportHtml !== 'function') {
        throw new Error('REPORT_HTML_ENGINE_UNAVAILABLE');
      }

      return runtimeModule;
    } catch (error) {
      const detail = String(error?.code || error?.message || error || '').trim();
      const shouldFallback =
        detail.includes('ERR_MODULE_NOT_FOUND') ||
        detail.includes('ENOENT') ||
        detail.includes('Cannot find package') ||
        detail.includes('REPORT_HTML_ENGINE_UNAVAILABLE');

      if (!shouldFallback) {
        throw error;
      }

      console.warn('[disc-report] using built-in fallback html runtime', {
        reason: detail,
      });
      return createFallbackReportHtmlRuntime();
    }
  })();

  return reportHtmlEnginePromise;
}

async function loadDiscTemplateRuntime() {
  if (discEngineRuntimePromise) {
    return discEngineRuntimePromise;
  }

  discEngineRuntimePromise = import(pathToFileURL(DISC_ENGINE_RUNTIME_PATH).href);
  return discEngineRuntimePromise;
}

async function loadTemplateSource({
  reportType = 'business',
  language = 'pt-BR',
  version = 'report.v1',
  templateHtml = '',
  templatePath = '',
} = {}) {
  const resolveTemplatePath = (rawPath = '') => {
    const normalized = toText(rawPath);
    if (!normalized) {
      return MASTER_TEMPLATE_PATH;
    }

    if (path.isAbsolute(normalized)) {
      return normalized;
    }

    const candidates = [
      path.resolve(PROJECT_ROOT, normalized),
      path.resolve(PROJECT_ROOT, '..', normalized),
      path.resolve(process.cwd(), normalized),
      path.resolve(process.cwd(), '..', normalized),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return path.resolve(PROJECT_ROOT, normalized);
  };

  const inlineTemplate = String(templateHtml || '');
  const resolvedTemplatePath = resolveTemplatePath(templatePath);

  if (inlineTemplate) {
    return {
      html: inlineTemplate,
      templatePath: resolvedTemplatePath,
      cacheKey: `inline:${version}:${language}:${reportType}`,
      sizeBytes: Buffer.byteLength(inlineTemplate, 'utf8'),
      readDurationMs: 0,
      fromCache: false,
    };
  }

  const cacheKey = [version, language, reportType, resolvedTemplatePath].join(':');
  const cached = templateCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      readDurationMs: 0,
      fromCache: true,
    };
  }

  if (templateInflight.has(cacheKey)) {
    return templateInflight.get(cacheKey);
  }

  const pending = (async () => {
    const readStartedAt = Date.now();
    let rawTemplate = '';

    try {
      rawTemplate = readFileSync(resolvedTemplatePath, 'utf8');
    } catch (error) {
      throw createReportGeneratorError(
        'TEMPLATE_NOT_FOUND',
        'Report template not found.',
        {
          reportType,
          templatePath: resolvedTemplatePath,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }

    const html =
      resolvedTemplatePath === MASTER_TEMPLATE_PATH
        ? placeholderizeLegacyMasterTemplate(rawTemplate)
        : rawTemplate;
    const loaded = {
      html,
      templatePath: resolvedTemplatePath,
      cacheKey,
      sizeBytes: Buffer.byteLength(html, 'utf8'),
    };

    templateCache.set(cacheKey, loaded);

    return {
      ...loaded,
      readDurationMs: Date.now() - readStartedAt,
      fromCache: false,
    };
  })().finally(() => {
    templateInflight.delete(cacheKey);
  });

  templateInflight.set(cacheKey, pending);
  return pending;
}

function storagePath({ accountId, reportId, reportType } = {}) {
  const normalizedAccountId = toText(accountId);
  const normalizedReportId = toText(reportId);
  const normalizedReportType = toText(reportType);

  if (!normalizedAccountId || !normalizedReportId || !normalizedReportType) {
    return null;
  }

  return `reports/${normalizedAccountId}/${normalizedReportId}/${normalizedReportType}.pdf`;
}

function invalidateTemplateCache() {
  templateCache.clear();
  templateInflight.clear();
}

function resolveOfficialTemplatePath(reportType = 'business') {
  const normalizedReportType = normalizeMode(reportType);
  const templateFileName =
    OFFICIAL_TEMPLATE_PATHS[normalizedReportType] || OFFICIAL_TEMPLATE_PATHS.business;
  return path.join(basePath, templateFileName);
}

async function buildReportHtmlPreview({
  reportType = 'business',
  scores,
  payload,
  input_snapshot,
  scoring_snapshot,
  template_snapshot,
  templateHtml,
  templatePath,
  language,
  allowDefaultValues = true,
} = {}) {
  const runtime = await loadReportHtmlEngine();
  const normalizedTemplateSnapshot = toPlainObject(template_snapshot);
  const normalizedLanguage =
    toText(
      pickFirstDefined(
        language,
        normalizedTemplateSnapshot.language,
        normalizedTemplateSnapshot.lang,
        'pt-BR',
      ),
    ) || 'pt-BR';
  const requiredPlaceholders = resolveRequiredPlaceholders(normalizedTemplateSnapshot);
  const templateSource = await loadTemplateSource({
    reportType,
    language: normalizedLanguage,
    version:
      toText(normalizedTemplateSnapshot.version) || 'report.v1',
    templateHtml:
      templateHtml ||
      pickFirstDefined(
        normalizedTemplateSnapshot.html,
        normalizedTemplateSnapshot.template_html,
        normalizedTemplateSnapshot.templateHtml,
      ) ||
      '',
    templatePath:
      templatePath ||
      pickFirstDefined(
        normalizedTemplateSnapshot.templatePath,
        normalizedTemplateSnapshot.path,
      ) ||
      '',
  });
  const snapshots = buildRuntimeSnapshots({
    scores,
    payload,
    input_snapshot,
    scoring_snapshot,
    allowDefaultValues,
  });
  const placeholderValues = buildPlaceholderValues({
    assessment: snapshots.assessment,
    normalizedScores: snapshots.normalizedScores,
  });

  assertRequiredPlaceholderValues(placeholderValues, requiredPlaceholders);

  console.info('[disc-report] template loaded', {
    reportType,
    templatePath: templateSource.templatePath,
    templateBytes: templateSource.sizeBytes,
    readMs: templateSource.readDurationMs,
    fromCache: templateSource.fromCache,
  });

  const renderStartedAt = Date.now();
  const built = runtime.buildReportHtml({
    reportType,
    language: normalizedLanguage,
    input_snapshot: snapshots.input_snapshot,
    scoring_snapshot: snapshots.scoring_snapshot,
    template_snapshot: {
      ...normalizedTemplateSnapshot,
      html: templateSource.html,
      required_placeholders: requiredPlaceholders,
      language: normalizedLanguage,
      version: toText(normalizedTemplateSnapshot.version) || 'report.v1',
    },
  });
  const renderDurationMs = Date.now() - renderStartedAt;

  console.info('[disc-report] html rendered', {
    reportType,
    renderMs: renderDurationMs,
    templateBytes: templateSource.sizeBytes,
  });

  return {
    ...built,
    input_snapshot: snapshots.input_snapshot,
    scoring_snapshot: snapshots.scoring_snapshot,
    placeholderValues,
    templateMetrics: {
      templateBytes: templateSource.sizeBytes,
      readMs: templateSource.readDurationMs,
      renderMs: renderDurationMs,
      fromCache: templateSource.fromCache,
    },
  };
}

async function buildTemplateSnapshotPayload({
  mode,
  scores,
  payload,
  reportModel = {},
  assessment = {},
} = {}) {
  const built = await buildReportHtmlPreview({
    reportType: mode,
    scores,
    payload,
  });
  const interpretation = resolveDiscRenderInterpretation({
    scores,
    payload,
    scoringSnapshot: built.scoring_snapshot,
    reportModel,
    assessment,
    logOrder: false,
  });
  const assessmentSnapshot = resolveAssessmentSnapshot(built.input_snapshot);

  return {
    input_snapshot: {
      assessment: {
        ...assessmentSnapshot,
        profile: interpretation.label,
      },
    },
    scoring_snapshot: built.scoring_snapshot,
    template_snapshot: {
      html: built.html,
      templatePath: built.templatePath,
      cacheKey: built.cacheKey,
      placeholders: built.template_snapshot?.placeholders || REPORT_PLACEHOLDER_KEYS,
      version: built.version,
      language: built.language,
    },
    cache: {
      templateCacheKey: built.cacheKey,
    },
    content: {
      ...interpretation.rawContent,
    },
    rawContent: {
      ...interpretation.rawContent,
    },
    version: built.version,
    language: built.language,
  };
}

async function generateHtmlPreview({
  mode = 'business',
  scores = {},
  payload = {},
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const runtimePayload = await buildTemplateSnapshotPayload({
    mode: normalizedMode,
    scores,
    payload,
  });
  const rendered = await generateDiscHtmlFromRuntimePayload({
    mode: normalizedMode,
    runtimePayload,
    scores,
    payload,
  });

  return rendered.html;
}

function resolveOfficialValidationProfile(reportModel = {}, assessment = {}) {
  const participant = toPlainObject(reportModel?.participant);
  const profile = toPlainObject(reportModel?.profile);
  const assessmentProfile = toPlainObject(assessment?.report?.discProfile?.profile);

  return (
    toText(
      pickFirstDefined(
        participant.profile,
        participant.profileName,
        reportModel?.profileLabel,
        profile.title,
        profile.label,
        assessmentProfile.label,
        assessmentProfile.title,
        profile.key && profile.archetype ? `${profile.key} (${profile.archetype})` : '',
        profile.key,
      ),
    ) || ''
  );
}

function resolveOfficialValidationScores(reportModel = {}, assessment = {}) {
  const reportScores = toPlainObject(reportModel?.scores);
  const assessmentScores = toPlainObject(assessment?.results);
  const discScores = toPlainObject(assessment?.disc_results);

  return resolveScoreInputs({
    scores: pickFirstDefined(
      reportScores.natural,
      reportScores.summary,
      assessmentScores.natural_profile,
      discScores.natural,
      assessment?.report?.discProfile?.scores?.natural,
      assessment?.report?.discProfile?.scores?.summary,
    ) || {},
    allowDefaultValues: false,
  });
}

function buildOfficialTemplateValidationInput({ reportModel = {}, assessment = {} } = {}) {
  const participant = toPlainObject(reportModel?.participant);
  const normalizedScores = resolveOfficialValidationScores(reportModel, assessment);

  return {
    reportType: normalizeMode(reportModel?.meta?.reportType || reportModel?.reportType),
    input_snapshot: {
      assessment: {
        name: toText(
          pickFirstDefined(
            participant.name,
            participant.candidateName,
            participant.respondent_name,
            assessment?.candidateName,
            assessment?.respondent_name,
            participant.email,
            assessment?.candidateEmail,
          ),
        ),
        profile: computeProfileLabel(normalizedScores),
      },
    },
    scoring_snapshot: {
      assessment_result: {
        result: {
          disc_d: normalizedScores.D,
          disc_i: normalizedScores.I,
          disc_s: normalizedScores.S,
          disc_c: normalizedScores.C,
        },
      },
    },
  };
}

async function assertOfficialTemplateCompatibility(input = {}) {
  const validationInput = buildOfficialTemplateValidationInput(input);

  return buildReportHtmlPreview({
    reportType: validationInput.reportType,
    input_snapshot: validationInput.input_snapshot,
    scoring_snapshot: validationInput.scoring_snapshot,
    templateHtml: OFFICIAL_TEMPLATE_VALIDATION_HTML,
    templatePath: resolveOfficialTemplatePath(validationInput.reportType),
    template_snapshot: {
      required_placeholders: REPORT_PLACEHOLDER_KEYS,
      language: 'pt-BR',
      version: 'report.v1',
    },
    allowDefaultValues: false,
  });
}

function buildAiArtifactPayload(aiResult = {}) {
  const payload = {
    content: aiResult.content,
    rawContent: aiResult.rawContent,
  };

  const inputSnapshot = pickFirstDefined(
    aiResult.input_snapshot,
    aiResult.inputSnapshot,
    aiResult.rawContent?.input_snapshot,
    aiResult.rawContent?.inputSnapshot,
    aiResult.content?.input_snapshot,
    aiResult.content?.inputSnapshot,
  );
  const scoringSnapshot = pickFirstDefined(
    aiResult.scoring_snapshot,
    aiResult.scoringSnapshot,
    aiResult.rawContent?.scoring_snapshot,
    aiResult.rawContent?.scoringSnapshot,
    aiResult.content?.scoring_snapshot,
    aiResult.content?.scoringSnapshot,
  );
  const cache = pickFirstDefined(
    aiResult.cache,
    aiResult.rawContent?.cache,
    aiResult.content?.cache,
  );
  const version = pickFirstDefined(
    aiResult.version,
    aiResult.rawContent?.version,
    aiResult.content?.version,
  );
  const language = pickFirstDefined(
    aiResult.language,
    aiResult.lang,
    aiResult.locale,
    aiResult.rawContent?.language,
    aiResult.content?.language,
  );

  if (Object.keys(toPlainObject(inputSnapshot)).length > 0) {
    payload.input_snapshot = toPlainObject(inputSnapshot);
  }

  if (Object.keys(toPlainObject(scoringSnapshot)).length > 0) {
    payload.scoring_snapshot = toPlainObject(scoringSnapshot);
  }

  if (Object.keys(toPlainObject(cache)).length > 0) {
    payload.cache = toPlainObject(cache);
  }

  if (typeof version === 'string' && version.trim()) {
    payload.version = version.trim();
  }

  if (typeof language === 'string' && language.trim()) {
    payload.language = language.trim();
  }

  return payload;
}

function mergeArtifactPayload(basePayload = {}, aiPayload = {}) {
  const normalizedBase = toPlainObject(basePayload);
  const normalizedAi = toPlainObject(aiPayload);

  return {
    ...normalizedBase,
    ...normalizedAi,
    content: {
      ...toPlainObject(normalizedBase.content),
      ...toPlainObject(normalizedAi.content),
    },
    rawContent: {
      ...toPlainObject(normalizedBase.rawContent),
      ...toPlainObject(normalizedAi.rawContent),
    },
    input_snapshot: normalizedAi.input_snapshot ?? normalizedBase.input_snapshot ?? {},
    scoring_snapshot: normalizedAi.scoring_snapshot ?? normalizedBase.scoring_snapshot ?? {},
    template_snapshot: {
      ...toPlainObject(normalizedBase.template_snapshot),
      ...toPlainObject(normalizedAi.template_snapshot),
    },
    cache: {
      ...toPlainObject(normalizedBase.cache),
      ...toPlainObject(normalizedAi.cache),
    },
    version: normalizedAi.version || normalizedBase.version || '',
    language: normalizedAi.language || normalizedBase.language || '',
  };
}

function resolvePayloadDiscSnapshots(payload = {}, scoringSnapshot = {}, summaryScores = null) {
  const normalizedPayload = toPlainObject(payload);
  const disc = toPlainObject(normalizedPayload.disc);
  const scoring = toPlainObject(scoringSnapshot);

  const resolvedSummary =
    resolveNormalizedDiscScoreMap(
      normalizedPayload.summary,
      normalizedPayload.scores,
      disc.summary,
      disc.scores,
      scoring.summary,
      scoring.scores,
      summaryScores,
    ) ||
    resolveScoreInputs({
      scores: summaryScores || {},
      payload,
      scoringSnapshot,
      allowDefaultValues: true,
    });
  const resolvedNatural =
    resolveNormalizedDiscScoreMap(
      normalizedPayload.natural,
      normalizedPayload.natural_profile,
      disc.natural,
      disc.natural_profile,
      scoring.natural,
      scoring.natural_profile,
      resolvedSummary,
    ) || resolvedSummary;
  const resolvedAdapted =
    resolveNormalizedDiscScoreMap(
      normalizedPayload.adapted,
      normalizedPayload.adapted_profile,
      disc.adapted,
      disc.adapted_profile,
      scoring.adapted,
      scoring.adapted_profile,
      resolvedNatural,
    ) || resolvedNatural;

  return {
    summary: resolvedSummary,
    natural: resolvedNatural,
    adapted: resolvedAdapted,
  };
}

function resolveStructuredReportSnapshots(reportModel = {}, assessment = {}) {
  const reportScores = toPlainObject(reportModel?.scores);
  const assessmentScores = resolveAssessmentDiscResultSnapshot(assessment);
  const reportDiscProfileScores = toPlainObject(assessment?.report?.discProfile?.scores);

  const summary =
    resolveNormalizedDiscScoreMap(
      reportScores.summary,
      reportScores.natural,
      reportScores.adapted,
      assessmentScores?.summary,
      assessmentScores,
      reportDiscProfileScores.summary,
      reportDiscProfileScores.natural,
      assessment?.results?.natural_profile,
      assessment?.disc_results?.summary,
      assessment?.disc_results?.natural,
    ) || normalizeScoresSnapshot({}, { allowDefaultValues: true });
  const natural =
    resolveNormalizedDiscScoreMap(
      reportScores.natural,
      assessment?.results?.natural_profile,
      assessment?.disc_results?.natural,
      reportDiscProfileScores.natural,
      summary,
    ) || summary;
  const adapted =
    resolveNormalizedDiscScoreMap(
      reportScores.adapted,
      assessment?.results?.adapted_profile,
      assessment?.disc_results?.adapted,
      reportDiscProfileScores.adapted,
      natural,
    ) || natural;

  return { summary, natural, adapted };
}

function resolveDiscRenderInterpretation({
  scores = {},
  payload = {},
  scoringSnapshot = {},
  reportModel = {},
  assessment = {},
  logOrder = false,
} = {}) {
  const hasStructuredSource =
    Object.keys(toPlainObject(reportModel)).length > 0 || Object.keys(toPlainObject(assessment)).length > 0;
  const structuredSnapshots = hasStructuredSource
    ? resolveStructuredReportSnapshots(reportModel, assessment)
    : null;
  const payloadSnapshots = resolvePayloadDiscSnapshots(
    payload,
    resolveScoringResultSnapshot(scoringSnapshot),
    structuredSnapshots?.summary || scores,
  );

  return buildDiscInterpretation({
    summaryScores: structuredSnapshots?.summary || payloadSnapshots.summary,
    naturalScores: structuredSnapshots?.natural || payloadSnapshots.natural,
    adaptedScores: structuredSnapshots?.adapted || payloadSnapshots.adapted,
    logOrder,
  });
}

function findMatchingDivEnd(html, startIndex) {
  const tagPattern = /<div\b[^>]*>|<\/div>/g;
  tagPattern.lastIndex = startIndex;

  let depth = 0;
  let match;

  while ((match = tagPattern.exec(html))) {
    if (match[0].startsWith('</div')) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return tagPattern.lastIndex;
    }
  }

  throw new Error('Nao foi possivel fechar um bloco de slide do relatorio DISC.');
}

function extractSlides(html = '') {
  const slides = [];
  let cursor = 0;

  while (true) {
    const startIndex = html.indexOf('<div class="slide"', cursor);
    if (startIndex === -1) {
      break;
    }

    const tagEnd = html.indexOf('>', startIndex);
    const openTag = html.slice(startIndex, tagEnd + 1);
    const idMatch = openTag.match(/\sid="([^"]+)"/);
    const id = idMatch?.[1];

    if (!id) {
      break;
    }

    const endIndex = findMatchingDivEnd(html, startIndex);
    slides.push({
      id,
      startIndex,
      endIndex,
      block: html.slice(startIndex, endIndex),
    });
    cursor = endIndex;
  }

  return slides;
}

function replaceSlideBlock(html, slideId, transform) {
  const slide = extractSlides(html).find((entry) => entry.id === slideId);
  if (!slide) return html;

  const nextBlock = transform(slide.block);
  if (typeof nextBlock !== 'string' || nextBlock === slide.block) {
    return html;
  }

  return `${html.slice(0, slide.startIndex)}${nextBlock}${html.slice(slide.endIndex)}`;
}

function replaceNthMatch(input, pattern, index, replacement) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  let match;
  let currentIndex = 0;

  while ((match = regex.exec(input))) {
    if (currentIndex === index) {
      const value =
        typeof replacement === 'function' ? replacement(match[0], currentIndex) : replacement;
      return `${input.slice(0, match.index)}${value}${input.slice(match.index + match[0].length)}`;
    }

    currentIndex += 1;
  }

  return input;
}

function replaceHeadingParagraph(block, headingText, value, headingTag = 'h3') {
  const pattern = new RegExp(
    `(<${headingTag}[^>]*>${escapeRegex(headingText)}<\\/${headingTag}>\\s*<p[^>]*>)([\\s\\S]*?)(<\\/p>)`,
  );
  return block.replace(pattern, `$1${escapeHtml(value)}$3`);
}

function replaceLabeledParagraph(block, labelText, value) {
  const pattern = new RegExp(
    `(<div[^>]*>${escapeRegex(labelText)}<\\/div>\\s*<p[^>]*>)([\\s\\S]*?)(<\\/p>)`,
  );
  return block.replace(pattern, `$1${escapeHtml(value)}$3`);
}

function renderTableBody(rows = []) {
  return `<tbody>${rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.text)}</td></tr>`,
    )
    .join('')}</tbody>`;
}

function resolveStableIconToken(icon = '', title = '') {
  const map = {
    '🤝': 'CO',
    '📣': 'VO',
    '🌐': 'RE',
    '🎤': 'EX',
    '🤲': 'CU',
    '🧩': 'ES',
    '📅': 'PL',
    '🏥': 'BE',
    '📊': 'AN',
    '🛡️': 'QA',
    '🧠': 'IQ',
    '🧾': 'PR',
    '🎯': 'FO',
    '🚀': 'IN',
    '🧭': 'DI',
    '⚙️': 'RT',
    '📏': 'CR',
    '⏱️': 'TM',
    '💼': 'NV',
    '📚': 'AP',
    '🖥️': 'ED',
    '🔍': 'AC',
    '🗣️': 'CM',
    '🔄': 'FL',
    '🌿': 'EQ',
    '🛠️': 'UT',
    '💡': 'ID',
    '🏁': 'FC',
    '📌': 'FP',
    '🔓': 'AU',
    '⚡': 'VL',
    '🏆': 'RG',
    '🎓': 'MT',
    '⚖️': 'BL',
  };

  if (map[icon]) return map[icon];

  const words = toText(title)
    .split(/\s+/)
    .filter(Boolean);
  const fallback = words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return fallback || 'ID';
}

function renderStableMonogramIcon(icon = '', title = '') {
  const token = resolveStableIconToken(icon, title);
  return `<div class="ibox n" style="padding:0;overflow:hidden;"><svg viewBox="0 0 38 38" width="38" height="38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="0.5" y="0.5" width="37" height="37" rx="9" fill="rgba(108,71,255,0.18)" stroke="rgba(108,71,255,0.35)"/><text x="19" y="24" text-anchor="middle" font-family="Sora,sans-serif" font-size="11" font-weight="700" fill="#cfd4ff">${escapeHtml(token)}</text></svg></div>`;
}

function resolveCardIconKind(icon = '', title = '') {
  const normalizedIcon = toText(icon).trim();
  const normalizedTitle = toText(title).toLowerCase();
  if (normalizedIcon === '🤝') return 'handshake';
  if (normalizedIcon === '📣' || /vendas|marketing|comunicação/.test(normalizedTitle)) return 'megaphone';
  if (normalizedIcon === '📚') return 'book';
  if (normalizedIcon === '🖥️' || /facilita|educa/.test(normalizedTitle)) return 'presentation';
  return '';
}

function renderCardIcon(icon = '', title = '') {
  const kind = resolveCardIconKind(icon, title);
  if (!kind) {
    return renderStableMonogramIcon(icon, title);
  }

  const glyphs = {
    handshake:
      '<path d="M8 22l7-7 4 4 4-4 7 7" fill="none" stroke="#cfd4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 26l3-3m2 3l3-3m2 3l3-3m2 3l3-3" fill="none" stroke="#cfd4ff" stroke-width="1.6" stroke-linecap="round"/>',
    megaphone:
      '<path d="M9 21l10-5v8l-10-5z" fill="none" stroke="#cfd4ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M19 16l8-3v14l-8-3" fill="none" stroke="#cfd4ff" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 23l2 6h4l-1.6-5" fill="none" stroke="#cfd4ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    book:
      '<rect x="8.5" y="10" width="9.5" height="17.5" rx="1.8" fill="none" stroke="#cfd4ff" stroke-width="1.6"/><rect x="19.5" y="10" width="9.5" height="17.5" rx="1.8" fill="none" stroke="#cfd4ff" stroke-width="1.6"/><line x1="19" y1="10" x2="19" y2="27.5" stroke="#cfd4ff" stroke-width="1.2"/><line x1="12" y1="14" x2="16" y2="14" stroke="#cfd4ff" stroke-width="1.2"/><line x1="22" y1="14" x2="26" y2="14" stroke="#cfd4ff" stroke-width="1.2"/>',
    presentation:
      '<rect x="8.5" y="9.5" width="21" height="13.5" rx="2" fill="none" stroke="#cfd4ff" stroke-width="1.6"/><line x1="19" y1="23" x2="19" y2="30" stroke="#cfd4ff" stroke-width="1.6" stroke-linecap="round"/><line x1="14" y1="30" x2="24" y2="30" stroke="#cfd4ff" stroke-width="1.6" stroke-linecap="round"/><line x1="12" y1="13" x2="25" y2="13" stroke="#cfd4ff" stroke-width="1.2"/><line x1="12" y1="17" x2="21" y2="17" stroke="#cfd4ff" stroke-width="1.2"/>',
  };

  return `<div class="ibox n" style="padding:0;overflow:hidden;"><svg viewBox="0 0 38 38" width="38" height="38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="0.5" y="0.5" width="37" height="37" rx="9" fill="rgba(108,71,255,0.18)" stroke="rgba(108,71,255,0.35)"/>${glyphs[kind]}</svg></div>`;
}

function renderCareerCard(card = {}) {
  return `<div class="career-card">${renderCardIcon(card.icon, card.title)}<div><h4>${escapeHtml(card.title)}</h4><p>${escapeHtml(card.text)}</p></div></div>`;
}

function renderRecommendationItem(item = {}) {
  return `<div class="rec-item"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`;
}

function renderCareerCards(cards = []) {
  return cards.map((card) => renderCareerCard(card)).join('');
}

function formatLookupDateTime(value = '') {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatAvailabilityText(item = {}) {
  const availability = toPlainObject(item.availability);
  if (!Object.keys(availability).length) return '';

  const entryPlatforms = Array.isArray(availability.entries)
    ? availability.entries.map((entry) => toText(entry?.platform)).filter(Boolean)
    : [];
  const directPlatforms = Array.isArray(availability.platforms)
    ? availability.platforms.map((platform) => toText(platform)).filter(Boolean)
    : [];
  const platforms = [...new Set([...directPlatforms, ...entryPlatforms])].filter(Boolean);

  if (platforms.length === 0) return '';

  const checkedAt = formatLookupDateTime(availability.checkedAt);
  return checkedAt
    ? `Disponibilidade consultada em ${checkedAt}: ${platforms.join(', ')}.`
    : `Disponibilidade consultada: ${platforms.join(', ')}.`;
}

function renderDevelopmentRecommendationBlock(recommendation = {}) {
  const normalized = toPlainObject(recommendation);
  const book = toPlainObject(normalized.book);
  const film = toPlainObject(normalized.film);
  const hasBook = Boolean(toText(book.title));
  const hasFilm = Boolean(toText(film.title));
  const rationale = toText(normalized.rationale);
  const focus = Array.isArray(normalized.developmentFocus)
    ? normalized.developmentFocus.map((item) => toText(item)).filter(Boolean)
    : [];

  if (!hasBook && !hasFilm && !rationale) {
    return '';
  }

  const focusText = focus.length > 0 ? `Foco de desenvolvimento: ${joinWithAnd(focus)}.` : '';
  const bookAvailability = hasBook ? formatAvailabilityText(book) : '';
  const filmAvailability = hasFilm ? formatAvailabilityText(film) : '';

  return `<!-- DISC_RECOMMENDATION_BLOCK_START --><div data-disc-recommendation-block="true" style="margin-top:14px;background:var(--bg2);border:1px solid var(--bord);border-left:3px solid var(--pur);border-radius:10px;padding:14px 16px;">
    <div style="font-family:'Sora',sans-serif;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:var(--pur2);margin-bottom:8px;">${escapeHtml(
      toText(normalized.title) || 'Indicação Personalizada',
    )}</div>
    ${
      hasBook
        ? `<p style="font-size:12px;color:var(--t2);margin:0 0 6px;"><strong>Livro recomendado:</strong> ${escapeHtml(book.title)}${toText(book.author) ? ` — ${escapeHtml(book.author)}` : ''}</p>`
        : ''
    }
    ${bookAvailability ? `<p style="font-size:11px;color:var(--t4);margin:0 0 8px;">${escapeHtml(bookAvailability)}</p>` : ''}
    ${
      hasFilm
        ? `<p style="font-size:12px;color:var(--t2);margin:0 0 6px;"><strong>Filme recomendado:</strong> ${escapeHtml(film.title)}${toText(film.director) ? ` — ${escapeHtml(film.director)}` : ''}</p>`
        : ''
    }
    ${filmAvailability ? `<p style="font-size:11px;color:var(--t4);margin:0 0 8px;">${escapeHtml(filmAvailability)}</p>` : ''}
    ${focusText ? `<p style="font-size:12px;color:var(--t3);margin:0 0 6px;">${escapeHtml(focusText)}</p>` : ''}
    ${rationale ? `<p style="font-size:12px;color:var(--t3);margin:0;"><strong>Motivo:</strong> ${escapeHtml(rationale)}</p>` : ''}
  </div><!-- DISC_RECOMMENDATION_BLOCK_END -->`;
}

function renderCoverIndicatorRows(items = []) {
  return items
    .map(
      (item) =>
        `<div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--t3);">${escapeHtml(item.title)}</span><span style="color:${escapeHtml(item.color)};font-weight:700;">${escapeHtml(item.label)}</span></div>`,
    )
    .join('');
}

function renderIndexCard(item = {}) {
  const value = clampPercentage(item.value);
  const circumference = 314;
  const dashOffset = Math.max(0, Math.round(circumference * (1 - value / 100)));
  return `<div class="ind-card"><div class="ring-wrap"><svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="50"/><circle class="ring-fill" cx="60" cy="60" r="50" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"/></svg><div class="ring-num">${value}%</div></div><div class="ind-title">${escapeHtml(item.title)}</div><div class="ind-desc">${escapeHtml(item.description)}</div></div>`;
}

function renderMotivatorItem(item = {}) {
  return `<div class="mot-item"${item.style ? ` style="${escapeHtml(item.style)}"` : ''}>${renderStableMonogramIcon(item.icon, item.title)}<div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div></div>`;
}

function renderEnvironmentCard(item = {}) {
  return `<div class="card"${item.style ? ` style="${escapeHtml(item.style)}"` : ' style="margin-bottom:12px;"'}><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`;
}

function renderPerceptionCard(title = '', text = '') {
  return `<div class="perc-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function renderCommunicationRows(rows = []) {
  return `<tbody>${rows
    .map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.text)}</td></tr>`)
    .join('')}</tbody>`;
}

function renderDecisionSteps(steps = []) {
  return steps
    .map(
      (step, index) =>
        `<div style="display:flex;gap:16px;align-items:flex-start;"><div class="step-c">${index + 1}</div><div><h4>${escapeHtml(step.title)}</h4><p>${escapeHtml(step.text)}</p></div></div>`,
    )
    .join('');
}

function renderPressureItems(items = []) {
  return items
    .map(
      (item, index) =>
        `<div class="pr-item"${index === items.length - 1 ? ' style="margin-bottom:0;"' : ''}><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`,
    )
    .join('');
}

function renderDevelopmentCard(item = {}) {
  return `<div class="dev-card">${renderStableMonogramIcon(item.icon, item.title)}<div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div></div>`;
}

function renderNvaCard(icon = '', title = '', text = '') {
  return `<div class="nva-card"><div class="nva-icon">${renderCardIcon(icon, title)}</div><h4 style="font-size:16px;margin-bottom:10px;">${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function renderRadarFactorCard(profile = {}, factor = 'D') {
  const colors = {
    D: '#ff5555',
    I: '#f5c842',
    S: '#42e8d8',
    C: '#8b6dff',
  };
  const score = clampPercentage(profile?.scores?.[factor]);
  const titleLabel = `${FACTOR_META[factor].name} — ${score}% · ${profile?.ranks?.title?.[factor] || 'Quaternário'}`;
  const narrative = getFactorNarrative(factor, score);

  return `<div style="display:flex;align-items:center;gap:14px;background:var(--bg2);border:1px solid var(--bord);border-left:3px solid ${colors[factor]};border-radius:8px;padding:12px 16px;"><div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:${colors[factor]};min-width:32px;">${factor}</div><div><div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:2px;">${escapeHtml(titleLabel)}</div><p style="font-size:12px;margin:0;">${escapeHtml(narrative)}</p></div></div>`;
}

function renderDnaCard(item = {}) {
  return `<div class="dna-card"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`;
}

function renderScaleRows(rows = []) {
  return rows
    .map((row) => {
      const width = clampPercentage(row.value);
      const className = width >= 50 ? 'bar-fill' : 'bar-fill lt';
      return `<div class="scale-row"><div class="scale-label">${escapeHtml(row.title)}</div><div class="bar-track"><div class="${className}" style="width:${width}%;"></div></div></div>`;
    })
    .join('');
}

function renderIntensityColumns(profile = {}) {
  return DISC_FACTOR_KEYS.map((factor) => {
    const score = clampPercentage(profile.scores?.[factor]);
    const height = Math.max(18, Math.round(score * 1.7));
    const isLowTone = factor === 'S' || factor === 'C';
    return `<div class="int-col"><div style="font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--pur2);line-height:1;">${score}%</div><div class="int-bar${isLowTone ? ' lt' : ''}" style="height:${height}px;"></div><div class="int-name">${factor}</div></div>`;
  }).join('');
}

function renderPlanDetailCards(items = []) {
  return items
    .map(
      (item, index) =>
        `<div style="background:var(--bg2);border:1px solid var(--bord);border-top:2px solid var(--pur);border-radius:12px;padding:16px 18px;"><div style="font-family:'Sora',sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--pur2);margin-bottom:8px;">${escapeHtml(item.period || (index === 0 ? 'Dias 1–30' : index === 1 ? 'Dias 31–60' : 'Dias 61–90'))}</div><p style="font-size:12px;line-height:1.55;">${escapeHtml(item.text ?? item)}</p></div>`,
    )
    .join('');
}

function renderAdvancedBullets(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderAdviceRows(rows = []) {
  return `<tbody>${rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.situation)}</td><td>${escapeHtml(row.recommendation)}</td></tr>`,
    )
    .join('')}</tbody>`;
}

function renderRelationshipRows(rows = []) {
  return `<tbody>${rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.profile)}</td><td>${escapeHtml(row.synergy)}</td><td>${escapeHtml(row.challenge)}</td><td>${escapeHtml(row.strategy)}</td></tr>`,
    )
    .join('')}</tbody>`;
}

function renderQuadrantGrid(profile = {}) {
  return `<div class="quad-grid"><div class="quad-card${profile.primary?.key === 'D' ? ' active' : ''}"><h4>Q1 — D</h4><p>Ativo · Tarefa</p></div><div class="quad-card${profile.primary?.key === 'I' ? ' active' : ''}"><h4>Q2 — I</h4><p>Ativo · Pessoas</p></div><div class="quad-card${profile.primary?.key === 'S' ? ' active' : ''}"><h4>Q3 — S</h4><p>Passivo · Pessoas</p></div><div class="quad-card${profile.primary?.key === 'C' ? ' active' : ''}"><h4>Q4 — C</h4><p>Passivo · Tarefa</p></div></div>`;
}

function renderMapQuadrantCards(profile = {}) {
  const active = profile.primary?.key || 'D';
  const cards = {
    D: {
      label: 'Ativo · Tarefa',
      color: '#ff5555',
      bg: 'rgba(255,85,85,.08)',
      border: 'rgba(255,85,85,.2)',
      text: 'Perfis D e D/C. Alta assertividade com foco em direção, entrega e desafio.',
    },
    I: {
      label: 'Ativo · Pessoas',
      color: '#f5c842',
      bg: 'rgba(245,200,66,.08)',
      border: 'rgba(245,200,66,.25)',
      text: 'Perfis I e I/D. Alta energia relacional, influência social e mobilização de pessoas.',
    },
    S: {
      label: 'Passivo · Pessoas',
      color: '#42e8d8',
      bg: 'rgba(66,232,216,.06)',
      border: 'rgba(66,232,216,.18)',
      text: 'Perfis S e S/C. Ritmo estável, cooperação e foco em confiança e continuidade.',
    },
    C: {
      label: 'Passivo · Tarefa',
      color: '#8b6dff',
      bg: 'rgba(139,109,255,.06)',
      border: 'rgba(139,109,255,.18)',
      text: 'Perfis C e C/S. Alta precisão técnica, análise, método e previsibilidade.',
    },
  };

  return ['D', 'I', 'S', 'C']
    .map((factor) => {
      const card = cards[factor];
      const isActive = factor === active;
      return `<div style="display:flex;gap:12px;align-items:flex-start;background:${card.bg};border:1px solid ${card.border};border-radius:8px;padding:12px 14px;"><div style="font-family:'Sora',sans-serif;font-size:11px;font-weight:700;color:${card.color};text-transform:uppercase;letter-spacing:1px;min-width:110px;padding-top:1px;">${escapeHtml(card.label)}${isActive ? ' ★' : ''}</div><p style="font-size:12px;margin:0;">${isActive ? `<strong style="color:${card.color};">${escapeHtml(`Quadrante ${profile.label} — este perfil.`)}</strong> ` : ''}${escapeHtml(isActive ? resolveQuadrant(profile).summary : card.text)}.</p></div>`;
    })
    .join('');
}

function renderBenchmarkHighlightCard(card = {}) {
  return `<div class="bench-hl"><h4>${escapeHtml(card.title)}</h4><p>${escapeHtml(card.text)}</p></div>`;
}

function renderCombinationCard(icon, title, text, extraStyle = '') {
  return `<div class="di-card"${extraStyle ? ` style="${extraStyle}"` : ''}><div class="ibox n" style="font-size:20px;">${escapeHtml(icon)}</div><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div></div>`;
}

function formatSvgNumber(value) {
  return Number(toNumber(value, 0).toFixed(1));
}

function buildRadarPoint(score = 0, endX = 0, endY = 0, centerX = 450, centerY = 270) {
  const ratio = clampPercentage(score) / 100;
  return {
    x: formatSvgNumber(centerX + (endX - centerX) * ratio),
    y: formatSvgNumber(centerY + (endY - centerY) * ratio),
  };
}

function renderRadarChartSvg(scores = {}) {
  const center = { x: 450, y: 270 };
  const axisEnds = {
    D: { x: 598.5, y: 121.5, color: '#ff5555', labelX: 628, labelY: 92, scoreY: 118 },
    I: { x: 598.5, y: 418.5, color: '#f5c842', labelX: 628, labelY: 448, scoreY: 474 },
    S: { x: 301.5, y: 418.5, color: '#42e8d8', labelX: 272, labelY: 448, scoreY: 474 },
    C: { x: 301.5, y: 121.5, color: '#8b6dff', labelX: 272, labelY: 92, scoreY: 118 },
  };
  const polygonPoints = DISC_FACTOR_KEYS.map((factor) => {
    const point = buildRadarPoint(scores[factor], axisEnds[factor].x, axisEnds[factor].y, center.x, center.y);
    return `${point.x},${point.y}`;
  }).join(' ');
  const gridLevels = [25, 50, 75, 100];
  const gridMarkup = gridLevels
    .map((level) => {
      const ratio = level / 100;
      const dPoint = {
        x: formatSvgNumber(center.x + (axisEnds.D.x - center.x) * ratio),
        y: formatSvgNumber(center.y + (axisEnds.D.y - center.y) * ratio),
      };
      const iPoint = {
        x: formatSvgNumber(center.x + (axisEnds.I.x - center.x) * ratio),
        y: formatSvgNumber(center.y + (axisEnds.I.y - center.y) * ratio),
      };
      const sPoint = {
        x: formatSvgNumber(center.x + (axisEnds.S.x - center.x) * ratio),
        y: formatSvgNumber(center.y + (axisEnds.S.y - center.y) * ratio),
      };
      const cPoint = {
        x: formatSvgNumber(center.x + (axisEnds.C.x - center.x) * ratio),
        y: formatSvgNumber(center.y + (axisEnds.C.y - center.y) * ratio),
      };

      return `<polygon points="${dPoint.x},${dPoint.y} ${iPoint.x},${iPoint.y} ${sPoint.x},${sPoint.y} ${cPoint.x},${cPoint.y}" fill="none" stroke="rgba(108,71,255,${(0.06 + level / 1000).toFixed(2)})" stroke-width="1"/><text x="${formatSvgNumber(dPoint.x - 14)}" y="${formatSvgNumber(dPoint.y)}" text-anchor="middle" dominant-baseline="middle" font-family="DM Sans,sans-serif" font-size="11" fill="rgba(139,109,255,0.5)">${level}%</text>`;
    })
    .join('');
  const axesMarkup = DISC_FACTOR_KEYS.map((factor) => {
    const axis = axisEnds[factor];
    return `<line x1="${center.x}" y1="${center.y}" x2="${axis.x}" y2="${axis.y}" stroke="rgba(108,71,255,0.18)" stroke-width="1.5"/><text x="${axis.labelX}" y="${axis.labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Sora,sans-serif" font-size="22" font-weight="800" fill="${axis.color}">${factor}</text><text x="${axis.labelX}" y="${axis.scoreY}" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="13" fill="${axis.color}" opacity="0.75">${clampPercentage(scores[factor])}%</text>`;
  }).join('');
  const pointMarkup = DISC_FACTOR_KEYS.map((factor) => {
    const axis = axisEnds[factor];
    const point = buildRadarPoint(scores[factor], axis.x, axis.y, center.x, center.y);
    return `<circle cx="${point.x}" cy="${point.y}" r="8" fill="${axis.color}" stroke="#0d0f1e" stroke-width="2.5"/>`;
  }).join('');

  return `<svg viewBox="0 0 900 520" width="840" height="486" xmlns="http://www.w3.org/2000/svg">${gridMarkup}${axesMarkup}<polygon points="${polygonPoints}" fill="rgba(108,71,255,0.18)" stroke="#8b6dff" stroke-width="2.5"/>${pointMarkup}<circle cx="${center.x}" cy="${center.y}" r="6" fill="rgba(108,71,255,0.4)"/></svg>`;
}

function renderNaturalAdaptedChartSvg(naturalScores = {}, adaptedScores = {}) {
  const chartLeft = 60;
  const chartBottom = 340;
  const chartTop = 90;
  const scale = (chartBottom - chartTop) / 100;
  const barGroups = [
    { factor: 'D', naturalX: 80, adaptedX: 158, color: '#ff5555', labelX: 154 },
    { factor: 'I', naturalX: 250, adaptedX: 328, color: '#f5c842', labelX: 324 },
    { factor: 'S', naturalX: 420, adaptedX: 498, color: '#42e8d8', labelX: 494 },
    { factor: 'C', naturalX: 590, adaptedX: 668, color: '#8b6dff', labelX: 664 },
  ];
  const tickValues = [0, 20, 40, 60, 80, 100];
  const gridLines = tickValues
    .map((tickValue, index) => {
      const y = chartBottom - index * 50;
      const stroke =
        tickValue === 0 ? 'rgba(108,71,255,0.20)' : 'rgba(108,71,255,0.06)';
      const strokeWidth = tickValue === 0 ? 1 : 1;
      return `<line x1="${chartLeft}" y1="${y}" x2="880" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth}"/><text x="50" y="${y}" text-anchor="end" dominant-baseline="middle" font-family="DM Sans,sans-serif" font-size="12" fill="#5a6280">${tickValue}</text>`;
    })
    .join('');
  const barMarkup = barGroups
    .map((group) => {
      const naturalValue = clampPercentage(naturalScores[group.factor]);
      const adaptedValue = clampPercentage(adaptedScores[group.factor]);
      const naturalHeight = formatSvgNumber(naturalValue * scale);
      const adaptedHeight = formatSvgNumber(adaptedValue * scale);
      const naturalY = formatSvgNumber(chartBottom - naturalHeight);
      const adaptedY = formatSvgNumber(chartBottom - adaptedHeight);
      return `<rect x="${group.naturalX}" y="${naturalY}" width="70" height="${naturalHeight}" rx="6" fill="${group.color}" opacity="0.88"/><rect x="${group.adaptedX}" y="${adaptedY}" width="70" height="${adaptedHeight}" rx="6" fill="${group.color}" opacity="0.38"/><text x="${group.naturalX + 35}" y="${formatSvgNumber(naturalY - 10)}" text-anchor="middle" font-family="Sora,sans-serif" font-size="14" font-weight="700" fill="${group.color}">${naturalValue}%</text><text x="${group.adaptedX + 35}" y="${formatSvgNumber(adaptedY - 10)}" text-anchor="middle" font-family="Sora,sans-serif" font-size="13" font-weight="600" fill="${group.color}" opacity="0.75">${adaptedValue}%</text><text x="${group.labelX}" y="362" text-anchor="middle" font-family="Sora,sans-serif" font-size="16" font-weight="800" fill="${group.color}">${group.factor}</text><text x="${group.labelX}" y="382" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="11" fill="rgba(200,200,220,0.55)">${FACTOR_META[group.factor].name}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 900 400" width="840" height="372" xmlns="http://www.w3.org/2000/svg">${gridLines}<line x1="${chartLeft}" y1="${chartBottom}" x2="880" y2="${chartBottom}" stroke="rgba(108,71,255,0.3)" stroke-width="2"/>${barMarkup}<rect x="60" y="8" width="16" height="16" rx="4" fill="#8b6dff" opacity="0.88"/><text x="82" y="18" font-family="DM Sans,sans-serif" font-size="13" fill="#c5c8e0" dominant-baseline="middle">Natural</text><rect x="152" y="8" width="16" height="16" rx="4" fill="#8b6dff" opacity="0.38"/><text x="174" y="18" font-family="DM Sans,sans-serif" font-size="13" fill="#c5c8e0" dominant-baseline="middle">Adaptado</text></svg>`;
}

function buildRuntimeProfileShape(profile = {}) {
  return {
    primary: profile.primary?.key || 'D',
    secondary: profile.secondary?.key || 'I',
    tertiary: profile.tertiary?.key || 'S',
    quaternary: profile.quaternary?.key || 'C',
    compactCode: profile.compactCode || profile.primary?.key || 'D',
    slashCode: profile.label || profile.primary?.key || 'D',
    label: profile.label || profile.primary?.key || 'D',
    name: profile.name || FACTOR_META[profile.primary?.key || 'D']?.name || 'DISC',
    sorted: (profile.factors || []).map((factor) => ({
      factor: factor.key,
      score: factor.value,
    })),
  };
}

function buildRuntimeAiPayload(runtimePayload = {}) {
  const content = toPlainObject(runtimePayload.content);
  const rawContent = toPlainObject(runtimePayload.rawContent);

  return {
    requested: Object.keys(content).length > 0 || Object.keys(rawContent).length > 0,
    enabled: hasMeaningfulAiSourceContent(content) || hasMeaningfulAiSourceContent(rawContent),
    content,
    rawContent,
    input_snapshot: toPlainObject(runtimePayload.input_snapshot),
    scoring_snapshot: toPlainObject(runtimePayload.scoring_snapshot),
    template_snapshot: toPlainObject(runtimePayload.template_snapshot),
    cache: toPlainObject(runtimePayload.cache),
    version: toText(runtimePayload.version),
    language: toText(runtimePayload.language) || 'pt-BR',
  };
}

function applyDynamicDiscHtmlAdjustments(html = '', profile = {}, options = {}) {
  const developmentRecommendation = toPlainObject(options.developmentRecommendation);
  let result = String(html || '');
  const playbook = getProfilePlaybook(profile);
  const indices = buildBehavioralIndices(profile);
  const coverIndicators = buildCoverIndicators(profile);
  const quadrant = resolveQuadrant(profile);

  result = replaceSlideBlock(result, 's1', (block) => {
    let updatedBlock = block;
    updatedBlock = updatedBlock.replace(
      /(<div style="display:inline-flex;padding:7px 16px;border-radius:6px;background:rgba\(108,71,255,.12\);border:1px solid var\(--bord2\);color:var\(--pur2\);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;letter-spacing:.5px;align-self:flex-start;">)([\s\S]*?)(<\/div>)/,
      `$1${escapeHtml(`Perfil predominante: ${buildRuntimeProfileLabel(profile)}`)}$3`,
    );
    updatedBlock = replaceLabeledParagraph(
      updatedBlock,
      'Síntese Comportamental',
      buildExecutiveSummary(profile),
    );
    updatedBlock = updatedBlock.replace(
      /(<div style="display:flex;flex-direction:column;gap:7px;">)([\s\S]*?)(<\/div>\s*<\/div>\s*<div style="background:rgba\(108,71,255,.06\);)/,
      `$1${renderCoverIndicatorRows(coverIndicators)}$3`,
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 'p3', (block) => {
    return block.replace(
      /(<h3>Visão Geral do Perfil<\/h3>\s*<p>)([\s\S]*?)(<\/p>)/,
      (match, start, content, end) => {
        const rawContent = String(content || '').trim();
        if (!/(?:…|\.{3})\s*$/.test(rawContent)) {
          return match;
        }

        const withoutEllipsis = rawContent.replace(/(?:…|\.{3})\s*$/, '').trim();
        const withPeriod = withoutEllipsis.endsWith('.') ? withoutEllipsis : `${withoutEllipsis}.`;
        const shouldAppendFocus = /diferença de\s+\d+\s+pontos\.?$/i.test(withoutEllipsis);
        const finalized = shouldAppendFocus
          ? `${withPeriod} ${escapeHtml(getPrimaryFocusNarrative(profile))}`
          : withPeriod;
        return `${start}${finalized}${end}`;
      },
    );
  });

  result = replaceSlideBlock(result, 'sg-radar', (block) => {
    let updatedBlock = block.replace(
      /<svg viewBox="0 0 900 520"[\s\S]*?<\/svg>/,
      renderRadarChartSvg(profile.scores),
    );
    updatedBlock = updatedBlock.replace(
      /(<div style="display:flex;flex-direction:column;gap:10px;">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/div>)/,
      `$1${DISC_FACTOR_KEYS.map((factor) => renderRadarFactorCard(profile, factor)).join('')}$3`,
    );

    return updatedBlock;
  });

  result = replaceSlideBlock(result, 'sg-bars', (block) => {
    let updatedBlock = block.replace(
      /<svg viewBox="0 0 900 400"[\s\S]*?<\/svg>/,
      renderNaturalAdaptedChartSvg(profile.naturalScores, profile.adaptedScores),
    );
    updatedBlock = replaceLabeledParagraph(updatedBlock, 'Perfil Natural', buildNaturalSummaryText(profile.naturalScores));
    updatedBlock = replaceLabeledParagraph(updatedBlock, 'Perfil Adaptado', buildAdaptedSummaryText(profile.adaptedScores));
    updatedBlock = replaceLabeledParagraph(
      updatedBlock,
      'Interpretação Técnica',
      buildNaturalAdaptedInterpretation(profile),
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 'sg-map', (block) => {
    let updatedBlock = block.replace(
      /(<div style="display:flex;flex-direction:column;gap:10px;">)([\s\S]*?)(<\/div>\s*<\/div>\s*<!-- chart right -->)/,
      `$1${renderMapQuadrantCards(profile)}$3`,
    );
    updatedBlock = updatedBlock.replace(
      /(<p style="margin-bottom:18px;">)([\s\S]*?)(<\/p>)/,
      `$1${escapeHtml(buildMapSummary(profile))}$3`,
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's4', (block) =>
    block.replace(
      /(<div class="desc">)([\s\S]*?)(<\/div>)/,
      `$1${escapeHtml(buildExecutiveSummary(profile))}$3`,
    ),
  );

  result = replaceSlideBlock(result, 's6', (block) => {
    let updatedBlock = block;
    updatedBlock = updatedBlock.replace(
      /(<div class="int-row">)([\s\S]*?)(<\/div>\s*<div style="text-align:center;font-size:11px;color:var\(--t4\);margin-top:6px;">Fator<\/div>)/,
      `$1${renderIntensityColumns(profile)}$3`,
    );
    updatedBlock = updatedBlock.replace(
      /(<p style="margin-bottom:18px;">)([\s\S]*?)(<\/p>)/,
      `$1${escapeHtml(buildMapSummary(profile))}$3`,
    );
    updatedBlock = updatedBlock.replace(
      /<div class="quad-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
      `${renderQuadrantGrid(profile)}</div></div>`,
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's7', (block) => {
    return block.replace(
      /<div class="ind-grid">[\s\S]*?<\/div>\s*<\/div>\s*<div class="pgn">/,
      `<div class="ind-grid">${indices.map((item) => renderIndexCard(item)).join('')}</div></div><div class="pgn">`,
    );
  });

  result = replaceSlideBlock(result, 's8', (block) => {
    let updatedBlock = block;
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<div class="di-card">[\s\S]*?<\/div><\/div>/g,
      0,
      renderCombinationCard(
        '🎯',
        `Perfil Primário — ${FACTOR_META[profile.primary.key].name} (${profile.primary.key})`,
        buildCombinationPrimaryText(profile),
      ),
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<div class="di-card">[\s\S]*?<\/div><\/div>/g,
      1,
      renderCombinationCard(
        '💡',
        `Perfil Secundário — ${FACTOR_META[profile.secondary.key].name} (${profile.secondary.key})`,
        buildCombinationSecondaryText(profile),
      ),
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<div class="di-card" style="margin-bottom:0;">[\s\S]*?<\/div><\/div>/g,
      0,
      renderCombinationCard(
        '⚡',
        `Sinergia ${profile.primary.key} + ${profile.secondary.key}`,
        buildCombinationSynergyText(profile),
        'margin-bottom:0;',
      ),
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's9', (block) => {
    let updatedBlock = block;

    DISC_FACTOR_KEYS.forEach((factor, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /(<div class="pct-track"><div class="pct-fill" style="width:)(\d+)(%;"><\/div><\/div>)/g,
        index,
        (match) =>
          match.replace(/width:\d+%;/, `width:${profile.scores[factor]}%;`),
      );
    });

    updatedBlock = updatedBlock.replace(
      /(<p style="margin-bottom:20px;">)([\s\S]*?)(<\/p>)/,
      `$1${escapeHtml(buildBenchmarkText(profile))}$3`,
    );

    const benchmarkCards = buildBenchmarkCards(profile);
    benchmarkCards.forEach((card, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="bench-hl"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        index,
        renderBenchmarkHighlightCard(card),
      );
    });

    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's10', (block) => {
    let updatedBlock = block;
    updatedBlock = replaceNthMatch(updatedBlock, /<tbody>[\s\S]*?<\/tbody>/g, 0, renderTableBody(buildStrengthRows(profile)));
    updatedBlock = replaceNthMatch(updatedBlock, /<tbody>[\s\S]*?<\/tbody>/g, 1, renderTableBody(buildLimitationRows(profile)));
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's11', (block) => {
    let updatedBlock = block;
    playbook.motivators.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="mot-item"(?: style="margin-bottom:0;")?>[\s\S]*?<\/div><\/div>/g,
        index,
        renderMotivatorItem({
          ...item,
          style: index === playbook.motivators.length - 1 ? 'margin-bottom:0;' : '',
        }),
      );
    });
    playbook.environment.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="card"(?: style="margin-bottom:12px;")?>[\s\S]*?<\/div>/g,
        index,
        renderEnvironmentCard({
          ...item,
          style: index === playbook.environment.length - 1 ? 'margin-bottom:0;' : 'margin-bottom:12px;',
        }),
      );
    });
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's12', (block) => {
    let updatedBlock = block;
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<p style="margin-bottom:14px;">[\s\S]*?<\/p>/g,
      0,
      `<p style="margin-bottom:14px;">${escapeHtml(buildCommunicationStyle(profile))}</p>`,
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<tbody>[\s\S]*?<\/tbody>/g,
      0,
      renderCommunicationRows(playbook.communicationRows),
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<p style="margin-bottom:20px;">[\s\S]*?<\/p>/g,
      0,
      `<p style="margin-bottom:20px;">${escapeHtml(playbook.decisionIntro)}</p>`,
    );
    updatedBlock = updatedBlock.replace(
      /(<div style="display:flex;flex-direction:column;gap:18px;">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/div>)/,
      `$1${renderDecisionSteps(playbook.decisionSteps)}$3`,
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's13', (block) =>
    block.replace(
      /(<div class="lid-body"><h4>Gestão de Conflitos<\/h4><p>)([\s\S]*?)(<\/p><\/div>)/,
      `$1${escapeHtml(playbook.conflict)}$3`,
    ),
  );

  result = replaceSlideBlock(result, 's14', (block) => {
    let updatedBlock = block;
    updatedBlock = updatedBlock.replace(
      /(<p class="pr-header">)([\s\S]*?)(<\/p>)/,
      `$1${escapeHtml(buildPressureBehavior(profile))}$3`,
    );
    playbook.pressure.normal.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="pr-item"(?: style="margin-bottom:0;")?>[\s\S]*?<\/div>/g,
        index,
        renderPressureItems([item]),
      );
    });
    playbook.pressure.stressed.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="pr-item"(?: style="margin-bottom:0;")?>[\s\S]*?<\/div>/g,
        index + playbook.pressure.normal.length,
        renderPressureItems([item]),
      );
    });
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's15', (block) => {
    let updatedBlock = block;
    playbook.perception.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="perc-card"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        index,
        renderPerceptionCard(item.title, item.text),
      );
    });
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's16', (block) => {
    let updatedBlock = block;
    playbook.nva.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="nva-card">[\s\S]*?<\/p><\/div>/g,
        index,
        renderNvaCard(item.icon, item.title, item.text),
      );
    });
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's17', (block) => {
    let updatedBlock = block;
    playbook.dna.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="dna-card"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        index,
        renderDnaCard(item),
      );
    });
    buildScaleRows(profile).forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="scale-row"><div class="scale-label">[\s\S]*?<\/div><div class="bar-track"><div class="bar-fill(?: lt)?" style="width:\d+%;"><\/div><\/div><\/div>/g,
        index,
        renderScaleRows([item]),
      );
    });
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's19', (block) => {
    let updatedBlock = block;
    updatedBlock = replaceNthMatch(updatedBlock, /<tbody>[\s\S]*?<\/tbody>/g, 0, renderTableBody(buildDevelopmentRows(profile)));
    updatedBlock = updatedBlock.replace(
      /(<div class="career-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<div style="flex:1;padding-top:56px;">)/,
      `$1${renderCareerCards(buildCareerCards(profile))}$3`,
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's20', (block) => {
    let updatedBlock = block;
    playbook.developmentCards.forEach((item) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="dev-card"><div class="ibox n" style="font-size:20px;">[\s\S]*?<\/div><div><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div><\/div>/g,
        0,
        renderDevelopmentCard(item),
      );
    });
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's21', (block) => {
    let updatedBlock = block;
    playbook.plan.forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div style="background:var\(--bg2\);border:1px solid var\(--bord\);border-top:2px solid var\(--pur\);border-radius:12px;padding:16px 18px;">[\s\S]*?<\/p>\s*<\/div>/g,
        index,
        renderPlanDetailCards([
          {
            period: index === 0 ? 'Dias 1–30' : index === 1 ? 'Dias 31–60' : 'Dias 61–90',
            text: item,
          },
        ]),
      );
    });
    updatedBlock = updatedBlock.replace(
      /(<div class="road-footer">)([\s\S]*?)(<\/div>)/,
      `$1${escapeHtml(playbook.planFooter)}$3`,
    );
    const recommendationBlock = renderDevelopmentRecommendationBlock(developmentRecommendation);
    if (recommendationBlock) {
      updatedBlock = updatedBlock.replace(
        /(<div class="road-footer">[\s\S]*?<\/div>)/,
        `$1${recommendationBlock}`,
      );
    }
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's22', (block) => {
    let updatedBlock = block;
    updatedBlock = updatedBlock.replace(
      /(<div class="tag">)([\s\S]*?)(<\/div>)/,
      `$1${escapeHtml(`${playbook.advanced.tag}:`)}$3`,
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<p>[\s\S]*?<\/p>/g,
      0,
      `<p>${escapeHtml(playbook.advanced.summary)}</p>`,
    );
    updatedBlock = updatedBlock.replace(
      /<ul>[\s\S]*?<\/ul>/,
      `<ul>${renderAdvancedBullets(playbook.advanced.bullets)}</ul>`,
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<tbody>[\s\S]*?<\/tbody>/g,
      0,
      renderAdviceRows(playbook.communicationAdvice),
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's23', (block) => {
    let updatedBlock = block;
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<p style="margin-bottom:14px;">[\s\S]*?<\/p>/g,
      0,
      `<p style="margin-bottom:14px;">${escapeHtml(`Compreender como este perfil ${profile.label} se relaciona com os demais perfis é essencial para otimizar parcerias, minimizar conflitos e maximizar resultados em equipe.`)}</p>`,
    );
    updatedBlock = replaceNthMatch(
      updatedBlock,
      /<tbody>[\s\S]*?<\/tbody>/g,
      0,
      renderRelationshipRows(playbook.relationships),
    );
    updatedBlock = updatedBlock.replace(
      /(<div class="exec-tip"><strong>Dica executiva:<\/strong> )([\s\S]*?)(<\/div>)/,
      `$1${escapeHtml(playbook.relationshipTip)}$3`,
    );
    return updatedBlock;
  });

  result = replaceSlideBlock(result, 's24', (block) => {
    let updatedBlock = block;
    buildRecommendationItems(profile).forEach((item, index) => {
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="rec-item"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        index,
        renderRecommendationItem(item),
      );
    });
    return updatedBlock;
  });

  return result;
}

async function resolveDevelopmentRecommendationForRender({
  mode = 'business',
  interpretation = {},
  payload = {},
} = {}) {
  const normalizedPayload = toPlainObject(payload);
  const payloadHistory = toPlainObject(
    pickFirstDefined(
      normalizedPayload.recommendationHistory,
      normalizedPayload.recommendation_history,
      normalizedPayload.history,
    ),
  );
  const recommendationHistory = {
    lastRecommendedBooks: [
      ...toArray(pickFirstDefined(normalizedPayload.lastRecommendedBooks, normalizedPayload.last_recommended_books)),
      ...toArray(pickFirstDefined(payloadHistory.lastRecommendedBooks, payloadHistory.last_recommended_books, payloadHistory.books)),
    ],
    lastRecommendedFilms: [
      ...toArray(pickFirstDefined(normalizedPayload.lastRecommendedFilms, normalizedPayload.last_recommended_films)),
      ...toArray(pickFirstDefined(payloadHistory.lastRecommendedFilms, payloadHistory.last_recommended_films, payloadHistory.films)),
    ],
  };
  const profile = toPlainObject(interpretation);
  const scores = toPlainObject(profile.scores);

  if (!Object.keys(scores).length) {
    return null;
  }

  const deterministicRecommendation = await resolveDiscDevelopmentRecommendation({
    mode,
    scores,
    profile,
    history: recommendationHistory,
  });
  const recommendation = toPlainObject(deterministicRecommendation);

  if (!Object.keys(recommendation).length) {
    return null;
  }

  const aiRationale = await generateAiRecommendationRationale({
    mode,
    nome: payload.nome,
    cargo: payload.cargo,
    empresa: payload.empresa,
    scores,
    profile: recommendation.profile,
    developmentFocus: recommendation.developmentFocus,
    book: recommendation.book,
    film: recommendation.film,
    fallbackRationale: recommendation.rationale,
  });

  return {
    ...recommendation,
    rationale: toText(aiRationale.text) || toText(recommendation.rationale),
    ai: {
      enabled: Boolean(aiRationale.enabled),
      source: toText(aiRationale.source),
      provider: toText(aiRationale.provider),
      model: toText(aiRationale.model),
      usedFallback: Boolean(aiRationale.usedFallback),
      attempts: Array.isArray(aiRationale.attempts) ? aiRationale.attempts : [],
    },
  };
}

async function generateDiscHtmlFromRuntimePayload({
  mode = 'business',
  runtimePayload = {},
  scores = {},
  payload = {},
  reportModel = {},
  assessment = {},
} = {}) {
  const discRuntime = await loadDiscTemplateRuntime();
  const normalizedMode = normalizeMode(mode);
  const normalizedRuntimePayload = toPlainObject(runtimePayload);
  const assessmentSnapshot = resolveAssessmentSnapshot(normalizedRuntimePayload.input_snapshot);
  const resultSnapshot = resolveScoringResultSnapshot(normalizedRuntimePayload.scoring_snapshot);
  const interpretation = resolveDiscRenderInterpretation({
    scores,
    payload,
    scoringSnapshot: normalizedRuntimePayload.scoring_snapshot,
    reportModel,
    assessment,
    logOrder: true,
  });
  const context = discRuntime.buildContext({
    mode: normalizedMode,
    nome: assessmentSnapshot.name,
    cargo: assessmentSnapshot.cargo,
    empresa: assessmentSnapshot.empresa,
    data: assessmentSnapshot.data,
    d: interpretation.scores.D,
    i: interpretation.scores.I,
    s: interpretation.scores.S,
    c: interpretation.scores.C,
    input_snapshot: {
      ...assessmentSnapshot,
      profile: interpretation.label,
    },
    scoring_snapshot: {
      ...resultSnapshot,
      disc_d: interpretation.scores.D,
      disc_i: interpretation.scores.I,
      disc_s: interpretation.scores.S,
      disc_c: interpretation.scores.C,
    },
    template_snapshot: normalizedRuntimePayload.template_snapshot,
    cache: normalizedRuntimePayload.cache,
    version: normalizedRuntimePayload.version,
    language: normalizedRuntimePayload.language,
  });

  context.scores = { ...interpretation.scores };
  context.profile = buildRuntimeProfileShape(interpretation);
  context.profileLabel = escapeHtml(buildRuntimeProfileLabel(interpretation));
  context.ranks = interpretation.ranks;
  context.ai = buildRuntimeAiPayload(normalizedRuntimePayload);
  context.recommendation = await resolveDevelopmentRecommendationForRender({
    mode: normalizedMode,
    interpretation,
    payload,
  });
  context.template_snapshot = {
    ...toPlainObject(normalizedRuntimePayload.template_snapshot),
  };

  const html = applyDynamicDiscHtmlAdjustments(
    discRuntime.generateFinalHtml(context),
    interpretation,
    {
      developmentRecommendation: context.recommendation,
    },
  );

  return {
    html,
    context,
    interpretation,
  };
}

function getModeLock(mode) {
  if (!modeLocks.has(mode)) {
    modeLocks.set(mode, {
      locked: false,
      queue: [],
    });
  }

  return modeLocks.get(mode);
}

async function withModeGenerationLock(mode, task) {
  const lock = getModeLock(mode);

  await new Promise((resolve) => {
    if (!lock.locked) {
      lock.locked = true;
      resolve();
      return;
    }

    lock.queue.push(resolve);
  });

  try {
    return await task();
  } finally {
    const next = lock.queue.shift();
    if (next) {
      next();
      return;
    }

    lock.locked = false;
    if (lock.queue.length === 0) {
      modeLocks.delete(mode);
    }
  }
}

function buildDiscCommand({
  basePath: workingPath,
  normalizedMode,
  scores,
  payload,
  useAi,
  aiInputPath,
  outputs,
}) {
  return [
    `cd ${shellEscape(workingPath)}`,
    `node disc_engine.js --mode=${shellEscape(normalizedMode)}`,
    `${buildArg('d', scores.D)}`,
    `${buildArg('i', scores.I)}`,
    `${buildArg('s', scores.S)}`,
    `${buildArg('c', scores.C)}`,
    `${buildArg('nome', payload.nome)}`,
    `${buildArg('cargo', payload.cargo)}`,
    `${buildArg('empresa', payload.empresa)}`,
    `${buildArg('data', payload.data)}`,
    `${useAi ? ' --useAi=true' : ''}`,
    `${aiInputPath ? ` --aiInput=${shellEscape(aiInputPath)}` : ''}`,
    `&& node gerar_pdf.mjs ${shellEscape(outputs.html)} ${shellEscape(outputs.pdf)}`,
  ]
    .join(' ')
    .trim();
}

function executeDiscCommand(command, outputs, normalizedMode) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(stderr?.trim() || stdout?.trim() || error.message || 'Falha ao gerar relatório DISC.'),
        );
        return;
      }

      resolve({
        mode: normalizedMode,
        html: outputs.html,
        pdf: outputs.pdf,
        htmlPath: path.join(basePath, outputs.html),
        pdfPath: path.join(basePath, outputs.pdf),
        stdout: stdout?.trim() || '',
      });
    });
  });
}

export function gerarRelatorio({
  mode = 'business',
  scores = {},
  payload = {},
  useAi = false,
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const outputs = REPORT_OUTPUTS[normalizedMode];
  const aiRequested = useAi === true;

  let tempDir = '';
  let artifactDir = '';
  let aiMeta = aiRequested
    ? {
        requested: true,
        enabled: false,
      }
    : {
        enabled: false,
      };

  return (async () => {
    return withModeGenerationLock(normalizedMode, async () => {
      let aiInputPath = '';
      let aiEnabled = false;
      let runtimePayload = await buildTemplateSnapshotPayload({
        mode: normalizedMode,
        scores,
        payload,
      });

      tempDir = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-runtime-'));
      aiInputPath = path.join(tempDir, 'disc-runtime-context.json');

      console.info('[disc-report] generating report', {
        mode: normalizedMode,
        useAi: aiRequested,
      });

      if (aiRequested) {
        console.info('[disc-report] AI enabled', {
          mode: normalizedMode,
        });

        try {
          const aiResult = await generateAiDiscContent({
            mode: normalizedMode,
            nome: payload.nome,
            cargo: payload.cargo,
            empresa: payload.empresa,
            scores,
          });

          const hasProviderText = aiResult?.source === 'ai' && hasMeaningfulAiSourceContent(aiResult?.rawContent);

          if (!hasProviderText) {
            console.warn('[disc-report] AI skipped due to invalid content', {
              mode: normalizedMode,
              reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'NO_PROVIDER_TEXT_FIELDS',
            });
            aiMeta = {
              ...aiMeta,
              skipped: true,
              reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'NO_PROVIDER_TEXT_FIELDS',
            };
          } else {
            runtimePayload = mergeArtifactPayload(
              runtimePayload,
              buildAiArtifactPayload(aiResult),
            );
            aiEnabled = true;
            aiMeta = {
              requested: true,
              enabled: true,
              provider: aiResult.provider,
              model: aiResult.model,
              source: aiResult.source,
              usedFallback: aiResult.usedFallback,
              attempts: aiResult.attempts,
            };
          }
        } catch (error) {
          console.warn('[disc-report] AI skipped due to invalid content', {
            mode: normalizedMode,
            error: sanitizeLogValue(error?.message || error),
          });
          aiMeta = {
            ...aiMeta,
            skipped: true,
            reason: 'AI_GENERATION_FAILED',
          };
          aiEnabled = false;
        }
      }

      writeFileSync(aiInputPath, JSON.stringify(runtimePayload, null, 2), 'utf8');

      const rendered = await generateDiscHtmlFromRuntimePayload({
        mode: normalizedMode,
        runtimePayload,
        scores,
        payload,
      });
      const pdfBuffer = await renderOfficialHtmlToPdfBuffer(rendered.html);

      console.info('[disc-report] report generated successfully', {
        mode: normalizedMode,
        pdf: outputs.pdf,
        aiEnabled,
      });

      artifactDir = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-report-'));
      const uniqueHtmlPath = path.join(artifactDir, outputs.html);
      const uniquePdfPath = path.join(artifactDir, outputs.pdf);
      writeFileSync(uniqueHtmlPath, rendered.html, 'utf8');
      writeFileSync(uniquePdfPath, pdfBuffer);

      const cleanup = () => {
        if (!artifactDir) return;
        rmSync(artifactDir, { recursive: true, force: true });
        artifactDir = '';
      };

      const cleanupTimer = setTimeout(cleanup, 10 * 60 * 1000);
      cleanupTimer.unref?.();

      return {
        mode: normalizedMode,
        html: outputs.html,
        pdf: outputs.pdf,
        htmlPath: uniqueHtmlPath,
        pdfPath: uniquePdfPath,
        stdout: '',
        cleanup,
        ai: aiRequested
          ? {
              ...aiMeta,
              enabled: aiEnabled,
            }
          : aiMeta,
      };
    }).finally(() => {
      if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  })();
}

function normalizePublicReportType(value, fallback = REPORT_TYPE.BUSINESS) {
  return normalizeCanonicalReportType(value, fallback);
}

function createServiceError(code, message, statusCode = 400, details = {}) {
  const error = createReportGeneratorError(code, message, details);
  error.statusCode = statusCode;
  return error;
}

function resolveAssessmentParticipantName(assessment = {}) {
  const reportParticipant = toPlainObject(assessment?.report?.discProfile?.participant);

  return (
    toText(
      pickFirstDefined(
        assessment?.candidateName,
        assessment?.respondent_name,
        assessment?.respondentName,
        reportParticipant?.name,
        reportParticipant?.candidateName,
        reportParticipant?.respondent_name,
        assessment?.candidateEmail,
        assessment?.email,
        'Participante DISC',
      ),
    ) || 'Participante DISC'
  );
}

function slugifyFileNamePart(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildGeneratedReportCacheKey({ assessmentId = '', reportType = REPORT_TYPE.BUSINESS } = {}) {
  return `${toText(assessmentId)}:${normalizePublicReportType(reportType)}`;
}

function pruneGeneratedReportCache() {
  const now = Date.now();

  for (const [key, entry] of generatedReportCache.entries()) {
    if (Number(entry?.expiresAt || 0) <= now) {
      generatedReportCache.delete(key);
    }
  }
}

function getCachedGeneratedReport(cacheKey) {
  pruneGeneratedReportCache();

  const entry = generatedReportCache.get(cacheKey);
  if (!entry) return null;

  return entry.value || null;
}

function setCachedGeneratedReport(cacheKey, value, ttlMs = GENERATED_REPORT_CACHE_TTL_MS) {
  if (!cacheKey || !value?.pdfBuffer) return;

  generatedReportCache.set(cacheKey, {
    expiresAt: Date.now() + Math.max(1_000, Number(ttlMs) || GENERATED_REPORT_CACHE_TTL_MS),
    value: {
      ...value,
      pdfBuffer: Buffer.from(value.pdfBuffer),
    },
  });
}

async function loadPremiumReportPipeline() {
  if (premiumReportPipelinePromise) {
    return premiumReportPipelinePromise;
  }

  premiumReportPipelinePromise = (async () => {
    const [buildModule, pdfModule] = await Promise.all([
      import('../modules/report/build-report.js'),
      import('../modules/report/generate-pdf.js'),
    ]);

    return {
      buildPremiumReportModel: buildModule.buildPremiumReportModel,
      generatePremiumPdf: pdfModule.generatePremiumPdf,
      loadServerBrowserLauncher: pdfModule.loadServerBrowserLauncher,
    };
  })();

  return premiumReportPipelinePromise;
}

function resolveAssessmentDiscResultSnapshot(assessment = {}) {
  const stored = assessment?.report?.discProfile || assessment?.results || assessment?.disc_results;
  if (stored && (stored.D || stored.summary)) return stored;
  const answers = assessment?.response?.answersJson;
  if (Array.isArray(answers) && answers.length > 0) {
    try { return calculateDiscFromAnswers(answers); } catch (e) {}
  }
  return stored || {};
}

export function buildPublicReportFileName({
  assessment = {},
  reportType = REPORT_TYPE.BUSINESS,
} = {}) {
  const normalizedReportType = normalizePublicReportType(reportType);
  const participantSlug = slugifyFileNamePart(resolveAssessmentParticipantName(assessment));

  if (participantSlug) {
    return `relatorio-disc-${participantSlug}.pdf`;
  }

  return `relatorio-disc-${normalizedReportType}.pdf`;
}

export function invalidateGeneratedReportCache() {
  generatedReportCache.clear();
}

export async function buildStructuredReportModel({
  assessment = {},
  reportType = REPORT_TYPE.BUSINESS,
  assetBaseUrl = '',
  currentUser = null,
} = {}) {
  if (!assessment?.id) {
    throw createServiceError('NOT_FOUND', 'Assessment não encontrado.', 404);
  }

  const normalizedReportType = normalizePublicReportType(
    reportType,
    resolveStoredReportType(assessment, REPORT_TYPE.BUSINESS),
  );
  const { buildPremiumReportModel } = await loadPremiumReportPipeline();

  return buildPremiumReportModel({
    assessment,
    discResult: resolveAssessmentDiscResultSnapshot(assessment),
    assetBaseUrl,
    currentUser: currentUser || assessment?.creator || assessment?.organization?.owner || null,
    reportType: normalizedReportType,
    includeAiComplement: false,
    useAi: false,
  });
}

function formatAssessmentDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function resolveStructuredReportScores(reportModel = {}, assessment = {}) {
  return resolveStructuredReportSnapshots(reportModel, assessment).summary;
}

function resolveStructuredReportProfile(reportModel = {}, normalizedScores = {}) {
  return computeProfileLabel(normalizedScores);
}

function buildOfficialPreviewPayload({ assessment = {}, reportModel = {}, normalizedScores = {} } = {}) {
  const participant = toPlainObject(reportModel?.participant);

  return {
    name: toText(
      pickFirstDefined(
        participant.name,
        participant.candidateName,
        assessment?.candidateName,
        assessment?.respondent_name,
        assessment?.candidateEmail,
      ),
    ),
    cargo: toText(
      pickFirstDefined(
        participant.role,
        assessment?.candidateRole,
        assessment?.role,
      ),
    ),
    empresa: toText(
      pickFirstDefined(
        participant.company,
        assessment?.candidateCompany,
        assessment?.company,
        assessment?.organization?.name,
      ),
    ),
    data: formatAssessmentDate(
      pickFirstDefined(assessment?.completedAt, assessment?.createdAt, assessment?.updatedAt),
    ),
    profile: resolveStructuredReportProfile(reportModel, normalizedScores),
    disc: {
      profile: resolveStructuredReportProfile(reportModel, normalizedScores),
    },
  };
}

export async function buildStructuredReportHtml({
  assessment = {},
  reportType = REPORT_TYPE.BUSINESS,
  assetBaseUrl = '',
  currentUser = null,
  reportModel = null,
} = {}) {
  const normalizedReportType = normalizePublicReportType(
    reportType,
    resolveStoredReportType(assessment, REPORT_TYPE.BUSINESS),
  );
  const resolvedReportModel =
    reportModel ||
    (await buildStructuredReportModel({
      assessment,
      reportType: normalizedReportType,
      assetBaseUrl,
      currentUser,
    }));
  const resolvedSnapshots = resolveStructuredReportSnapshots(resolvedReportModel, assessment);
  const normalizedScores = resolvedSnapshots.summary;
  const payload = buildOfficialPreviewPayload({
    assessment,
    reportModel: resolvedReportModel,
    normalizedScores,
  });
  const runtimePayload = await buildTemplateSnapshotPayload({
    mode: normalizedReportType,
    scores: normalizedScores,
    payload,
    reportModel: resolvedReportModel,
    assessment,
  });
  const rendered = await generateDiscHtmlFromRuntimePayload({
    mode: normalizedReportType,
    runtimePayload,
    scores: normalizedScores,
    payload,
    reportModel: resolvedReportModel,
    assessment,
  });

  return {
    reportModel: resolvedReportModel,
    html: rendered.html || '',
    normalizedScores,
  };
}

async function renderOfficialHtmlToPdfBuffer(html = '') {
  const normalizedHtml = String(html || '').trim();
  if (!normalizedHtml) {
    throw createServiceError(
      'PUBLIC_REPORT_HTML_EMPTY',
      'Não foi possível montar o HTML oficial do relatório.',
      500,
    );
  }

  const { loadServerBrowserLauncher } = await loadPremiumReportPipeline();
  const browserLauncher = await loadServerBrowserLauncher();
  const browser = await browserLauncher.launch();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1400,
      height: 900,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType('screen');
    page.setDefaultNavigationTimeout(60_000);
    await page.setContent(normalizedHtml, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      timeout: 90_000,
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true,
    });

    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

async function loadAssessmentByPublicReportToken({
  token = '',
  reportType = REPORT_TYPE.BUSINESS,
} = {}) {
  const normalizedToken = toText(token);
  if (!normalizedToken) {
    throw createServiceError('TOKEN_REQUIRED', 'Token do relatório é obrigatório.', 400);
  }

  let payload = null;

  try {
    payload = verifyPublicReportToken(normalizedToken);
  } catch (error) {
    throw createServiceError(
      'PUBLIC_REPORT_TOKEN_INVALID',
      error?.message || 'Token inválido.',
      401,
    );
  }

  const assessmentId = toText(
    pickFirstDefined(payload?.assessmentId, payload?.id, payload?.assessment_id),
  );
  const accountId = toText(
    pickFirstDefined(payload?.accountId, payload?.organizationId, payload?.account_id),
  );

  if (!assessmentId) {
    throw createServiceError(
      'PUBLIC_REPORT_ASSESSMENT_REQUIRED',
      'Token sem assessmentId.',
      400,
    );
  }

  if (!accountId) {
    throw createServiceError(
      'PUBLIC_REPORT_ACCOUNT_REQUIRED',
      'Token sem accountId.',
      400,
    );
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      organizationId: accountId,
    },
    include: {
      report: true,
      creator: true,
      organization: { include: { owner: true } },
      quickContext: true,
      response: true,
    },
  });

  if (!assessment) {
    throw createServiceError(
      'NOT_FOUND',
      'Não localizamos a avaliação para gerar o relatório.',
      404,
    );
  }

  return {
    assessment,
    tokenPayload: payload,
    reportType: normalizePublicReportType(
      reportType || payload?.reportType || resolveStoredReportType(assessment, REPORT_TYPE.BUSINESS),
    ),
  };
}

export async function generateAssessmentReport({
  assessment = {},
  reportType = REPORT_TYPE.BUSINESS,
  assetBaseUrl = '',
  currentUser = null,
  inMemory = true,
  useCache = true,
} = {}) {
  if (!assessment?.id) {
    throw createServiceError('NOT_FOUND', 'Assessment não encontrado.', 404);
  }

  const normalizedReportType = normalizePublicReportType(
    reportType,
    resolveStoredReportType(assessment, REPORT_TYPE.BUSINESS),
  );
  const cacheKey = buildGeneratedReportCacheKey({
    assessmentId: assessment.id,
    reportType: normalizedReportType,
  });

  if (inMemory && useCache) {
    const cached = getCachedGeneratedReport(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
      };
    }
  }

  const structured = await buildStructuredReportHtml({
    assessment,
    reportType: normalizedReportType,
    assetBaseUrl,
    currentUser,
  });
  const reportModel = structured.reportModel;
  const html = structured.html;
  const pdfBuffer = await renderOfficialHtmlToPdfBuffer(html);
  const branding = normalizeBrandingFromOrganization(assessment?.organization || {});
  const payload = {
    assessment,
    reportType: normalizedReportType,
    reportModel,
    html,
    pdfBuffer,
    outputPath: null,
    pdfUrl: '',
    fileName: buildPublicReportFileName({
      assessment: {
        ...assessment,
        branding,
      },
      reportType: normalizedReportType,
    }),
    cacheHit: false,
  };
 
  if (inMemory && useCache && payload.pdfBuffer) {
    setCachedGeneratedReport(cacheKey, payload);
  }

  const emailEnabled = process.env.EMAIL_REPORTS_ENABLED === 'true';
  const recipientEmail = assessment?.candidateEmail || assessment?.response?.email || null;
  const shareToken = assessment?.public_share_token || null;

  if (emailEnabled && recipientEmail && shareToken && assetBaseUrl) {
    const reportUrl = `${String(assetBaseUrl).replace(/\/$/, '')}/r/public?token=${shareToken}`;
    const nome = resolveAssessmentParticipantName(assessment);

    sendEmail({
      to: recipientEmail,
      subject: 'Seu relatório DISC está pronto',
      html: reportReadyEmail({
        nome: nome || 'Olá',
        link: reportUrl,
      }),
      replyTo: 'suporte@insightdisc.com',
    })
      .then(() => {
        console.info(`[Email] Relatório enviado com sucesso para: ${recipientEmail}`);
      })
      .catch((err) => {
        console.error(`[Email] Erro ao enviar para ${recipientEmail}:`, err?.message || err);
      });
  }

  return payload;
}

export async function generateReport({
  token = '',
  reportType = REPORT_TYPE.BUSINESS,
  assetBaseUrl = '',
  inMemory = true,
  useCache = true,
} = {}) {
  const resolved = await loadAssessmentByPublicReportToken({
    token,
    reportType,
  });

  return generateAssessmentReport({
    assessment: resolved.assessment,
    reportType: resolved.reportType,
    assetBaseUrl,
    currentUser: resolved.assessment?.creator || resolved.assessment?.organization?.owner || null,
    inMemory,
    useCache,
  });
}

export {
  REPORT_OUTPUTS,
  basePath as REPORT_BASE_PATH,
  assertOfficialTemplateCompatibility,
  buildReportHtmlPreview,
  generateHtmlPreview,
  invalidateTemplateCache,
  normalizeMode,
  storagePath,
  templateCache,
  templateInflight,
};
