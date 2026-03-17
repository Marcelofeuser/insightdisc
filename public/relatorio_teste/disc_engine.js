import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MASTER_TEMPLATE = 'relatorio_disc_pdf.html';
const DEFAULT_OUTPUTS = {
  business: 'relatorio_disc_business.html',
  professional: 'relatorio_disc_professional.html',
  personal: 'relatorio_disc_personal.html',
};

const MODE_SLIDES_TO_REMOVE = {
  business: [],
  professional: ['s9', 's16', 's17', 's18', 's22', 's23'],
  personal: ['sg-bars', 'sg-map', 's7', 's9', 's13', 's16', 's17', 's18', 's19', 's22', 's23', 's24'],
};

const DEFAULT_INPUT = {
  nome: 'João Silva',
  cargo: 'Gerente Comercial',
  empresa: 'Empresa XYZ',
  data: '15/03/2026',
  scores: {
    D: 34,
    I: 32,
    S: 23,
    C: 11,
  },
};

const FACTOR_META = {
  D: {
    name: 'Dominância',
  },
  I: {
    name: 'Influência',
  },
  S: {
    name: 'Estabilidade',
  },
  C: {
    name: 'Conformidade',
  },
};

const PROFILE_NAMES = {
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
};

const AI_TEXT_LIMITS = {
  summary: 240,
  executiveSummary: 220,
  profileOverview: 240,
  profileInterpretation: 300,
  communicationStyle: 250,
  decisionStyle: 190,
  leadershipStyle: 220,
  workStyle: 220,
  pressureBehavior: 180,
  relationshipStyle: 110,
  negotiation: 210,
  sales: 210,
  learning: 210,
  finalQuote: 170,
  finalCard: 190,
  listItem: 96,
  tableCell: 96,
  recommendation: 120,
  career: 90,
};

const BUSINESS_FALLBACKS = {
  strengthBullets: [
    'Iniciativa e tomada de decisão ágil',
    'Capacidade natural de liderança',
    'Persuasão e influência social elevadas',
    'Foco consistente em resultados e metas',
  ],
  opportunityBullets: [
    'Maior atenção aos detalhes e processos',
    'Equilíbrio entre velocidade e análise criteriosa',
    'Escuta ativa em decisões estratégicas',
    'Paciência em contextos de alta exigência',
  ],
  strengthRows: [
    { title: 'Liderança assertiva', text: 'Decide com rapidez e assume responsabilidades' },
    { title: 'Persuasão', text: 'Influencia equipes e stakeholders com facilidade' },
    { title: 'Visão estratégica', text: 'Enxerga oportunidades antes dos demais' },
    { title: 'Alta energia', text: 'Mantém ritmo acelerado e inspira os pares' },
    { title: 'Resolução de conflitos', text: 'Enfrenta problemas de forma direta e objetiva' },
  ],
  limitationRows: [
    { title: 'Impaciência', text: 'Dificuldade com processos lentos ou detalhistas' },
    { title: 'Escuta ativa', text: 'Pode interromper ou desconsiderar opiniões' },
    { title: 'Controle emocional', text: 'Tensão visível sob pressão prolongada' },
    { title: 'Delegação', text: 'Tendência a centralizar decisões importantes' },
    { title: 'Atenção a normas', text: 'Pode desafiar regras sem avaliar consequências' },
  ],
  perceptionCards: [
    { title: 'Pelos pares', text: 'Competente, corajoso e inspirador — mas às vezes intimidador' },
    { title: 'Pelos liderados', text: 'Exigente, motivador e visionário — porém pouco paciente' },
    { title: 'Pelos superiores', text: 'Confiável para resultados, precisa de alinhamento estratégico' },
  ],
  careerCards: [
    { icon: '👔', title: 'Liderança executiva', text: 'CEO, Diretor Comercial, VP de Operações' },
    { icon: '💰', title: 'Vendas de alto impacto', text: 'Key Account, Hunting, Business Development' },
    { icon: '🚀', title: 'Empreendedorismo', text: 'Fundador, sócio-executivo, líder de startup' },
    { icon: '🔄', title: 'Gestão de mudança', text: 'Transformação organizacional, turnaround' },
  ],
  developmentRows: [
    { title: 'Escuta ativa', text: 'Praticar técnicas de escuta empática em reuniões' },
    { title: 'Gestão emocional', text: 'Mindfulness e coaching executivo contínuo' },
    { title: 'Processos', text: 'Respeitar etapas e envolver o time nas decisões' },
    { title: 'Delegação', text: 'Treinar líderes intermediários com autonomia real' },
    { title: 'Conformidade', text: 'Aumentar atenção a normas regulatórias e jurídicas' },
  ],
  recommendations: [
    {
      title: 'Potencialize a Liderança',
      text: 'Invista em liderança situacional — saiba quando ser diretivo e quando ser colaborativo. Adaptar o estilo ao contexto multiplica o impacto.',
    },
    {
      title: 'Desenvolva a Inteligência Emocional',
      text: 'Autocontrole sob pressão é o maior diferencial do líder D/I. Invista em coaching, mindfulness e feedback 360° contínuo.',
    },
    {
      title: 'Monte Equipes Complementares',
      text: 'Cerque-se de perfis S e C para compensar pontos cegos. Diversidade comportamental é vantagem competitiva real.',
    },
    {
      title: 'Construa Resultados Sustentáveis',
      text: 'Alta performance exige consistência. Equilibre velocidade com processo, e ambição com bem-estar da equipe.',
    },
  ],
  finalSummary: {
    quote:
      'O perfil D/I é raro, poderoso e transformador — quando aliado à inteligência emocional, torna-se imbatível.',
    profile:
      '34% Dominância + 32% Influência = líder orientado a resultados com alto poder de engajamento humano. Perfil de alto impacto em liderança executiva e comercial.',
    strength:
      'Capacidade única de unir resultado e relacionamento. Decide rápido, inspira genuinamente e entrega com consistência quando canalizado corretamente.',
    development:
      'Cultivar paciência, escuta empática e inteligência emocional para transformar potencial em legado sustentável de liderança.',
  },
};

function parseArgs(rawArgs = []) {
  return Object.fromEntries(
    rawArgs
      .filter((entry) => entry.startsWith('--'))
      .map((entry) => {
        const normalized = entry.slice(2);
        const separatorIndex = normalized.indexOf('=');
        if (separatorIndex === -1) {
          return [normalized, 'true'];
        }

        return [
          normalized.slice(0, separatorIndex),
          normalized.slice(separatorIndex + 1),
        ];
      }),
  );
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseBooleanFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(value = '') {
  return String(value || '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function stripHtml(value = '') {
  return normalizeWhitespace(String(value || '').replaceAll(/<[^>]*>/g, ' '));
}

function uniqueItems(items = []) {
  return [...new Set(items.map((item) => normalizeWhitespace(item)).filter(Boolean))];
}

function truncateText(value = '', maximumLength = 220) {
  const cleanValue = stripHtml(value);
  if (!cleanValue) return '';
  if (cleanValue.length <= maximumLength) return cleanValue;

  const shortened = cleanValue.slice(0, maximumLength + 1);
  const punctuationIndex = Math.max(
    shortened.lastIndexOf('. '),
    shortened.lastIndexOf('; '),
    shortened.lastIndexOf(': '),
  );
  const wordBoundaryIndex = shortened.lastIndexOf(' ');
  const cutIndex =
    punctuationIndex >= Math.floor(maximumLength * 0.55)
      ? punctuationIndex + 1
      : wordBoundaryIndex >= Math.floor(maximumLength * 0.55)
        ? wordBoundaryIndex
        : maximumLength;

  return `${shortened.slice(0, cutIndex).trim().replace(/[.,;:!?-]+$/, '')}…`;
}

function splitSentences(value = '', maximumLength = 110) {
  return stripHtml(value)
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => truncateText(sentence, maximumLength))
    .filter(Boolean) || [];
}

function firstNonEmptyText(values = [], maximumLength = 220) {
  for (const value of values) {
    const text = truncateText(value, maximumLength);
    if (text) {
      return text;
    }
  }

  return '';
}

function toSentenceFragment(value = '', maximumLength = 180) {
  return truncateText(value, maximumLength).replace(/[.!?]+$/, '');
}

function buildPrefixedText(prefix, sourceText, maximumLength) {
  const fragment = toSentenceFragment(sourceText, Math.max(40, maximumLength - prefix.length - 4));
  if (!fragment) return '';

  const normalizedFragment = fragment.charAt(0).toLowerCase() + fragment.slice(1);
  return truncateText(`${prefix} ${normalizedFragment}.`, maximumLength);
}

function normalizeScores(input = {}) {
  const raw = {
    D: Math.max(0, toNumber(input.D, DEFAULT_INPUT.scores.D)),
    I: Math.max(0, toNumber(input.I, DEFAULT_INPUT.scores.I)),
    S: Math.max(0, toNumber(input.S, DEFAULT_INPUT.scores.S)),
    C: Math.max(0, toNumber(input.C, DEFAULT_INPUT.scores.C)),
  };

  const total = raw.D + raw.I + raw.S + raw.C;
  if (!Number.isFinite(total) || total <= 0) {
    return { ...DEFAULT_INPUT.scores };
  }

  const normalized = {
    D: Math.round((raw.D / total) * 100),
    I: Math.round((raw.I / total) * 100),
    S: Math.round((raw.S / total) * 100),
    C: 0,
  };
  normalized.C = Math.max(0, 100 - normalized.D - normalized.I - normalized.S);

  return normalized;
}

function computeProfile(scores) {
  const sorted = Object.entries(scores)
    .map(([factor, score]) => ({ factor, score }))
    .sort((left, right) => right.score - left.score);

  const primary = sorted[0]?.factor || 'D';
  const secondary = sorted[1]?.factor || 'I';
  const compactCode = `${primary}${secondary}`;

  return {
    primary,
    secondary,
    compactCode,
    slashCode: `${primary}/${secondary}`,
    name:
      PROFILE_NAMES[compactCode] ||
      `${FACTOR_META[primary].name} / ${FACTOR_META[secondary].name}`,
    sorted,
  };
}

function getRankLabels(profile) {
  const lower = {};
  const title = {};
  const labelsLower = ['Perfil primário', 'Perfil secundário', 'Terciário', 'Quaternário'];
  const labelsTitle = ['Perfil Primário', 'Perfil Secundário', 'Terciário', 'Quaternário'];

  profile.sorted.forEach((entry, index) => {
    lower[entry.factor] = labelsLower[index] || 'Quaternário';
    title[entry.factor] = labelsTitle[index] || 'Quaternário';
  });

  return { lower, title };
}

function safeReadJsonFile(filePath = '') {
  const normalizedPath = String(filePath || '').trim();
  if (!normalizedPath) return null;

  try {
    return JSON.parse(readFileSync(resolve(__dirname, normalizedPath), 'utf8'));
  } catch (error) {
    console.warn(`[disc-engine] falha ao ler payload AI: ${error?.message || error}`);
    return null;
  }
}

function normalizeAiList(value, maxItems = 6, maxItemLength = AI_TEXT_LIMITS.listItem) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueItems(
    value
      .map((item) => truncateText(item, maxItemLength))
      .filter(Boolean),
  ).slice(0, maxItems);
}

function normalizeAiPayloadObject(input = {}) {
  const candidate = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const normalized = {};

  const textFields = {
    summary: 1200,
    executiveSummary: 1200,
    communicationStyle: 700,
    leadershipStyle: 700,
    workStyle: 700,
    pressureBehavior: 700,
    relationshipStyle: 700,
    professionalPositioning: 700,
  };

  Object.entries(textFields).forEach(([field, maximumLength]) => {
    const value = truncateText(candidate[field], maximumLength);
    if (value) {
      normalized[field] = value;
    }
  });

  ['strengths', 'limitations', 'developmentRecommendations', 'careerRecommendations', 'businessRecommendations'].forEach(
    (field) => {
      const items = normalizeAiList(candidate[field], 8, 280);
      if (items.length > 0) {
        normalized[field] = items;
      }
    },
  );

  if (typeof candidate.tone === 'string' && candidate.tone.trim()) {
    normalized.tone = candidate.tone.trim().toLowerCase();
  }

  return normalized;
}

function normalizeAiPayloadFile(payload = null) {
  const container = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const wrapped = Object.hasOwn(container, 'content') || Object.hasOwn(container, 'rawContent');
  const content = normalizeAiPayloadObject(wrapped ? container.content : container);
  const rawContent = normalizeAiPayloadObject(wrapped ? container.rawContent : container);

  return {
    content,
    rawContent,
  };
}

function readAiPayload(args = {}) {
  const aiRequested = parseBooleanFlag(args.useAi) || Boolean(String(args.aiInput || '').trim());
  if (!aiRequested) {
    return {
      requested: false,
      enabled: false,
      content: {},
      rawContent: {},
    };
  }

  const payload = normalizeAiPayloadFile(safeReadJsonFile(args.aiInput));
  const enabled = Object.entries(payload.rawContent).some(([field, value]) => {
    if (field === 'tone') return false;
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });

  if (!enabled) {
    console.warn('[disc-engine] payload AI presente, mas sem campos textuais utilizáveis; mantendo template padrão');
  }

  return {
    requested: true,
    enabled,
    content: payload.content,
    rawContent: payload.rawContent,
  };
}

function buildContext(args) {
  const mode = normalizeMode(args.mode);
  const scores = normalizeScores({
    D: args.d ?? args.D,
    I: args.i ?? args.I,
    S: args.s ?? args.S,
    C: args.c ?? args.C,
  });
  const profile = computeProfile(scores);
  const ranks = getRankLabels(profile);

  return {
    mode,
    output: args.output || DEFAULT_OUTPUTS[mode],
    nome: escapeHtml(args.nome ?? DEFAULT_INPUT.nome),
    cargo: escapeHtml(args.cargo ?? DEFAULT_INPUT.cargo),
    empresa: escapeHtml(args.empresa ?? DEFAULT_INPUT.empresa),
    data: escapeHtml(args.data ?? DEFAULT_INPUT.data),
    scores,
    profile,
    ranks,
    ai: readAiPayload(args),
  };
}

function normalizeMode(value = 'business') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  return DEFAULT_OUTPUTS[normalized] ? normalized : 'business';
}

function readMasterTemplate() {
  const templatePath = resolve(__dirname, MASTER_TEMPLATE);
  const raw = readFileSync(templatePath, 'utf8');

  if (raw.includes('</body>') && raw.includes('</html>')) {
    return raw;
  }

  return `${raw}px;background:rgba(108,71,255,.35);"></div>\n</div>\n</body>\n</html>\n`;
}

function tokenizeScoreValues(html) {
  return html
    .replaceAll('34%', '__DISC_SCORE_D__')
    .replaceAll('32%', '__DISC_SCORE_I__')
    .replaceAll('23%', '__DISC_SCORE_S__')
    .replaceAll('11%', '__DISC_SCORE_C__');
}

function injectScoreValues(html, context) {
  return html
    .replaceAll('__DISC_SCORE_D__', `${context.scores.D}%`)
    .replaceAll('__DISC_SCORE_I__', `${context.scores.I}%`)
    .replaceAll('__DISC_SCORE_S__', `${context.scores.S}%`)
    .replaceAll('__DISC_SCORE_C__', `${context.scores.C}%`);
}

function applyBaseReplacements(html, context) {
  let result = tokenizeScoreValues(html);

  result = result
    .replaceAll('João Silva', context.nome)
    .replaceAll('Gerente Comercial', context.cargo)
    .replaceAll('Empresa XYZ', context.empresa)
    .replaceAll('15/03/2026', context.data);

  result = injectScoreValues(result, context);

  result = result
    .replaceAll('DI (Dominante Influente)', `${context.profile.compactCode} (${context.profile.name})`)
    .replaceAll('DOMINANTE INFLUENTE', context.profile.name.toLocaleUpperCase('pt-BR'))
    .replaceAll('Dominante Influente', context.profile.name)
    .replaceAll('D+I', `${context.profile.primary}+${context.profile.secondary}`)
    .replaceAll('D/I', context.profile.slashCode);

  return result;
}

function applyRankReplacements(html, context) {
  let result = html;

  for (const [factor, meta] of Object.entries(FACTOR_META)) {
    const lowerPattern = new RegExp(
      `(<div class="sc-name">${meta.name}<\\/div><div class="sc-rank">)([^<]*)(<\\/div>)`,
    );
    result = result.replace(lowerPattern, `$1${context.ranks.lower[factor]}$3`);

    const titlePattern = new RegExp(
      `(${meta.name} — ${context.scores[factor]}% · )(Perfil Primário|Perfil Secundário|Terciário|Quaternário)`,
    );
    result = result.replace(titlePattern, `$1${context.ranks.title[factor]}`);
  }

  return result;
}

function applyProfileHeadingReplacements(html, context) {
  let result = html;

  result = result
    .replace(
      'Perfil Primário — Dominância (D)',
      `Perfil Primário — ${FACTOR_META[context.profile.primary].name} (${context.profile.primary})`,
    )
    .replace(
      'Perfil Secundário — Influência (I)',
      `Perfil Secundário — ${FACTOR_META[context.profile.secondary].name} (${context.profile.secondary})`,
    )
    .replace(
      'Sinergia D + I',
      `Sinergia ${context.profile.primary} + ${context.profile.secondary}`,
    )
    .replace('Alta D', `Alta ${context.profile.primary}`)
    .replace('Alta I', `Alta ${context.profile.secondary}`);

  return result;
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

  throw new Error('Não foi possível encontrar o fechamento de um bloco de slide no template master.');
}

function extractSlides(html) {
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
      throw new Error('Slide sem atributo id encontrado no template master.');
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

function replaceClassParagraph(block, className, value) {
  const pattern = new RegExp(`(<p class="${escapeRegex(className)}"[^>]*>)([\\s\\S]*?)(<\\/p>)`);
  return block.replace(pattern, `$1${escapeHtml(value)}$3`);
}

function renderBulletList(items = []) {
  return `
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:7px;margin-top:2px;">
          ${items
            .map(
              (item) => `<li style="display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--t2);line-height:1.5;"><span style="width:6px;height:6px;border-radius:50%;background:var(--pur2);flex-shrink:0;margin-top:5px;display:block;"></span>${escapeHtml(item)}</li>`,
            )
            .join('')}
        </ul>
      `;
}

function renderTableBody(rows = []) {
  return `<tbody>${rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.text)}</td></tr>`,
    )
    .join('')}</tbody>`;
}

function renderPerceptionCard(title, text) {
  return `<div class="perc-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function renderNvaCard(icon, title, text) {
  return `<div class="nva-card"><div class="nva-icon">${escapeHtml(icon)}</div><h4 style="font-size:16px;margin-bottom:10px;">${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function renderCareerCard(card) {
  return `<div class="career-card"><div class="ibox n">${escapeHtml(card.icon)}</div><div><h4>${escapeHtml(card.title)}</h4><p>${escapeHtml(card.text)}</p></div></div>`;
}

function renderRecommendationItem(item) {
  return `<div class="rec-item"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>`;
}

function renderSintCard(title, text) {
  return `<div class="sint-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></div>`;
}

function mergeWithFallbackText(aiItems, fallbackItems, maxItems, maximumLength) {
  return uniqueItems([
    ...normalizeAiList(aiItems, maxItems, maximumLength),
    ...normalizeAiList(fallbackItems, maxItems, maximumLength),
  ]).slice(0, maxItems);
}

function buildPerceptionTexts(rawContent = {}) {
  return mergeWithFallbackText(
    [
      ...splitSentences(rawContent.relationshipStyle, AI_TEXT_LIMITS.relationshipStyle),
      ...splitSentences(rawContent.professionalPositioning, AI_TEXT_LIMITS.relationshipStyle),
    ],
    BUSINESS_FALLBACKS.perceptionCards.map((card) => card.text),
    3,
    AI_TEXT_LIMITS.relationshipStyle,
  );
}

function buildDecisionText(rawContent = {}) {
  return firstNonEmptyText(
    [
      buildPrefixedText(
        'Na tomada de decisão,',
        rawContent.professionalPositioning,
        AI_TEXT_LIMITS.decisionStyle,
      ),
      buildPrefixedText(
        'Na tomada de decisão,',
        rawContent.executiveSummary,
        AI_TEXT_LIMITS.decisionStyle,
      ),
      buildPrefixedText('Na tomada de decisão,', rawContent.summary, AI_TEXT_LIMITS.decisionStyle),
    ],
    AI_TEXT_LIMITS.decisionStyle,
  );
}

function buildNegotiationText(rawContent = {}) {
  return firstNonEmptyText(
    [
      buildPrefixedText(
        'Na negociação,',
        rawContent.businessRecommendations?.[0],
        AI_TEXT_LIMITS.negotiation,
      ),
      buildPrefixedText(
        'Na negociação,',
        rawContent.communicationStyle,
        AI_TEXT_LIMITS.negotiation,
      ),
      buildPrefixedText('Na negociação,', rawContent.summary, AI_TEXT_LIMITS.negotiation),
    ],
    AI_TEXT_LIMITS.negotiation,
  );
}

function buildSalesText(rawContent = {}) {
  return firstNonEmptyText(
    [
      buildPrefixedText(
        'Em vendas,',
        rawContent.businessRecommendations?.[1],
        AI_TEXT_LIMITS.sales,
      ),
      buildPrefixedText(
        'Em vendas,',
        rawContent.professionalPositioning,
        AI_TEXT_LIMITS.sales,
      ),
      buildPrefixedText('Em vendas,', rawContent.summary, AI_TEXT_LIMITS.sales),
    ],
    AI_TEXT_LIMITS.sales,
  );
}

function buildLearningText(rawContent = {}) {
  return firstNonEmptyText(
    [
      buildPrefixedText(
        'No aprendizado,',
        rawContent.developmentRecommendations?.[0],
        AI_TEXT_LIMITS.learning,
      ),
      buildPrefixedText('No aprendizado,', rawContent.workStyle, AI_TEXT_LIMITS.learning),
      buildPrefixedText('No aprendizado,', rawContent.summary, AI_TEXT_LIMITS.learning),
    ],
    AI_TEXT_LIMITS.learning,
  );
}

function buildRelationshipTip(rawContent = {}) {
  return firstNonEmptyText(
    [rawContent.businessRecommendations?.[0], rawContent.relationshipStyle],
    AI_TEXT_LIMITS.relationshipStyle * 2,
  );
}

function applyBusinessAiTextReplacements(html, context) {
  if (context.mode !== 'business') {
    return html;
  }

  const rawContent = context.ai?.rawContent || {};
  if (!context.ai?.enabled || Object.keys(rawContent).length === 0) {
    return html;
  }

  const summaryText = firstNonEmptyText([rawContent.summary], AI_TEXT_LIMITS.summary);
  const executiveSummaryText = firstNonEmptyText(
    [rawContent.executiveSummary, rawContent.summary],
    AI_TEXT_LIMITS.executiveSummary,
  );
  const overviewText = firstNonEmptyText(
    [rawContent.summary, rawContent.professionalPositioning],
    AI_TEXT_LIMITS.profileOverview,
  );
  const profileInterpretationText = firstNonEmptyText(
    [rawContent.professionalPositioning, rawContent.executiveSummary, rawContent.summary],
    AI_TEXT_LIMITS.profileInterpretation,
  );
  const communicationText = firstNonEmptyText(
    [rawContent.communicationStyle],
    AI_TEXT_LIMITS.communicationStyle,
  );
  const decisionText = buildDecisionText(rawContent);
  const leadershipText = firstNonEmptyText(
    [rawContent.leadershipStyle],
    AI_TEXT_LIMITS.leadershipStyle,
  );
  const teamworkText = firstNonEmptyText([rawContent.workStyle], AI_TEXT_LIMITS.workStyle);
  const pressureText = firstNonEmptyText(
    [rawContent.pressureBehavior],
    AI_TEXT_LIMITS.pressureBehavior,
  );
  const negotiationText = buildNegotiationText(rawContent);
  const salesText = buildSalesText(rawContent);
  const learningText = buildLearningText(rawContent);
  const perceptionTexts = buildPerceptionTexts(rawContent);
  const relationshipTip = buildRelationshipTip(rawContent);
  const strengthList = mergeWithFallbackText(
    rawContent.strengths,
    BUSINESS_FALLBACKS.strengthBullets,
    4,
    AI_TEXT_LIMITS.listItem,
  );
  const opportunityList = mergeWithFallbackText(
    [...(rawContent.limitations || []), ...(rawContent.developmentRecommendations || [])],
    BUSINESS_FALLBACKS.opportunityBullets,
    4,
    AI_TEXT_LIMITS.listItem,
  );
  const strengthRows = BUSINESS_FALLBACKS.strengthRows.map((row, index) => ({
    title: row.title,
    text: mergeWithFallbackText(
      rawContent.strengths,
      BUSINESS_FALLBACKS.strengthRows.map((entry) => entry.text),
      5,
      AI_TEXT_LIMITS.tableCell,
    )[index],
  }));
  const limitationRows = BUSINESS_FALLBACKS.limitationRows.map((row, index) => ({
    title: row.title,
    text: mergeWithFallbackText(
      rawContent.limitations,
      BUSINESS_FALLBACKS.limitationRows.map((entry) => entry.text),
      5,
      AI_TEXT_LIMITS.tableCell,
    )[index],
  }));
  const developmentRows = BUSINESS_FALLBACKS.developmentRows.map((row, index) => ({
    title: row.title,
    text: mergeWithFallbackText(
      rawContent.developmentRecommendations,
      BUSINESS_FALLBACKS.developmentRows.map((entry) => entry.text),
      5,
      AI_TEXT_LIMITS.tableCell,
    )[index],
  }));
  const careerCards = BUSINESS_FALLBACKS.careerCards.map((card, index) => ({
    ...card,
    text: mergeWithFallbackText(
      rawContent.careerRecommendations,
      BUSINESS_FALLBACKS.careerCards.map((entry) => entry.text),
      4,
      AI_TEXT_LIMITS.career,
    )[index],
  }));
  const recommendationItems = BUSINESS_FALLBACKS.recommendations.map((item, index) => ({
    ...item,
    text: mergeWithFallbackText(
      rawContent.businessRecommendations,
      BUSINESS_FALLBACKS.recommendations.map((entry) => entry.text),
      4,
      AI_TEXT_LIMITS.recommendation,
    )[index],
  }));
  const finalQuoteText = firstNonEmptyText(
    [rawContent.executiveSummary, rawContent.summary],
    AI_TEXT_LIMITS.finalQuote,
  );
  const finalSummaryText = firstNonEmptyText(
    [rawContent.summary, rawContent.professionalPositioning],
    AI_TEXT_LIMITS.finalCard,
  );
  const finalStrengthText = firstNonEmptyText(
    [rawContent.strengths?.[0], rawContent.summary],
    AI_TEXT_LIMITS.finalCard,
  );
  const finalDevelopmentText = firstNonEmptyText(
    [rawContent.limitations?.[0], rawContent.developmentRecommendations?.[0]],
    AI_TEXT_LIMITS.finalCard,
  );

  let result = html;

  if (summaryText) {
    result = replaceSlideBlock(result, 's1', (block) =>
      replaceLabeledParagraph(block, 'Síntese Comportamental', summaryText),
    );
    result = replaceSlideBlock(result, 'p3', (block) =>
      replaceHeadingParagraph(block, 'Visão Geral do Perfil', overviewText || summaryText),
    );
  }

  if (executiveSummaryText) {
    result = replaceSlideBlock(result, 's2', (block) =>
      block.replace(
        /(<h2>Sumário Executivo<\/h2>\s*<p style="margin-bottom:16px;">)([\s\S]*?)(<\/p>)/,
        `$1${escapeHtml(executiveSummaryText)}$3`,
      ),
    );
  }

  if (communicationText) {
    result = replaceSlideBlock(result, 'p3', (block) =>
      replaceHeadingParagraph(block, 'Estilo de Comunicação', communicationText),
    );
    result = replaceSlideBlock(result, 's12', (block) =>
      replaceLabeledParagraph(block, 'Estilo de Comunicação', communicationText),
    );
  }

  if (profileInterpretationText) {
    result = replaceSlideBlock(result, 's4', (block) =>
      block.replace(
        /(<div class="desc">)([\s\S]*?)(<\/div>)/,
        `$1${escapeHtml(profileInterpretationText)}$3`,
      ),
    );
    result = replaceSlideBlock(result, 's8', (block) =>
      replaceHeadingParagraph(
        block,
        `Sinergia ${context.profile.primary} + ${context.profile.secondary}`,
        profileInterpretationText,
        'h4',
      ),
    );
  }

  if (strengthList.length > 0) {
    result = replaceSlideBlock(result, 'p3', (block) =>
      block.replace(
        /(<h3>Pontos Fortes<\/h3>\s*)(<ul[\s\S]*?<\/ul>)/,
        `$1${renderBulletList(strengthList)}`,
      ),
    );
    result = replaceSlideBlock(result, 's10', (block) =>
      replaceNthMatch(block, /<tbody>[\s\S]*?<\/tbody>/g, 0, renderTableBody(strengthRows)),
    );
  }

  if (opportunityList.length > 0) {
    result = replaceSlideBlock(result, 'p3', (block) =>
      block.replace(
        /(<h3>Oportunidades de Desenvolvimento<\/h3>\s*)(<ul[\s\S]*?<\/ul>)/,
        `$1${renderBulletList(opportunityList)}`,
      ),
    );
    result = replaceSlideBlock(result, 's10', (block) =>
      replaceNthMatch(block, /<tbody>[\s\S]*?<\/tbody>/g, 1, renderTableBody(limitationRows)),
    );
    result = replaceSlideBlock(result, 's19', (block) =>
      replaceNthMatch(block, /<tbody>[\s\S]*?<\/tbody>/g, 0, renderTableBody(developmentRows)),
    );
  }

  if (decisionText) {
    result = replaceSlideBlock(result, 's12', (block) =>
      replaceLabeledParagraph(block, 'Tomada de Decisão', decisionText),
    );
  }

  if (leadershipText || teamworkText) {
    result = replaceSlideBlock(result, 's13', (block) => {
      let updatedBlock = block;
      if (leadershipText) {
        updatedBlock = replaceHeadingParagraph(updatedBlock, 'Estilo de Liderança', leadershipText, 'h4');
      }
      if (teamworkText) {
        updatedBlock = replaceHeadingParagraph(updatedBlock, 'Papel na Equipe', teamworkText, 'h4');
      }
      return updatedBlock;
    });
  }

  if (pressureText) {
    result = replaceSlideBlock(result, 's14', (block) =>
      replaceClassParagraph(block, 'pr-header', pressureText),
    );
  }

  if (perceptionTexts.length > 0) {
    result = replaceSlideBlock(result, 's15', (block) => {
      let updatedBlock = block;
      BUSINESS_FALLBACKS.perceptionCards.forEach((card, index) => {
        updatedBlock = replaceNthMatch(
          updatedBlock,
          /<div class="perc-card">[\s\S]*?<\/div>/g,
          index,
          renderPerceptionCard(card.title, perceptionTexts[index] || card.text),
        );
      });
      return updatedBlock;
    });
  }

  if (relationshipTip) {
    result = replaceSlideBlock(result, 's23', (block) =>
      block.replace(
        /(<div class="exec-tip"><strong>Dica executiva:<\/strong> )([\s\S]*?)(<\/div>)/,
        `$1${escapeHtml(relationshipTip)}$3`,
      ),
    );
  }

  if (negotiationText || salesText || learningText) {
    result = replaceSlideBlock(result, 's16', (block) => {
      let updatedBlock = block;
      if (negotiationText) {
        updatedBlock = replaceNthMatch(
          updatedBlock,
          /<div class="nva-card">[\s\S]*?<\/div>/g,
          0,
          renderNvaCard('🤝', 'Estilo de Negociação', negotiationText),
        );
      }
      if (salesText) {
        updatedBlock = replaceNthMatch(
          updatedBlock,
          /<div class="nva-card">[\s\S]*?<\/div>/g,
          1,
          renderNvaCard('💼', 'Estilo de Vendas', salesText),
        );
      }
      if (learningText) {
        updatedBlock = replaceNthMatch(
          updatedBlock,
          /<div class="nva-card">[\s\S]*?<\/div>/g,
          2,
          renderNvaCard('📚', 'Estilo de Aprendizado', learningText),
        );
      }
      return updatedBlock;
    });
  }

  if (careerCards.length > 0) {
    result = replaceSlideBlock(result, 's19', (block) => {
      let updatedBlock = block;
      careerCards.forEach((card, index) => {
        updatedBlock = replaceNthMatch(
          updatedBlock,
          /<div class="career-card"><div class="ibox n">[\s\S]*?<\/div><div><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div><\/div>/g,
          index,
          renderCareerCard(card),
        );
      });
      return updatedBlock;
    });
  }

  if (recommendationItems.length > 0) {
    result = replaceSlideBlock(result, 's24', (block) => {
      let updatedBlock = block;
      recommendationItems.forEach((item, index) => {
        updatedBlock = replaceNthMatch(
          updatedBlock,
          /<div class="rec-item"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
          index,
          renderRecommendationItem(item),
        );
      });
      return updatedBlock;
    });
  }

  if (finalQuoteText || finalSummaryText || finalStrengthText || finalDevelopmentText) {
    result = replaceSlideBlock(result, 's25', (block) => {
      let updatedBlock = block;

      if (finalQuoteText) {
        updatedBlock = updatedBlock.replace(
          /(<div class="quote-text">)([\s\S]*?)(<\/div>)/,
          `$1${escapeHtml(finalQuoteText)}$3`,
        );
      }

      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="sint-card"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        0,
        renderSintCard(
          `Perfil ${context.profile.slashCode} — Síntese`,
          finalSummaryText || BUSINESS_FALLBACKS.finalSummary.profile,
        ),
      );
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="sint-card"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        1,
        renderSintCard(
          'Principal Força',
          finalStrengthText || BUSINESS_FALLBACKS.finalSummary.strength,
        ),
      );
      updatedBlock = replaceNthMatch(
        updatedBlock,
        /<div class="sint-card"><h4>[\s\S]*?<\/h4><p>[\s\S]*?<\/p><\/div>/g,
        2,
        renderSintCard(
          'Principal Desenvolvimento',
          finalDevelopmentText || BUSINESS_FALLBACKS.finalSummary.development,
        ),
      );

      return updatedBlock;
    });
  }

  return result;
}

function removeSlidesByMode(html, mode) {
  const slidesToRemove = new Set(MODE_SLIDES_TO_REMOVE[mode] || []);
  if (!slidesToRemove.size) {
    return html;
  }

  const slides = extractSlides(html);
  let result = '';
  let lastIndex = 0;

  for (const slide of slides) {
    result += html.slice(lastIndex, slide.startIndex);
    if (!slidesToRemove.has(slide.id)) {
      result += slide.block;
    }
    lastIndex = slide.endIndex;
  }

  result += html.slice(lastIndex);
  return result;
}

function renumberPages(html) {
  let pageNumber = 0;
  return html.replace(/<div class="pgn">\d+<\/div>/g, () => {
    pageNumber += 1;
    return `<div class="pgn">${pageNumber}</div>`;
  });
}

function generateFinalHtml(context) {
  const masterHtml = readMasterTemplate();
  const withValues = applyProfileHeadingReplacements(
    applyRankReplacements(applyBaseReplacements(masterHtml, context), context),
    context,
  );
  const withAiText = applyBusinessAiTextReplacements(withValues, context);
  const pruned = removeSlidesByMode(withAiText, context.mode);
  return renumberPages(pruned);
}

function main() {
  const args = parseArgs(argv.slice(2));
  const context = buildContext(args);
  const finalHtml = generateFinalHtml(context);
  const outputPath = resolve(__dirname, context.output);

  writeFileSync(outputPath, finalHtml, 'utf8');
  console.log(`HTML gerado com sucesso: ${outputPath}`);
}

if (argv[1] && resolve(argv[1]) === __filename) {
  main();
}

export {
  applyBusinessAiTextReplacements,
  buildContext,
  generateFinalHtml,
  normalizeAiPayloadFile,
  readAiPayload,
};
