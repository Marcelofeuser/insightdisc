import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.resolve(__dirname, 'content');
const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_LABELS = {
  D: 'Dominancia',
  I: 'Influencia',
  S: 'Estabilidade',
  C: 'Conformidade',
};

const DEFAULT_LOGO_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56"><rect width="220" height="56" rx="12" fill="#0b1f3b"/><text x="26" y="35" font-family="Arial,sans-serif" font-size="22" fill="#ffffff" font-weight="700">InsightDISC</text><circle cx="194" cy="28" r="10" fill="#f7b500"/></svg>'
  );

const DEFAULT_BRANDING = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: DEFAULT_LOGO_DATA_URI,
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Analise Comportamental',
});

const DEFAULT_TEXT = 'Diagnostico validado pelo instrumento comportamental DISC.';
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6})$/;

const cache = {
  loaded: false,
  factors: {},
  combos: {},
  pure: {},
  snippets: {},
  rules: null,
};

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function clamp(value, min = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function safeText(value, fallback = DEFAULT_TEXT) {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeArray(value, fallback = [DEFAULT_TEXT]) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function normalizeHexColor(value, fallback) {
  const color = String(value || '').trim();
  if (!color || !HEX_COLOR_REGEX.test(color)) return fallback;
  return color.toLowerCase();
}

function firstNonEmpty(values = []) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeScores(input = {}, fallback = { D: 25, I: 25, S: 25, C: 25 }) {
  const result = {};
  let total = 0;

  for (const factor of FACTORS) {
    result[factor] = clamp(input?.[factor]);
    total += result[factor];
  }

  if (total > 0) return result;

  return FACTORS.reduce((acc, factor) => {
    acc[factor] = clamp(fallback?.[factor], 0, 100);
    return acc;
  }, {});
}

function sortFactorsByScore(scores) {
  return FACTORS.map((factor) => ({ factor, score: clamp(scores?.[factor]) })).sort(
    (a, b) => b.score - a.score
  );
}

function computeBand(score, factorBands) {
  const value = clamp(score);
  if (value >= factorBands.high.min && value <= factorBands.high.max) return 'high';
  if (value >= factorBands.mid.min && value <= factorBands.mid.max) return 'mid';
  return 'low';
}

function computeAdaptationBand(natural, adapted, adaptationRule) {
  const deltas = FACTORS.map((factor) => Math.abs(clamp(adapted[factor]) - clamp(natural[factor])));
  const avgAbsDelta = deltas.reduce((sum, n) => sum + n, 0) / FACTORS.length;

  if (avgAbsDelta < adaptationRule.low.maxExclusive) {
    return {
      key: 'low',
      avgAbsDelta: Number(avgAbsDelta.toFixed(2)),
      interpretation: 'Baixo custo de adaptacao: o comportamento adaptado permanece proximo do estilo natural.',
      deltas,
    };
  }

  if (avgAbsDelta >= adaptationRule.mid.minInclusive && avgAbsDelta <= adaptationRule.mid.maxInclusive) {
    return {
      key: 'mid',
      avgAbsDelta: Number(avgAbsDelta.toFixed(2)),
      interpretation: 'Custo moderado de adaptacao: ajustes pontuais sao exigidos pelo contexto de trabalho.',
      deltas,
    };
  }

  return {
    key: 'high',
    avgAbsDelta: Number(avgAbsDelta.toFixed(2)),
    interpretation: 'Custo elevado de adaptacao: o ambiente atual exige mudancas comportamentais intensas e frequentes.',
    deltas,
  };
}

function pickProfileKey(ranked, rules) {
  const top1 = ranked[0] || { factor: 'D', score: 25 };
  const top2 = ranked[1] || { factor: 'I', score: 25 };
  const diff = top1.score - top2.score;
  const usePure = top1.score === top2.score || diff >= Number(rules?.top2Selection?.pureThreshold || 18);

  return {
    primary: top1.factor,
    secondary: top2.factor,
    key: usePure ? top1.factor : `${top1.factor}${top2.factor}`,
    mode: usePure ? 'pure' : 'combo',
    topDiff: diff,
  };
}

function normalizeBranding(branding = {}, strict = false) {
  const companyName = String(branding?.company_name || '').trim();
  const logoUrl = String(branding?.logo_url || '').trim();

  if (strict && (!companyName || !logoUrl)) {
    throw createBadRequest('Branding incompleto para geracao white-label');
  }

  return {
    company_name: companyName || DEFAULT_BRANDING.company_name,
    logo_url: logoUrl || DEFAULT_BRANDING.logo_url,
    brand_primary_color: normalizeHexColor(
      branding?.brand_primary_color,
      DEFAULT_BRANDING.brand_primary_color
    ),
    brand_secondary_color: normalizeHexColor(
      branding?.brand_secondary_color,
      DEFAULT_BRANDING.brand_secondary_color
    ),
    report_footer_text: safeText(
      branding?.report_footer_text,
      DEFAULT_BRANDING.report_footer_text
    ),
  };
}

function resolveParticipant(input = {}, strict = false) {
  const participant = input?.participant || {};
  const assessment = input?.assessment || {};
  const meta = input?.meta || {};

  const name = firstNonEmpty([
    assessment?.candidateName,
    assessment?.respondent_name,
    assessment?.respondentName,
    assessment?.user_name,
    assessment?.name,
    participant?.candidateName,
    participant?.respondent_name,
    participant?.respondentName,
    participant?.user_name,
    participant?.name,
  ]);

  const email = firstNonEmpty([
    assessment?.candidateEmail,
    assessment?.respondent_email,
    assessment?.respondentEmail,
    assessment?.user_email,
    assessment?.email,
    participant?.candidateEmail,
    participant?.respondent_email,
    participant?.respondentEmail,
    participant?.user_email,
    participant?.email,
  ]);

  const assessmentId = firstNonEmpty([
    assessment?.id,
    participant?.assessmentId,
    meta?.reportId,
  ]);

  if (strict && !name) {
    throw createBadRequest('Dado obrigatorio ausente: participant.name');
  }

  return {
    name: name || 'Participante DISC',
    email: email || 'contato@participante.disc',
    assessmentId: assessmentId || `report-${Date.now()}`,
    role: firstNonEmpty([participant?.role, assessment?.candidateRole, assessment?.role, 'Profissional']),
    company: firstNonEmpty([participant?.company, assessment?.candidateCompany, assessment?.company, 'Organizacao avaliada']),
  };
}

function buildFactorSection(factor, score, contentByFactor, rules) {
  const band = computeBand(score, rules.factorBands);
  const source = contentByFactor?.[factor]?.[band] || {};

  return {
    factor,
    label: FACTOR_LABELS[factor],
    score: clamp(score),
    band,
    headline: safeText(source?.headline, `Leitura de ${FACTOR_LABELS[factor]} em banda ${band}.`),
    paragraphs: safeArray(source?.paragraphs, [
      `O fator ${FACTOR_LABELS[factor]} influencia sua forma de agir nas rotinas profissionais.`,
      'Ajustes de contexto aumentam consistencia quando acompanhados por metas e feedback.',
    ]).slice(0, 2),
    actions: safeArray(source?.actions, [
      'Definir uma acao observavel para praticar semanalmente.',
      'Estabelecer criterio objetivo de progresso para o fator.',
      'Solicitar feedback quinzenal de um par de confianca.',
      'Revisar decisoes criticas com checklist de risco e impacto.',
      'Registrar evolucao em ciclos de 30 dias.',
    ]).slice(0, 5),
    redFlags: safeArray(source?.redFlags, [
      'Queda de clareza em momentos de pressao.',
      'Oscilacao de consistencia quando a demanda aumenta.',
      'Ruido de comunicacao em alinhamentos importantes.',
      'Decisoes sem criterio explicito sob urgencia.',
      'Dificuldade de manter follow-up apos acordos.',
    ]).slice(0, 5),
  };
}

function normalizeBlock(block = {}, primaryLabel = 'Perfil DISC') {
  return {
    title: safeText(block?.title, `${primaryLabel} orientado a resultados sustentaveis`),
    executiveSummary: safeArray(block?.executiveSummary, [
      'Perfil com potencial para impacto consistente quando opera com clareza de objetivos.',
      'A combinacao dos fatores favorece colaboracao e decisao estruturada.',
      'A maior alavanca de desempenho e transformar insight em rotina objetiva.',
      'A gestao da adaptacao reduz desgaste e aumenta previsibilidade de entrega.',
    ]).slice(0, 4),
    strengths: safeArray(block?.strengths, [
      'Capacidade de manter foco em objetivo relevante.',
      'Boa leitura de contexto para ajustar abordagem.',
      'Consistencia na relacao com pessoas e entregas.',
      'Disciplina de acompanhamento quando ha critrios claros.',
      'Flexibilidade para ajustar estrategia sem perder direcao.',
      'Potencial de influencia em ambientes colaborativos.',
    ]).slice(0, 6),
    risks: safeArray(block?.risks, [
      'Acumular decisoes sem fechamento formal de acordos.',
      'Perder prioridade diante de excesso de demandas.',
      'Aumentar desgaste em periodos de pressao prolongada.',
      'Subestimar riscos operacionais em temas sensiveis.',
      'Reduzir escuta ativa em conversas de alta tensao.',
      'Oscilar ritmo entre urgencia e aprofundamento.',
    ]).slice(0, 6),
    communicationPlaybook: {
      do: safeArray(block?.communicationPlaybook?.do, [
        'Abrir conversas com objetivo e contexto de negocio.',
        'Finalizar com dono, prazo e criterio de sucesso.',
        'Ajustar profundidade conforme perfil do interlocutor.',
        'Usar exemplos concretos para reduzir ambiguidade.',
        'Confirmar entendimento antes de encerrar alinhamentos.',
      ]).slice(0, 5),
      dont: safeArray(block?.communicationPlaybook?.dont, [
        'Assumir alinhamento sem confirmar entendimento.',
        'Trocar prioridade sem atualizar criterio de decisao.',
        'Conduzir reuniao sem fechamento de proximo passo.',
        'Confundir rapidez com qualidade de acordos.',
        'Postergar feedback sobre riscos recorrentes.',
      ]).slice(0, 5),
    },
    leadershipStyle: safeArray(block?.leadershipStyle, [
      'Lideranca orientada a resultado com foco em execucao previsivel.',
      'Boa capacidade de mobilizar pessoas com clareza de direcao.',
      'Evolui com rituais curtos de acompanhamento e feedback.',
    ]).slice(0, 3),
    stressPattern: safeArray(block?.stressPattern, [
      'Tende a reduzir paciencia em ciclos de alta pressao.',
      'Pode acelerar decisoes sem consolidar alinhamento.',
      'Necessita checkpoints curtos para preservar consistencia.',
    ]).slice(0, 3),
    motivators: safeArray(block?.motivators, [
      'Autonomia com responsabilidade clara.',
      'Objetivos desafiadores e mensuraveis.',
      'Reconhecimento por entrega consistente.',
      'Ambiente com colaboracao e boa comunicacao.',
    ]).slice(0, 4),
    idealEnvironment: safeArray(block?.idealEnvironment, [
      'Metas claras e criterios de decisao conhecidos.',
      'Ritmo de execucao sustentavel com previsibilidade.',
      'Feedback frequente e orientado a comportamento.',
      'Espaco para colaboracao com responsabilidade compartilhada.',
    ]).slice(0, 4),
    conflictStyle: safeArray(block?.conflictStyle, [
      'Busca resolver conflito com objetividade e foco em resultado.',
      'Prefere acordos claros com responsabilidade definida.',
      'Responde melhor quando ha fatos e impacto explicito.',
    ]).slice(0, 3),
    coachingTips: safeArray(block?.coachingTips, [
      'Definir 1 comportamento de foco por semana.',
      'Usar checklist de decisao antes de temas criticos.',
      'Praticar escuta ativa em reunioes de alinhamento.',
      'Registrar aprendizados apos situacoes de pressao.',
      'Revisar progresso com indicador simples quinzenal.',
    ]).slice(0, 5),
    recommendedRoles: safeArray(block?.recommendedRoles, [
      'Coordenacao de projetos',
      'Lideranca de equipe',
      'Gestao comercial',
      'Operacoes e performance',
      'Desenvolvimento de negocios',
      'Relacionamento com clientes',
      'Planejamento e execucao',
      'Consultoria de processos',
    ]).slice(0, 8),
  };
}

function mergePlans(snippetPlans = {}, inputPlans = {}) {
  return {
    days30: safeArray(inputPlans?.days30, safeArray(snippetPlans?.days30, [
      'Semana 1: escolher um comportamento-chave para praticar nas interacoes criticas.',
      'Semana 2: coletar feedback estruturado de duas pessoas-chave.',
      'Semana 3: repetir ajuste em tres contextos relevantes.',
      'Semana 4: consolidar ritual semanal de melhoria continua.',
    ])).slice(0, 4),
    days60: safeArray(inputPlans?.days60, safeArray(snippetPlans?.days60, [
      'Padronizar criterios de decisao para temas recorrentes.',
      'Fortalecer comunicacao com scripts por perfil de interlocutor.',
      'Estabelecer rotina quinzenal de feedback e calibracao.',
      'Reduzir um red flag prioritario com plano pratico.',
    ])).slice(0, 4),
    days90: safeArray(inputPlans?.days90, safeArray(snippetPlans?.days90, [
      'Consolidar novo padrao em cenarios de alta pressao.',
      'Comparar evolucao com baseline inicial e ajustar metas.',
      'Definir objetivos de desenvolvimento para o proximo trimestre.',
      'Transferir aprendizado para pares e lideranca imediata.',
    ])).slice(0, 4),
  };
}

function buildBenchmarkRows({ natural, profile, rules }) {
  const rows = [];

  for (const factor of FACTORS) {
    const score = clamp(natural[factor]);
    let min = 20;
    let max = 65;

    if (factor === profile.primary) {
      min = 67;
      max = 100;
    } else if (factor === profile.secondary) {
      min = profile.mode === 'pure' ? 34 : 45;
      max = profile.mode === 'pure' ? 66 : 85;
    }

    // Ajuste adicional baseado na banda oficial do fator
    const band = computeBand(score, rules.factorBands);
    const reading =
      score < min
        ? `Abaixo da faixa tipica para ${profile.key}; recomenda-se reforco de repertorio em ${FACTOR_LABELS[factor]}.`
        : score > max
          ? `Acima da faixa tipica para ${profile.key}; alta expressao de ${FACTOR_LABELS[factor]} no contexto atual.`
          : `Dentro da faixa tipica para ${profile.key}, com nivel ${band.toUpperCase()} de expressao.`;

    rows.push({
      factor,
      label: FACTOR_LABELS[factor],
      score,
      typicalRange: `${min}-${max}`,
      reading,
      band,
    });
  }

  return rows;
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadDirectoryJsonMap(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const map = {};

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const key = path.basename(entry.name, '.json');
    map[key] = await loadJson(path.join(directoryPath, entry.name));
  }

  return map;
}

async function ensureContentLoaded() {
  if (cache.loaded) return cache;

  const [rules, factors, combos, pure, snippets] = await Promise.all([
    loadJson(path.join(CONTENT_DIR, 'rules.json')),
    loadDirectoryJsonMap(path.join(CONTENT_DIR, 'factors')),
    loadDirectoryJsonMap(path.join(CONTENT_DIR, 'combos')),
    loadDirectoryJsonMap(path.join(CONTENT_DIR, 'pure')),
    loadDirectoryJsonMap(path.join(CONTENT_DIR, 'snippets')),
  ]);

  cache.rules = rules;
  cache.factors = factors;
  cache.combos = combos;
  cache.pure = pure;
  cache.snippets = snippets;
  cache.loaded = true;

  return cache;
}

export async function buildReportModel(input = {}) {
  const content = await ensureContentLoaded();
  const strict = Boolean(input?.strict || input?.options?.strict);

  const participant = resolveParticipant(input, strict);
  const metaInput = input?.meta || {};
  const branding = normalizeBranding(input?.branding || metaInput?.branding || {}, strict);

  const natural = normalizeScores(input?.scores?.natural, { D: 25, I: 25, S: 25, C: 25 });
  const adapted = normalizeScores(input?.scores?.adapted, natural);
  const summary = FACTORS.reduce((acc, factor) => {
    acc[factor] = clamp((natural[factor] + adapted[factor]) / 2);
    return acc;
  }, {});

  const ranked = sortFactorsByScore(natural);
  const profileSelection = pickProfileKey(ranked, content.rules);
  const adaptation = computeAdaptationBand(natural, adapted, content.rules.adaptationBand);

  const comboSource =
    profileSelection.mode === 'combo'
      ? content.combos?.[profileSelection.key]
      : content.pure?.[profileSelection.key];
  const fallbackPure = content.pure?.[profileSelection.primary] || {};

  const combinedProfile = normalizeBlock(
    comboSource || fallbackPure,
    FACTOR_LABELS[profileSelection.primary]
  );

  const factors = FACTORS.reduce((acc, factor) => {
    acc[factor] = buildFactorSection(factor, natural[factor], content.factors, content.rules);
    return acc;
  }, {});

  const benchmarkRows = buildBenchmarkRows({
    natural,
    profile: profileSelection,
    rules: content.rules,
  });

  const plans = mergePlans(content.snippets.plans, input?.plans);

  const model = {
    meta: {
      brand: branding.company_name,
      reportTitle: safeText(metaInput?.reportTitle, 'Relatorio DISC Premium'),
      reportSubtitle: safeText(
        metaInput?.reportSubtitle,
        'Diagnostico comportamental completo com recomendacoes praticas para decisao, lideranca e carreira'
      ),
      generatedAt: safeText(metaInput?.generatedAt, new Date().toISOString().slice(0, 10)),
      reportId: safeText(metaInput?.reportId || participant.assessmentId, participant.assessmentId),
      version: safeText(metaInput?.version, '4.0'),
      totalPages: 20,
      workspaceId: safeText(metaInput?.workspaceId || input?.workspaceId || input?.assessment?.organizationId || 'workspace-disc'),
      responsibleName: safeText(metaInput?.responsibleName, 'Especialista InsightDISC'),
      responsibleRole: safeText(metaInput?.responsibleRole, 'Analista Comportamental'),
    },
    branding,
    participant,
    scores: {
      natural,
      adapted,
      summary,
      deltas: FACTORS.reduce((acc, factor) => {
        acc[factor] = clamp(adapted[factor]) - clamp(natural[factor]);
        return acc;
      }, {}),
    },
    profile: {
      primary: profileSelection.primary,
      secondary: profileSelection.secondary,
      key: profileSelection.key,
      mode: profileSelection.mode,
      topDiff: profileSelection.topDiff,
      label:
        profileSelection.mode === 'pure'
          ? `Predominancia de ${FACTOR_LABELS[profileSelection.primary]}`
          : `${FACTOR_LABELS[profileSelection.primary]} com apoio de ${FACTOR_LABELS[profileSelection.secondary]}`,
      archetype: combinedProfile.title,
    },
    adaptation,
    benchmark: {
      rows: benchmarkRows,
      note: 'Faixas tipicas internas para comparacao deterministica por combinacao de perfil.',
    },
    combinedProfile,
    factors,
    snippets: {
      communication: content.snippets.communication || {},
      leadership: content.snippets.leadership || {},
      stress: content.snippets.stress || {},
      environment: content.snippets.environment || {},
      career: content.snippets.career || {},
      plans: content.snippets.plans || {},
      glossary: content.snippets.glossary || {},
    },
    plans,
    lgpd: {
      notice: safeText(
        content.snippets.glossary?.lgpd?.notice,
        'Este relatorio contem dados pessoais e deve ser usado exclusivamente para desenvolvimento comportamental, em conformidade com a LGPD.'
      ),
      contact: safeText(content.snippets.glossary?.lgpd?.contact, 'suporte@insightdisc.app'),
    },
  };

  model.profileNarrative = [
    `Perfil identificado: ${model.profile.archetype}.`,
    `Fator primario: ${FACTOR_LABELS[model.profile.primary]} (${model.scores.natural[model.profile.primary]}%).`,
    `Fator secundario: ${FACTOR_LABELS[model.profile.secondary]} (${model.scores.natural[model.profile.secondary]}%).`,
    model.adaptation.interpretation,
  ];

  model.pages = [
    { key: 'executive', bullets: combinedProfile.executiveSummary },
    { key: 'strengths', bullets: combinedProfile.strengths },
    { key: 'risks', bullets: combinedProfile.risks },
  ];

  model.charts = {
    natural: model.scores.natural,
    adapted: model.scores.adapted,
    summary: model.scores.summary,
  };

  return model;
}

export async function buildPremiumReportModel(input = {}) {
  return buildReportModel(input);
}

export default buildReportModel;
