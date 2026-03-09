import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.resolve(__dirname, 'content');
const FACTORS = ['D', 'I', 'S', 'C'];
const PROFILE_KEYS = ['D', 'I', 'S', 'C', 'DI', 'ID', 'DS', 'SD', 'DC', 'CD', 'IS', 'SI', 'IC', 'CI', 'SC', 'CS'];

const FACTOR_LABELS = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

const DEFAULT_BRANDING = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-report-logo.png',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
});

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6})$/;

const contentCache = {
  loaded: false,
  profiles: {},
  shared: {},
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

function safeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeArray(value, fallback = []) {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return normalized.length ? normalized : [...fallback];
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (text) return [text];
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const serialized = String(value?.text || value?.value || '').trim();
    if (serialized) return [serialized];
  }

  return [...fallback];
}

function firstNonEmpty(values = []) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeHexColor(color, fallback) {
  const normalized = String(color || '').trim();
  if (!normalized || !HEX_COLOR_REGEX.test(normalized)) return fallback;
  return normalized.toLowerCase();
}

function ensureMinBullets(items, min, fallbackFactory) {
  const list = safeArray(items);
  if (list.length >= min) return list;

  const enriched = [...list];
  let index = 0;
  while (enriched.length < min) {
    enriched.push(fallbackFactory(index));
    index += 1;
  }

  return enriched;
}

function ensureMinItems(items, min, fallbackFactory) {
  return ensureMinBullets(items, min, fallbackFactory);
}

function ensureMinParagraphs(items, min, fallbackFactory) {
  const list = safeArray(items);
  if (list.length >= min) return list;

  const enriched = [...list];
  let index = 0;
  while (enriched.length < min) {
    enriched.push(fallbackFactory(index));
    index += 1;
  }

  return enriched;
}

function normalizeScores(...scoreSources) {
  const picked = {
    D: 0,
    I: 0,
    S: 0,
    C: 0,
  };

  let anyScore = false;

  for (const source of scoreSources) {
    if (!source || typeof source !== 'object') continue;

    for (const factor of FACTORS) {
      const parsed = Number(source?.[factor]);
      if (Number.isFinite(parsed)) {
        picked[factor] = clamp(parsed);
        anyScore = true;
      }
    }
  }

  if (anyScore) return picked;

  return {
    D: 25,
    I: 25,
    S: 25,
    C: 25,
  };
}

function rankFactors(scores = {}) {
  return FACTORS.map((factor) => ({
    factor,
    score: clamp(scores?.[factor]),
  })).sort((a, b) => b.score - a.score);
}

function resolveFactorBand(score, factorBands = {}) {
  const value = clamp(score);

  const low = factorBands?.low || { min: 0, max: 33 };
  const mid = factorBands?.mid || { min: 34, max: 66 };
  const high = factorBands?.high || { min: 67, max: 100 };

  if (value >= high.min && value <= high.max) return 'high';
  if (value >= mid.min && value <= mid.max) return 'mid';
  if (value >= low.min && value <= low.max) return 'low';
  return 'mid';
}

function computeAdaptation(natural = {}, adapted = {}, adaptationRule = {}) {
  const deltas = {};
  let totalDelta = 0;

  for (const factor of FACTORS) {
    const delta = Math.abs(clamp(adapted[factor]) - clamp(natural[factor]));
    deltas[factor] = delta;
    totalDelta += delta;
  }

  const avgAbsDelta = Number((totalDelta / FACTORS.length).toFixed(2));

  const lowRule = adaptationRule?.low || { maxExclusive: 8, label: 'baixo' };
  const midRule = adaptationRule?.mid || { minInclusive: 8, maxInclusive: 15, label: 'moderado' };
  const highRule = adaptationRule?.high || { minExclusive: 15, label: 'alto' };

  if (avgAbsDelta < Number(lowRule.maxExclusive ?? 8)) {
    return {
      band: 'low',
      label: safeText(lowRule.label, 'baixo'),
      avgAbsDelta,
      deltas,
      interpretation:
        'Baixo custo de adaptacao: o estilo adaptado permanece muito proximo do estilo natural, com baixa perda de energia comportamental.',
    };
  }

  if (
    avgAbsDelta >= Number(midRule.minInclusive ?? 8) &&
    avgAbsDelta <= Number(midRule.maxInclusive ?? 15)
  ) {
    return {
      band: 'mid',
      label: safeText(midRule.label, 'moderado'),
      avgAbsDelta,
      deltas,
      interpretation:
        'Custo de adaptacao moderado: o contexto pede ajustes comportamentais frequentes, mas ainda sustentaveis com rotina de alinhamento.',
    };
  }

  if (avgAbsDelta > Number(highRule.minExclusive ?? 15)) {
    return {
      band: 'high',
      label: safeText(highRule.label, 'alto'),
      avgAbsDelta,
      deltas,
      interpretation:
        'Custo de adaptacao alto: o ambiente exige mudancas intensas de estilo, aumentando risco de desgaste e oscilacao de performance.',
    };
  }

  return {
    band: 'mid',
    label: 'moderado',
    avgAbsDelta,
    deltas,
    interpretation:
      'Custo de adaptacao moderado com necessidade de calibragem de rotina para manter consistencia comportamental.',
  };
}

function selectProfileKey(ranked = [], rules = {}, scores = {}) {
  const top1 = ranked[0] || { factor: 'D', score: 25 };
  const top2 = ranked[1] || { factor: 'I', score: 25 };
  const scoreValues = FACTORS.map((factor) => clamp(scores?.[factor]));
  const maxScore = Math.max(...scoreValues);
  const minScore = Math.min(...scoreValues);
  const spread = clamp(maxScore - minScore, 0, 100);
  const balancedThreshold = Number(rules?.top2Selection?.balancedThreshold || 10);

  if (spread <= balancedThreshold) {
    return {
      key: 'DISC',
      mode: 'balanced',
      primary: top1.factor,
      secondary: top2.factor,
      displayPrimary: 'Balanceado',
      displaySecondary: 'Adaptativo',
      topDiff: clamp(top1.score - top2.score, 0, 100),
      spread,
    };
  }

  const pureThreshold = Number(rules?.top2Selection?.pureThreshold || 18);
  const diff = clamp(top1.score - top2.score, 0, 100);
  const tieBehavior = safeText(rules?.top2Selection?.tieBehavior, 'pure');
  const isTie = top1.score === top2.score;

  const shouldUsePure = isTie
    ? tieBehavior === 'pure'
    : diff >= pureThreshold;

  const key = shouldUsePure ? top1.factor : `${top1.factor}${top2.factor}`;

  return {
    key,
    mode: shouldUsePure ? 'pure' : 'combo',
    primary: top1.factor,
    secondary: top2.factor,
    displayPrimary: top1.factor,
    displaySecondary: top2.factor,
    topDiff: diff,
    spread,
  };
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadJsonMap(directoryPath) {
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
  if (contentCache.loaded) return contentCache;

  const profiles = await loadJsonMap(path.join(CONTENT_DIR, 'profiles'));
  const shared = await loadJsonMap(path.join(CONTENT_DIR, 'shared'));

  contentCache.profiles = profiles;
  contentCache.shared = shared;
  contentCache.loaded = true;

  return contentCache;
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

  if (strict && !name) {
    throw createBadRequest('Dado obrigatorio ausente: participant.name');
  }

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

  return {
    name: name || 'Participante DISC',
    email: email || 'contato@participante.disc',
    assessmentId: assessmentId || `assessment-${Date.now()}`,
    role: firstNonEmpty([
      participant?.role,
      assessment?.candidateRole,
      assessment?.role,
      'Profissional em desenvolvimento',
    ]),
    company: firstNonEmpty([
      participant?.company,
      assessment?.candidateCompany,
      assessment?.company,
      assessment?.organization?.name,
      'Organizacao avaliada',
    ]),
  };
}

function resolveBranding(input = {}, strict = false) {
  const brandingInput = input?.branding || input?.meta?.branding || {};
  const assessment = input?.assessment || {};
  const meta = input?.meta || {};

  const companyName = firstNonEmpty([
    brandingInput?.company_name,
    assessment?.organization?.companyName,
    assessment?.organization?.name,
    meta?.brand,
  ]);

  const logoUrl = firstNonEmpty([
    brandingInput?.logo_url,
    assessment?.organization?.logoUrl,
  ]);

  const hasWorkspaceContext = Boolean(
    input?.workspaceId ||
      meta?.workspaceId ||
      assessment?.organizationId ||
      assessment?.workspaceId ||
      assessment?.organization
  );

  if (strict && hasWorkspaceContext && (!companyName || !logoUrl)) {
    throw createBadRequest('Branding incompleto para geracao white-label');
  }

  return {
    company_name: companyName || DEFAULT_BRANDING.company_name,
    logo_url: logoUrl || DEFAULT_BRANDING.logo_url,
    brand_primary_color: normalizeHexColor(
      brandingInput?.brand_primary_color,
      DEFAULT_BRANDING.brand_primary_color
    ),
    brand_secondary_color: normalizeHexColor(
      brandingInput?.brand_secondary_color,
      DEFAULT_BRANDING.brand_secondary_color
    ),
    report_footer_text: safeText(
      brandingInput?.report_footer_text,
      DEFAULT_BRANDING.report_footer_text
    ),
    logo_contains_tagline: Boolean(brandingInput?.logo_contains_tagline),
  };
}

function normalizeProfileContent(rawProfile = {}, profileKey = 'DI') {
  const title = safeText(rawProfile?.title, `Perfil ${profileKey}`);
  const summary = safeText(
    rawProfile?.summary,
    `Perfil ${profileKey} com potencial de alta entrega quando combina forcas naturais com rotina de calibragem comportamental.`
  );
  const identitySource = rawProfile?.identityDynamics || rawProfile?.deepDynamics;
  const executiveClosingSource = rawProfile?.executiveClosing || rawProfile?.closingSummary;

  return {
    key: profileKey,
    title,
    archetype: safeText(rawProfile?.archetype, `Arquetipo ${profileKey}`),
    summary,
    executiveSummary: ensureMinBullets(
      rawProfile?.executiveSummary,
      4,
      (index) => `Leitura executiva complementar ${index + 1} para ${profileKey}.`
    ),
    identityDynamics: ensureMinParagraphs(
      identitySource,
      5,
      (index) => `Dinamica complementar ${index + 1}: aplicacao do perfil ${profileKey} em contexto corporativo.`
    ),
    deepDynamics: ensureMinParagraphs(
      identitySource,
      5,
      (index) => `Dinamica complementar ${index + 1}: aplicacao do perfil ${profileKey} em contexto corporativo.`
    ),
    decisionStyle: ensureMinParagraphs(
      rawProfile?.decisionStyle,
      4,
      (index) => `Decisao complementar ${index + 1}: calibrar criterio e velocidade no perfil ${profileKey}.`
    ),
    motivators: ensureMinItems(rawProfile?.motivators, 5, (index) => `Motivador adicional ${index + 1}.`),
    energyDrainers: ensureMinItems(rawProfile?.energyDrainers, 5, (index) => `Drenador adicional ${index + 1}.`),
    workStrengths: ensureMinItems(rawProfile?.workStrengths, 6, (index) => `Forca operacional adicional ${index + 1}.`),
    workRisks: ensureMinItems(rawProfile?.workRisks, 6, (index) => `Risco comportamental adicional ${index + 1}.`),
    communicationStyle: ensureMinParagraphs(
      rawProfile?.communicationStyle,
      4,
      (index) => `Estilo de comunicacao ${index + 1} para ${profileKey}.`
    ),
    communicationNeeds: ensureMinItems(
      rawProfile?.communicationNeeds,
      4,
      (index) => `Necessidade de comunicacao ${index + 1}.`
    ),
    communicationDo: ensureMinItems(rawProfile?.communicationDo, 5, (index) => `Boa pratica de comunicacao ${index + 1}.`),
    communicationDont: ensureMinItems(rawProfile?.communicationDont, 4, (index) => `Evitar comportamento ${index + 1}.`),
    leadershipStyle: ensureMinParagraphs(rawProfile?.leadershipStyle, 4, (index) => `Diretriz de lideranca ${index + 1}.`),
    leadershipStrengths: ensureMinItems(
      rawProfile?.leadershipStrengths,
      5,
      (index) => `Forca de lideranca ${index + 1}.`
    ),
    leadershipRisks: ensureMinItems(rawProfile?.leadershipRisks, 5, (index) => `Risco de lideranca ${index + 1}.`),
    stressPattern: ensureMinItems(rawProfile?.stressPattern, 4, (index) => `Padrao de estresse ${index + 1}.`),
    stressSignals: ensureMinItems(rawProfile?.stressSignals, 5, (index) => `Sinal de estresse ${index + 1}.`),
    recoveryStrategy: ensureMinItems(rawProfile?.recoveryStrategy, 5, (index) => `Acao de recuperacao ${index + 1}.`),
    conflictStyle: ensureMinItems(rawProfile?.conflictStyle, 5, (index) => `Diretriz de conflito ${index + 1}.`),
    teamContribution: ensureMinItems(rawProfile?.teamContribution, 5, (index) => `Contribuicao de equipe ${index + 1}.`),
    bestMatches: ensureMinItems(rawProfile?.bestMatches, 4, (index) => `Combinacao favoravel ${index + 1}.`),
    frictionMatches: ensureMinItems(rawProfile?.frictionMatches, 4, (index) => `Combinacao de atrito ${index + 1}.`),
    idealEnvironment: ensureMinItems(rawProfile?.idealEnvironment, 5, (index) => `Condicao de ambiente ideal ${index + 1}.`),
    lowFitEnvironment: ensureMinItems(
      rawProfile?.lowFitEnvironment,
      4,
      (index) => `Ambiente de baixa aderencia ${index + 1}.`
    ),
    recommendedRoles: ensureMinItems(rawProfile?.recommendedRoles, 8, (index) => `Funcao recomendada ${index + 1}.`),
    lowFitRoles: ensureMinItems(rawProfile?.lowFitRoles, 4, (index) => `Funcao de baixa aderencia ${index + 1}.`),
    naturalStrengths: ensureMinItems(rawProfile?.naturalStrengths, 8, (index) => `Forca natural complementar ${index + 1}.`),
    developmentPoints: ensureMinItems(rawProfile?.developmentPoints, 8, (index) => `Ponto de desenvolvimento ${index + 1}.`),
    developmentRisks: ensureMinItems(
      rawProfile?.developmentRisks,
      4,
      (index) => `Risco de desenvolvimento ${index + 1}.`
    ),
    managerGuidance: ensureMinItems(rawProfile?.managerGuidance, 5, (index) => `Guia de lider para o perfil ${index + 1}.`),
    selfLeadershipGuidance: ensureMinItems(rawProfile?.selfLeadershipGuidance, 5, (index) => `Guia de autolideranca ${index + 1}.`),
    plan30: ensureMinItems(rawProfile?.plan30, 4, (index) => `Plano 30 dias - acao ${index + 1}.`),
    plan60: ensureMinItems(rawProfile?.plan60, 4, (index) => `Plano 60 dias - acao ${index + 1}.`),
    plan90: ensureMinItems(rawProfile?.plan90, 4, (index) => `Plano 90 dias - acao ${index + 1}.`),
    executiveClosing: ensureMinParagraphs(
      executiveClosingSource,
      3,
      (index) => `Fechamento executivo ${index + 1} para o perfil ${profileKey}.`
    ),
    closingSummary: safeText(
      safeArray(executiveClosingSource, [])[0],
      `O perfil ${profileKey} amplia resultado quando combina forcas naturais com disciplina de desenvolvimento.`
    ),
  };
}

function buildExecutiveInsight(profile, pageKey, scores, profileContent, adaptation) {
  const primaryScore = clamp(scores?.natural?.[profile.primary]);
  const secondaryScore = clamp(scores?.natural?.[profile.secondary]);
  const summary = safeText(profileContent?.summary, `Perfil ${profile.key} com alta aplicacao em contexto corporativo.`);
  const adaptationLabel = safeText(adaptation?.label, 'moderado');
  const delta = Number(adaptation?.avgAbsDelta || 0).toFixed(2);

  const byPage = {
    dynamics: `Na dinamica geral, ${profile.key} tende a iniciar acao por ${profile.primary} (${primaryScore}%) e ajustar colaboracao por ${profile.secondary} (${secondaryScore}%).`,
    decision: `No processo decisorio, ${profile.key} opera melhor com criterio curto, dono definido e revisao de risco proporcional ao impacto.`,
    communication: `Em comunicacao, ${profile.key} ganha eficiencia quando canal, nivel de detalhe e tom sao alinhados ao contexto e ao interlocutor.`,
    leadership: `Em lideranca, ${profile.key} gera melhor resposta quando combina direcao objetiva, proximidade de follow-up e consistencia de cobranca.`,
    stress: `Sob pressao, ${profile.key} pode amplificar o fator ${profile.primary}; rituais de recalibragem preservam qualidade relacional e decisoria.`,
    environment: `No ambiente ideal, ${profile.key} sustenta desempenho em estruturas com prioridade clara, autonomia e responsabilidade compartilhada.`,
    career: `Na carreira, ${profile.key} avanca quando atua em funcoes aderentes ao seu estilo natural e acompanha evolucao com indicadores objetivos.`,
  };

  return `${summary} ${byPage[pageKey] || byPage.dynamics} O custo de adaptacao atual e ${adaptationLabel}, com delta medio de ${delta} pontos.`;
}

function buildPracticalApplication(profile, pageKey, profileContent) {
  const contextMap = {
    dynamics: `Conecte os blocos de identidade do perfil ${profile.key} aos rituais semanais de alinhamento para reduzir ruido de execucao.`,
    decision: `Aplique um checklist de decisao com tres itens: objetivo, risco principal e criterio de fechamento para o perfil ${profile.key}.`,
    communication: `Ajuste mensagem ao estilo de comunicacao dominante de ${profile.key}, mantendo acordos explicitos de proximo passo.`,
    leadership: `Use cadencia quinzenal de feedback para calibrar forcas e riscos de lideranca do perfil ${profile.key}.`,
    stress: `Monitore sinais de estresse do perfil ${profile.key} e execute plano de recuperacao antes de ocorrer escalada de conflito.`,
    environment: `Estruture ambiente com fronteira de autonomia, qualidade minima e responsabilidade compartilhada para ${profile.key}.`,
    career: `Transforme recomendacoes de carreira do perfil ${profile.key} em trilha com marcos trimestrais e evidencias observaveis.`,
  };

  const firstStrength = safeArray(profileContent?.workStrengths, ['forca de entrega'])[0];
  return contextMap[pageKey] || `Converta a leitura de ${profile.key} em rotina objetiva, usando ${firstStrength} como alavanca principal de desenvolvimento.`;
}

function buildManagerLens(profile, profileContent) {
  const managerGuidance = safeArray(profileContent?.managerGuidance, []);
  if (managerGuidance.length) {
    return `Leitura do gestor: ${managerGuidance[0]}`;
  }
  return `Leitura do gestor: para ${profile.key}, cobre resultado com criterio explicito, feedback curto e checkpoints de progresso.`;
}

function buildRiskOfExcess(profile, profileContent) {
  const risks = safeArray(profileContent?.developmentRisks || profileContent?.workRisks, []);
  if (risks.length) {
    return `Risco de exagero do perfil ${profile.key}: ${risks[0]}`;
  }
  return `Risco de exagero do perfil ${profile.key}: quando o fator ${profile.primary} domina sem calibragem, pode haver perda de equilibrio relacional e queda de consistencia operacional.`;
}

function buildDevelopmentLens(profile, profileContent) {
  const points = safeArray(profileContent?.developmentPoints, []);
  if (points.length) {
    return `Observacao de desenvolvimento: priorize ${points[0].toLowerCase()} com pratica recorrente nas proximas 4 semanas.`;
  }
  return `Observacao de desenvolvimento: o perfil ${profile.key} evolui mais rapido quando traduz insight em rotina semanal com feedback observavel.`;
}

function buildBehavioralRisk(profile, profileContent) {
  return buildRiskOfExcess(profile, profileContent);
}

function buildManagerCallout(profile, profileContent) {
  return buildManagerLens(profile, profileContent);
}

function buildCareerCallout(profile, profileContent) {
  return buildPracticalApplication(profile, 'career', profileContent);
}

function buildFactorAnalysis(scores, sharedFactors, rules) {
  const byFactor = {};

  for (const factor of FACTORS) {
    const score = clamp(scores.natural[factor]);
    const band = resolveFactorBand(score, rules.factorBands);
    const shared = sharedFactors?.[factor]?.[band] || {};

    byFactor[factor] = {
      factor,
      label: FACTOR_LABELS[factor],
      score,
      band,
      headline: safeText(shared?.headline, `${FACTOR_LABELS[factor]} em banda ${band}.`),
      paragraphs: ensureMinParagraphs(
        shared?.paragraphs,
        2,
        (index) => `Leitura complementar ${index + 1} para ${FACTOR_LABELS[factor]}.`
      ),
      actions: ensureMinBullets(
        shared?.actions,
        5,
        (index) => `Acao pratica ${index + 1} para ${FACTOR_LABELS[factor]}.`
      ),
      redFlags: ensureMinBullets(
        shared?.redFlags,
        5,
        (index) => `Sinal de alerta ${index + 1} para ${FACTOR_LABELS[factor]}.`
      ),
    };
  }

  return byFactor;
}

function buildBenchmarkRows(scores, profile) {
  return FACTORS.map((factor) => {
    const score = clamp(scores.natural[factor]);
    const isPrimary = factor === profile.primary;
    const isSecondary = factor === profile.secondary;

    const min = isPrimary ? 62 : isSecondary ? 45 : 20;
    const max = isPrimary ? 100 : isSecondary ? 85 : 70;

    const reading =
      score < min
        ? `Abaixo da faixa tipica para ${profile.key}; recomenda-se reforco comportamental direcionado.`
        : score > max
          ? `Acima da faixa tipica para ${profile.key}; alta intensidade com risco de exagero em contexto de pressao.`
          : `Dentro da faixa tipica para ${profile.key}; expressao coerente com a dinamica esperada.`;

    return {
      factor,
      label: FACTOR_LABELS[factor],
      score,
      typicalRange: `${min}-${max}`,
      reading,
    };
  });
}

function resolveResponsible(input = {}, participant = {}) {
  const meta = input?.meta || {};
  const assessment = input?.assessment || {};
  const participantName = safeText(participant?.name);

  return {
    name: firstNonEmpty([
      meta?.responsibleName,
      input?.currentUser?.name,
      assessment?.creator?.name,
      assessment?.organization?.owner?.name,
      participantName ? `Especialista responsavel por ${participantName}` : '',
      'Especialista InsightDISC',
    ]),
    role: firstNonEmpty([
      meta?.responsibleRole,
      input?.currentUser?.role,
      'Especialista em Analise Comportamental',
    ]),
  };
}

function resolveGeneratedAt(input = {}) {
  const meta = input?.meta || {};
  const assessment = input?.assessment || {};

  return firstNonEmpty([
    meta?.generatedAt,
    assessment?.completedAt,
    assessment?.completed_at,
    assessment?.createdAt,
    new Date().toISOString(),
  ]);
}

function toIsoDateString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function composeNarratives({ profile, profileContent, adaptation, scores, shared }) {
  const methodology = shared?.methodology || {};
  const communication = shared?.communication || {};
  const leadership = shared?.leadership || {};
  const stress = shared?.stress || {};
  const environment = shared?.environment || {};
  const career = shared?.career || {};
  const conflicts = shared?.conflicts || {};
  const development = shared?.development || {};

  const summaryParagraphs = ensureMinParagraphs(
    [
      safeText(profileContent?.summary),
      `O perfil ${profile.key} combina ${profile.primary} e ${profile.secondary} com foco em aplicacao pratica de resultado.`,
      `A leitura indica maior expressao de ${profile.primary} (${scores.natural[profile.primary]}%) e apoio de ${profile.secondary} (${scores.natural[profile.secondary]}%).`,
      adaptation.interpretation,
    ],
    4,
    (index) => `Resumo complementar ${index + 1} para ampliar clareza executiva sobre o perfil ${profile.key}.`
  );

  return {
    methodologyOverview: ensureMinParagraphs(
      methodology?.overview,
      3,
      (index) => `Metodologia complementar ${index + 1} para leitura responsavel do DISC.`
    ),
    methodologyHowToUse: ensureMinBullets(
      methodology?.howToUse,
      5,
      (index) => `Pratica recomendada ${index + 1} para extrair valor do relatorio.`
    ),
    methodologyResponsibleReading: ensureMinBullets(
      methodology?.responsibleReading,
      5,
      (index) => `Regra de leitura responsavel ${index + 1}.`
    ),
    summaryParagraphs,
    identityDynamics: ensureMinParagraphs(
      profileContent?.identityDynamics || profileContent?.deepDynamics,
      5,
      (index) => `Dinamica identitaria complementar ${index + 1}.`
    ),
    decisionParagraphs: ensureMinParagraphs(profileContent.decisionStyle, 4, (index) => `Diretriz decisoria ${index + 1}.`),
    communicationStyle: ensureMinParagraphs(
      profileContent?.communicationStyle,
      4,
      (index) => `Leitura de estilo de comunicacao ${index + 1}.`
    ),
    communicationNeeds: ensureMinBullets(
      profileContent?.communicationNeeds,
      4,
      (index) => `Necessidade de comunicacao ${index + 1}.`
    ),
    communicationPrinciples: ensureMinBullets(communication?.principles, 5, (index) => `Principio de comunicacao ${index + 1}.`),
    communicationManagerNotes: ensureMinBullets(communication?.managerNotes, 5, (index) => `Nota para gestao ${index + 1}.`),
    leadershipPrinciples: ensureMinBullets(leadership?.principles, 5, (index) => `Principio de lideranca ${index + 1}.`),
    leadershipStrengths: ensureMinBullets(
      profileContent?.leadershipStrengths,
      5,
      (index) => `Forca de lideranca ${index + 1}.`
    ),
    leadershipPitfalls: ensureMinBullets(leadership?.pitfalls, 5, (index) => `Armadilha de lideranca ${index + 1}.`),
    stressSignals: ensureMinBullets(profileContent?.stressSignals, 5, (index) => `Sinal de estresse ${index + 1}.`),
    stressSignalsShared: ensureMinBullets(stress?.signals, 5, (index) => `Sinal de estresse compartilhado ${index + 1}.`),
    stressRecovery: ensureMinBullets(stress?.recovery, 5, (index) => `Acao de recuperacao ${index + 1}.`),
    environmentEnergizers: ensureMinBullets(environment?.energizers, 5, (index) => `Energizador ${index + 1}.`),
    environmentDrainers: ensureMinBullets(profileContent?.lowFitEnvironment, 4, (index) => `Drenador de ambiente ${index + 1}.`),
    environmentDrainersShared: ensureMinBullets(environment?.drainers, 5, (index) => `Drenador ${index + 1}.`),
    careerFramework: ensureMinBullets(career?.framework, 5, (index) => `Diretriz de carreira ${index + 1}.`),
    conflictPrinciples: ensureMinBullets(conflicts?.principles, 5, (index) => `Diretriz de conflito ${index + 1}.`),
    developmentHabits: ensureMinBullets(development?.habits, 5, (index) => `Habito de desenvolvimento ${index + 1}.`),
    developmentQuestions: ensureMinBullets(development?.coachingQuestions, 5, (index) => `Pergunta de coaching ${index + 1}.`),
    developmentRisks: ensureMinBullets(
      profileContent?.developmentRisks,
      4,
      (index) => `Risco de desenvolvimento ${index + 1}.`
    ),
    executiveClosing: ensureMinParagraphs(
      profileContent?.executiveClosing,
      3,
      (index) => `Fechamento executivo complementar ${index + 1}.`
    ),
  };
}

function resolveScoreInput(input = {}) {
  const scores = input?.scores || {};
  const assessment = input?.assessment || {};

  const natural = normalizeScores(
    scores?.natural,
    scores?.summary,
    assessment?.results?.natural_profile,
    assessment?.disc_results?.natural,
    assessment?.disc_results?.normalized,
    assessment?.natural_profile,
    assessment?.scores
  );

  const adapted = normalizeScores(
    scores?.adapted,
    assessment?.results?.adapted_profile,
    assessment?.disc_results?.adapted,
    assessment?.adapted_profile,
    natural
  );

  const summary = FACTORS.reduce((accumulator, factor) => {
    accumulator[factor] = clamp((natural[factor] + adapted[factor]) / 2);
    return accumulator;
  }, {});

  const deltas = FACTORS.reduce((accumulator, factor) => {
    accumulator[factor] = clamp(adapted[factor] - natural[factor], -100, 100);
    return accumulator;
  }, {});

  return { natural, adapted, summary, deltas };
}

function resolveProfile(profiles = {}, selected = {}) {
  const preferred = profiles?.[selected.key];
  const primaryFallback = profiles?.[selected.primary];

  if (preferred) {
    return normalizeProfileContent(preferred, selected.key);
  }

  if (primaryFallback) {
    return normalizeProfileContent(primaryFallback, selected.primary);
  }

  return normalizeProfileContent({}, selected.key || selected.primary || 'DI');
}

function resolvePagesStructure(sharedPages = {}) {
  const structure = safeArray(sharedPages?.structure, []);
  if (structure.length === 30) return structure;

  return [
    'Capa',
    'Apresentacao executiva',
    'O que e DISC',
    'Visao geral dos fatores',
    'Sintese executiva',
    'Graficos DISC',
    'Radar comportamental',
    'Benchmark',
    'Dinamica geral do perfil',
    'Processo de decisao',
    'Motivadores',
    'Drenadores de energia',
    'Comportamento no ambiente de trabalho',
    'Comunicacao',
    'Estilo de lideranca',
    'Tomada de decisao e autonomia',
    'Resposta ao estresse',
    'Conflitos',
    'Relacionamento com equipe',
    'Sinergia com outros perfis',
    'Ambiente ideal',
    'Aderencia a funcoes e carreira',
    'Forcas naturais',
    'Pontos de desenvolvimento',
    'Recomendacoes de desenvolvimento',
    'Como liderar este perfil',
    'Como este perfil deve liderar',
    'Plano de desenvolvimento comportamental',
    'Glossário e leitura técnica',
    'Conclusao do perfil comportamental',
  ];
}

function resolveStandardPagesStructure() {
  return [
    'Capa',
    'O que e DISC',
    'Graficos DISC',
    'Natural vs Adaptado',
    'Radar comportamental',
    'Sintese executiva',
    'Comunicacao',
    'Processo de decisao',
    'Ambiente ideal',
    'Forcas naturais',
    'Pontos de atencao',
    'Recomendacoes praticas',
    'Relacao no ambiente de trabalho',
    'Sugestoes de desenvolvimento',
    'Conclusao final',
  ];
}

function resolveReportType(input = {}) {
  const value = safeText(input?.reportType, safeText(input?.meta?.reportType, 'standard')).toLowerCase();
  return value === 'premium' ? 'premium' : 'standard';
}

export async function buildReportModel(input = {}) {
  const strict = Boolean(input?.strict || input?.options?.strict);
  const reportType = resolveReportType(input);
  const content = await ensureContentLoaded();

  const participant = resolveParticipant(input, strict);
  const branding = resolveBranding(input, strict);
  const scores = resolveScoreInput(input);

  const rules = content?.shared?.rules || {
    factorBands: {
      low: { min: 0, max: 33 },
      mid: { min: 34, max: 66 },
      high: { min: 67, max: 100 },
    },
    adaptationBand: {
      low: { maxExclusive: 8, label: 'baixo' },
      mid: { minInclusive: 8, maxInclusive: 15, label: 'moderado' },
      high: { minExclusive: 15, label: 'alto' },
    },
    top2Selection: {
      pureThreshold: 18,
      tieBehavior: 'pure',
    },
  };

  const ranked = rankFactors(scores.natural);
  const selectedProfile = selectProfileKey(ranked, rules, scores.natural);
  const profileContent = resolveProfile(content.profiles, selectedProfile);

  const profile = {
    primary: selectedProfile.primary,
    secondary: selectedProfile.secondary,
    displayPrimary: selectedProfile.displayPrimary,
    displaySecondary: selectedProfile.displaySecondary,
    key:
      selectedProfile.mode === 'balanced'
        ? 'DISC'
        : PROFILE_KEYS.includes(selectedProfile.key)
          ? selectedProfile.key
          : selectedProfile.primary,
    mode: selectedProfile.mode,
    topDiff: selectedProfile.topDiff,
    spread: selectedProfile.spread,
    label:
      selectedProfile.mode === 'balanced'
        ? 'Distribuicao equilibrada entre os quatro fatores DISC'
        : selectedProfile.mode === 'pure'
        ? `Predominancia de ${FACTOR_LABELS[selectedProfile.primary]}`
        : `${FACTOR_LABELS[selectedProfile.primary]} com apoio de ${FACTOR_LABELS[selectedProfile.secondary]}`,
    archetype:
      selectedProfile.mode === 'balanced'
        ? 'Adaptativo Estrategico'
        : profileContent.archetype,
    title:
      selectedProfile.mode === 'balanced'
        ? 'Perfil Balanceado (DISC)'
        : profileContent.title,
  };

  const adaptation = computeAdaptation(scores.natural, scores.adapted, rules.adaptationBand);
  const factorAnalysis = buildFactorAnalysis(scores, content?.shared?.factors || {}, rules);
  const benchmarkRows = buildBenchmarkRows(scores, profile);
  const responsible = resolveResponsible(input, participant);
  const generatedAt = toIsoDateString(resolveGeneratedAt(input));

  const narratives = composeNarratives({
    profile,
    profileContent,
    adaptation,
    scores,
    shared: content.shared,
  });

  const benchmarkMeta = content?.shared?.benchmark || {};
  const glossary = content?.shared?.glossary || {};

  const executiveInsight = buildExecutiveInsight(profile, 'dynamics', scores, profileContent, adaptation);

  const plans = {
    days30: ensureMinBullets(profileContent.plan30, 4, (index) => `Acao de 30 dias ${index + 1}.`),
    days60: ensureMinBullets(profileContent.plan60, 4, (index) => `Acao de 60 dias ${index + 1}.`),
    days90: ensureMinBullets(profileContent.plan90, 4, (index) => `Acao de 90 dias ${index + 1}.`),
  };

  const pagesMeta = content?.shared?.pages || {};
  const pageTitles =
    reportType === 'premium'
      ? resolvePagesStructure(pagesMeta)
      : resolveStandardPagesStructure();
  const enrichmentBlocks = pagesMeta?.enrichmentBlocks || {};
  const totalPages = reportType === 'premium' ? 30 : 15;

  return {
    meta: {
      reportTitle: safeText(input?.meta?.reportTitle, 'Relatório de Análise Comportamental DISC'),
      reportSubtitle: safeText(
        input?.meta?.reportSubtitle,
        'Diagnóstico comportamental completo com benchmark, comunicação, liderança, riscos, carreira e plano de desenvolvimento'
      ),
      generatedAt,
      reportId: safeText(
        input?.meta?.reportId,
        participant.assessmentId
      ),
      version: safeText(input?.meta?.version, '5.0'),
      totalPages,
      reportType,
      workspaceId: safeText(
        input?.meta?.workspaceId || input?.workspaceId || input?.assessment?.organizationId,
        ''
      ),
      responsibleName: responsible.name,
      responsibleRole: responsible.role,
      pageTitles,
      brand: branding.company_name,
    },
    branding,
    participant,
    profile,
    scores,
    adaptation,
    factors: factorAnalysis,
    benchmark: {
      rows: benchmarkRows,
      legend: safeText(
        benchmarkMeta?.legend,
        'Faixas de referencia internas para leitura comparativa de perfil. Uso recomendado para desenvolvimento.'
      ),
      interpretation: ensureMinBullets(
        benchmarkMeta?.interpretation,
        3,
        (index) => `Interpretacao complementar de benchmark ${index + 1}.`
      ),
    },
    profileContent,
    narratives,
    enrichment: {
      insight: safeText(enrichmentBlocks?.insight, 'Insight comportamental'),
      application: safeText(enrichmentBlocks?.application, 'Aplicacao pratica'),
      managerLens: safeText(enrichmentBlocks?.managerLens, 'Leitura do gestor'),
      riskLens: safeText(enrichmentBlocks?.riskLens, 'Risco de exagero do perfil'),
      developmentLens: safeText(enrichmentBlocks?.developmentLens, 'Observacao de desenvolvimento'),
    },
    insights: {
      executive: executiveInsight,
      practicalByPage: {
        dynamics: buildPracticalApplication(profile, 'dynamics', profileContent),
        decision: buildPracticalApplication(profile, 'decision', profileContent),
        communication: buildPracticalApplication(profile, 'communication', profileContent),
        leadership: buildPracticalApplication(profile, 'leadership', profileContent),
        stress: buildPracticalApplication(profile, 'stress', profileContent),
        environment: buildPracticalApplication(profile, 'environment', profileContent),
        career: buildPracticalApplication(profile, 'career', profileContent),
      },
      executiveByPage: {
        dynamics: buildExecutiveInsight(profile, 'dynamics', scores, profileContent, adaptation),
        decision: buildExecutiveInsight(profile, 'decision', scores, profileContent, adaptation),
        communication: buildExecutiveInsight(profile, 'communication', scores, profileContent, adaptation),
        leadership: buildExecutiveInsight(profile, 'leadership', scores, profileContent, adaptation),
        stress: buildExecutiveInsight(profile, 'stress', scores, profileContent, adaptation),
        environment: buildExecutiveInsight(profile, 'environment', scores, profileContent, adaptation),
        career: buildExecutiveInsight(profile, 'career', scores, profileContent, adaptation),
      },
      behavioralRisk: buildBehavioralRisk(profile, profileContent),
      managerCallout: buildManagerCallout(profile, profileContent),
      managerLens: buildManagerLens(profile, profileContent),
      riskOfExcess: buildRiskOfExcess(profile, profileContent),
      developmentLens: buildDevelopmentLens(profile, profileContent),
      careerCallout: buildCareerCallout(profile, profileContent),
    },
    plans,
    glossary: {
      items: safeArray(glossary?.items, [
        { term: 'Perfil Natural', definition: 'Tendencia espontanea de comportamento.' },
        { term: 'Perfil Adaptado', definition: 'Ajustes ativados pelas demandas do contexto.' },
        { term: 'Benchmark', definition: 'Comparativo do score com faixa de referencia interna.' },
      ]),
    },
    lgpd: {
      notice: safeText(
        input?.lgpd?.notice,
        'Este documento contem dados pessoais e deve ser utilizado exclusivamente para desenvolvimento comportamental, em conformidade com a LGPD e com o consentimento informado.'
      ),
      contact: safeText(input?.lgpd?.contact, 'suporte@insightdisc.app'),
    },
    quality: {
      noAi: true,
      deterministic: true,
      densityTarget: Number(content?.shared?.rules?.density?.minParagraphsPerPage || 2),
      bulletTarget: Number(content?.shared?.rules?.density?.minBulletsPerSection || 5),
    },
  };
}

export async function buildPremiumReportModel(input = {}) {
  return buildReportModel(input);
}

export default buildReportModel;
