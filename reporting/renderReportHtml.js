const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_META = {
  D: { label: 'Dominância', color: '#e74c3c' },
  I: { label: 'Influência', color: '#f1c40f' },
  S: { label: 'Estabilidade', color: '#2ecc71' },
  C: { label: 'Conformidade', color: '#3498db' },
};

const SUMMARY_ITEMS = [
  'Apresentação Executiva',
  'O que é DISC',
  'Visão Geral dos 4 Fatores',
  'Síntese Executiva do Perfil',
  'Gráficos DISC',
  'Radar Comportamental',
  'Benchmark do Perfil',
  'Dinâmica Geral do Perfil',
  'Processo de Decisão',
  'Motivadores',
  'Drenadores de Energia',
  'Comportamento no Ambiente de Trabalho',
  'Comunicação',
  'Estilo de Liderança',
  'Tomada de Decisão e Autonomia',
  'Resposta ao Estresse',
  'Conflitos',
  'Relacionamento com Equipe',
  'Sinergia com Outros Perfis',
  'Conclusão Estratégica do Perfil',
];

const SECTION_ICON_SVGS = Object.freeze({
  chart: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19h16M6 16v-5m6 5V7m6 9v-8" />
    </svg>
  `,
  radar: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18M6.9 6.9l10.2 10.2M17.1 6.9L6.9 17.1" />
      <circle cx="12" cy="12" r="3.8" />
    </svg>
  `,
  communication: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v10H8l-4 4V5Z" />
    </svg>
  `,
  energy: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 5 14h6l-1 8 9-13h-6l1-7Z" />
    </svg>
  `,
  stress: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2 20h20L12 3Zm0 6v5m0 3h.01" />
    </svg>
  `,
  leadership: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 8 10h8l-4-6Zm-6 9h12v7H6v-7Z" />
    </svg>
  `,
  conflict: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h6M14 12h6M10 8l-4 4 4 4M14 8l4 4-4 4" />
    </svg>
  `,
  profile: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.3-4.5 4-6.5 8-6.5s6.7 2 8 6.5" />
    </svg>
  `,
  book: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h7a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3V5Zm16 0h-7a3 3 0 0 0-3 3v11h7a3 3 0 0 1 3 3V5Z" />
    </svg>
  `,
  target: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  `,
  default: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 4 20h16L12 4Z" />
    </svg>
  `,
});

const DEFAULT_BRANDING = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-report-logo.png',
  cover_url: '/report-assets/cover-insightdisc-premium.png',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
  logo_contains_tagline: false,
});

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6})$/;

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function safeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeArray(value, fallback = []) {
  if (Array.isArray(value)) {
    const normalized = value.filter((item) => {
      if (item === null || item === undefined) return false;
      if (typeof item === 'string') return Boolean(item.trim());
      return true;
    });
    return normalized.length ? normalized : [...fallback];
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [...fallback];
}

function normalizeHexColor(color, fallback) {
  const normalized = String(color || '').trim();
  if (!normalized || !HEX_COLOR_REGEX.test(normalized)) return fallback;
  return normalized.toLowerCase();
}

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('pt-BR');
  }
  return date.toLocaleDateString('pt-BR');
}

function ensureCriticalData(report) {
  const participantName = safeText(report?.participant?.name);
  if (!participantName) {
    throw createBadRequest('Dado obrigatorio ausente: participant.name');
  }

  const brandingCompany = safeText(report?.branding?.company_name || report?.meta?.brand);
  const brandingLogo = safeText(report?.branding?.logo_url);
  if (!brandingCompany || !brandingLogo) {
    throw createBadRequest('Branding incompleto para geracao white-label');
  }
}

function normalizeBranding(branding = {}, meta = {}) {
  return {
    company_name: safeText(branding?.company_name || meta?.brand, DEFAULT_BRANDING.company_name),
    logo_url: safeText(branding?.logo_url, DEFAULT_BRANDING.logo_url),
    cover_url: safeText(branding?.cover_url, DEFAULT_BRANDING.cover_url),
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
    logo_contains_tagline: Boolean(branding?.logo_contains_tagline),
  };
}

function normalizeParticipant(participant = {}, meta = {}) {
  return {
    name: safeText(participant?.name, ''),
    email: safeText(participant?.email, 'contato@participante.disc'),
    assessmentId: safeText(participant?.assessmentId || meta?.reportId, `assessment-${Date.now()}`),
    role: safeText(participant?.role, 'Profissional em desenvolvimento'),
    company: safeText(participant?.company, meta?.brand || 'Organizacao avaliada'),
  };
}

function normalizeScores(input = {}) {
  const normalized = {};
  for (const factor of FACTORS) {
    normalized[factor] = clamp(input?.[factor]);
  }

  const hasAny = FACTORS.some((factor) => normalized[factor] > 0);
  if (hasAny) return normalized;

  return { D: 25, I: 25, S: 25, C: 25 };
}

function listHtml(items, fallback) {
  const list = safeArray(items, fallback);
  return `<ul class="bullet-list">${list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function paragraphsHtml(items, fallback) {
  const paragraphs = safeArray(items, fallback);
  return paragraphs.map((item) => `<p>${esc(item)}</p>`).join('');
}

function scoresTable(scores) {
  return `
    <table class="table compact">
      <thead>
        <tr>
          <th>Fator</th>
          <th>Natural</th>
          <th>Adaptado</th>
          <th>Sintese</th>
        </tr>
      </thead>
      <tbody>
        ${FACTORS.map(
          (factor) => `
            <tr>
              <td>${factor} - ${FACTOR_META[factor].label}</td>
              <td>${clamp(scores.natural?.[factor])}%</td>
              <td>${clamp(scores.adapted?.[factor])}%</td>
              <td>${clamp(scores.summary?.[factor])}%</td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>
  `;
}

function barsHtml(scores = {}, title = 'Perfil') {
  return `
    <div class="card">
      <h3>${esc(title)}</h3>
      ${FACTORS.map((factor) => {
        const value = clamp(scores?.[factor]);
        return `
          <div class="bar-row">
            <div class="bar-label"><span class="dot" style="background:${FACTOR_META[factor].color}"></span>${factor} - ${FACTOR_META[factor].label}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${value}%;background:${FACTOR_META[factor].color}"></div></div>
            <div class="bar-value">${value}%</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function radarSvg(scores = {}) {
  const width = 420;
  const height = 320;
  const centerX = 160;
  const centerY = 160;
  const radius = 110;

  const positions = {
    D: -90,
    I: 0,
    S: 90,
    C: 180,
  };

  const pointByFactor = (factor, value) => {
    const angle = (positions[factor] * Math.PI) / 180;
    const r = (clamp(value) / 100) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return [x.toFixed(2), y.toFixed(2)];
  };

  const rings = [25, 50, 75, 100]
    .map((ring) => {
      const points = FACTORS.map((factor) => {
        const [x, y] = pointByFactor(factor, ring);
        return `${x},${y}`;
      }).join(' ');
      return `<polygon points="${points}" fill="none" stroke="rgba(15,23,42,.18)" stroke-width="1" />`;
    })
    .join('');

  const axes = FACTORS.map((factor) => {
    const [x, y] = pointByFactor(factor, 100);
    return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="rgba(15,23,42,.2)" stroke-width="1" />`;
  }).join('');

  const labels = FACTORS.map((factor) => {
    const [x, y] = pointByFactor(factor, 118);
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">${factor}</text>`;
  }).join('');

  const profilePoints = FACTORS.map((factor) => pointByFactor(factor, scores[factor]).join(',')).join(' ');

  return `
    <svg class="radar" viewBox="0 0 ${width} ${height}" role="img" aria-label="Radar comportamental DISC">
      ${rings}
      ${axes}
      <polygon points="${profilePoints}" fill="rgba(37,99,235,.24)" stroke="rgba(37,99,235,.95)" stroke-width="2.2" />
      <circle cx="${centerX}" cy="${centerY}" r="3" fill="#0f172a" />
      ${labels}
    </svg>
  `;
}

function benchmarkRowsHtml(rows = []) {
  const normalized = safeArray(rows, []);
  return normalized
    .map((row) => {
      const factor = safeText(row?.factor || row?.label, 'Fator');
      const score = `${clamp(row?.score)}%`;
      const range = safeText(row?.typicalRange, '20-70');
      const reading = safeText(row?.reading, 'Leitura comparativa por faixa de referencia.');
      return `<tr><td>${esc(factor)}</td><td>${esc(score)}</td><td>${esc(range)}</td><td>${esc(reading)}</td></tr>`;
    })
    .join('');
}

function hashSeed(value) {
  const input = String(value || '');
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function resolveCalloutKind(title) {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('aplic')) return 'application';
  if (normalized.includes('gestor') || normalized.includes('lider') || normalized.includes('nota para')) return 'manager';
  if (normalized.includes('desenvolv')) return 'development';
  if (normalized.includes('risco') || normalized.includes('aten')) return 'warning';
  if (normalized.includes('cenario') || normalized.includes('exemplo')) return 'example';
  return 'insight';
}

function resolveCalloutTitle(title, text = '') {
  const normalized = String(title || '').trim().toLowerCase();
  const repetitive = new Set([
    'aplicacao pratica',
    'leitura do gestor',
    'observacao de desenvolvimento',
    'risco de exagero do perfil',
    'risco de exagero',
    'insight comportamental',
    'leitura executiva',
    'nota para gestor',
    'nota para lideres',
    'bloco relacional',
    'observacao de carreira',
    'evolucao mensuravel',
  ]);

  if (!repetitive.has(normalized)) {
    return safeText(title, 'Insight estrategico');
  }

  const kind = resolveCalloutKind(title);
  const options = {
    application: [
      'Implicacao no ambiente de trabalho',
      'Como isso aparece no dia a dia',
      'Impacto no contexto profissional',
      'Expressao pratica do comportamento',
    ],
    manager: [
      'Leitura para liderancas',
      'Lente de gestao aplicada',
      'Diretriz para conduzir o perfil',
      'Orientacao para tomada de decisao do gestor',
    ],
    development: [
      'Observacao de desenvolvimento',
      'Foco de maturidade comportamental',
      'Ponto de evolucao prioritaria',
      'Direcao de crescimento profissional',
    ],
    warning: [
      'Atenção comportamental',
      'Risco de exagero do estilo',
      'Sinal de alerta em contexto de pressao',
      'Ponto critico de calibragem',
    ],
    insight: [
      'Insight estrategico',
      'Leitura executiva aplicada',
      'Perspectiva de performance',
      'Interpretacao de valor profissional',
    ],
    example: [
      'Cenario profissional ilustrativo',
      'Exemplo de aplicacao no dia a dia',
      'Contexto pratico de comportamento',
      'Leitura situacional',
    ],
  };

  const titles = options[kind] || options.insight;
  const seed = hashSeed(`${title}-${text}`);
  return titles[seed % titles.length];
}

function resolveCalloutClass(kind) {
  const map = {
    application: 'callout-application',
    manager: 'callout-manager',
    development: 'callout-development',
    warning: 'callout-warning',
    example: 'callout-example',
    insight: 'callout-insight',
  };
  return map[kind] || map.insight;
}

function enrichmentCard(title, text) {
  const resolvedTitle = resolveCalloutTitle(title, text);
  const kind = resolveCalloutKind(title);
  const className = resolveCalloutClass(kind);
  return `
    <div class="callout-box ${className}">
      <h4>${esc(resolvedTitle)}</h4>
      <p>${esc(text)}</p>
    </div>
  `;
}

function classifyAdherence(score) {
  const value = clamp(score);
  if (value >= 70) return 'Alta aderencia';
  if (value >= 45) return 'Aderencia moderada';
  return 'Aderencia condicionada';
}

function adherenceRowsHtml(scores = {}) {
  const d = clamp(scores?.D);
  const i = clamp(scores?.I);
  const s = clamp(scores?.S);
  const c = clamp(scores?.C);

  const rows = [
    {
      context: 'Ambiente corporativo estruturado',
      score: Math.round((d + i + s + c) / 4),
      interpretation:
        'Leitura geral de equilibrio comportamental para contextos com metas, governanca e colaboracao interareas.',
    },
    {
      context: 'Funcoes comerciais e expansao',
      score: Math.round(d * 0.35 + i * 0.35 + s * 0.1 + c * 0.2),
      interpretation:
        'Combina ritmo de execucao, influencia e capacidade de resposta em cenarios de meta e negociacao.',
    },
    {
      context: 'Lideranca e tomada de decisao',
      score: Math.round(d * 0.4 + i * 0.25 + s * 0.15 + c * 0.2),
      interpretation:
        'Indica potencial de conduzir pessoas e decidir com criterio em ambientes com pressao e responsabilidade.',
    },
    {
      context: 'Funcoes analiticas e tecnicas',
      score: Math.round(c * 0.45 + s * 0.25 + d * 0.2 + i * 0.1),
      interpretation:
        'Mostra aderencia para rotinas de metodo, qualidade, previsibilidade e aprofundamento tecnico.',
    },
  ];

  return rows
    .map((row) => {
      const score = clamp(row.score);
      const label = classifyAdherence(score);
      return `<tr><td>${esc(row.context)}</td><td>${score}%</td><td>${esc(label)}</td><td>${esc(row.interpretation)}</td></tr>`;
    })
    .join('');
}

function scorePillsHtml(scores = {}, profile = {}, adaptation = {}) {
  const pillars = [
    { factor: 'D', label: 'Direção' },
    { factor: 'I', label: 'Influência' },
    { factor: 'S', label: 'Estabilidade' },
    { factor: 'C', label: 'Qualidade' },
  ];

  return `
    <div class="kpi-grid">
      ${pillars
        .map((pillar) => {
          const value = clamp(scores?.natural?.[pillar.factor]);
          return `
            <div class="kpi-pill">
              <div class="kpi-chip" style="background:${FACTOR_META[pillar.factor].color}1a;border-color:${FACTOR_META[pillar.factor].color}66;">
                ${pillar.factor}
              </div>
              <div class="kpi-copy">
                <span>${esc(pillar.label)}</span>
                <strong>${value}%</strong>
              </div>
            </div>
          `;
        })
        .join('')}
      <div class="kpi-pill kpi-pill-wide">
        <div class="kpi-copy">
          <span>Custo de adaptação</span>
          <strong>${esc(safeText(adaptation?.label, 'MODERADO'))}</strong>
          <small>Delta médio: ${esc(Number(adaptation?.avgAbsDelta || 0).toFixed(2))}</small>
        </div>
      </div>
      <div class="kpi-pill kpi-pill-wide">
        <div class="kpi-copy">
          <span>Assinatura comportamental</span>
          <strong>${esc(`${profile?.primary || 'D'} + ${profile?.secondary || 'I'}`)}</strong>
          <small>${esc(safeText(profile?.title, 'Composição de perfil DISC'))}</small>
        </div>
      </div>
    </div>
  `;
}

function executiveDivider(title, subtitle = '') {
  return `
    <div class="executive-divider">
      <h3>${esc(title)}</h3>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
    </div>
  `;
}

function strategicNote(title, text, extra = '') {
  return `
    <div class="strategic-note">
      <h4>${esc(title)}</h4>
      <p>${esc(text)}</p>
      ${extra ? `<p class="muted-note">${esc(extra)}</p>` : ''}
    </div>
  `;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveSectionIconKey(title) {
  const value = safeText(title).toLowerCase();
  if (!value) return 'default';
  if (value.includes('gráfico') || value.includes('grafico') || value.includes('benchmark')) return 'chart';
  if (value.includes('radar')) return 'radar';
  if (value.includes('comunica')) return 'communication';
  if (value.includes('motivador') || value.includes('energia')) return 'energy';
  if (value.includes('estress') || value.includes('pressão') || value.includes('pressao')) return 'stress';
  if (value.includes('liderança') || value.includes('lideranca')) return 'leadership';
  if (value.includes('conflito')) return 'conflict';
  if (value.includes('perfil') || value.includes('síntese') || value.includes('sintese')) return 'profile';
  if (value.includes('sumário') || value.includes('sumario') || value.includes('glossário') || value.includes('glossario')) return 'book';
  if (value.includes('conclusão') || value.includes('conclusao')) return 'target';
  return 'default';
}

function sectionIconHtml(title) {
  const key = resolveSectionIconKey(title);
  return SECTION_ICON_SVGS[key] || SECTION_ICON_SVGS.default;
}

function summaryRowsHtml(items = []) {
  const lines = safeArray(items, SUMMARY_ITEMS).map((item, index) => {
    const order = String(index + 1).padStart(2, '0');
    return `
      <div class="summary-item">
        <div class="summary-order">${order}</div>
        <div class="summary-copy">${esc(item)}</div>
      </div>
    `;
  });

  const midpoint = Math.ceil(lines.length / 2);
  const firstColumn = lines.slice(0, midpoint).join('');
  const secondColumn = lines.slice(midpoint).join('');

  return `
    <div class="summary-grid">
      <div class="summary-col">${firstColumn}</div>
      <div class="summary-col">${secondColumn}</div>
    </div>
  `;
}

function finalConclusionBlocks({ participant, profile, profileContent, insights, plans }) {
  const strengths = safeArray(profileContent?.naturalStrengths, ['Capacidade de gerar resultado com consistência e consciência comportamental.']).slice(0, 3);
  const developments = safeArray(profileContent?.developmentPoints, ['Aprimorar calibragem comportamental em contextos de alta pressão.']).slice(0, 2);
  const plan90 = safeArray(plans?.days90, profileContent?.plan90 || ['Consolidar rotina de melhoria contínua com acompanhamento observável.']).slice(0, 2);

  return [
    `${safeText(participant?.name, 'Profissional avaliado')}, seu perfil ${safeText(profile?.key, '')} revela uma combinação valiosa de repertório comportamental para gerar impacto real no ambiente profissional.`,
    `Sua principal força está em ${strengths[0].toLowerCase()}. Quando isso é aplicado com contexto claro, você amplia influência, previsibilidade de entrega e percepção de senioridade.`,
    `Ao mesmo tempo, o salto mais estratégico aparece ao evoluir ${developments.map((item) => item.toLowerCase()).join(' e ')}. Esse ajuste reduz desgaste e fortalece sua atuação em cenários complexos.`,
    `Nos próximos ciclos, priorize ${plan90.map((item) => item.toLowerCase()).join(' e ')} para transformar potencial em rotina de alta performance sustentável.`,
    safeText(
      insights?.executiveByPage?.career,
      'Este relatório foi construído para apoiar sua evolução com clareza, profundidade e aplicação prática. O valor está na execução consistente do que foi identificado aqui.'
    ),
  ];
}

function automaticEnrichment(title, subtitle) {
  const scope = safeText(title, 'perfil');
  const detail = safeText(subtitle, 'contexto profissional');
  return `
    <div class="grid two compact-enrichment">
      ${enrichmentCard(
        'Exemplo de aplicacao',
        `Em um cenário real de ${scope.toLowerCase()}, observe como o comportamento se expressa em reuniões de alinhamento, priorização de tarefas e tomada de decisão sob prazo.`
      )}
      ${enrichmentCard(
        'Leitura do gestor',
        `Para ${detail.toLowerCase()}, combine metas claras, feedback observável e revisões curtas para transformar insight comportamental em consistência de entrega.`
      )}
    </div>
    <div class="card compact-density-note">
      <p><strong>Aplicação prática:</strong> conecte estes pontos com situações reais da rotina e revise o ajuste em ciclos curtos.</p>
    </div>
  `;
}

function buildPage({
  number,
  totalPages,
  title,
  subtitle,
  content,
  cover = false,
  branding,
  enforceDensity = true,
  hideInternalBranding = false,
}) {
  if (cover) {
    const coverBrandName = safeText(branding?.company_name, DEFAULT_BRANDING.company_name);
    const coverArtUrl = DEFAULT_BRANDING.cover_url;
    return `
      <section class="page cover-page">
        <div class="cover-content">
          <img src="${esc(coverArtUrl)}" alt="Capa oficial ${esc(coverBrandName)}" class="cover-art-image" />
          ${content}
        </div>
      </section>
    `;
  }

  const parityClass = number % 2 === 0 ? 'page-even' : 'page-odd';
  const densityChars = stripHtml(content).length;
  const contentWithDensity =
    enforceDensity && densityChars < 950
      ? `${content}\n${automaticEnrichment(title, subtitle)}`
      : content;

  return `
    <section class="page ${parityClass}">
      <div class="page-backdrop"></div>
      <main class="content">
        ${
          hideInternalBranding
            ? ''
            : `
              <div class="page-brand-strip">
                <div class="report-header-text">
                  <div class="report-header-brand">InsightDISC</div>
                  <div class="report-header-subtitle">Plataforma de Análise Comportamental</div>
                </div>
              </div>
            `
        }
        <div class="section-head">
          <div class="section-head-title">
            <span class="section-icon">${sectionIconHtml(title)}</span>
            <h2>${esc(title)}</h2>
          </div>
          ${subtitle ? `<span>${esc(subtitle)}</span>` : ''}
        </div>
        ${contentWithDensity}
      </main>
      <footer class="footer">
        <span>${esc(branding.report_footer_text)}</span>
        <span>Página ${number} de ${totalPages}</span>
      </footer>
    </section>
  `;
}

export function renderReportHtml(input = {}) {
  const report = input?.reportModel || input || {};

  ensureCriticalData(report);

  const meta = {
    reportTitle: safeText(report?.meta?.reportTitle, 'Relatório de Análise Comportamental DISC'),
    reportSubtitle: safeText(
      report?.meta?.reportSubtitle,
      'Diagnóstico comportamental completo com benchmark, comunicação, liderança, riscos, carreira e plano de desenvolvimento'
    ),
    generatedAt: formatDate(report?.meta?.generatedAt),
    reportId: safeText(report?.meta?.reportId, `report-${Date.now()}`),
    responsibleName: safeText(report?.meta?.responsibleName, 'Especialista InsightDISC'),
    responsibleRole: safeText(report?.meta?.responsibleRole, 'Especialista em Análise Comportamental'),
    totalPages: 30,
  };

  const branding = normalizeBranding(report?.branding || {}, report?.meta || {});
  const participant = normalizeParticipant(report?.participant || {}, report?.meta || {});

  const scores = {
    natural: normalizeScores(report?.scores?.natural),
    adapted: normalizeScores(report?.scores?.adapted || report?.scores?.natural),
    summary: normalizeScores(report?.scores?.summary || report?.scores?.natural),
  };

  const profile = {
    key: safeText(report?.profile?.key, 'DI'),
    primary: safeText(report?.profile?.primary, 'D'),
    secondary: safeText(report?.profile?.secondary, 'I'),
    mode: safeText(report?.profile?.mode, 'combo'),
    title: safeText(report?.profile?.title, safeText(report?.profileContent?.title, `Perfil ${safeText(report?.profile?.key, 'DI')}`)),
    archetype: safeText(report?.profile?.archetype, safeText(report?.profileContent?.archetype, 'Perfil orientado a resultado com equilibrio relacional e consistencia operacional.')),
    label: safeText(report?.profile?.label, 'Combinacao comportamental com aplicacao corporativa.'),
  };

  const adaptation = {
    label: safeText(report?.adaptation?.label, safeText(report?.adaptation?.band, 'moderado')).toUpperCase(),
    avgAbsDelta: Number(report?.adaptation?.avgAbsDelta || 0).toFixed(2),
    interpretation: safeText(
      report?.adaptation?.interpretation,
      'A diferenca entre natural e adaptado indica calibragem comportamental relevante para sustentar performance sem desgaste.'
    ),
  };

  const profileContent = report?.profileContent || {};
  const narratives = report?.narratives || {};
  const factors = report?.factors || {};
  const benchmark = report?.benchmark || {};
  const insights = report?.insights || {};
  const plans = report?.plans || {};
  const enrichment = {
    insight: safeText(report?.enrichment?.insight, 'Insight comportamental'),
    application: safeText(report?.enrichment?.application, 'Aplicacao pratica'),
    managerLens: safeText(report?.enrichment?.managerLens, 'Leitura do gestor'),
    riskLens: safeText(report?.enrichment?.riskLens, 'Risco de exagero do perfil'),
    developmentLens: safeText(report?.enrichment?.developmentLens, 'Observacao de desenvolvimento'),
  };

  const methodologyOverview = safeArray(narratives?.methodologyOverview, [
    'Este relatorio traduz comportamento em orientacoes praticas para decisao, lideranca e desenvolvimento.',
    'A leitura e deterministica e considera perfil natural, perfil adaptado e benchmark interno.',
    'O foco e apoiar aplicacao real no contexto profissional, com acompanhamento por ciclos curtos.',
  ]);

  const methodologyUse = safeArray(narratives?.methodologyHowToUse, [
    'Conecte cada insight a uma situacao concreta de trabalho.',
    'Transforme recomendacoes em rotina com medicao quinzenal.',
    'Revise progresso em ciclos de 30, 60 e 90 dias.',
    'Alinhe expectativa com lider e pares.',
    'Ajuste abordagem conforme mudanca de contexto.',
  ]);

  const responsibleReading = safeArray(narratives?.methodologyResponsibleReading, [
    'Nao use o DISC como rotulo definitivo.',
    'Cruze leitura comportamental com desempenho real.',
    'Considere contexto, cultura e maturidade da equipe.',
    'Evite decisao critica sem evidencia complementar.',
    'Use o relatorio para desenvolvimento continuo.',
  ]);

  const pages = [];
  pages.push(
    buildPage({
      number: 1,
      totalPages: meta.totalPages,
      cover: true,
      branding,
      content: '',
    })
  );

  pages.push(
    buildPage({
      number: 2,
      totalPages: meta.totalPages,
      title: 'Sumário',
      subtitle: 'Estrutura executiva do relatório e trilha de leitura recomendada',
      branding,
      enforceDensity: false,
      content: `
        ${executiveDivider('Como navegar por este relatório', 'Use o sumário como mapa editorial para leitura por prioridade de negócio')}
        <div class="card summary-intro">
          <p>Este relatório foi estruturado para apoiar decisões de liderança, comunicação, carreira e desenvolvimento comportamental com base em evidências observáveis.</p>
          <p>Você pode ler em sequência completa ou priorizar as seções de acordo com seu contexto atual de atuação.</p>
        </div>
        ${summaryRowsHtml(SUMMARY_ITEMS)}
        <div class="grid two">
          <div class="card">${paragraphsHtml(methodologyOverview)}</div>
          <div class="card">
            <h3>Como extrair valor deste relatório</h3>
            ${listHtml(methodologyUse)}
          </div>
        </div>
        <div class="card">
          <h3>Aviso de confidencialidade</h3>
          <p>${esc(safeText(report?.lgpd?.notice, 'Documento confidencial para uso profissional. Compartilhamento externo somente com autorizacao do titular e responsavel pelo processo.'))}</p>
        </div>
        ${enrichmentCard('Leitura estratégica', safeText(insights?.executive, 'Priorize aplicacao pratica, rotina de acompanhamento e feedback observavel para transformar leitura em ganho de performance.'))}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 3,
      totalPages: meta.totalPages,
      title: 'O Que é DISC',
      subtitle: 'Modelo, limites de uso e leitura responsável',
      branding,
      content: `
        <div class="card">
          <p>O DISC é um modelo comportamental que organiza tendências de resposta em quatro fatores: Dominância, Influência, Estabilidade e Conformidade.</p>
          <p>O modelo apoia desenvolvimento, comunicação, liderança e desenho de ambiente de trabalho. Não mede caráter nem competência técnica de forma isolada.</p>
          <p>Aplicação correta exige leitura de contexto, histórico de desempenho e maturidade da função.</p>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Como deve ser usado</h3>
            ${listHtml(methodologyUse)}
          </div>
          <div class="card">
            <h3>Leitura responsavel</h3>
            ${listHtml(responsibleReading)}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 4,
      totalPages: meta.totalPages,
      title: 'Visão Geral dos 4 Fatores',
      subtitle: 'D, I, S, C com forças e riscos típicos',
      branding,
      content: `
        <div class="grid two">
          ${FACTORS.map(
            (factor) => `
              <div class="factor-card" style="--factor:${FACTOR_META[factor].color}">
                <h3>${factor} - ${FACTOR_META[factor].label}</h3>
                <p>${esc(safeText(factors?.[factor]?.headline, `Expressao de ${FACTOR_META[factor].label} no perfil atual.`))}</p>
                <div class="mini-columns">
                  <div>
                    <h4>Forcas tipicas</h4>
                    ${listHtml((factors?.[factor]?.actions || []).slice(0, 3), ['Aplicar criterio de prioridade.', 'Executar com consistencia.', 'Comunicar impacto.'])}
                  </div>
                  <div>
                    <h4>Riscos tipicos</h4>
                    ${listHtml((factors?.[factor]?.redFlags || []).slice(0, 3), ['Evitar exagero do fator.', 'Manter equilibrio relacional.', 'Revisar risco de decisao.'])}
                  </div>
                </div>
              </div>
            `
          ).join('')}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 5,
      totalPages: meta.totalPages,
      title: 'Síntese Executiva do Perfil',
      subtitle: 'Leitura geral, arquétipo e custo de adaptação',
      branding,
      content: `
        ${executiveDivider('Panorama executivo do comportamento', 'Visão de liderança para tomada de decisão, comunicação e desenvolvimento')}
        ${scorePillsHtml(scores, profile, adaptation)}
        <div class="card executive-hero">
          <p><strong>Perfil identificado:</strong> ${esc(profile.key)} (${esc(profile.mode)})</p>
          <p><strong>Perfil primário:</strong> ${esc(profile.primary)} • <strong>Perfil secundário:</strong> ${esc(profile.secondary)}</p>
          <p><strong>Arquétipo:</strong> ${esc(profile.archetype)}</p>
          <p><strong>Custo de adaptação:</strong> ${esc(adaptation.label)} (${esc(adaptation.avgAbsDelta)} pontos)</p>
          <p>${esc(adaptation.interpretation)}</p>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Resumo executivo</h3>
            ${listHtml(profileContent?.executiveSummary, ['Leitura executiva do perfil com foco em aplicação de negócio.'])}
          </div>
          <div class="card">
            <h3>Leitura geral</h3>
            ${paragraphsHtml(narratives?.summaryParagraphs, [safeText(insights?.executive, 'Perfil com potencial de impacto quando combina forças naturais com rotina de calibragem.')])}
            ${strategicNote('Recomendação executiva', 'Priorize frentes em que o perfil gere valor imediato e acompanhe riscos de exagero com rituais quinzenais.', 'Esse ajuste aumenta percepção de senioridade, previsibilidade de entrega e influência no time.')}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 6,
      totalPages: meta.totalPages,
      title: 'Gráficos DISC',
      subtitle: 'Perfil natural, adaptado e leitura comparativa',
      branding,
      content: `
        <div class="grid two">
          ${barsHtml(scores.natural, 'Perfil Natural')}
          ${barsHtml(scores.adapted, 'Perfil Adaptado')}
        </div>
        <div class="card">
          <h3>Leitura executiva dos índices</h3>
          ${scoresTable(scores)}
          <p>Este gráfico demonstra a intensidade relativa dos quatro fatores comportamentais. A predominância de <strong>${esc(profile.primary)}</strong> com apoio de <strong>${esc(profile.secondary)}</strong> indica o eixo central de resposta no contexto profissional.</p>
          <p>${esc(safeText(insights?.practicalByPage?.dynamics, 'Compare natural e adaptado para entender onde há maior esforço de ajuste comportamental.'))}</p>
          <div class="grid two">
            ${strategicNote('Implicação no ambiente de trabalho', `Quando ${profile.primary} e ${profile.secondary} aparecem acima dos demais fatores, a pessoa tende a influenciar o ritmo da equipe por esse estilo dominante.`)}
            ${strategicNote('Leitura do gestor', 'Observe onde o perfil está operando mais distante do natural; esses pontos costumam concentrar desgaste e ruído de comunicação.')}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 7,
      totalPages: meta.totalPages,
      title: 'Radar Comportamental',
      subtitle: 'Equilíbrio dos eixos D, I, S, C',
      branding,
      content: `
        <div class="grid two">
          <div class="card radar-card">${radarSvg(scores.natural)}</div>
          <div class="card">
            <h3>Interpretação dos eixos</h3>
            <p>O radar traduz a distribuição relativa dos fatores em uma visão única. Áreas mais extensas indicam maior ativação no perfil natural.</p>
            ${listHtml([
              `Eixo D-I: combina decisão e influência para gerar tração no contexto atual.`,
              `Eixo S-C: regula consistência, previsibilidade e qualidade operacional.`,
              `Fator primário (${profile.primary}) orienta a resposta inicial em situações críticas.`,
              `Fator secundário (${profile.secondary}) ajusta o estilo para colaboração e entrega.`
            ])}
            ${enrichmentCard('Leitura executiva', safeText(insights?.executiveByPage?.dynamics, safeText(insights?.executive, 'Use o radar para alinhar distribuição de responsabilidade e estilo de liderança no time.')))}
            ${enrichmentCard('Cenário profissional ilustrativo', `Em projetos com alta pressão, o eixo ${profile.primary}-${profile.secondary} tende a definir como a pessoa negocia prioridade, comunica urgência e fecha compromissos.`)}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 8,
      totalPages: meta.totalPages,
      title: 'Benchmark do Perfil',
      subtitle: 'Comparação do participante com faixa típica',
      branding,
      content: `
        ${executiveDivider('Leitura comparativa de aderência', 'Análise de posição relativa por fator e por contexto de negócio')}
        <div class="card">
          <table class="table">
            <thead>
              <tr>
                <th>Fator</th>
                <th>Score da pessoa</th>
                <th>Faixa tipica</th>
                <th>Leitura</th>
              </tr>
            </thead>
            <tbody>
              ${benchmarkRowsHtml(benchmark?.rows || [])}
            </tbody>
          </table>
        </div>
        <div class="card">
          <h3>Aderencia por contexto profissional</h3>
          <table class="table compact">
            <thead>
              <tr>
                <th>Contexto</th>
                <th>Indice</th>
                <th>Leitura</th>
                <th>Interpretacao</th>
              </tr>
            </thead>
            <tbody>
              ${adherenceRowsHtml(scores.natural)}
            </tbody>
          </table>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Legenda de benchmark</h3>
            <p>${esc(safeText(benchmark?.legend, 'Faixas internas para leitura comparativa deterministica por perfil.'))}</p>
            ${listHtml(benchmark?.interpretation, ['Acima da faixa: intensidade alta do fator.', 'Dentro da faixa: alinhamento esperado.', 'Abaixo da faixa: requer compensacao contextual.'])}
          </div>
          <div class="card">
            <h3>Aplicação prática</h3>
            <p>${esc(safeText(insights?.practicalByPage?.decision, 'Use benchmark para calibrar plano de desenvolvimento sem rotular de forma fixa.'))}</p>
            ${enrichmentCard('Risco de exagero', safeText(insights?.behavioralRisk, 'Excesso de um único fator pode elevar risco relacional e reduzir sustentabilidade de resultado.'))}
            ${strategicNote('Leitura organizacional', 'A diferença entre faixa típica e score atual deve orientar coaching, não julgamento estático do potencial profissional.')}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 9,
      totalPages: meta.totalPages,
      title: 'Dinamica Geral do Perfil',
      subtitle: 'Como opera, influencia e se posiciona no ambiente',
      branding,
      content: `
        <div class="card">
          ${paragraphsHtml(
            profileContent?.identityDynamics || narratives?.identityDynamics,
            ['Dinamica de atuacao com foco em resultado, contexto e colaboracao.']
          )}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Contribuicao tipica</h3>
            ${listHtml(profileContent?.teamContribution, ['Contribuicao para direcao e estabilidade da equipe.'])}
          </div>
          <div class="card">
            <h3>Risco de execucao</h3>
            ${listHtml(profileContent?.workRisks, ['Risco operacional relevante para monitorar em ciclos curtos.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Estilo de comunicacao predominante</h3>
            ${listHtml(narratives?.communicationStyle, ['Comunicacao orientada ao contexto e ao impacto da mensagem.'])}
          </div>
          <div class="card">
            <h3>Necessidades de comunicacao</h3>
            ${listHtml(narratives?.communicationNeeds, ['Contexto claro, prioridade definida e proximo passo explicito.'])}
          </div>
        </div>
        ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.dynamics, 'Conecte a dinamica do perfil aos rituais da equipe para elevar previsibilidade de entrega.'))}
        ${enrichmentCard(enrichment.insight, safeText(insights?.executiveByPage?.dynamics, safeText(insights?.executive, 'Leitura executiva para converter estilo em resultado sustentavel.')))}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 10,
      totalPages: meta.totalPages,
      title: 'Processo de Decisao',
      subtitle: 'Velocidade, criterio dominante e riscos de decisao',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Como decide</h3>
            ${paragraphsHtml(profileContent?.decisionStyle, ['Decide por impacto, risco e contexto de prioridade.'])}
          </div>
          <div class="card">
            <h3>Quando tende a errar</h3>
            ${listHtml(
              [...safeArray(profileContent?.developmentRisks, []), ...safeArray(profileContent?.leadershipRisks, [])].slice(0, 8),
              ['Risco de decisao por excesso de velocidade ou de analise.']
            )}
          </div>
        </div>
        <div class="card">
          <h3>Framework de decisao recomendado</h3>
          ${listHtml([
            'Definir objetivo e criterio de sucesso antes de decidir.',
            'Mapear impacto em pessoas, prazo e qualidade.',
            'Testar decisao com pelo menos um contraponto tecnico.',
            'Registrar dono, prazo e risco principal.',
            'Revisar resultado da decisao em ciclos curtos.'
          ])}
          ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.decision, 'O perfil decide melhor quando combina clareza de impacto com checkpoint rapido de risco.'))}
          ${enrichmentCard(enrichment.riskLens, safeText(insights?.riskOfExcess, safeText(insights?.behavioralRisk, 'Monitorar exagero comportamental ajuda a preservar qualidade de decisao.')))}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 11,
      totalPages: meta.totalPages,
      title: 'Motivadores',
      subtitle: 'Fatores que elevam energia, engajamento e consistencia',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.motivators, ['Autonomia, clareza e reconhecimento por entrega sustentavel.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Gatilhos positivos</h3>
            ${listHtml(narratives?.developmentHabits, ['Habitos de desenvolvimento aumentam motivacao sustentavel.'])}
          </div>
          <div class="card">
            <h3>Necessidades para manter engajamento</h3>
            ${listHtml(
              narratives?.communicationNeeds,
              ['Definicao clara de contexto, prioridade e feedback observavel.']
            )}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Aplicacao na lideranca</h3>
            <p>${esc(safeText(insights?.managerCallout, 'Lideres aumentam engajamento quando alinham desafio, autonomia e criterio claro de sucesso.'))}</p>
            <p>${esc(safeText(insights?.careerCallout, 'Motivadores alinhados ao contexto de carreira aceleram desenvolvimento consistente.'))}</p>
          </div>
          <div class="card">
            <h3>Leitura executiva</h3>
            <p>${esc(safeText(insights?.executiveByPage?.leadership, safeText(insights?.executive, 'Leitura executiva para engajamento com foco em resultado e consistencia.')))}</p>
            ${enrichmentCard(enrichment.managerLens, safeText(insights?.managerLens, 'Ajuste desafio, autonomia e acompanhamento para manter energia do perfil.'))}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 12,
      totalPages: meta.totalPages,
      title: 'Drenadores de Energia',
      subtitle: 'Fatores que reduzem produtividade e foco',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Drenadores do perfil</h3>
            ${listHtml(profileContent?.energyDrainers, ['Ambiguidade de prioridade e baixa qualidade de alinhamento.'])}
          </div>
          <div class="card">
            <h3>Drenadores de ambiente</h3>
            ${listHtml(
              [...safeArray(profileContent?.lowFitEnvironment, []), ...safeArray(narratives?.environmentDrainers, [])].slice(0, 8),
              ['Cultura de ruido, reuniao sem decisao e falta de ownership.']
            )}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Sinais de desgaste mais provaveis</h3>
            ${listHtml(narratives?.stressSignals, ['Reatividade, queda de clareza e oscilacao de consistencia.'])}
          </div>
          <div class="card">
            <h3>Estrategias de recuperacao</h3>
            ${listHtml(profileContent?.recoveryStrategy, ['Repriorizar foco e retomar rotina de alinhamento.'])}
          </div>
        </div>
        <div class="card">
          <h3>Como minimizar desgaste</h3>
          ${listHtml([
            'Reforcar acordos de prioridade e dono por entrega.',
            'Reduzir multitarefa e proteger blocos de foco.',
            'Estabelecer rotina de checkpoint semanal com criterio objetivo.',
            'Escalar risco cedo para evitar desgaste silencioso.',
            'Ajustar cadencia conforme capacidade real da equipe.'
          ])}
          ${enrichmentCard(enrichment.developmentLens, safeText(insights?.developmentLens, 'Quando drenadores persistem, ajuste rotina e feedback para reduzir risco de exagero comportamental.'))}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 13,
      totalPages: meta.totalPages,
      title: 'Comportamento no Ambiente de Trabalho',
      subtitle: 'Forcas observaveis, riscos e ajuste recomendado',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Forcas observaveis</h3>
            ${listHtml(profileContent?.workStrengths, ['Contribui para resultado com disciplina de entrega e colaboracao.'])}
          </div>
          <div class="card">
            <h3>Pontos de atencao</h3>
            ${listHtml(profileContent?.workRisks, ['Monitorar risco de exagero e desalinhamento de ritmo com a equipe.'])}
          </div>
        </div>
        <div class="card">
          <h3>Ajuste recomendado</h3>
          <p>${esc(safeText(insights?.practicalByPage?.environment, 'Ajustar ambiente e rotina conforme o perfil aumenta performance sem elevar desgaste comportamental.'))}</p>
          ${enrichmentCard('Nota para gestor', safeText(insights?.managerCallout, 'Reforce acordos claros de resultado, cadencia e responsabilidade compartilhada.'))}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 14,
      totalPages: meta.totalPages,
      title: 'Comunicação',
      subtitle: 'Como este perfil se comunica e como deve ser abordado',
      branding,
      content: `
        ${executiveDivider('Arquitetura de comunicação do perfil', 'Leitura aplicada para líderes, pares e clientes internos')}
        <div class="grid two">
          <div class="card">
            <h3>Estilo de comunicação</h3>
            ${listHtml(narratives?.communicationStyle, ['Comunicação com foco em clareza, ritmo e objetivo de negócio.'])}
          </div>
          <div class="card">
            <h3>Necessidades de comunicação</h3>
            ${listHtml(narratives?.communicationNeeds, ['Definição explícita de prioridade, dono e próximo passo.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Boas práticas</h3>
            ${listHtml(profileContent?.communicationDo, ['Comunicar objetivo, impacto e próximo passo com clareza.'])}
          </div>
          <div class="card">
            <h3>Evitar</h3>
            ${listHtml(profileContent?.communicationDont, ['Evitar ambiguidade, promessas sem alinhamento e fechamento incompleto.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Princípios de comunicação</h3>
            ${listHtml(narratives?.communicationPrinciples, ['Ajustar profundidade por público e risco de decisão.'])}
          </div>
          <div class="card">
            <h3>Como abordar este perfil</h3>
            ${listHtml(narratives?.communicationManagerNotes, ['Dar feedback observável e fechar com compromisso de ação.'])}
          </div>
        </div>
        ${enrichmentCard(enrichment.insight, safeText(insights?.executiveByPage?.communication, 'Comunicar com método aumenta velocidade de resposta e qualidade da colaboração.'))}
        ${strategicNote('Expressão prática do comportamento', 'Em reuniões decisivas, esse perfil responde melhor a mensagens curtas, contextualizadas e orientadas para decisão com dono definido.')}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 15,
      totalPages: meta.totalPages,
      title: 'Estilo de Liderança',
      subtitle: 'Potencial de gestão, forças e riscos como líder',
      branding,
      content: `
        <div class="card">
          ${paragraphsHtml(profileContent?.leadershipStyle, ['Estilo de liderança orientado ao contexto do perfil e à maturidade da equipe.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Forças de gestão</h3>
            ${listHtml(
              [...safeArray(narratives?.leadershipStrengths, []), ...safeArray(narratives?.leadershipPrinciples, [])].slice(0, 10),
              ['Direção, contexto e acompanhamento curto aumentam resultado.']
            )}
          </div>
          <div class="card">
            <h3>Riscos de liderança</h3>
            ${listHtml(profileContent?.leadershipRisks, ['Monitorar centralização, tom e ritmo de cobrança em alta pressão.'])}
          </div>
        </div>
        <div class="grid two">
          ${strategicNote('Leitura de gestão aplicada', safeText(insights?.practicalByPage?.leadership, 'Liderança eficaz neste perfil depende de critério claro, feedback recorrente e ajuste de estilo por contexto.'))}
          ${strategicNote('Observação de desenvolvimento', 'O salto de senioridade aparece quando o líder combina direção firme com calibragem de escuta e qualidade relacional.')}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 16,
      totalPages: meta.totalPages,
      title: 'Tomada de Decisao e Autonomia',
      subtitle: 'Relacao com poder, validacao e risco',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Autonomia ideal</h3>
            <p>${esc(`Este perfil opera melhor com autonomia proporcional ao risco da decisao e com criterio explicito de escalonamento.`)}</p>
            ${listHtml([
              'Delimitar fronteira de decisao por impacto.',
              'Definir quando escalar e quando decidir localmente.',
              'Documentar racional para temas criticos.',
              'Usar checkpoint curto para decisao de alto risco.',
              'Revisar resultado com foco em aprendizado.'
            ])}
          </div>
          <div class="card">
            <h3>Pressao e validacao</h3>
            ${paragraphsHtml(profileContent?.decisionStyle, ['Sob pressao, tende a repetir o fator primario. calibragem de escuta e criterio reduz erro.'])}
            ${enrichmentCard('Risco de exagero', safeText(insights?.behavioralRisk, 'Excesso de autonomia sem alinhamento aumenta atrito, retrabalho e risco de decisao.'))}
          </div>
        </div>
        <div class="card">
          <h3>Relação com autoridade, mudanca e risco</h3>
          ${listHtml([
            `Tende a responder melhor quando autoridade define fronteira clara para o fator ${profile.primary} sem microgestao.`,
            'Mudancas com contexto, prazo e objetivo tendem a ser absorvidas com menos resistencia.',
            `A tolerancia a risco aumenta quando ha dados e ownership sobre a decisao final de ${profile.key}.`,
            'Em transicoes rapidas, checkpoints curtos reduzem ansiedade operacional e retrabalho.',
            'A qualidade de decisao sobe quando conflito de prioridade e tratado no inicio do ciclo.'
          ])}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 17,
      totalPages: meta.totalPages,
      title: 'Resposta ao Estresse',
      subtitle: 'Sinais de alerta e estratégia de recuperação',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Padrão de estresse do perfil</h3>
            ${listHtml(profileContent?.stressPattern, ['Sinais comportamentais de pressão que afetam clareza e colaboração.'])}
          </div>
          <div class="card">
            <h3>Sinais de alerta universais</h3>
            ${listHtml(
              [...safeArray(narratives?.stressSignals, []), ...safeArray(narratives?.stressSignalsShared, [])].slice(0, 10),
              ['Reatividade, queda de clareza e oscilação de consistência.']
            )}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Reações emocionais prováveis</h3>
            ${listHtml([
              `Sob pressão, o fator ${profile.primary} tende a aumentar a intensidade de resposta.`,
              'A percepção de perda de controle pode gerar comunicação mais curta e defensiva.',
              'Quando não há alinhamento de prioridade, cresce o risco de tensão com pares e liderança.',
              'A falta de retorno rápido amplia desgaste e reduz qualidade de colaboração.'
            ])}
          </div>
          <div class="card">
            <h3>Impacto no ambiente de trabalho</h3>
            ${listHtml([
              'Pode ocorrer queda de escuta em reuniões críticas.',
              'Retrabalho cresce quando o time não tem checkpoint de risco.',
              'Conflitos latentes tendem a escalar sem ritual de alinhamento.',
              'A performance se recupera quando há clareza de dono, prazo e critério.'
            ])}
          </div>
        </div>
        <div class="card">
          <h3>Como recuperar equilíbrio</h3>
          ${listHtml(profileContent?.recoveryStrategy, ['Repriorizar, reduzir ruído e retomar rotina de acompanhamento.'])}
          ${enrichmentCard('Leitura do gestor', safeText(insights?.practicalByPage?.stress, 'Gestores devem atuar cedo quando sinais de estresse aparecem para evitar escalada de conflito e queda de performance.'))}
          ${strategicNote('Atenção comportamental', 'Sob pressão prolongada, esse perfil tende a repetir o fator dominante. Intervenções rápidas preservam qualidade de decisão e relacionamento.')}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 18,
      totalPages: meta.totalPages,
      title: 'Conflitos',
      subtitle: 'Estilo de confronto e recomendacoes de resolucao',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Estilo de conflito do perfil</h3>
            ${listHtml(profileContent?.conflictStyle, ['Forma preferencial de lidar com confronto e divergencia.'])}
          </div>
          <div class="card">
            <h3>Principios de resolucao</h3>
            ${listHtml(narratives?.conflictPrinciples, ['Separar pessoa de problema e fechar acordo objetivo.'])}
          </div>
        </div>
        ${enrichmentCard('Leitura relacional', 'Conflito bem conduzido acelera maturidade da equipe; conflito evitado ou mal conduzido amplia desgaste e retrabalho.')}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 19,
      totalPages: meta.totalPages,
      title: 'Relacionamento com Equipe',
      subtitle: 'Contribuicao social, sinergias e dificuldades comuns',
      branding,
      content: `
        <div class="card">
          <h3>Papel social do perfil</h3>
          ${listHtml(profileContent?.teamContribution, ['Contribuicao para ritmo, qualidade e colaboracao no time.'])}
          <p>Em times multidisciplinares, este perfil costuma assumir papel de organizacao relacional e alinhamento de expectativa, conectando contribuicoes tecnicas com ritmo de execucao.</p>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Sinergias naturais</h3>
            ${listHtml(profileContent?.bestMatches, ['Combinacoes de perfil com maior fluidez de cooperacao.'])}
            <p>Sinergias funcionam melhor quando existe acordo claro de dono, prazo e criterio de qualidade em cada entrega.</p>
          </div>
          <div class="card">
            <h3>Dificuldades comuns</h3>
            ${listHtml(profileContent?.frictionMatches, ['Combinacoes que exigem maior alinhamento de expectativa.'])}
            <p>Atritos diminuem com rituais curtos de alinhamento, revisao de prioridades e feedback observavel sobre comportamento de colaboracao.</p>
          </div>
        </div>
        <div class="card">
          <h3>Leitura de convivencia</h3>
          ${listHtml([
            'Mapear combinacoes de perfil em atividades criticas para reduzir ruido operacional.',
            'Definir protocolo de comunicacao para decisoes urgentes e temas sensiveis.',
            'Reforcar contrato de convivio com foco em respeito, clareza e responsabilidade.',
            'Revisar conflitos recorrentes por padrao de comportamento, nao por julgamento pessoal.',
            'Consolidar aprendizado relacional em retrospectiva mensal da equipe.'
          ])}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 20,
      totalPages: meta.totalPages,
      title: 'Sinergia com Outros Perfis DISC',
      subtitle: 'Combinações complementares e pontos de atrito',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Perfis complementares</h3>
            ${listHtml(profileContent?.bestMatches, ['Perfil complementar para equilibrar decisão e relacionamento.'])}
            <p>Perfis complementares ampliam resultado quando há acordo claro de papéis e critério de colaboração.</p>
          </div>
          <div class="card">
            <h3>Perfis com atrito potencial</h3>
            ${listHtml(profileContent?.frictionMatches, ['Atrito tende a surgir quando ritmo e critério divergem sem alinhamento.'])}
            <p>Conflitos diminuem com contratos de convívio, objetivo comum e rituais curtos de alinhamento.</p>
          </div>
        </div>
        <div class="card">
          <h3>Leitura relacional aplicada</h3>
          ${listHtml([
            'Combinações com alta complementaridade funcionam melhor quando a fronteira de decisão é explícita.',
            'Perfis de atrito não devem ser evitados, e sim calibrados por contrato de comunicação.',
            'Equipes maduras usam diversidade comportamental para ampliar velocidade e qualidade simultaneamente.',
            'Gestores eficazes ajustam rituais conforme combinação de perfis predominantes.',
          ])}
        </div>
        ${enrichmentCard(enrichment.application, 'Diferença de perfil não é problema; problema é falta de combinados claros sobre decisão, prazo e qualidade.')}
        ${enrichmentCard(enrichment.managerLens, safeText(insights?.managerLens, 'Leitura do gestor para compor equipes complementares com acordos claros de colaboração.'))}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 21,
      totalPages: meta.totalPages,
      title: 'Ambiente Ideal de Trabalho',
      subtitle: 'Estrutura, cultura e ritmo para alta performance',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Ambiente que energiza</h3>
            ${listHtml(profileContent?.idealEnvironment, ['Contexto com autonomia, clareza e responsabilidade.'])}
          </div>
          <div class="card">
            <h3>Condições que drenam</h3>
            ${listHtml(narratives?.environmentDrainers, ['Ambiguidade, ruido relacional e baixa qualidade de decisao.'])}
          </div>
        </div>
        <div class="card">
          <h3>Leitura de cultura ideal</h3>
          ${listHtml(narratives?.environmentEnergizers, ['Cultura de feedback observavel e rotina de melhoria continua.'])}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 22,
      totalPages: meta.totalPages,
      title: 'Aderência a Funções e Carreira',
      subtitle: 'Áreas recomendadas e baixa aderência',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Funções recomendadas</h3>
            ${listHtml(profileContent?.recommendedRoles, ['Função com aderência comportamental alta ao perfil identificado.'])}
          </div>
          <div class="card">
            <h3>Funções de menor aderência</h3>
            ${listHtml(profileContent?.lowFitRoles, ['Função que pode gerar desgaste sem ajuste de contexto e suporte.'])}
          </div>
        </div>
        <div class="card">
          <h3>Framework de crescimento</h3>
          ${listHtml(narratives?.careerFramework, ['Evolução de carreira combina contexto adequado e desenvolvimento intencional.'])}
          <table class="table compact">
            <thead>
              <tr><th>Eixo</th><th>Leitura</th><th>Prioridade</th></tr>
            </thead>
            <tbody>
              <tr><td>Potencial técnico</td><td>Compatível com padrões de qualidade e consistência esperados.</td><td>Média</td></tr>
              <tr><td>Potencial relacional</td><td>Depende da calibragem entre comunicação, influência e escuta ativa.</td><td>Alta</td></tr>
              <tr><td>Potencial de liderança</td><td>Escala quando há clareza de contexto e rotina de feedback observável.</td><td>Alta</td></tr>
            </tbody>
          </table>
          ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.career, 'Aderência de carreira melhora quando força natural e exigência da função estão em equilíbrio.'))}
          ${enrichmentCard('Observação de carreira', safeText(insights?.careerCallout, 'Aderência de carreira melhora quando força natural e exigência da função estão em equilíbrio.'))}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 23,
      totalPages: meta.totalPages,
      title: 'Forcas Naturais',
      subtitle: 'Oito forcas principais e aplicacao no trabalho',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.naturalStrengths, ['Forca natural com impacto observavel em colaboracao e entrega.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Quando essas forcas aparecem mais</h3>
            ${listHtml([
              'Contexto com objetivo claro e criterio de sucesso definido.',
              'Ambiente com autonomia proporcional a responsabilidade.',
              'Equipe com cadencia de alinhamento e feedback observavel.',
              'Escopo com desafio adequado ao nivel de maturidade.',
              'Lideranca coerente entre discurso e cobranca.'
            ])}
          </div>
          <div class="card">
            <h3>Leitura executiva</h3>
            <p>${esc(safeText(insights?.executive, 'As forcas naturais do perfil aceleram resultado quando estao acopladas a rotina de desenvolvimento e alinhamento de contexto.'))}</p>
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 24,
      totalPages: meta.totalPages,
      title: 'Pontos de Desenvolvimento',
      subtitle: 'Áreas de maturidade para reduzir risco de exagero',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.developmentPoints, ['Ponto de desenvolvimento com alto potencial de impacto no resultado.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Risco de exagero do perfil</h3>
            <p>${esc(safeText(insights?.riskOfExcess, safeText(insights?.behavioralRisk, 'Exagero de fator primário sem calibragem pode gerar queda de qualidade relacional e impacto em performance sustentável.')))}</p>
            ${listHtml(narratives?.developmentRisks, ['Exagero comportamental sem revisão de contexto pode reduzir performance sustentável.'])}
          </div>
          <div class="card">
            <h3>Impacto na carreira</h3>
            <p>Tratar os pontos de desenvolvimento com rotina e medição reduz gargalo de progressão e aumenta confiabilidade de entrega em contextos complexos.</p>
            ${enrichmentCard(enrichment.developmentLens, safeText(insights?.developmentLens, 'Consolidar hábitos de melhoria acelera maturidade de carreira.'))}
            ${strategicNote('Coaching executivo', 'Transforme cada ponto de desenvolvimento em hábito observável com prazo, evidência e revisão quinzenal.')}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 25,
      totalPages: meta.totalPages,
      title: 'Recomendacoes de Desenvolvimento',
      subtitle: 'Habitos, treinos e evolucao mensuravel',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Habitos recomendados</h3>
            ${listHtml(narratives?.developmentHabits, ['Habito semanal de melhoria com foco em comportamento observavel.'])}
          </div>
          <div class="card">
            <h3>Perguntas de coaching</h3>
            ${listHtml(narratives?.developmentQuestions, ['Pergunta orientadora para elevar consciencia e consistencia de acao.'])}
          </div>
        </div>
        ${enrichmentCard('Evolucao mensuravel', 'Defina um indicador comportamental por ciclo quinzenal e acompanhe com feedback de pares e lideranca.')}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 26,
      totalPages: meta.totalPages,
      title: 'Como Liderar Este Perfil',
      subtitle: 'Guia para gestores: feedback, cobrança, delegação e engajamento',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.managerGuidance, ['Diretriz de líder para aumentar aderência, ritmo e qualidade de entrega.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Como dar feedback</h3>
            ${listHtml([
              'Use fato, impacto e ajuste esperado.',
              'Traga exemplo observável e contexto de negócio.',
              'Feche com ação e prazo de revisão.',
              'Evite feedback genérico ou sem critério.',
              'Reconheça evolução com evidência concreta.'
            ])}
          </div>
          <div class="card">
            <h3>Como engajar</h3>
            <p>${esc(safeText(insights?.managerCallout, 'Engajamento cresce quando o líder combina autonomia, clareza de expectativa e acompanhamento objetivo.'))}</p>
            ${enrichmentCard(enrichment.managerLens, safeText(insights?.managerLens, 'Leitura do gestor para aumentar aderência, ritmo e qualidade de entrega.'))}
          </div>
        </div>
        ${strategicNote('Contexto ideal de gestão', 'Esse perfil entrega melhor quando recebe desafio claro, critérios objetivos de qualidade e liberdade responsável para executar.')}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 27,
      totalPages: meta.totalPages,
      title: 'Como Este Perfil Deve Liderar',
      subtitle: 'Guia de autoliderança para o participante',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.selfLeadershipGuidance, ['Diretriz de autoliderança para ampliar impacto com equilíbrio comportamental.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Armadilhas de liderança</h3>
            ${listHtml(narratives?.leadershipPitfalls, ['Armadilha recorrente quando o estilo não é calibrado ao contexto.'])}
          </div>
          <div class="card">
            <h3>Roteiro de evolução</h3>
            ${listHtml([
              'Definir intenção de liderança por ciclo semanal.',
              'Revisar linguagem e tom em conversas críticas.',
              'Delegar com checkpoints claros.',
              'Criar rotina de feedback bilateral.',
              'Consolidar aprendizado em plano trimestral.'
            ])}
            ${enrichmentCard(enrichment.developmentLens, safeText(insights?.developmentLens, 'Autoliderança evolui quando insight vira rotina semanal com medição observável.'))}
          </div>
        </div>
        ${strategicNote('Leitura de maturidade', 'A evolução mais relevante ocorre quando este perfil aprende a equilibrar força natural com adaptação consciente ao contexto da equipe.')}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 28,
      totalPages: meta.totalPages,
      title: 'Plano de Ação 30/60/90 Dias',
      subtitle: 'Roteiro prático com indicadores de acompanhamento',
      branding,
      content: `
        <div class="grid three">
          <div class="card action-plan-card">
            <h3>30 dias</h3>
            ${listHtml(plans?.days30, ['Definir foco comportamental e rotina de checkpoint semanal.'])}
          </div>
          <div class="card action-plan-card">
            <h3>60 dias</h3>
            ${listHtml(plans?.days60, ['Consolidar ajuste de comunicação e decisão em contexto real.'])}
          </div>
          <div class="card action-plan-card">
            <h3>90 dias</h3>
            ${listHtml(plans?.days90, ['Escalar rotina de alta performance sustentável com feedback estruturado.'])}
          </div>
        </div>
        <div class="card">
          <h3>Indicadores recomendados</h3>
          ${listHtml([
            'Qualidade de fechamento de acordos por semana.',
            'Redução de retrabalho por falta de alinhamento.',
            'Consistência de follow-up em temas críticos.',
            'Percepção de clareza de comunicação pelo time.',
            'Evolução de autonomia com responsabilidade.'
          ])}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 29,
      totalPages: meta.totalPages,
      title: 'Glossário e Leitura Técnica',
      subtitle: 'Conceitos-chave para interpretação responsável',
      branding,
      content: `
        <div class="card">
          <h3>Glossário técnico</h3>
          <table class="table compact">
            <thead><tr><th>Termo</th><th>Definição</th></tr></thead>
            <tbody>
              ${safeArray(report?.glossary?.items, [
                { term: 'Perfil Natural', definition: 'Tendência espontânea de comportamento.' },
                { term: 'Perfil Adaptado', definition: 'Ajuste comportamental exigido pelo contexto.' },
                { term: 'Benchmark', definition: 'Comparação com faixa típica de referência.' },
              ])
                .slice(0, 10)
                .map(
                  (item) => `<tr><td>${esc(item.term)}</td><td>${esc(item.definition)}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="grid two">
          ${strategicNote('Diferença entre natural e adaptado', 'O natural representa a expressão espontânea. O adaptado revela como o contexto atual pede ajustes comportamentais.')}
          ${strategicNote('Leitura de benchmark', 'Benchmark não é rótulo. É referência para orientar decisões de desenvolvimento e calibragem de papel.')}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 30,
      totalPages: meta.totalPages,
      title: 'Conclusão Estratégica do Perfil',
      subtitle: 'Síntese personalizada, próximos passos e assinatura institucional',
      branding,
      enforceDensity: false,
      content: `
        <div class="card">
          <h3>Mensagem final personalizada</h3>
          ${paragraphsHtml(
            finalConclusionBlocks({ participant, profile, profileContent, insights, plans }),
            [
              `${safeText(participant.name)}, sua leitura comportamental evidencia potencial de impacto profissional quando aplicada com disciplina, contexto e evolução contínua.`,
            ]
          )}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Resumo técnico e confidencialidade</h3>
            <p><strong>Perfil identificado:</strong> ${esc(profile.key)} • <strong>Arquétipo:</strong> ${esc(profile.archetype)}</p>
            <p><strong>Fatores de maior expressão:</strong> ${esc(profile.primary)} e ${esc(profile.secondary)}</p>
            <p><strong>Custo de adaptação:</strong> ${esc(adaptation.label)} (${esc(adaptation.avgAbsDelta)} pontos)</p>
            <p>${esc(safeText(report?.lgpd?.notice, 'Dados pessoais tratados para finalidade de desenvolvimento comportamental, conforme consentimento e princípios da LGPD.'))}</p>
            <p><strong>Contato:</strong> ${esc(safeText(report?.lgpd?.contact, 'suporte@insightdisc.app'))}</p>
          </div>
          <div class="card">
            <h3>Assinatura institucional</h3>
            <p><strong>${esc(meta.responsibleName)}</strong></p>
            <p>${esc(meta.responsibleRole)}</p>
            <p>${esc(branding.company_name)}</p>
            <p>${esc(branding.report_footer_text)}</p>
          </div>
        </div>
        <div class="card final-lockup">
          <img src="${esc(DEFAULT_BRANDING.logo_url)}" alt="InsightDISC" class="final-lockup-logo" />
          <p><strong>${esc(participant.name)}</strong>, o próximo nível do seu desenvolvimento começa quando cada insight se transforma em ação observável no seu contexto real de trabalho.</p>
        </div>
        ${strategicNote('Encerramento premium', 'Use este relatório como instrumento de decisão e desenvolvimento contínuo. O valor está na aplicação prática com disciplina, contexto e acompanhamento real.')}
      `,
    })
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(meta.reportTitle)} | ${esc(branding.company_name)}</title>
  <style>
    :root {
      --primary: ${esc(branding.brand_primary_color)};
      --secondary: ${esc(branding.brand_secondary_color)};
      --ink: #0f172a;
      --muted: #475569;
      --line: #dbe0e8;
      --paper: #ffffff;
      --paper-alt: #f7f8fa;
      --card: #ffffff;
      --radius: 14px;
      --shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #edf1f6;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: var(--ink);
      line-height: 1.5;
    }

    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      body {
        background: #fff;
      }

      .page {
        margin: 0 !important;
        width: 210mm !important;
        height: 296mm !important;
        min-height: 296mm !important;
        max-height: 296mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }
    }

    .page {
      width: 210mm;
      height: 296mm;
      min-height: 296mm;
      max-height: 296mm;
      margin: 8mm auto;
      background: var(--paper);
      border-radius: 10px;
      overflow: hidden;
      position: relative;
      box-shadow: var(--shadow);
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #e7ebf1;
    }

    .page-backdrop {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 96% 4%, rgba(247, 181, 0, 0.11), transparent 28%),
        radial-gradient(circle at 4% 92%, rgba(11, 31, 59, 0.08), transparent 30%);
      opacity: 0.95;
    }

    .page:last-child {
      break-after: auto;
    }

    .page-even {
      background: var(--paper-alt);
    }

    .page-odd {
      background: var(--paper);
    }

    .content {
      position: relative;
      z-index: 1;
      padding: 7.5mm 10mm 20mm;
      height: 100%;
      overflow: hidden;
    }

    .page-brand-strip {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 12px;
      margin-bottom: 2.4mm;
      padding: 7px 11px;
      min-height: 50px;
      border: 1px solid #d8e1ee;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 250, 255, 0.95));
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
    }

    .report-header-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      min-width: 0;
    }

    .report-header-brand {
      font-size: 20px;
      font-weight: 800;
      color: #0b1f3b;
      line-height: 1;
      letter-spacing: 0.2px;
    }

    .report-header-subtitle {
      font-size: 11px;
      color: #64748b;
      line-height: 1.2;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 3.6mm;
      border-bottom: 1px solid var(--line);
      padding-bottom: 2.2mm;
    }

    .section-head-title {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .section-icon {
      width: 30px;
      height: 30px;
      border-radius: 10px;
      border: 1px solid #d8e0ec;
      background: linear-gradient(180deg, #ffffff, #f3f7ff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      flex-shrink: 0;
    }

    .section-icon svg {
      width: 16px;
      height: 16px;
      stroke: var(--primary);
      stroke-width: 1.9;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .section-head h2 {
      margin: 0;
      color: var(--primary);
      font-size: 23px;
      line-height: 1.16;
      letter-spacing: -0.35px;
      font-weight: 750;
    }

    .section-head h2::after {
      content: "";
      display: block;
      width: 62px;
      height: 3px;
      margin-top: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--secondary), rgba(247, 181, 0, 0.15));
    }

    .section-head span {
      font-size: 11px;
      color: var(--muted);
      text-align: right;
      max-width: 72mm;
    }

    .footer {
      position: absolute;
      bottom: 5.5mm;
      left: 11mm;
      right: 11mm;
      border-top: 1px solid var(--line);
      padding-top: 2.2mm;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 10px;
      color: #5b6474;
    }

    .cover-page {
      background: #020916;
      border: none;
    }

    .cover-page::before {
      display: none;
    }

    .cover-content {
      position: relative;
      z-index: 1;
      padding: 0;
      height: 100%;
      width: 100%;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      overflow: hidden;
    }

    .cover-art-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      display: block;
      background: #020916;
    }

    .executive-hero {
      border: 1px solid #ccd9eb;
      background: linear-gradient(180deg, #f9fbff, #ffffff);
      box-shadow: 0 8px 26px rgba(19, 42, 95, 0.08);
    }

    .executive-divider {
      border-left: 4px solid var(--secondary);
      padding-left: 10px;
      margin-bottom: 10px;
    }

    .executive-divider h3 {
      margin-bottom: 4px;
      color: #0f2b55;
      font-size: 17px;
    }

    .executive-divider p {
      margin: 0;
      font-size: 12.4px;
      color: #4a5b76;
    }

    .cover-footer {
      background: transparent;
      color: rgba(255, 255, 255, 0.84);
      border-top: 1px solid rgba(255, 255, 255, 0.24);
    }

    p {
      margin: 0 0 10px;
      font-size: 12.9px;
      color: #1f2937;
      line-height: 1.48;
    }

    h3 {
      margin: 0 0 6px;
      font-size: 15.4px;
      color: var(--primary);
      line-height: 1.24;
      letter-spacing: -0.15px;
    }

    h4 {
      margin: 0 0 6px;
      font-size: 12px;
      color: #1e293b;
      line-height: 1.3;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .grid {
      display: grid;
      gap: 10px;
    }

    .grid.two {
      grid-template-columns: 1fr 1fr;
    }

    .grid.three {
      grid-template-columns: repeat(3, 1fr);
    }

    .card {
      background: var(--card);
      border: 1px solid #d9e0ea;
      border-radius: var(--radius);
      padding: 12px;
      box-shadow: 0 3px 14px rgba(15, 23, 42, 0.038);
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .card::after {
      content: "";
      position: absolute;
      right: -28px;
      bottom: -28px;
      width: 86px;
      height: 86px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(11, 31, 59, 0.08), rgba(11, 31, 59, 0));
      pointer-events: none;
    }

    .strategic-note {
      background: #ffffff;
      border: 1px solid #d5deec;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
      margin-top: 10px;
    }

    .strategic-note h4 {
      margin-bottom: 4px;
      color: #112d5c;
    }

    .strategic-note p {
      margin-bottom: 0;
      font-size: 12.7px;
      line-height: 1.52;
    }

    .strategic-note .muted-note {
      margin-top: 6px;
      color: #51637f;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 10px;
    }

    .kpi-pill {
      background: #ffffff;
      border: 1px solid #dce3ef;
      border-radius: 12px;
      padding: 10px;
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .kpi-pill-wide {
      grid-column: span 3;
      justify-content: space-between;
      padding-inline: 12px;
    }

    .kpi-chip {
      width: 27px;
      height: 27px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0f172a;
      font-weight: 800;
      font-size: 12px;
      border: 1px solid #d7deea;
      flex-shrink: 0;
    }

    .kpi-copy {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .kpi-copy span {
      font-size: 11px;
      color: #59667a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .kpi-copy strong {
      font-size: 16px;
      color: #0f172a;
      line-height: 1.1;
    }

    .kpi-copy small {
      font-size: 11px;
      color: #5f6f89;
    }

    .callout-box {
      border-radius: 12px;
      padding: 10px 12px;
      margin-top: 10px;
      border-left: 4px solid transparent;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .compact-enrichment .callout-box {
      margin-top: 0;
    }

    .compact-density-note {
      margin-top: 8px;
      padding: 9px 11px;
      background: #f8fbff;
      border-color: #d6e1f0;
    }

    .callout-insight {
      background: #f4f8ff;
      border: 1px solid #cfe0ff;
      border-left-color: #3b82f6;
    }

    .callout-application {
      background: #f7f9ff;
      border: 1px solid #d7ddff;
      border-left-color: #6366f1;
    }

    .callout-manager {
      background: #f4fbf8;
      border: 1px solid #c8eadc;
      border-left-color: #10b981;
    }

    .callout-development {
      background: #fff9f2;
      border: 1px solid #ffe2c2;
      border-left-color: #f59e0b;
    }

    .callout-warning {
      background: #fff5f5;
      border: 1px solid #ffd2d2;
      border-left-color: #ef4444;
    }

    .callout-example {
      background: #f8fafc;
      border: 1px solid #dce4ee;
      border-left-color: #64748b;
    }

    .callout-box p {
      margin-bottom: 0;
    }

    .summary-intro {
      border-top: 3px solid rgba(247, 181, 0, 0.55);
      background: linear-gradient(180deg, #fffdf8, #ffffff);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }

    .summary-col {
      background: #ffffff;
      border: 1px solid #dae3f0;
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
      display: grid;
      gap: 6px;
    }

    .summary-item {
      display: grid;
      grid-template-columns: 34px 1fr;
      align-items: center;
      gap: 8px;
      border: 1px solid #e2e8f1;
      border-radius: 10px;
      padding: 6px 8px;
      background: linear-gradient(180deg, #ffffff, #f9fbff);
    }

    .summary-order {
      font-size: 11px;
      font-weight: 800;
      color: #0f2f64;
      background: #edf3ff;
      border: 1px solid #d6e2fb;
      border-radius: 999px;
      text-align: center;
      padding: 4px 0;
      line-height: 1;
    }

    .summary-copy {
      font-size: 12.2px;
      color: #1f2937;
      line-height: 1.3;
    }

    .visual-panel {
      margin-top: 12px;
      border: 1px solid #d8e0ed;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff, #f8fbff);
      padding: 12px;
      box-shadow: 0 5px 18px rgba(15, 23, 42, 0.04);
    }

    .visual-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #dde5f1;
      margin-bottom: 10px;
    }

    .visual-panel-header h4 {
      margin: 0;
      color: #0f2a52;
    }

    .visual-panel-header span {
      font-size: 10.8px;
      color: #61708a;
      text-align: right;
      max-width: 60%;
    }

    .visual-signal-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .visual-signal-card {
      border: 1px solid #dce4ef;
      border-radius: 10px;
      padding: 8px;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
    }

    .visual-signal-head {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 6px;
    }

    .visual-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .visual-signal-head strong {
      font-size: 11px;
      color: #0f172a;
      line-height: 1;
    }

    .visual-signal-head small {
      font-size: 9px;
      color: #607089;
      line-height: 1;
    }

    .visual-track {
      height: 7px;
      border-radius: 999px;
      background: #e5ebf4;
      overflow: hidden;
      margin-bottom: 6px;
    }

    .visual-fill {
      height: 100%;
      border-radius: 999px;
    }

    .visual-signal-card p {
      margin: 0;
      font-size: 10px;
      line-height: 1.35;
      color: #4d5d76;
    }

    .visual-panel-notes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }

    .visual-panel-notes p {
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
      color: #334155;
      padding: 8px;
      border-radius: 10px;
      border: 1px solid #dbe3ef;
      background: #ffffff;
    }

    .factor-card {
      background: #ffffff;
      border: 1px solid #dce3ec;
      border-top: 4px solid var(--factor);
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }

    .factor-card .mini-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }

    .bullet-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 7px;
    }

    .bullet-list li {
      position: relative;
      padding-left: 16px;
      font-size: 13px;
      color: #1f2937;
      line-height: 1.42;
    }

    .bullet-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      top: 0;
      color: var(--secondary);
      font-weight: 800;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    .table th,
    .table td {
      border-bottom: 1px solid #dee5ee;
      padding: 7px 8px;
      text-align: left;
      vertical-align: top;
    }

    .table th {
      background: #f2f6fb;
      color: #0f172a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .table.compact td,
    .table.compact th {
      padding: 7px 8px;
      font-size: 12px;
    }

    .action-plan-card {
      border-top: 4px solid var(--secondary);
      background: linear-gradient(180deg, #fffdf7, #ffffff);
    }

    .bar-row {
      display: grid;
      grid-template-columns: 132px 1fr 46px;
      gap: 10px;
      align-items: center;
      margin-bottom: 8px;
    }

    .bar-label {
      font-size: 12px;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .bar-track {
      height: 10px;
      border-radius: 999px;
      background: #e3e8f1;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 999px;
    }

    .bar-value {
      text-align: right;
      font-size: 12px;
      color: #1f2937;
      font-weight: 700;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .radar-card {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 250px;
    }

    .radar {
      width: 100%;
      max-width: 420px;
      height: auto;
    }

    .final-lockup {
      display: grid;
      grid-template-columns: 108px 1fr;
      gap: 12px;
      align-items: center;
      border-top: 3px solid rgba(247, 181, 0, 0.62);
      background: linear-gradient(180deg, #ffffff, #f8fbff);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .final-lockup-logo {
      width: 100%;
      max-width: 108px;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .final-lockup p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #1f2f46;
    }
  </style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}

export default renderReportHtml;
