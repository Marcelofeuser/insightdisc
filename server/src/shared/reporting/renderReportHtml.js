const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_META = {
  D: { label: 'Dominância', color: '#E53935' },
  I: { label: 'Influência', color: '#FBC02D' },
  S: { label: 'Estabilidade', color: '#43A047' },
  C: { label: 'Conformidade', color: '#1E88E5' },
};

const PERSONAL_SUMMARY_ITEMS = Object.freeze([
  'Apresentação Executiva',
  'O que é DISC',
  'Perfil Comportamental',
  'Síntese Executiva',
  'Gráficos DISC',
  'Radar Comportamental',
  'Benchmark do Perfil',
  'Comunicação',
  'Liderança',
  'Ambiente Ideal',
  'Forças Naturais',
  'Pontos de Desenvolvimento',
  'Plano de Desenvolvimento',
  'Conclusão',
]);

const PROFESSIONAL_SUMMARY_ITEMS = Object.freeze([
  ...PERSONAL_SUMMARY_ITEMS,
  'Dinâmica Geral do Perfil',
  'Motivadores',
  'Comportamento no Trabalho',
  'Conflitos',
  'Relacionamento com a Equipe',
  'Sinergia com Perfis DISC',
  'Aderência a Funções e Carreira',
  'Como Liderar Este Perfil',
]);

const BUSINESS_SUMMARY_ITEMS = Object.freeze([
  ...PROFESSIONAL_SUMMARY_ITEMS,
  'Natural vs Adaptado',
  'Mudança Comportamental',
  'Índice de Adaptação',
  'Índice de Estresse',
  'Zona de Conforto vs Esforço',
  'Mapa de Comunicação',
  'Mapa de Competências',
  'Heatmap de Compatibilidade',
]);

const SUMMARY_ITEMS = BUSINESS_SUMMARY_ITEMS;

const REPORT_TIER = Object.freeze({
  PERSONAL: 'personal',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
});

const PERSONAL_PAGE_SEQUENCE = Object.freeze([
  1,  // Capa
  2,  // Sumário
  3,  // O que é DISC
  4,  // 4 Fatores DISC
  5,  // Síntese executiva
  6,  // Gráficos DISC
  7,  // Radar comportamental
  8,  // Benchmark
  10, // Processo de decisão
  13, // Comportamento no trabalho
  14, // Comunicação
  17, // Estresse
  21, // Ambiente ideal
  23, // Forças
  24, // Pontos de desenvolvimento
  25, // Recomendações
  28, // Plano 30/60/90
  30, // Conclusão
]);

const PROFESSIONAL_PAGE_SEQUENCE = Object.freeze([
  1,  // Capa
  2,  // Sumário
  3,  // O que é DISC
  4,  // Visão geral dos fatores
  5,  // Síntese executiva
  6,  // Gráficos DISC
  7,  // Radar
  8,  // Benchmark
  9,  // Dinâmica geral
  10, // Processo de decisão
  11, // Motivadores
  13, // Comportamento no trabalho
  14, // Comunicação
  15, // Liderança
  17, // Estresse
  18, // Conflitos
  19, // Relacionamento em equipe
  20, // Sinergia com perfis
  21, // Ambiente ideal
  22, // Carreira
  23, // Forças
  24, // Pontos de desenvolvimento
  28, // Plano de desenvolvimento
  30, // Conclusão
]);

const BUSINESS_PAGE_SEQUENCE = Object.freeze([
  1,  // Capa
  2,  // Sumário
  3,  // O que é DISC
  4,  // Visão geral dos fatores
  5,  // Síntese executiva
  6,  // Gráficos DISC
  7,  // Radar
  8,  // Benchmark
  9,  // Dinâmica geral
  10, // Processo de decisão
  11, // Motivadores
  12, // Drenadores de energia
  13, // Comportamento no trabalho
  14, // Comunicação
  15, // Liderança
  16, // Tomada de decisão e autonomia
  17, // Estresse
  18, // Conflitos
  19, // Relacionamento em equipe
  20, // Sinergia com perfis
  21, // Ambiente ideal
  22, // Carreira
  23, // Forças
  24, // Pontos de desenvolvimento
  25, // Recomendações
  26, // Como liderar este perfil
  27, // Como este perfil deve liderar
  28, // Plano de desenvolvimento
  29, // Glossário
  30, // Conclusão
]);

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
  cover_url: '/brand/report-cover-standard.jpg',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
  website: 'www.insightdisc.app',
  support_email: 'contato@insightdisc.app',
  instagram: '@insightdisc',
  logo_contains_tagline: false,
});

const PLATFORM_BRAND_LINE = 'InsightDISC – Plataforma de Análise Comportamental';

const COVER_BACKGROUND_BY_TIER = Object.freeze({
  business: '',
  professional: '',
  personal: '',
});

function resolveCoverBackgroundByTier(reportType = REPORT_TIER.BUSINESS) {
  if (reportType === REPORT_TIER.PERSONAL) return COVER_BACKGROUND_BY_TIER.personal;
  if (reportType === REPORT_TIER.PROFESSIONAL) return COVER_BACKGROUND_BY_TIER.professional;
  return COVER_BACKGROUND_BY_TIER.business;
}

function toAbsoluteAssetUrl(assetPath = '', assetBaseUrl = '') {
  const normalizedPath = String(assetPath || '').trim();
  const normalizedBase = String(assetBaseUrl || '').trim().replace(/\/+$/, '');
  if (!normalizedPath || !normalizedPath.startsWith('/') || !normalizedBase) return '';
  return `${normalizedBase}${normalizedPath}`;
}

function resolvePdfImageSrc(primarySrc = '', options = {}) {
  const fallbackSrc = String(options?.fallbackSrc || '').trim();
  const assetBaseUrl = String(options?.assetBaseUrl || '').trim();
  const candidates = [primarySrc, fallbackSrc]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (/^data:image\//i.test(candidate)) return candidate;
    if (/^https?:\/\//i.test(candidate)) return candidate;
    if (/^file:\/\//i.test(candidate)) return candidate;

    if (candidate.startsWith('/')) {
      const absoluteUrl = toAbsoluteAssetUrl(candidate, assetBaseUrl);
      if (absoluteUrl) return absoluteUrl;
      if (/^\/(brand|report-assets|assets)\//i.test(candidate)) {
        return candidate;
      }
      continue;
    }
  }

  return '';
}

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

function normalizeReportType(value) {
  const normalized = safeText(value, REPORT_TIER.BUSINESS).toLowerCase();
  if (normalized === 'standard') return REPORT_TIER.PERSONAL;
  if (normalized === 'premium') return REPORT_TIER.BUSINESS;
  if (normalized === REPORT_TIER.PERSONAL) return REPORT_TIER.PERSONAL;
  if (normalized === REPORT_TIER.PROFESSIONAL) return REPORT_TIER.PROFESSIONAL;
  return REPORT_TIER.BUSINESS;
}

function firstNonEmptyText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
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

function ensureUniqueItems(items = []) {
  return Array.from(
    new Set(
      safeArray(items, [])
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  );
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
    website: safeText(branding?.website, DEFAULT_BRANDING.website),
    support_email: safeText(branding?.support_email || branding?.contact_email, DEFAULT_BRANDING.support_email),
    instagram: safeText(branding?.instagram, DEFAULT_BRANDING.instagram),
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
  const normalized = {
    quantitativeAvailable: input?.quantitativeAvailable !== false,
    availabilityMessage: safeText(input?.availabilityMessage, ''),
  };
  for (const factor of FACTORS) {
    normalized[factor] = clamp(input?.[factor]);
  }

  const hasAny = FACTORS.some((factor) => normalized[factor] > 0);
  if (hasAny) return normalized;

  return {
    D: 25,
    I: 25,
    S: 25,
    C: 25,
    quantitativeAvailable: normalized.quantitativeAvailable,
    availabilityMessage: normalized.availabilityMessage,
  };
}

function hasQuantitativeScoreData(scores = {}) {
  return scores?.quantitativeAvailable !== false;
}

function quantitativeDataUnavailableHtml(
  title = 'Medição quantitativa indisponível',
  message = 'Esta avaliação legada não preservou scores DISC confiáveis. A leitura abaixo mantém apenas a interpretação qualitativa disponível.'
) {
  return `
    <div class="strategic-note">
      <h4>${esc(title)}</h4>
      <p>${esc(message)}</p>
    </div>
  `;
}

function listHtml(items, fallback) {
  const list = ensureUniqueItems(safeArray(items, fallback)).slice(0, 12);
  return `<ul class="bullet-list">${list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function paragraphsHtml(items, fallback) {
  const paragraphs = ensureUniqueItems(safeArray(items, fallback)).slice(0, 4);
  return paragraphs.map((item) => `<p>${esc(item)}</p>`).join('');
}

function scoresTable(scores) {
  if (!hasQuantitativeScoreData(scores)) {
    return `
      <table class="table compact">
        <thead>
          <tr>
            <th>Fator</th>
            <th>Natural</th>
            <th>Adaptado</th>
            <th>Síntese</th>
          </tr>
        </thead>
        <tbody>
          ${FACTORS.map(
            (factor) => `
              <tr>
                <td>${factor} - ${FACTOR_META[factor].label}</td>
                <td>n/d</td>
                <td>n/d</td>
                <td>n/d</td>
              </tr>
            `
          ).join('')}
        </tbody>
      </table>
      ${quantitativeDataUnavailableHtml('Scores quantitativos indisponíveis', scores?.availabilityMessage)}
    `;
  }

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
  if (!hasQuantitativeScoreData(scores)) {
    return `
      <div class="card">
        <h3>${esc(title)}</h3>
        ${quantitativeDataUnavailableHtml('Gráfico indisponível', scores?.availabilityMessage)}
      </div>
    `;
  }

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
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml('Radar indisponível', scores?.availabilityMessage);
  }

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

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function discWheelSvg(scores = {}) {
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml('Roda DISC indisponível', scores?.availabilityMessage);
  }

  const width = 420;
  const height = 320;
  const cx = 160;
  const cy = 160;
  const outerRadius = 106;
  const innerRadius = 56;
  const factors = ['D', 'I', 'S', 'C'];
  const angles = {
    D: { start: -90, end: 0 },
    I: { start: 0, end: 90 },
    S: { start: 90, end: 180 },
    C: { start: 180, end: 270 },
  };

  const segments = factors
    .map((factor) => {
      const info = angles[factor];
      const startOuter = polarToCartesian(cx, cy, outerRadius, info.start);
      const endOuter = polarToCartesian(cx, cy, outerRadius, info.end);
      const startInner = polarToCartesian(cx, cy, innerRadius, info.start);
      const endInner = polarToCartesian(cx, cy, innerRadius, info.end);
      return `
        <path
          d="M ${startOuter.x} ${startOuter.y}
             A ${outerRadius} ${outerRadius} 0 0 1 ${endOuter.x} ${endOuter.y}
             L ${endInner.x} ${endInner.y}
             A ${innerRadius} ${innerRadius} 0 0 0 ${startInner.x} ${startInner.y}
             Z"
          fill="${FACTOR_META[factor].color}"
          fill-opacity="0.88"
          stroke="#ffffff"
          stroke-width="2"
        />
      `;
    })
    .join('');

  const labels = factors
    .map((factor) => {
      const angle = (angles[factor].start + angles[factor].end) / 2;
      const point = polarToCartesian(cx, cy, outerRadius + 18, angle);
      const score = clamp(scores?.[factor]);
      return `
        <text x="${point.x}" y="${point.y}" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a">
          ${factor} ${score}%
        </text>
      `;
    })
    .join('');

  const dominant = FACTORS.reduce(
    (acc, factor) =>
      clamp(scores?.[factor]) > clamp(scores?.[acc]) ? factor : acc,
    'D'
  );
  const dominantAngle = (angles[dominant].start + angles[dominant].end) / 2;
  const markerOuter = polarToCartesian(cx, cy, outerRadius + 2, dominantAngle);
  const markerLabel = polarToCartesian(cx, cy, outerRadius + 34, dominantAngle);

  return `
    <svg class="radar wheel-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Roda comportamental DISC">
      <circle cx="${cx}" cy="${cy}" r="${outerRadius + 8}" fill="none" stroke="#d9e2ef" stroke-width="1.5" />
      ${segments}
      <circle cx="${cx}" cy="${cy}" r="${innerRadius - 4}" fill="#ffffff" stroke="#d9e2ef" stroke-width="1.5" />
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a">DISC</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10.5" fill="#64748b">Roda comportamental</text>
      <line x1="${cx}" y1="${cy}" x2="${markerOuter.x}" y2="${markerOuter.y}" stroke="${FACTOR_META[dominant].color}" stroke-width="2.4" />
      <circle cx="${markerOuter.x}" cy="${markerOuter.y}" r="4.5" fill="${FACTOR_META[dominant].color}" />
      <text x="${markerLabel.x}" y="${markerLabel.y}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#0f172a">
        Dominante: ${dominant}
      </text>
      ${labels}
    </svg>
  `;
}

function gaugeSvg(value = 0, options = {}) {
  const safeValue = clamp(value, 0, 100);
  const color = safeText(options?.color, '#1E88E5');
  const label = safeText(options?.label, 'Índice');
  const subtitle = safeText(options?.subtitle, '');
  const width = 320;
  const height = 210;
  const cx = 160;
  const cy = 158;
  const radius = 92;
  const startAngle = -210;
  const endAngle = 30;
  const currentAngle = startAngle + (safeValue / 100) * (endAngle - startAngle);
  const baseArc = describeArcPath(cx, cy, radius, startAngle, endAngle);
  const valueArc = describeArcPath(cx, cy, radius, startAngle, currentAngle);
  const marker = polarToCartesian(cx, cy, radius, currentAngle);

  return `
    <svg class="gauge-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
      <path d="${baseArc}" stroke="#dce5f1" stroke-width="14" fill="none" stroke-linecap="round" />
      <path d="${valueArc}" stroke="${esc(color)}" stroke-width="14" fill="none" stroke-linecap="round" />
      <circle cx="${marker.x}" cy="${marker.y}" r="5.5" fill="${esc(color)}" />
      <text x="${cx}" y="${cy - 18}" text-anchor="middle" font-size="13" font-weight="800" fill="#0f172a">${esc(label)}</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="31" font-weight="800" fill="#0f172a">${safeValue}</text>
      <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="10.8" fill="#64748b">de 100</text>
      ${subtitle ? `<text x="${cx}" y="${cy + 48}" text-anchor="middle" font-size="10.3" fill="#475569">${esc(subtitle)}</text>` : ''}
    </svg>
  `;
}

function naturalVsAdaptedTableHtml(scores = {}) {
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml('Comparativo indisponível', scores?.availabilityMessage);
  }

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Fator</th>
          <th>Natural</th>
          <th>Adaptado</th>
          <th>Diferença</th>
          <th>Leitura</th>
        </tr>
      </thead>
      <tbody>
        ${FACTORS.map((factor) => {
          const natural = clamp(scores?.natural?.[factor]);
          const adapted = clamp(scores?.adapted?.[factor]);
          const delta = adapted - natural;
          const absDelta = Math.abs(delta);
          const intensity =
            absDelta >= 25
              ? 'Ajuste alto'
              : absDelta >= 12
                ? 'Ajuste moderado'
                : 'Ajuste leve';
          return `
            <tr>
              <td><span class="disc-chip disc-chip-${factor.toLowerCase()}">${factor}</span>${esc(FACTOR_META[factor].label)}</td>
              <td>${natural}%</td>
              <td>${adapted}%</td>
              <td>${delta >= 0 ? '+' : ''}${delta}%</td>
              <td>${esc(intensity)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function effortBarRowsHtml(scores = {}) {
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml('Mapa de esforço indisponível', scores?.availabilityMessage);
  }

  return FACTORS.map((factor) => {
    const natural = clamp(scores?.natural?.[factor]);
    const adapted = clamp(scores?.adapted?.[factor]);
    const delta = Math.abs(adapted - natural);
    return `
      <div class="bar-row">
        <div class="bar-label">
          <span class="dot" style="background:${FACTOR_META[factor].color}"></span>
          ${factor} - ${FACTOR_META[factor].label}
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${delta}%;background:${FACTOR_META[factor].color}"></div>
        </div>
        <div class="bar-value">${delta}%</div>
      </div>
    `;
  }).join('');
}

function compatibilityHeatmapHtml(profile = {}, scores = {}) {
  const primary = resolvePrimaryFactor(profile, scores?.summary || scores);
  const factors = ['D', 'I', 'S', 'C'];
  const matrix = {
    D: { D: 58, I: 72, S: 48, C: 67 },
    I: { D: 72, I: 64, S: 74, C: 56 },
    S: { D: 48, I: 74, S: 69, C: 78 },
    C: { D: 67, I: 56, S: 78, C: 73 },
  };

  const toneByScore = (value) => {
    if (value >= 75) return 'rgba(67,160,71,0.30)';
    if (value >= 63) return 'rgba(30,136,229,0.22)';
    if (value >= 52) return 'rgba(251,192,45,0.24)';
    return 'rgba(229,57,53,0.20)';
  };

  return `
    <div class="heatmap-wrap">
      <table class="table compact heatmap-table">
        <thead>
          <tr>
            <th>Perfil base</th>
            ${factors.map((factor) => `<th>${factor}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${factors.map((row) => `
            <tr>
              <td>${row}</td>
              ${factors.map((col) => {
                const score = matrix[row][col];
                const cellClass = row === primary ? 'heatmap-primary-row' : '';
                return `<td class="${cellClass}" style="background:${toneByScore(score)}">${score}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="heatmap-caption">Matriz referencial para sinergia relacional entre estilos DISC em contextos de colaboração.</p>
    </div>
  `;
}

function communicationMapHtml(profileContent = {}) {
  const doList = safeArray(
    profileContent?.communicationDo || profileContent?.communicationPreferred,
    [
      'Seja direto e objetivo no ponto principal.',
      'Apresente contexto e impacto antes de detalhar.',
      'Confirme entendimento e próximos passos.',
      'Adapte o ritmo da conversa ao interlocutor.',
    ]
  );
  const avoidList = safeArray(
    profileContent?.communicationAvoid || profileContent?.communicationPitfalls,
    [
      'Rodeios excessivos sem foco prático.',
      'Mensagens ambíguas sem critério de decisão.',
      'Interrupções constantes em debates críticos.',
      'Feedback sem exemplo concreto de comportamento.',
    ]
  );

  return `
    <div class="grid two stack-on-print">
      <div class="card">
        <h3>Fazer</h3>
        ${listHtml(doList.slice(0, 6))}
      </div>
      <div class="card">
        <h3>Evitar</h3>
        ${listHtml(avoidList.slice(0, 6))}
      </div>
    </div>
  `;
}

function competencyLevelLabel(score) {
  if (score >= 80) return 'Muito alto';
  if (score >= 65) return 'Alto';
  if (score >= 50) return 'Moderado';
  if (score >= 35) return 'Em desenvolvimento';
  return 'Baixo';
}

function competencyStars(score) {
  const stars = Math.max(1, Math.min(5, Math.round(score / 20)));
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function competencyMapTableHtml(scores = {}) {
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml('Mapa de competências indisponível', scores?.availabilityMessage);
  }

  const s = scores?.summary || {};
  const metrics = [
    { name: 'Liderança', score: Math.round(clamp(s.D) * 0.42 + clamp(s.I) * 0.32 + clamp(s.C) * 0.26) },
    { name: 'Organização', score: Math.round(clamp(s.C) * 0.5 + clamp(s.S) * 0.35 + clamp(s.D) * 0.15) },
    { name: 'Persuasão', score: Math.round(clamp(s.I) * 0.62 + clamp(s.D) * 0.28 + clamp(s.S) * 0.1) },
    { name: 'Trabalho em equipe', score: Math.round(clamp(s.S) * 0.44 + clamp(s.I) * 0.32 + clamp(s.C) * 0.24) },
    { name: 'Decisão sob pressão', score: Math.round(clamp(s.D) * 0.48 + clamp(s.C) * 0.27 + clamp(s.I) * 0.25) },
  ];

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Competência</th>
          <th>Índice</th>
          <th>Nível</th>
          <th>Leitura</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.map((metric) => `
          <tr>
            <td>${esc(metric.name)}</td>
            <td>${metric.score}%</td>
            <td>${esc(competencyLevelLabel(metric.score))}</td>
            <td>${esc(competencyStars(metric.score))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function benchmarkRowsHtml(rows = []) {
  const normalized = safeArray(rows, []);
  return normalized
    .map((row) => {
      const factor = safeText(row?.factor || row?.label, 'Fator');
      const score = Number.isFinite(Number(row?.score)) ? `${clamp(row?.score)}%` : 'n/d';
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
  if (!hasQuantitativeScoreData(scores)) {
    return '<tr><td colspan="4">Medição quantitativa indisponível nesta avaliação legada. A aderência contextual deve ser lida apenas de forma qualitativa.</td></tr>';
  }

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
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml(
      'Painel quantitativo indisponível',
      scores?.availabilityMessage ||
        `Esta avaliação preservou apenas a leitura qualitativa do perfil ${safeText(profile?.key, 'DISC')}.`
    );
  }

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
          <small>Delta médio: ${esc(adaptation?.avgAbsDelta == null ? 'n/d' : Number(adaptation.avgAbsDelta).toFixed(2))}</small>
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

function resolvePrimaryFactor(profile = {}, scores = {}) {
  const primary = safeText(profile?.primary).toUpperCase();
  if (FACTOR_META[primary]) return primary;
  return FACTORS.reduce((best, factor) => {
    if (clamp(scores?.[factor]) > clamp(scores?.[best])) return factor;
    return best;
  }, 'D');
}

function factorAccentBadge(profile = {}, scores = {}, label = 'Fator dominante') {
  const primaryFactor = resolvePrimaryFactor(profile, scores);
  const meta = FACTOR_META[primaryFactor] || FACTOR_META.D;
  return `
    <div class="factor-accent-badge" style="--accent:${meta.color}">
      <span>${esc(label)}</span>
      <strong>${esc(primaryFactor)} • ${esc(meta.label)}</strong>
    </div>
  `;
}

function miniDiscBarsHtml(scores = {}, title = 'Mapa técnico DISC') {
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml('Distribuição quantitativa indisponível', scores?.availabilityMessage);
  }

  return `
    <div class="mini-disc-chart">
      <div class="mini-disc-header">
        <h4>${esc(title)}</h4>
        <span>Escala 0–100</span>
      </div>
      ${FACTORS.map((factor) => {
        const value = clamp(scores?.[factor]);
        const color = FACTOR_META[factor].color;
        return `
          <div class="mini-disc-row">
            <div class="mini-disc-label">
              <span class="mini-disc-dot" style="background:${color}"></span>
              <strong>${factor}</strong>
              <small>${esc(FACTOR_META[factor].label)}</small>
            </div>
            <div class="mini-disc-track"><div class="mini-disc-fill" style="width:${value}%;background:${color}"></div></div>
            <div class="mini-disc-value">${value}%</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function behaviorBalanceMatrixHtml(scores = {}, profile = {}) {
  if (!hasQuantitativeScoreData(scores)) {
    return quantitativeDataUnavailableHtml(
      'Matriz quantitativa indisponível',
      scores?.availabilityMessage ||
        `A leitura do eixo dominante permanece qualitativa para o perfil ${safeText(profile?.key, 'DISC')}.`
    );
  }

  const drive = clamp(50 + (clamp(scores?.D) - clamp(scores?.S)) / 2);
  const relation = clamp(50 + (clamp(scores?.I) - clamp(scores?.C)) / 2);
  const markerX = 8 + relation * 0.84;
  const markerY = 92 - drive * 0.84;
  const primaryFactor = resolvePrimaryFactor(profile, scores);
  const markerColor = FACTOR_META[primaryFactor]?.color || FACTOR_META.D.color;

  return `
    <div class="behavior-matrix">
      <div class="behavior-matrix-head">
        <h4>Matriz de equilíbrio comportamental</h4>
        <span>Direção × Relacionamento</span>
      </div>
      <div class="behavior-matrix-grid">
        <div class="matrix-quadrant q1">Alta direção<br/><small>Execução e pressão por resultado</small></div>
        <div class="matrix-quadrant q2">Alta influência<br/><small>Conexão, persuasão e mobilização</small></div>
        <div class="matrix-quadrant q3">Estabilidade relacional<br/><small>Ritmo, apoio e consistência</small></div>
        <div class="matrix-quadrant q4">Critério técnico<br/><small>Método, qualidade e conformidade</small></div>
        <div class="matrix-marker" style="left:${markerX}%;top:${markerY}%;--marker:${markerColor}"></div>
      </div>
      <p>Leitura atual: maior tração em <strong>${esc(primaryFactor)}</strong>, com ajuste situacional entre assertividade e colaboração.</p>
    </div>
  `;
}

function decisionPathVisualHtml(profile = {}) {
  const primary = safeText(profile?.primary, 'D');
  const secondary = safeText(profile?.secondary, 'I');
  return `
    <div class="decision-path">
      <h4>Fluxo técnico de decisão</h4>
      <div class="decision-path-row">
        <div class="decision-step"><span>1</span><strong>Contexto</strong><small>clareza de cenário</small></div>
        <div class="decision-arrow">→</div>
        <div class="decision-step"><span>2</span><strong>Critério</strong><small>peso de ${esc(primary)}</small></div>
        <div class="decision-arrow">→</div>
        <div class="decision-step"><span>3</span><strong>Validação</strong><small>checagem por ${esc(secondary)}</small></div>
        <div class="decision-arrow">→</div>
        <div class="decision-step"><span>4</span><strong>Execução</strong><small>ação com checkpoint</small></div>
      </div>
    </div>
  `;
}

function stressEscalationVisualHtml(profile = {}) {
  const primary = safeText(profile?.primary, 'D');
  const primaryColor = FACTOR_META[primary]?.color || FACTOR_META.D.color;
  const stages = [
    { label: 'Sinal inicial', action: 'queda de foco e aumento de tensão', width: 34 },
    { label: 'Escalada', action: 'resposta mais defensiva ou reativa', width: 56 },
    { label: 'Impacto operacional', action: 'retrabalho e ruído de comunicação', width: 74 },
    { label: 'Recuperação', action: 'priorização + alinhamento + critério', width: 100 },
  ];

  return `
    <div class="stress-escalation" style="--stress:${primaryColor}">
      <h4>Escalada de estresse comportamental</h4>
      ${stages
        .map(
          (stage) => `
            <div class="stress-row">
              <div class="stress-label"><strong>${esc(stage.label)}</strong><small>${esc(stage.action)}</small></div>
              <div class="stress-track"><div class="stress-fill" style="width:${stage.width}%"></div></div>
            </div>
          `
        )
        .join('')}
      <p>Quando o fator <strong>${esc(primary)}</strong> domina sob pressão, checkpoints curtos e alinhamento de prioridade reduzem escalada e preservam qualidade decisória.</p>
    </div>
  `;
}

function factorTechnicalBlockHtml(factor, factors = {}, scores = {}) {
  const meta = FACTOR_META[factor] || FACTOR_META.D;
  const hasQuantitativeData = hasQuantitativeScoreData(scores);
  const naturalValue = clamp(scores?.natural?.[factor]);
  const adaptedValue = clamp(scores?.adapted?.[factor]);
  const actions = safeArray(factors?.[factor]?.actions, [
    'Aplicar este fator com objetivo claro e critério explícito.',
    'Converter intensidade em ação observável no contexto de trabalho.',
  ]).slice(0, 2);
  const risks = safeArray(factors?.[factor]?.redFlags, [
    'Evitar exagero de intensidade sem calibragem relacional.',
    'Manter clareza de prioridade para reduzir ruído na execução.',
  ]).slice(0, 2);

  return `
    <div class="factor-tech-card" style="--factor:${meta.color}">
      <div class="factor-tech-head">
        <span class="factor-pill">${factor}</span>
        <h3>${factor} • ${esc(meta.label)}</h3>
      </div>
      <p>${esc(safeText(factors?.[factor]?.headline, `Expressão de ${meta.label} no perfil atual.`))}</p>
      ${
        hasQuantitativeData
          ? `
            <div class="factor-mini-bars">
              <div class="factor-mini-row">
                <span>Natural</span>
                <div class="factor-mini-track"><div class="factor-mini-fill" style="width:${naturalValue}%"></div></div>
                <strong>${naturalValue}%</strong>
              </div>
              <div class="factor-mini-row">
                <span>Adaptado</span>
                <div class="factor-mini-track"><div class="factor-mini-fill factor-mini-fill-soft" style="width:${adaptedValue}%"></div></div>
                <strong>${adaptedValue}%</strong>
              </div>
            </div>
          `
          : quantitativeDataUnavailableHtml('Score numérico indisponível', scores?.availabilityMessage)
      }
      <div class="grid two factor-mini-grid">
        <div>
          <h4>Forças típicas</h4>
          ${listHtml(actions)}
        </div>
        <div>
          <h4>Riscos típicos</h4>
          ${listHtml(risks)}
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

function summaryRowsHtml(items = [], options = {}) {
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
  const singleColumn = Boolean(options?.singleColumn);

  return `
    <div class="summary-grid ${singleColumn ? 'summary-grid-single' : ''}">
      <div class="summary-col">${singleColumn ? lines.join('') : firstColumn}</div>
      ${singleColumn ? '' : `<div class="summary-col">${secondColumn}</div>`}
    </div>
  `;
}

function remapPageForTier(pageHtml = '', pageNumber = 1, totalPages = 1, premiumFooterLabel = '') {
  let normalized = String(pageHtml || '');
  const parityClass = pageNumber % 2 === 0 ? 'page-even' : 'page-odd';

  normalized = normalized.replace(/\bpage-(odd|even)\b/g, parityClass);
  normalized = normalized.replace(/Página\s+\d+\s+de\s+\d+/g, `Página ${pageNumber} de ${totalPages}`);

  if (
    premiumFooterLabel &&
    normalized.includes('<footer class="footer">') &&
    !normalized.includes('premium-footer-label')
  ) {
    normalized = normalized.replace(
      '<footer class="footer">',
      `<footer class="footer"><span class="premium-footer-label">${esc(premiumFooterLabel)}</span>`,
    );
  }

  return normalized;
}

function strategicInsightsSection(isBalancedProfile) {
  return `
    <div class="card">
      <h3>INSIGHTS COMPORTAMENTAIS ESTRATÉGICOS</h3>
      <p>Leitura aplicada para transformar observação comportamental em decisões mais consistentes no ambiente profissional.</p>
      <div class="grid two">
        <div>
          <h4>Principais forças comportamentais</h4>
          ${listHtml(
            isBalancedProfile
              ? [
                  'Capacidade de adaptação a diferentes contextos.',
                  'Facilidade em compreender diferentes perspectivas.',
                  'Tendência a colaborar na construção de soluções.',
                  'Equilíbrio entre análise e relacionamento interpessoal.',
                ]
              : [
                  'Capacidade de adaptação conforme o contexto da equipe.',
                  'Leitura de cenário para ajustar decisão e comunicação.',
                  'Tendência a colaborar na construção de soluções.',
                  'Equilíbrio entre análise e relacionamento interpessoal.',
                ]
          )}
        </div>
        <div>
          <h4>Pontos de atenção</h4>
          ${listHtml([
            'Possível demora em decisões quando existem muitas alternativas.',
            'Tendência a evitar conflitos desnecessários.',
            'Risco de dispersão quando prioridades não estão claras.',
          ])}
        </div>
      </div>
      <p>Use o benchmark como referência de calibragem de contexto, papel e rotina de desenvolvimento, não como rótulo fixo de potencial.</p>
    </div>
  `;
}

function applyGlobalWordingCorrections(html = '') {
  return String(html || '')
    .replaceAll(
      'Não use o DISC como rótulo definitivo.',
      'O modelo DISC não deve ser utilizado como um rótulo definitivo, mas sim como uma ferramenta de compreensão comportamental.'
    )
    .replaceAll(
      'Nao use o DISC como rotulo definitivo.',
      'O modelo DISC nao deve ser utilizado como um rotulo definitivo, mas sim como uma ferramenta de compreensao comportamental.'
    )
    .replaceAll(
      'Queda de clareza quando aumenta a pressão',
      'Pode ocorrer redução de clareza quando o nível de pressão aumenta.'
    )
    .replaceAll(
      'Queda de clareza quando aumenta a pressao',
      'Pode ocorrer reducao de clareza quando o nivel de pressao aumenta.'
    )
    .replaceAll(
      'Usar checkpoint curto para decisão de risco',
      'Utilizar checkpoints curtos para validação de decisões de risco.'
    )
    .replaceAll(
      'Usar checkpoint curto para decisao de risco',
      'Utilizar checkpoints curtos para validacao de decisoes de risco.'
    )
    .replaceAll('Contribuição típica: contribuição para', 'Contribuição típica: apoio à')
    .replaceAll('Contribuicao tipica: contribuicao para', 'Contribuicao tipica: apoio a');
}

function applyUtf8Polish(html = '') {
  const replacements = [
    [/\bDominancia\b/g, 'Dominância'],
    [/\bdominancia\b/g, 'dominância'],
    [/\bInfluencia\b/g, 'Influência'],
    [/\binfluencia\b/g, 'influência'],
    [/\bDiagnostico\b/g, 'Diagnóstico'],
    [/\bdiagnostico\b/g, 'diagnóstico'],
    [/\bRelatorio\b/g, 'Relatório'],
    [/\brelatorio\b/g, 'relatório'],
    [/\bAnalise\b/g, 'Análise'],
    [/\banalise\b/g, 'análise'],
    [/\bComunicacao\b/g, 'Comunicação'],
    [/\bcomunicacao\b/g, 'comunicação'],
    [/\bConexao\b/g, 'Conexão'],
    [/\bconexao\b/g, 'conexão'],
    [/\bConfianca\b/g, 'Confiança'],
    [/\bconfianca\b/g, 'confiança'],
    [/\bConsistencia\b/g, 'Consistência'],
    [/\bconsistencia\b/g, 'consistência'],
    [/\bEquilibrio\b/g, 'Equilíbrio'],
    [/\bequilibrio\b/g, 'equilíbrio'],
    [/\bContribuicao\b/g, 'Contribuição'],
    [/\bcontribuicao\b/g, 'contribuição'],
    [/\bContribuicoes\b/g, 'Contribuições'],
    [/\bcontribuicoes\b/g, 'contribuições'],
    [/\bCritérios\b/g, 'Critérios'],
    [/\bcriterios\b/g, 'critérios'],
    [/\bMudanca\b/g, 'Mudança'],
    [/\bmudanca\b/g, 'mudança'],
    [/\bMudancas\b/g, 'Mudanças'],
    [/\bmudancas\b/g, 'mudanças'],
    [/\bLideranca\b/g, 'Liderança'],
    [/\blideranca\b/g, 'liderança'],
    [/\bDecisao\b/g, 'Decisão'],
    [/\bdecisao\b/g, 'decisão'],
    [/\bDecisoes\b/g, 'Decisões'],
    [/\bdecisoes\b/g, 'decisões'],
    [/\bRelacao\b/g, 'Relação'],
    [/\brelacao\b/g, 'relação'],
    [/\bTensao\b/g, 'Tensão'],
    [/\btensao\b/g, 'tensão'],
    [/\bSeguranca\b/g, 'Segurança'],
    [/\bseguranca\b/g, 'segurança'],
    [/\bNecessidade\b/g, 'Necessidade'],
    [/\bnecessidade\b/g, 'necessidade'],
    [/\bRecomendacoes\b/g, 'Recomendações'],
    [/\brecomendacoes\b/g, 'recomendações'],
    [/\bObservaveis\b/g, 'Observáveis'],
    [/\bobservaveis\b/g, 'observáveis'],
    [/\bConsciencia\b/g, 'Consciência'],
    [/\bconsciencia\b/g, 'consciência'],
    [/\bRevisao\b/g, 'Revisão'],
    [/\brevisao\b/g, 'revisão'],
    [/\bCobranca\b/g, 'Cobrança'],
    [/\bcobranca\b/g, 'cobrança'],
    [/\bExecucao\b/g, 'Execução'],
    [/\bexecucao\b/g, 'execução'],
    [/\bEstrategico\b/g, 'Estratégico'],
    [/\bestrategico\b/g, 'estratégico'],
    [/\bEstrategica\b/g, 'Estratégica'],
    [/\bestrategica\b/g, 'estratégica'],
    [/\bManutencao\b/g, 'Manutenção'],
    [/\bmanutencao\b/g, 'manutenção'],
    [/\bReuniao\b/g, 'Reunião'],
    [/\breuniao\b/g, 'reunião'],
    [/\bSintese\b/g, 'Síntese'],
    [/\bsintese\b/g, 'síntese'],
    [/\bDinamica\b/g, 'Dinâmica'],
    [/\bdinamica\b/g, 'dinâmica'],
    [/\bPadrao\b/g, 'Padrão'],
    [/\bpadrao\b/g, 'padrão'],
    [/\bResponsavel\b/g, 'Responsável'],
    [/\bresponsavel\b/g, 'responsável'],
    [/\bResponsaveis\b/g, 'Responsáveis'],
    [/\bresponsaveis\b/g, 'responsáveis'],
    [/\bAdaptacao\b/g, 'Adaptação'],
    [/\badaptacao\b/g, 'adaptação'],
    [/\bAderencia\b/g, 'Aderência'],
    [/\baderencia\b/g, 'aderência'],
    [/\bOrganizacao\b/g, 'Organização'],
    [/\borganizacao\b/g, 'organização'],
    [/\bAvaliacao\b/g, 'Avaliação'],
    [/\bavaliacao\b/g, 'avaliação'],
    [/\bAvaliacoes\b/g, 'Avaliações'],
    [/\bavaliacoes\b/g, 'avaliações'],
    [/\bConclusao\b/g, 'Conclusão'],
    [/\bconclusao\b/g, 'conclusão'],
    [/\bPaginas\b/g, 'Páginas'],
    [/\bpaginas\b/g, 'páginas'],
    [/\bPagina\b/g, 'Página'],
    [/\bpagina\b/g, 'página'],
    [/\bCriterio\b/g, 'Critério'],
    [/\bcriterio\b/g, 'critério'],
    [/\bTecnico\b/g, 'Técnico'],
    [/\btecnico\b/g, 'técnico'],
    [/\bTecnica\b/g, 'Técnica'],
    [/\btecnica\b/g, 'técnica'],
    [/\bCritica\b/g, 'Crítica'],
    [/\bcritica\b/g, 'crítica'],
    [/\bCriticas\b/g, 'Críticas'],
    [/\bcriticas\b/g, 'críticas'],
    [/\bRotulo\b/g, 'Rótulo'],
    [/\brotulo\b/g, 'rótulo'],
    [/\bCompreensao\b/g, 'Compreensão'],
    [/\bcompreensao\b/g, 'compreensão'],
    [/\bValidacao\b/g, 'Validação'],
    [/\bvalidacao\b/g, 'validação'],
    [/\bAplicacao\b/g, 'Aplicação'],
    [/\baplicacao\b/g, 'aplicação'],
    [/\bReunioes\b/g, 'Reuniões'],
    [/\breunioes\b/g, 'reuniões'],
    [/\bEvolucao\b/g, 'Evolução'],
    [/\bevolucao\b/g, 'evolução'],
    [/\bGestao\b/g, 'Gestão'],
    [/\bgestao\b/g, 'gestão'],
    [/\bPressao\b/g, 'Pressão'],
    [/\bpressao\b/g, 'pressão'],
    [/\bInformacao\b/g, 'Informação'],
    [/\binformacao\b/g, 'informação'],
    [/\bSituacao\b/g, 'Situação'],
    [/\bsituacao\b/g, 'situação'],
    [/\bSituacoes\b/g, 'Situações'],
    [/\bsituacoes\b/g, 'situações'],
    [/\bNao\b/g, 'Não'],
    [/\bnao\b/g, 'não'],
    [/\bAcao\b/g, 'Ação'],
    [/\bacao\b/g, 'ação'],
    [/\bAcoes\b/g, 'Ações'],
    [/\bacoes\b/g, 'ações'],
    [/\bContem\b/g, 'Contém'],
    [/\bcontem\b/g, 'contém'],
    [/\bFuncao\b/g, 'Função'],
    [/\bfuncao\b/g, 'função'],
    [/\bFuncoes\b/g, 'Funções'],
    [/\bfuncoes\b/g, 'funções'],
    [/\bNecessario\b/g, 'Necessário'],
    [/\bnecessario\b/g, 'necessário'],
    [/\bNecessarios\b/g, 'Necessários'],
    [/\bnecessarios\b/g, 'necessários'],
    [/\bPaciencia\b/g, 'Paciência'],
    [/\bpaciencia\b/g, 'paciência'],
    [/\bExplicacoes\b/g, 'Explicações'],
    [/\bexplicacoes\b/g, 'explicações'],
    [/\bPresenca\b/g, 'Presença'],
    [/\bpresenca\b/g, 'presença'],
    [/\bDiscussoes\b/g, 'Discussões'],
    [/\bdiscussoes\b/g, 'discussões'],
    [/\bPriorizacao\b/g, 'Priorização'],
    [/\bpriorizacao\b/g, 'priorização'],
    [/\bGovernanca\b/g, 'Governança'],
    [/\bgovernanca\b/g, 'governança'],
    [/\bTransicao\b/g, 'Transição'],
    [/\btransicao\b/g, 'transição'],
    [/\bInformacao\b/g, 'Informação'],
    [/\binformacao\b/g, 'informação'],
    [/\bAutonom(a|i)a\b/g, 'Autonomia'],
    [/\bautonom(a|i)a\b/g, 'autonomia'],
  ];

  let normalized = String(html || '');
  replacements.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized;
}

function finalConclusionBlocks({ participant, profile, isPremiumTier = false }) {
  const isBalancedProfile = profile?.mode === 'balanced' || profile?.key === 'DISC';
  const profileDescriptor = isBalancedProfile
    ? 'uma distribuição equilibrada entre os quatro fatores do modelo DISC'
    : `predominância de ${safeText(profile?.primary, 'D')} com apoio de ${safeText(profile?.secondary, 'I')}`;
  const participantName = safeText(participant?.name, 'Participante');
  const base = [
    `${participantName}, o perfil apresentado demonstra ${profileDescriptor}.`,
    'Essa característica indica um comportamento adaptativo, com capacidade de ajustar a forma de atuação conforme o ambiente, os desafios e o perfil das pessoas ao redor.',
    'Quando apoiado por critérios claros de decisão e objetivos bem definidos, esse perfil tende a contribuir significativamente para ambientes organizacionais colaborativos, equilibrados e orientados a resultados sustentáveis.',
    'O desenvolvimento contínuo deve priorizar:',
    '• clareza de prioridades',
    '• estruturação de processos de decisão',
    '• manutenção da consistência comportamental em ambientes de maior pressão',
    'Quando bem desenvolvido, esse perfil pode atuar como elemento de equilíbrio dentro de equipes e organizações.',
  ];

  if (!isPremiumTier) {
    base.push(
      'Para a versão completa, recomenda-se transformar os três pilares acima em metas observáveis de 30, 60 e 90 dias com acompanhamento quinzenal.'
    );
  } else {
    base.push(
      'Na versão premium, esse direcionamento ganha profundidade quando integrado à matriz de compatibilidade, leitura de estresse e plano executivo de evolução comportamental.'
    );
  }

  return base;
}

const EMPTY_AI_COMPLEMENT = Object.freeze({
  ai_summary: '',
  ai_strengths: '',
  ai_development: '',
  ai_communication: '',
  ai_workstyle: '',
  ai_recommendations: '',
  ai_leadership: '',
  ai_decision_making: '',
  ai_risk_profile: '',
});

function normalizeAiComplementValue(value = '', maxLength = 680) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function splitAiComplementItems(value = '') {
  return String(value || '')
    .split(/\n+/)
    .map((item) => item.replace(/^[•\-–]\s*/u, '').trim())
    .filter(Boolean);
}

function resolveAiComplementBlocks(aiComplement = {}, reportType = REPORT_TIER.BUSINESS) {
  const normalized = {
    ...EMPTY_AI_COMPLEMENT,
    ...(aiComplement || {}),
  };

  const baseBlocks = [
    {
      key: 'ai_summary',
      title: 'Leitura Estratégica do Perfil',
      value: normalizeAiComplementValue(normalized.ai_summary, 680),
      kind: 'paragraph',
    },
    {
      key: 'ai_strengths',
      title: 'Pontos Fortes em Evidência',
      value: normalizeAiComplementValue(normalized.ai_strengths, 540),
      kind: 'list',
    },
    {
      key: 'ai_development',
      title: 'Pontos de Atenção e Desenvolvimento',
      value: normalizeAiComplementValue(normalized.ai_development, 580),
      kind: 'list',
    },
    {
      key: 'ai_communication',
      title: 'Estilo de Comunicação',
      value: normalizeAiComplementValue(normalized.ai_communication, 520),
      kind: 'paragraph',
    },
    {
      key: 'ai_workstyle',
      title: 'Forma de Atuação no Trabalho',
      value: normalizeAiComplementValue(normalized.ai_workstyle, 520),
      kind: 'paragraph',
    },
    {
      key: 'ai_recommendations',
      title: 'Recomendações Práticas',
      value: normalizeAiComplementValue(normalized.ai_recommendations, 580),
      kind: 'list',
    },
  ];

  const businessBlocks =
    reportType === REPORT_TIER.BUSINESS
      ? [
          {
            key: 'ai_leadership',
            title: 'Liderança',
            value: normalizeAiComplementValue(normalized.ai_leadership, 480),
            kind: 'paragraph',
          },
          {
            key: 'ai_decision_making',
            title: 'Tomada de Decisão',
            value: normalizeAiComplementValue(normalized.ai_decision_making, 480),
            kind: 'paragraph',
          },
          {
            key: 'ai_risk_profile',
            title: 'Perfil de Risco',
            value: normalizeAiComplementValue(normalized.ai_risk_profile, 480),
            kind: 'paragraph',
          },
        ]
      : [];

  return [...baseBlocks, ...businessBlocks].filter((block) => String(block.value || '').trim());
}

function renderAiComplementBlock(block) {
  const items = splitAiComplementItems(block?.value);
  const body =
    block?.kind === 'list' || items.length > 1
      ? listHtml(items)
      : paragraphsHtml(items.length ? [items[0]] : []);

  return `
    <div class="card ai-block">
      <h3>${esc(block?.title || '')}</h3>
      ${body}
    </div>
  `;
}

function buildAiComplementPages({
  aiComplement = {},
  reportType = REPORT_TIER.BUSINESS,
  branding = {},
  startingPageNumber = 1,
  includeAiComplement = true,
}) {
  if (!includeAiComplement) {
    return [];
  }

  const blocks = resolveAiComplementBlocks(aiComplement, reportType);
  if (blocks.length === 0) {
    return [];
  }

  const chunks = [];
  for (let index = 0; index < blocks.length; index += 4) {
    chunks.push(blocks.slice(index, index + 4));
  }

  return chunks.map((chunk, index) =>
    buildPage({
      number: startingPageNumber + index,
      totalPages: startingPageNumber + chunks.length - 1,
      title: 'Análise Complementar por IA',
      subtitle:
        index === 0
          ? 'Leitura opcional complementar, gerada por IA estruturada a partir do perfil DISC.'
          : 'Continuação da leitura complementar por IA.',
      branding,
      enforceDensity: false,
      content: `
        <section class="ai-complementary-analysis">
          ${
            index === 0
              ? `
                <div class="card ai-complementary-intro">
                  <p>Esta seção é complementar ao relatório oficial e foi gerada apenas para aprofundar leitura, aplicação prática e reflexão estratégica, sem substituir a interpretação base do relatório.</p>
                </div>
              `
              : ''
          }
          <div class="grid two stack-on-print">
            ${chunk.map((block) => renderAiComplementBlock(block)).join('')}
          </div>
        </section>
      `,
    }),
  );
}

function automaticEnrichment(title, subtitle) {
  const scope = safeText(title, 'perfil');
  const detail = safeText(subtitle, 'contexto profissional');
  const normalizedTitle = scope.toLowerCase();
  let example = `Em um cenário real de ${scope.toLowerCase()}, observe como o comportamento se expressa em reuniões de alinhamento, priorização de tarefas e tomada de decisão sob prazo.`;
  let managerLens = `Para ${detail.toLowerCase()}, combine metas claras, feedback observável e revisões curtas para transformar insight comportamental em consistência de entrega.`;

  if (/comunic|relacion|equipe/.test(normalizedTitle)) {
    example = 'Observe como a pessoa ajusta tom, ritmo e profundidade da mensagem quando precisa alinhar expectativa com perfis diferentes.';
    managerLens = 'Defina combinados de comunicação, checkpoints curtos e exemplos concretos de boa interação para reduzir ruído relacional.';
  } else if (/decis|autonomia|benchmark/.test(normalizedTitle)) {
    example = 'Avalie como o perfil reage quando precisa decidir com informação incompleta, pressão de prazo e necessidade de alinhamento com pares.';
    managerLens = 'Estruture critérios de decisão, limites de autonomia e revisões pós-decisão para reduzir risco sem engessar a execução.';
  } else if (/estresse|conflit|press/.test(normalizedTitle)) {
    example = 'Observe quais sinais aparecem primeiro sob pressão: aceleração, retração, rigidez analítica ou excesso de sociabilidade.';
    managerLens = 'Use rituais curtos de recalibragem, priorização visível e alinhamento de expectativa para preservar consistência em cenários críticos.';
  } else if (/lideran|desenvolvimento|carreira|ambiente/.test(normalizedTitle)) {
    example = 'Considere em quais contextos o perfil entrega mais valor: direção clara, espaço para influência, rotina previsível ou profundidade técnica.';
    managerLens = 'Transforme o insight em plano de desenvolvimento com metas observáveis, evidência prática e revisão em ciclos de 30, 60 e 90 dias.';
  }

  return `
    <div class="grid two compact-enrichment">
      ${enrichmentCard(
        'Exemplo de aplicacao',
        example
      )}
      ${enrichmentCard(
        'Leitura do gestor',
        managerLens
      )}
    </div>
    <div class="card compact-density-note">
      <p><strong>Diretriz aplicada:</strong> conecte estes pontos ao seu contexto real e revise o ajuste em ciclos curtos com evidências observáveis.</p>
    </div>
  `;
}

function normalizeQuickContextForDisplay(quickContext = {}) {
  const normalized = {
    sex: safeText(quickContext?.sex, ''),
    maritalStatus: safeText(quickContext?.maritalStatus, ''),
    city: safeText(quickContext?.city, ''),
    stressLevel: safeText(quickContext?.stressLevel, ''),
    sleepQuality: safeText(quickContext?.sleepQuality, ''),
    physicalActivity: safeText(quickContext?.physicalActivity, ''),
    smoker: safeText(quickContext?.smoker, ''),
    alcoholConsumption: safeText(quickContext?.alcoholConsumption, ''),
    usesMedication: safeText(quickContext?.usesMedication, ''),
    healthConditions: safeText(quickContext?.healthConditions, ''),
  };

  const hasData = Object.values(normalized).some((value) => String(value || '').trim());
  return { ...normalized, hasData };
}

function quickContextPanelHtml(quickContext = {}) {
  const context = normalizeQuickContextForDisplay(quickContext);
  if (!context.hasData) return '';

  const rows = [
    ['Sexo', context.sex],
    ['Estado civil', context.maritalStatus],
    ['Cidade', context.city],
    ['Estresse atual', context.stressLevel],
    ['Qualidade do sono', context.sleepQuality],
    ['Atividade física', context.physicalActivity],
    ['Tabagismo', context.smoker],
    ['Álcool', context.alcoholConsumption],
    ['Uso de medicação', context.usesMedication],
    ['Condições de saúde', context.healthConditions],
  ].filter(([, value]) => String(value || '').trim());

  return `
    <div class="card">
      <h3>Contexto atual do participante</h3>
      <p>Dados opcionais de anamnese curta para contextualização da leitura comportamental.</p>
      <table class="table compact">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <th style="width: 42%;">${esc(label)}</th>
                  <td>${esc(value)}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function reliabilityPanelHtml(reliability = {}) {
  const insufficientData = Boolean(reliability?.insufficientData);
  const score = clamp(reliability?.score, 0, 100);
  const level = insufficientData
    ? 'indisponível'
    : safeText(reliability?.level, score >= 80 ? 'alto' : score >= 60 ? 'moderado' : 'baixo');
  const secondsPerQuestion = Number(reliability?.secondsPerQuestion || 0);
  const hasAnswerData = Boolean(reliability?.hasAnswerData);
  const hasTimingData = Boolean(reliability?.hasTimingData);
  const repeatRate = Number(reliability?.repeatedPatternRate || 0);
  const answeredRatio = Number(reliability?.answeredRatio || 0);
  const scoreSpread = Number(reliability?.scoreSpread || 0);
  const notes = safeArray(reliability?.notes, ['Padrão de respostas consistente para leitura comportamental.']);

  return `
    <div class="card">
      <h3>Índice de confiabilidade das respostas</h3>
      <div class="kpi-grid">
        <div class="kpi-pill">
          <div class="kpi-chip" style="background: color-mix(in srgb, var(--factor-primary), #ffffff 76%);">R</div>
          <div class="kpi-copy">
            <span>Score</span>
            <strong>${esc(insufficientData ? 'n/d' : `${String(score)}/100`)}</strong>
            <small>Nível ${esc(level)}</small>
          </div>
        </div>
        <div class="kpi-pill">
          <div class="kpi-chip" style="background: color-mix(in srgb, var(--disc-c), #ffffff 76%);">T</div>
          <div class="kpi-copy">
            <span>Tempo médio</span>
            <strong>${esc(hasTimingData ? `${secondsPerQuestion.toFixed(1)}s` : 'n/d')}</strong>
            <small>${esc(hasTimingData ? 'por pergunta' : 'sem histórico de tempo')}</small>
          </div>
        </div>
        <div class="kpi-pill">
          <div class="kpi-chip" style="background: color-mix(in srgb, var(--disc-d), #ffffff 76%);">P</div>
          <div class="kpi-copy">
            <span>Padrão repetitivo</span>
            <strong>${esc(insufficientData ? 'n/d' : `${Math.round(repeatRate * 100)}%`)}</strong>
            <small>${esc(insufficientData ? 'sem base técnica suficiente' : 'repetição máxima')}</small>
          </div>
        </div>
      </div>
      ${
        insufficientData
          ? quantitativeDataUnavailableHtml(
              'Confiabilidade técnica parcial',
              'Esta avaliação não preservou histórico suficiente para calcular a confiabilidade completa de resposta.'
            )
          : `
              <p>Leitura técnica: maior confiabilidade aparece quando a consistência de resposta, o ritmo médio e a dispersão entre fatores permanecem em faixa estável.</p>
              <p>Use este índice apenas como apoio para interpretação, combinado ao contexto da avaliação e à coerência global do perfil observado.</p>
            `
      }
      ${listHtml(notes.slice(0, 3))}
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
  coverBackgroundUrl = '',
  branding,
  enforceDensity = true,
  hideInternalBranding = false,
}) {
  if (cover) {
    const coverBrandName = safeText(branding?.company_name, DEFAULT_BRANDING.company_name);
    const coverArtUrl = safeText(coverBackgroundUrl, COVER_BACKGROUND_BY_TIER.standard);
    return `
      <section class="page cover-page">
        <div class="cover-content" aria-label="Capa oficial ${esc(coverBrandName)}">
          ${coverArtUrl ? `<img src="${esc(coverArtUrl)}" alt="Capa ${esc(coverBrandName)}" class="cover-art-image" />` : ''}
          ${content}
        </div>
      </section>
    `;
  }

  const parityClass = number % 2 === 0 ? 'page-even' : 'page-odd';
  const densityChars = stripHtml(content).length;
  const contentWithDensity =
    enforceDensity && densityChars < 760
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
                <div class="report-header-line">${esc(PLATFORM_BRAND_LINE)}</div>
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
        <span>${esc(PLATFORM_BRAND_LINE)}</span>
        <span>Página ${number} de ${totalPages}</span>
      </footer>
    </section>
  `;
}

export function renderReportHtml(input = {}) {
  const assessment = input?.assessment || {};
  const rawReport = input?.reportModel || input || {};
  const participantFromReport = rawReport?.participant || {};
  const resolvedParticipantName = firstNonEmptyText(
    participantFromReport?.name,
    participantFromReport?.candidateName,
    participantFromReport?.respondent_name,
    assessment?.candidateName,
    assessment?.respondent_name,
    participantFromReport?.email,
    participantFromReport?.candidateEmail,
    assessment?.candidateEmail
  );

  const report = {
    ...rawReport,
    participant: {
      ...participantFromReport,
      name: resolvedParticipantName,
    },
  };

  ensureCriticalData(report);
  const reportType = normalizeReportType(
    safeText(report?.meta?.reportType, safeText(report?.reportType, REPORT_TIER.BUSINESS))
  );
  const isBusinessTier = reportType === REPORT_TIER.BUSINESS;
  const isProfessionalTier = reportType === REPORT_TIER.PROFESSIONAL;
  const isPremiumTier = reportType !== REPORT_TIER.PERSONAL;
  const logicalPageTarget =
    reportType === REPORT_TIER.PERSONAL
      ? PERSONAL_PAGE_SEQUENCE.length
      : reportType === REPORT_TIER.PROFESSIONAL
        ? PROFESSIONAL_PAGE_SEQUENCE.length
        : BUSINESS_PAGE_SEQUENCE.length;

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
    totalPages: logicalPageTarget,
    reportType,
  };

  const assetBaseUrl = safeText(
    report?.meta?.assetBaseUrl,
    safeText(input?.assetBaseUrl, '')
  );
  const branding = normalizeBranding(report?.branding || {}, report?.meta || {});
  const participant = normalizeParticipant(report?.participant || {}, report?.meta || {});
  const finalLockupLogoSrc = resolvePdfImageSrc(DEFAULT_BRANDING.logo_url, {
    fallbackSrc: branding.logo_url,
    assetBaseUrl,
  });
  const shouldRenderFinalLockupLogo = /^(data:image\/|https?:\/\/|file:\/\/)/i.test(finalLockupLogoSrc);
  const platformWebsite = safeText(branding?.website, DEFAULT_BRANDING.website);
  const platformEmail = safeText(branding?.support_email, safeText(report?.lgpd?.contact, DEFAULT_BRANDING.support_email));
  const platformInstagram = safeText(branding?.instagram, DEFAULT_BRANDING.instagram);
  const issuerResponsibleName = safeText(meta.responsibleName, 'Especialista InsightDISC');
  const issuerResponsibleRole = safeText(meta.responsibleRole, 'Especialista em Análise Comportamental');
  const issuerResponsibleContact = firstNonEmptyText(
    report?.meta?.responsibleEmail,
    report?.meta?.issuerContact,
    assessment?.creator?.email,
    assessment?.organization?.owner?.email,
    platformEmail,
  );

  const scores = {
    natural: normalizeScores(report?.scores?.natural),
    adapted: normalizeScores(report?.scores?.adapted || report?.scores?.natural),
    summary: normalizeScores(report?.scores?.summary || report?.scores?.natural),
    quantitativeAvailable: report?.scores?.quantitativeAvailable !== false,
    availabilityMessage: safeText(report?.scores?.availabilityMessage, ''),
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
  const primaryFactor = resolvePrimaryFactor(profile, scores.summary);
  const secondaryFactor = FACTOR_META[safeText(profile?.secondary).toUpperCase()]
    ? safeText(profile?.secondary).toUpperCase()
    : 'I';

  const coverParticipantName = firstNonEmptyText(
    assessment?.candidateName,
    report?.participant?.name,
    participant?.name,
    'Participante'
  );
  const coverParticipantEmail = firstNonEmptyText(
    assessment?.candidateEmail,
    report?.participant?.email,
    participant?.email,
    '-'
  );
  const coverParticipantRole = firstNonEmptyText(
    assessment?.candidateRole,
    assessment?.candidateJobTitle,
    report?.participant?.role,
    participant?.role,
    '-'
  );
  const coverCompanyName = firstNonEmptyText(
    assessment?.organization?.companyName,
    assessment?.organization?.name,
    report?.participant?.company,
    participant?.company,
    'InsightDISC'
  );
  const coverAssessmentId = firstNonEmptyText(
    assessment?.id,
    report?.participant?.assessmentId,
    participant?.assessmentId,
    '-'
  );
  const coverAssessmentDate = formatDate(
    assessment?.completedAt
      || assessment?.createdAt
      || report?.participant?.completedAt
      || report?.participant?.createdAt
      || report?.meta?.generatedAt
      || Date.now()
  );
  const coverIssuedDate = formatDate(report?.meta?.generatedAt || Date.now());
  const coverReportCode = safeText(meta.reportId, coverAssessmentId);
  const coverIssuerOrganization = firstNonEmptyText(
    report?.meta?.issuerOrganization,
    assessment?.organization?.companyName,
    assessment?.organization?.name,
    branding.company_name,
    coverCompanyName,
    'InsightDISC'
  );
  const coverModeLabel =
    reportType === REPORT_TIER.BUSINESS
      ? 'Business'
      : reportType === REPORT_TIER.PROFESSIONAL
        ? 'Professional'
        : 'Personal';
  const coverReportKicker =
    reportType === REPORT_TIER.BUSINESS
      ? 'INSIGHTDISC · RELATÓRIO PREMIUM'
      : reportType === REPORT_TIER.PROFESSIONAL
        ? 'INSIGHTDISC · RELATÓRIO PROFESSIONAL'
        : 'INSIGHTDISC · RELATÓRIO PERSONAL';
  const coverInstitutionTitle = PLATFORM_BRAND_LINE;
  const coverInstitutionUrl = platformWebsite;
  const coverInstitutionEmail = platformEmail;
  const coverSupportTitle = 'Supervisão e respaldo técnico-profissional';
  const coverSupportName = 'Verônica Feuser';
  const coverSupportRole = 'Psicanalista';
  const coverFooterNote =
    'Este relatório foi desenvolvido para apoio à análise comportamental, autoconhecimento, desenvolvimento pessoal e profissional, comunicação, liderança e tomada de decisão. Este material não substitui avaliação clínica, psicológica ou psiquiátrica.';
  const coverBackgroundUrl = resolveCoverBackgroundByTier(reportType);

  const adaptation = {
    label: safeText(report?.adaptation?.label, safeText(report?.adaptation?.band, 'moderado')).toUpperCase(),
    avgAbsDelta:
      report?.adaptation?.avgAbsDelta == null
        ? null
        : Number(report?.adaptation?.avgAbsDelta || 0).toFixed(2),
    interpretation: safeText(
      report?.adaptation?.interpretation,
      'A diferenca entre natural e adaptado indica calibragem comportamental relevante para sustentar performance sem desgaste.'
    ),
  };
  const reliability = {
    score:
      report?.reliability?.score == null ? null : clamp(report?.reliability?.score ?? 0, 0, 100),
    level: safeText(report?.reliability?.level, ''),
    secondsPerQuestion: Number(report?.reliability?.secondsPerQuestion || 0),
    repeatedPatternRate: Number(report?.reliability?.repeatedPatternRate || 0),
    answeredRatio: Number(report?.reliability?.answeredRatio || 0),
    scoreSpread: Number(report?.reliability?.scoreSpread || 0),
    hasAnswerData: Boolean(report?.reliability?.hasAnswerData),
    hasTimingData: Boolean(report?.reliability?.hasTimingData),
    insufficientData: Boolean(report?.reliability?.insufficientData),
    notes: safeArray(report?.reliability?.notes, []),
  };
  const quickContext = normalizeQuickContextForDisplay(
    report?.quickContext || assessment?.quickContext || {},
  );

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
    'O modelo DISC nao deve ser utilizado como um rotulo definitivo, mas sim como uma ferramenta de compreensao comportamental.',
    'Cruze leitura comportamental com desempenho real.',
    'Considere contexto, cultura e maturidade da equipe.',
    'Evite decisao critica sem evidencia complementar.',
    'Use o relatorio para desenvolvimento continuo.',
  ]);

  const summaryItemsForTier =
    reportType === REPORT_TIER.PERSONAL
      ? PERSONAL_SUMMARY_ITEMS
      : reportType === REPORT_TIER.PROFESSIONAL
        ? PROFESSIONAL_SUMMARY_ITEMS
        : BUSINESS_SUMMARY_ITEMS;

  const isBalancedProfile = profile.mode === 'balanced' || profile.key === 'DISC';
  const profilePrimaryLabel = safeText(profile?.displayPrimary, profile.primary);
  const profileSecondaryLabel = safeText(profile?.displaySecondary, profile.secondary);
  const premiumTopStrengths = ensureUniqueItems([
    ...safeArray(profileContent?.naturalStrengths, []),
    ...safeArray(profileContent?.workStrengths, []),
  ]).slice(0, 10);
  const premiumRemainingStrengths = ensureUniqueItems([
    ...safeArray(profileContent?.naturalStrengths, []),
    ...safeArray(profileContent?.workStrengths, []),
  ]).filter((item) => !premiumTopStrengths.includes(item));
  const premiumComplementaryStrengths =
    premiumRemainingStrengths.length > 0
      ? premiumRemainingStrengths
      : ensureUniqueItems([
          ...safeArray(profileContent?.developmentPoints, []),
          ...safeArray(narratives?.careerFramework, []),
          ...safeArray(narratives?.environmentEnergizers, []),
        ]).slice(0, 8);

  const premiumTopRisks = ensureUniqueItems([
    ...safeArray(profileContent?.developmentRisks, []),
    ...safeArray(profileContent?.workRisks, []),
    ...safeArray(profileContent?.leadershipRisks, []),
  ]).slice(0, 10);
  const premiumRemainingRisks = ensureUniqueItems([
    ...safeArray(profileContent?.developmentRisks, []),
    ...safeArray(profileContent?.workRisks, []),
    ...safeArray(profileContent?.leadershipRisks, []),
  ]).filter((item) => !premiumTopRisks.includes(item));
  const premiumComplementaryRisks =
    premiumRemainingRisks.length > 0
      ? premiumRemainingRisks
      : ensureUniqueItems([
          ...safeArray(narratives?.environmentDrainers, []),
          ...safeArray(narratives?.stressSignals, []),
          ...safeArray(profileContent?.frictionMatches, []),
        ]).slice(0, 8);

  const pages = [];
  pages.push(
    buildPage({
      number: 1,
      totalPages: meta.totalPages,
      cover: true,
      coverBackgroundUrl,
      branding,
      content: `
        <div class="cover-shell">
          <div class="cover-top-band">
            <div class="cover-top-brand">InsightDISC</div>
            <div class="cover-top-subtitle">Plataforma de Análise Comportamental</div>
          </div>
          <div class="cover-body">
            <div class="cover-central-block">
              <div class="cover-report-kicker">${esc(coverReportKicker)}</div>
              <div class="cover-mode-line">Modo: ${esc(coverModeLabel)}</div>
              <div class="cover-name-highlight">${esc(coverParticipantName)}</div>
              <div class="cover-meta-pair">
                <div class="cover-meta-column">
                  <span>Empresa</span>
                  <strong>${esc(coverCompanyName)}</strong>
                </div>
                <div class="cover-meta-column">
                  <span>Cargo</span>
                  <strong>${esc(coverParticipantRole)}</strong>
                </div>
              </div>
            </div>

            <div class="cover-identity-card">
              <div class="cover-card-heading">Identificação do relatório</div>
              <div class="cover-id-grid">
                <div class="cover-id-item">
                  <span>Nome do avaliado</span>
                  <strong>${esc(coverParticipantName)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>E-mail</span>
                  <strong>${esc(coverParticipantEmail)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Empresa</span>
                  <strong>${esc(coverCompanyName)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Cargo</span>
                  <strong>${esc(coverParticipantRole)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Data da avaliação</span>
                  <strong>${esc(coverAssessmentDate)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Data de emissão</span>
                  <strong>${esc(coverIssuedDate)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Código do relatório</span>
                  <strong>${esc(coverReportCode)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Responsável pela aplicação</span>
                  <strong>${esc(issuerResponsibleName)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Organização emissora</span>
                  <strong>${esc(coverIssuerOrganization)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Contato da emissão</span>
                  <strong>${esc(issuerResponsibleContact)}</strong>
                </div>
                <div class="cover-id-item">
                  <span>Modo</span>
                  <strong>${esc(coverModeLabel)}</strong>
                </div>
              </div>
            </div>

            <div class="cover-support-grid">
              <div class="cover-support-card">
                <div class="cover-card-heading">Bloco institucional</div>
                <div class="cover-institution-title">${esc(coverInstitutionTitle)}</div>
                <div class="cover-institution-url">${esc(coverInstitutionUrl)}</div>
                <div class="cover-institution-contact">${esc(coverInstitutionEmail)}</div>
              </div>
              <div class="cover-support-card cover-support-card-technical">
                <div class="cover-card-heading">Respaldo profissional</div>
                <div class="cover-support-title">${esc(coverSupportTitle)}</div>
                <div class="cover-support-name">${esc(coverSupportName)}</div>
                <div class="cover-support-role">${esc(coverSupportRole)}</div>
              </div>
            </div>
          </div>

          <div class="cover-footer-note">${esc(coverFooterNote)}</div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 2,
      totalPages: meta.totalPages,
      title: 'SUMÁRIO',
      subtitle: '',
      branding,
      enforceDensity: false,
      hideInternalBranding: true,
      content: `
        <div class="summary-clean">
          ${summaryRowsHtml(summaryItemsForTier, { singleColumn: false })}
        </div>
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
        <div class="card">
          <h3>Painel comparativo DISC</h3>
          ${miniDiscBarsHtml(scores.summary, 'Comparativo sintético dos quatro fatores')}
          ${factorAccentBadge(profile, scores.summary, 'Fator predominante no momento')}
        </div>
        <div class="grid two stack-on-print">
          ${FACTORS.map((factor) => factorTechnicalBlockHtml(factor, factors, scores)).join('')}
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
        <div class="grid two stack-on-print">
          ${reliabilityPanelHtml(reliability)}
          <div class="card executive-hero">
            <h3>Snapshot executivo</h3>
            ${factorAccentBadge(profile, scores.summary, 'Fator de maior intensidade')}
            ${listHtml([
              `Perfil identificado: ${profile.key} (${profile.mode}) com predominância de ${profilePrimaryLabel}.`,
              `Fator de apoio: ${profileSecondaryLabel}, regulando comunicação, colaboração e tomada de decisão.`,
              `Arquétipo central: ${safeText(profile.archetype, 'Estrategista Adaptativo')}.`,
              `Custo de adaptação ${safeText(adaptation.label, 'indisponível')}${adaptation.avgAbsDelta == null ? '' : ` (${Number(adaptation.avgAbsDelta).toFixed(2)} pontos)`}.`,
            ])}
            <p>${esc(adaptation.interpretation)}</p>
            ${
              quickContext.hasData
                ? '<p>Há dados contextuais complementares de anamnese curta associados a esta avaliação para leitura situacional do comportamento.</p>'
                : ''
            }
          </div>
        </div>
        ${
          isBalancedProfile
            ? `
              <div class="grid two stack-on-print">
                <div class="card">
                  <h3>Síntese executiva do perfil</h3>
                  <p>O perfil apresentado indica uma distribuição comportamental equilibrada entre os fatores do modelo DISC.</p>
                  ${listHtml([
                    'Boa capacidade de adaptação a cenários e interlocutores distintos.',
                    'Leitura contextual do ambiente antes de reagir.',
                    'Flexibilidade comportamental em diferentes ritmos de equipe.',
                  ])}
                </div>
                <div class="card">
                  <h3>Pontos de atenção</h3>
                  ${listHtml([
                    'Demora maior na tomada de decisão quando existem caminhos equivalentes.',
                    'Tendência a buscar validação externa antes de concluir posições difíceis.',
                    'Necessidade de critérios claros para priorizar sob pressão.',
                  ])}
                  <p>O desenvolvimento desse perfil passa pelo fortalecimento de critérios de decisão, clareza de prioridades e estruturação de processos de análise.</p>
                </div>
              </div>
            `
            : `
              <div class="grid two stack-on-print">
                <div class="card">
                  <h3>Resumo executivo</h3>
                  ${listHtml((profileContent?.executiveSummary || []).slice(0, 4), ['Leitura executiva do perfil com foco em aplicação de negócio.'])}
                </div>
                <div class="card">
                  <h3>Leitura geral</h3>
                  ${paragraphsHtml((narratives?.summaryParagraphs || []).slice(0, 2), [safeText(insights?.executive, 'Perfil com potencial de impacto quando combina forças naturais com rotina de calibragem.')])}
                  <p>Recomendação executiva: priorize frentes em que o perfil gere valor imediato e acompanhe riscos de exagero com rituais quinzenais de alinhamento.</p>
                </div>
              </div>
            `
        }
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
        <div class="split-half-layout">
          <div class="split-half-visual">
            <div class="grid two split-half-bars">
              ${barsHtml(scores.natural, 'Perfil Natural')}
              ${barsHtml(scores.adapted, 'Perfil Adaptado')}
            </div>
          </div>
          <div class="split-half-insight">
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
        <div class="split-half-layout">
          <div class="split-half-visual">
            <div class="card radar-card">${radarSvg(scores.natural)}</div>
          </div>
          <div class="split-half-insight">
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
        <div class="grid two stack-on-print">
          <div class="card">
            <h3>Legenda de benchmark</h3>
            <p>${esc(safeText(benchmark?.legend, 'Faixas internas para leitura comparativa deterministica por perfil.'))}</p>
            ${listHtml(benchmark?.interpretation, ['Acima da faixa: intensidade alta do fator.', 'Dentro da faixa: alinhamento esperado.', 'Abaixo da faixa: requer compensacao contextual.'])}
          </div>
          <div class="card">
            <h3>Leitura aplicada</h3>
            ${listHtml([
              'Considere benchmark como referência para ajustar papel, expectativa e rotina de feedback.',
              'Diferenças relevantes entre score e faixa típica indicam pontos de atenção para coaching e calibragem de contexto.',
              safeText(insights?.practicalByPage?.decision, 'Use benchmark para orientar desenvolvimento sem transformar o perfil em rótulo fixo.'),
            ])}
            ${enrichmentCard('Risco de exagero', safeText(insights?.behavioralRisk, 'Excesso de um único fator pode elevar risco relacional e reduzir sustentabilidade de resultado.'))}
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
        ${
          isPremiumTier
            ? `
              <div class="card">
                <h3>ARQUÉTIPO COMPORTAMENTAL</h3>
                <p>A combinação predominante dos fatores DISC revela um padrão de atuação recorrente em contextos de pressão, colaboração e tomada de decisão.</p>
                <p><strong>Arquétipo identificado:</strong> ${esc(safeText(profile.archetype, 'Estrategista Adaptativo'))}</p>
                ${factorAccentBadge(profile, scores.summary, 'Eixo técnico predominante')}
              </div>
            `
            : ''
        }
        <div class="grid two stack-on-print">
          <div class="card">
            ${behaviorBalanceMatrixHtml(scores.summary, profile)}
          </div>
          <div class="card">
            <h3>Dinâmica narrativa do perfil</h3>
            ${paragraphsHtml(
              (profileContent?.identityDynamics || narratives?.identityDynamics || []).slice(0, 2),
              ['Dinamica de atuacao com foco em resultado, contexto e colaboracao.']
            )}
            ${miniDiscBarsHtml(scores.natural, 'Assinatura comportamental natural')}
          </div>
        </div>
        <div class="grid two stack-on-print">
          <div class="card">
            <h3>Contribuição típica</h3>
            ${listHtml((profileContent?.teamContribution || []).slice(0, 4), ['Apoio a direcao e estabilidade da equipe.'])}
          </div>
          <div class="card">
            <h3>Riscos de execução</h3>
            ${listHtml((profileContent?.workRisks || []).slice(0, 4), ['Risco operacional relevante para monitorar em ciclos curtos.'])}
          </div>
        </div>
        <div class="card">
          ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.dynamics, 'Conecte a dinamica do perfil aos rituais da equipe para elevar previsibilidade de entrega.'))}
          ${
            isPremiumTier
              ? enrichmentCard(enrichment.insight, safeText(insights?.executiveByPage?.dynamics, safeText(insights?.executive, 'Leitura executiva para converter estilo em resultado sustentavel.')))
              : strategicNote('Leitura final da dinâmica', 'Use essa página para alinhar estilo, contexto e expectativa de entrega com a liderança imediata.')
          }
        </div>
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
        <div class="card">
          ${decisionPathVisualHtml(profile)}
          ${factorAccentBadge(profile, scores.summary, 'Fator que mais pesa na decisão')}
        </div>
        <div class="grid two stack-on-print">
          <div class="card">
            <h3>Como decide</h3>
            ${paragraphsHtml((profileContent?.decisionStyle || []).slice(0, 3), ['Decide por impacto, risco e contexto de prioridade.'])}
          </div>
          <div class="card">
            <h3>Quando tende a errar</h3>
            ${listHtml(
              [...safeArray(profileContent?.developmentRisks, []), ...safeArray(profileContent?.leadershipRisks, [])].slice(0, 6),
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
          ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.decision, 'O perfil decide melhor quando combina clareza de impacto com checkpoints curtos para validacao de decisoes de risco.'))}
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
            ${listHtml((narratives?.communicationStyle || []).slice(0, 3), ['Comunicação com foco em clareza, ritmo e objetivo de negócio.'])}
          </div>
          <div class="card">
            <h3>Necessidades de comunicação</h3>
            ${listHtml((narratives?.communicationNeeds || []).slice(0, 3), ['Definição explícita de prioridade, dono e próximo passo.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Boas práticas</h3>
            ${listHtml((profileContent?.communicationDo || []).slice(0, 4), ['Comunicar objetivo, impacto e próximo passo com clareza.'])}
          </div>
          <div class="card">
            <h3>Evitar</h3>
            ${listHtml((profileContent?.communicationDont || []).slice(0, 4), ['Evitar ambiguidade, promessas sem alinhamento e fechamento incompleto.'])}
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
              'Utilizar checkpoints curtos para validacao de decisoes de alto risco.',
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
        ${
          isPremiumTier
            ? `
              <div class="card">
                <h3>GATILHOS DE ESTRESSE</h3>
                ${listHtml([
                  'Prazos comprimidos com prioridades conflitantes e ausência de critério explícito de decisão.',
                  'Conflitos recorrentes sem fechamento de acordo e sem dono responsável por destravar o impasse.',
                  'Mudanças inesperadas com baixa previsibilidade operacional e comunicação incompleta de impacto.',
                ])}
              </div>
            `
            : ''
        }
        <div class="card">
          ${stressEscalationVisualHtml(profile)}
        </div>
        <div class="grid two stack-on-print">
          <div class="card">
            <h3>Padrão de estresse do perfil</h3>
            ${listHtml((profileContent?.stressPattern || []).slice(0, 4), ['Sinais comportamentais de pressão que afetam clareza e colaboração.'])}
          </div>
          <div class="card">
            <h3>Sinais de alerta universais</h3>
            ${listHtml(
              [...safeArray(narratives?.stressSignals, []), ...safeArray(narratives?.stressSignalsShared, [])].slice(0, 3),
              ['Reatividade, queda de clareza e oscilação de consistência.']
            )}
          </div>
        </div>
        <div class="card">
          <h3>Como recuperar equilíbrio</h3>
          ${listHtml((profileContent?.recoveryStrategy || []).slice(0, 4), ['Repriorizar, reduzir ruído e retomar rotina de acompanhamento.'])}
          ${
            isPremiumTier
              ? strategicNote('Atenção comportamental', 'Sob pressão prolongada, esse perfil tende a repetir o fator dominante. Intervenções rápidas preservam qualidade de decisão e relacionamento.')
              : strategicNote('Leitura do gestor', safeText(insights?.practicalByPage?.stress, 'Gestores devem atuar cedo quando sinais de estresse aparecem para evitar escalada de conflito e queda de performance.'))
          }
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
      subtitle: 'Matriz estratégica de colaboração, complementaridade e risco relacional',
      branding,
      content: `
        ${
          isPremiumTier
            ? `
              <div class="card">
                <h3>COMPATIBILIDADE COM OUTROS PERFIS DISC</h3>
                <table class="table compact">
                  <thead>
                    <tr><th>Perfil</th><th>Compatibilidade</th><th>Leitura</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><span class="disc-chip disc-chip-d">D</span> Perfil D</td><td>Média</td><td>Gera tração e decisão rápida quando existe contrato claro de prioridade, dono e limite de autonomia.</td></tr>
                    <tr><td><span class="disc-chip disc-chip-i">I</span> Perfil I</td><td>Alta</td><td>Eleva influência, engajamento e velocidade de mobilização, com melhor resultado quando há disciplina de fechamento.</td></tr>
                    <tr><td><span class="disc-chip disc-chip-s">S</span> Perfil S</td><td>Alta</td><td>Fortalece estabilidade, confiança e continuidade operacional, reduzindo atritos em ciclos de execução prolongados.</td></tr>
                    <tr><td><span class="disc-chip disc-chip-c">C</span> Perfil C</td><td>Média</td><td>Aumenta precisão analítica e gestão de risco, exigindo alinhamento explícito sobre ritmo e profundidade técnica.</td></tr>
                  </tbody>
                </table>
              </div>
            `
            : ''
        }
        <div class="grid two">
          <div class="card">
            <h3>Perfis complementares</h3>
            ${listHtml((profileContent?.bestMatches || []).slice(0, 3), ['Perfil complementar para equilibrar decisão e relacionamento.'])}
            <p>Perfis complementares ampliam resultado quando há acordo claro de papéis e critério de colaboração.</p>
          </div>
          <div class="card">
            <h3>Perfis com atrito potencial</h3>
            ${listHtml((profileContent?.frictionMatches || []).slice(0, 3), ['Atrito tende a surgir quando ritmo e critério divergem sem alinhamento.'])}
            <p>Conflitos diminuem com contratos de convívio, objetivo comum e rituais curtos de alinhamento.</p>
          </div>
        </div>
        <div class="card">
          <h3>Leitura relacional aplicada</h3>
          ${listHtml([
            'Combinações com alta complementaridade funcionam melhor quando a fronteira de decisão é explícita.',
            'Perfis de atrito não devem ser evitados, e sim calibrados por contrato de comunicação.',
            'Equipes maduras usam diversidade comportamental para ampliar velocidade e qualidade simultaneamente.',
          ])}
        </div>
        ${enrichmentCard(enrichment.application, 'Diferença de perfil não é problema; problema é falta de combinados claros sobre decisão, prazo e qualidade.')}
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
        ${
          isPremiumTier
            ? `
              <div class="card">
                <h3>ORIENTAÇÃO PROFISSIONAL</h3>
                <p>Este perfil tende a performar acima da média em ambientes com objetivo estratégico claro, fronteiras de autonomia bem definidas e critérios transparentes de qualidade e decisão.</p>
                <p>O valor profissional aumenta quando a pessoa atua em papéis aderentes ao próprio estilo natural e ao tipo de desafio predominante.</p>
              </div>
            `
            : ''
        }
        <div class="grid two">
          <div class="card">
            <h3>Funções recomendadas</h3>
            ${listHtml((profileContent?.recommendedRoles || []).slice(0, 5), ['Função com aderência comportamental alta ao perfil identificado.'])}
          </div>
          <div class="card">
            <h3>Funções de menor aderência</h3>
            ${listHtml((profileContent?.lowFitRoles || []).slice(0, 3), ['Função que pode gerar desgaste sem ajuste de contexto e suporte.'])}
          </div>
        </div>
        <div class="card">
          <h3>Framework de crescimento</h3>
          ${listHtml((narratives?.careerFramework || []).slice(0, 4), ['Evolução de carreira combina contexto adequado e desenvolvimento intencional.'])}
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
        ${
          isPremiumTier
            ? `
              <div class="card">
                <h3>TOP 10 FORÇAS COMPORTAMENTAIS DE ALTO IMPACTO</h3>
                <p>Estas forças representam ativos comportamentais com maior potencial de geração de valor em contexto corporativo quando associados a metas, prazos e critérios de qualidade claramente definidos.</p>
                ${listHtml(
                  premiumTopStrengths,
                  ['Capacidade de adaptação a diferentes contextos organizacionais.'],
                )}
              </div>
            `
            : ''
        }
        <div class="card">
          <h3>${isPremiumTier ? 'Forças complementares para alavancagem' : 'Forças naturais prioritárias'}</h3>
          ${listHtml(
            isPremiumTier ? premiumComplementaryStrengths : profileContent?.naturalStrengths,
            ['Força natural com impacto observável em colaboração e entrega.'],
          )}
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
        ${
          isPremiumTier
            ? `
              <div class="card">
                <h3>TOP 10 RISCOS COMPORTAMENTAIS PRIORITÁRIOS</h3>
                <p>Os riscos abaixo indicam padrões que podem comprometer previsibilidade de entrega, qualidade relacional e consistência decisória quando o perfil opera sob pressão sem calibragem.</p>
                ${listHtml(
                  premiumTopRisks.slice(0, 6),
                  ['Risco de oscilação de clareza quando a pressão aumenta sem critério de decisão.'],
                )}
              </div>
            `
            : ''
        }
        <div class="card">
          <h3>${isPremiumTier ? 'Riscos complementares para monitoramento' : 'Pontos de desenvolvimento prioritários'}</h3>
          ${listHtml(
            isPremiumTier ? premiumComplementaryRisks.slice(0, 4) : profileContent?.developmentPoints,
            ['Ponto de desenvolvimento com alto potencial de impacto no resultado.'],
          )}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Risco de exagero do perfil</h3>
            <p>${esc(safeText(insights?.riskOfExcess, safeText(insights?.behavioralRisk, 'Exagero de fator primário sem calibragem pode gerar queda de qualidade relacional e impacto em performance sustentável.')))}</p>
            ${listHtml((narratives?.developmentRisks || []).slice(0, 3), ['Exagero comportamental sem revisão de contexto pode reduzir performance sustentável.'])}
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
      title: 'PLANO DE DESENVOLVIMENTO COMPORTAMENTAL',
      subtitle: 'Plano sugerido para evolução comportamental em ciclos de 90 dias',
      branding,
      content: `
        <div class="card">
          <p>Plano sugerido para evolução comportamental em ciclos de 90 dias.</p>
        </div>
        <div class="grid three">
          <div class="card action-plan-card">
            <h3>Primeiros 30 dias</h3>
            ${listHtml([
              'Mapear decisões recorrentes do trabalho.',
              'Identificar padrões de comportamento sob pressão.',
              'Definir critérios objetivos para priorização de tarefas.',
              ...safeArray(plans?.days30, []),
            ].slice(0, 6))}
          </div>
          <div class="card action-plan-card">
            <h3>Entre 30 e 60 dias</h3>
            ${listHtml([
              'Aplicar métodos estruturados de tomada de decisão.',
              'Utilizar feedback de colegas ou liderança para validação de decisões importantes.',
              'Criar rotinas de revisão semanal de prioridades.',
              ...safeArray(plans?.days60, []),
            ].slice(0, 6))}
          </div>
          <div class="card action-plan-card">
            <h3>Entre 60 e 90 dias</h3>
            ${listHtml([
              'Consolidar práticas de análise antes de decisões críticas.',
              'Fortalecer autonomia na tomada de decisão.',
              'Avaliar evolução comportamental com base em resultados observáveis.',
              ...safeArray(plans?.days90, []),
            ].slice(0, 6))}
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

  if (isPremiumTier) {
    const adaptationDelta = Number.isFinite(Number(adaptation?.avgAbsDelta))
      ? Number(adaptation.avgAbsDelta)
      : null;
    const adaptationIndex =
      adaptationDelta == null ? 72 : clamp(Math.round(100 - adaptationDelta * 2.6), 0, 100);
    const reliabilityIndex = reliability?.score == null ? 68 : clamp(reliability.score, 0, 100);
    const stressIndex = clamp(
      100 -
        Math.round(
          reliabilityIndex * 0.55 +
            clamp((1 - Number(reliability?.answeredRatio || 0)) * 100, 0, 100) * 0.2 +
            clamp(Number(reliability?.repeatedPatternRate || 0) * 100, 0, 100) * 0.25
        ),
      0,
      100
    );

    pages.push(
      buildPage({
        number: 30,
        totalPages: meta.totalPages,
        title: 'Roda Comportamental DISC',
        subtitle: 'Visualização vetorial da composição e fator dominante',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card radar-card">${discWheelSvg(scores.summary)}</div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Leitura da roda comportamental</h3>
                <p>A roda posiciona os quatro fatores em um único mapa de leitura. O fator dominante aparece em maior evidência visual e orienta a resposta inicial em contextos de pressão.</p>
                ${listHtml([
                  `Predominância atual: ${profile.primary} com apoio de ${profile.secondary}.`,
                  'Use a combinação dominante para definir estilo de decisão, comunicação e priorização.',
                  'Observe o equilíbrio entre eixos opostos para reduzir exageros comportamentais.',
                  'A roda não rotula; ela orienta aplicação prática em contexto profissional.'
                ])}
                ${enrichmentCard('Diretriz executiva', 'Em decisões críticas, combine o fator dominante com um contrapeso consciente para preservar qualidade relacional e consistência técnica.')}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 31,
        totalPages: meta.totalPages,
        title: 'Índice de Adaptação Global',
        subtitle: 'Natural vs Adaptado, esforço comportamental e calibragem de contexto',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card radar-card">
                ${gaugeSvg(adaptationIndex, {
                  label: 'Adaptação global',
                  subtitle: adaptationDelta == null ? 'sem base completa' : `${adaptationDelta.toFixed(2)} pontos médios de ajuste`,
                  color: '#1E88E5',
                })}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Leitura do esforço de adaptação</h3>
                <p>O índice representa quanto do estilo natural está sendo ajustado para atender o contexto atual de atuação. Ajustes moderados são esperados; ajustes altos contínuos elevam custo emocional.</p>
                ${naturalVsAdaptedTableHtml(scores)}
                ${enrichmentCard('Aplicação prática', 'Quando o ajuste for alto por vários ciclos, revise escopo, ritmo de cobrança e forma de comunicação para reduzir desgaste sem perder entrega.')}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 32,
        totalPages: meta.totalPages,
        title: 'Índice de Estresse Comportamental',
        subtitle: 'Sinais de desgaste, confiabilidade de resposta e risco de sobrecarga',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card radar-card">
                ${gaugeSvg(stressIndex, {
                  label: 'Estresse comportamental',
                  subtitle: stressIndex >= 70 ? 'nível crítico' : stressIndex >= 45 ? 'atenção moderada' : 'faixa controlada',
                  color: '#E53935',
                })}
              </div>
              <div class="card radar-card">
                ${gaugeSvg(reliabilityIndex, {
                  label: 'Confiabilidade da leitura',
                  subtitle: reliability?.score == null ? 'estimado por consistência geral' : 'baseado no padrão de respostas',
                  color: '#43A047',
                })}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Painel de risco e estabilidade</h3>
                ${reliabilityPanelHtml(reliability)}
                ${listHtml([
                  'Acompanhe sinais precoces de irritabilidade, perda de foco e queda de consistência.',
                  'Reduza decisões críticas em janelas de alto desgaste sem revisão de contexto.',
                  'Institua pausas de recuperação e rotinas de alinhamento em ciclos curtos.',
                  'Use feedback observável para recalibrar comportamento antes de escalada de conflito.'
                ])}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 33,
        totalPages: meta.totalPages,
        title: 'Zona de Conforto vs Zona de Esforço',
        subtitle: 'Onde o perfil opera com fluidez e onde demanda energia extra',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card">
                <h3>Mapa de esforço por fator</h3>
                ${effortBarRowsHtml(scores)}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Leitura por zona</h3>
                ${naturalVsAdaptedTableHtml(scores)}
                ${enrichmentCard('Decisão operacional', 'Concentre tarefas de alta criticidade em zonas de maior fluidez e distribua esforço em blocos com checkpoints claros.')}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 34,
        totalPages: meta.totalPages,
        title: 'Mapa de Comunicação',
        subtitle: 'Diretrizes práticas para conversas de alta qualidade',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card">
                <h3>Direcionadores de comunicação</h3>
                ${communicationMapHtml(profileContent)}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Aplicação em liderança e colaboração</h3>
                ${listHtml([
                  'Adapte o nível de detalhe ao interlocutor e ao risco da decisão.',
                  'Use síntese no início da conversa e aprofunde apenas quando necessário.',
                  'Evite suposições implícitas; valide entendimento com próximos passos claros.',
                  'Combine objetividade com escuta ativa para preservar adesão e confiança.'
                ])}
                ${strategicNote('Protocolo recomendado', 'Para temas sensíveis, use sequência: contexto, fato observável, impacto, decisão esperada e revisão com prazo.')}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 35,
        totalPages: meta.totalPages,
        title: 'Mapa de Competências',
        subtitle: 'Leitura de potencial comportamental para contexto profissional',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card">
                <h3>Painel técnico de competências</h3>
                ${competencyMapTableHtml(scores)}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Leitura executiva de competências</h3>
                ${listHtml([
                  'Competências com índice alto indicam vantagem competitiva comportamental.',
                  'Competências moderadas evoluem com método, feedback e prática deliberada.',
                  'Índices baixos não são limitação fixa: sinalizam prioridade de desenvolvimento.',
                  'Aderência à função aumenta quando competência comportamental e demanda do cargo convergem.'
                ])}
                ${enrichmentCard('Prioridade prática', 'Conecte duas competências-chave aos objetivos do trimestre e monitore evolução por evidências observáveis.')}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 36,
        totalPages: meta.totalPages,
        title: 'Heatmap de Compatibilidade',
        subtitle: 'Sinergia relacional entre fatores e riscos de atrito',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card">
                <h3>Matriz de compatibilidade comportamental</h3>
                ${compatibilityHeatmapHtml(profile, scores)}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Como usar o heatmap</h3>
                ${listHtml([
                  'Use a matriz para definir pares críticos em projetos de alta dependência.',
                  'Antecipe atritos de ritmo e critério antes de escalar conflito.',
                  'Transforme complementaridade em estratégia de distribuição de responsabilidades.',
                  'Reforce acordos de comunicação quando a combinação for naturalmente tensa.'
                ])}
                ${strategicNote('Leitura de equipe', 'Compatibilidade é potencial. Resultado depende de acordos claros de decisão, autonomia e rotina de alinhamento.')}
              </div>
            </div>
          </div>
        `,
      })
    );

    pages.push(
      buildPage({
        number: 37,
        totalPages: meta.totalPages,
        title: 'Painel Executivo de Forças e Riscos',
        subtitle: 'Síntese visual de alavancas e pontos de atenção',
        branding,
        content: `
          <div class="split-half-layout">
            <div class="split-half-visual">
              <div class="card">
                <h3>Forças de maior impacto</h3>
                ${listHtml(premiumTopStrengths.slice(0, 8), ['Força comportamental de alto impacto no contexto atual.'])}
              </div>
              <div class="card">
                <h3>Riscos prioritários</h3>
                ${listHtml(premiumTopRisks.slice(0, 8), ['Risco comportamental prioritário para monitoramento.'])}
              </div>
            </div>
            <div class="split-half-insight">
              <div class="card">
                <h3>Diretrizes de aplicação</h3>
                ${listHtml([
                  'Use as forças para acelerar entregas em contextos de alta responsabilidade.',
                  'Trate riscos como alertas operacionais, não como rótulos de personalidade.',
                  'Transforme cada risco em ajuste de rotina com prazo e evidência.',
                  'Revise quinzenalmente progresso comportamental com líder e pares.'
                ])}
                ${enrichmentCard('Síntese executiva', safeText(insights?.executive, 'O diferencial está em aplicar forças com disciplina e reduzir riscos antes de comprometer qualidade de decisão e relacionamento.'))}
              </div>
            </div>
          </div>
        `,
      })
    );

    if (isProfessionalTier) {
      pages.push(
        buildPage({
          number: 38,
          totalPages: meta.totalPages,
          title: 'Arquétipo DISC Profissional',
          subtitle: 'Identidade comportamental, forças estruturais e riscos críticos',
          branding,
          content: `
            <div class="split-half-layout">
              <div class="split-half-visual">
                <div class="card">
                  <h3>Arquétipo identificado: ${esc(profile.key)} — ${esc(profile.archetype)}</h3>
                  ${naturalVsAdaptedTableHtml(scores)}
                </div>
              </div>
              <div class="split-half-insight">
                <div class="card">
                  <h3>Leitura profissional do arquétipo</h3>
                  <p>${esc(safeText(profile?.label, 'Perfil com combinação dominante de decisão, influência e calibragem relacional conforme contexto.'))}</p>
                  ${listHtml([
                    ...premiumTopStrengths.slice(0, 4),
                    ...premiumTopRisks.slice(0, 3),
                  ])}
                  ${enrichmentCard('Aplicação consultiva', 'Use o arquétipo como mapa de comportamento observável para calibrar papéis, rituais e decisões de gestão de pessoas.')}
                </div>
              </div>
            </div>
          `,
        })
      );

      pages.push(
        buildPage({
          number: 39,
          totalPages: meta.totalPages,
          title: 'Análise Estratégica do Perfil',
          subtitle: 'Leitura aprofundada de decisão, influência e execução sob pressão',
          branding,
          content: `
            <div class="split-half-layout">
              <div class="split-half-visual">
                <div class="card">
                  <h3>Tomada de decisão estratégica</h3>
                  ${decisionPathVisualHtml(profile)}
                </div>
                <div class="card">
                  <h3>Risco de escalada sob pressão</h3>
                  ${stressEscalationVisualHtml(profile)}
                </div>
              </div>
              <div class="split-half-insight">
                <div class="card">
                  <h3>Interpretação de consultoria</h3>
                  ${listHtml([
                    'A consistência de decisão depende da qualidade do critério explícito adotado pelo perfil.',
                    'Sob pressão, o estilo dominante tende a intensificar força e risco simultaneamente.',
                    'A liderança deve equilibrar velocidade de ação com mecanismo de validação técnica.',
                    'Ciclos curtos de revisão reduzem retrabalho e aumentam previsibilidade de entrega.',
                  ])}
                  ${enrichmentCard('Diretriz estratégica', safeText(insights?.executiveByPage?.decision, 'Defina critérios de decisão por nível de risco para preservar qualidade em cenários de alta exigência.'))}
                </div>
              </div>
            </div>
          `,
        })
      );

      pages.push(
        buildPage({
          number: 40,
          totalPages: meta.totalPages,
          title: 'Influência em Equipes',
          subtitle: 'Impacto em colaboração, conflitos e governança relacional',
          branding,
          content: `
            <div class="split-half-layout">
              <div class="split-half-visual">
                <div class="card">
                  <h3>Matriz de influência relacional</h3>
                  ${compatibilityHeatmapHtml(profile, scores)}
                </div>
                <div class="card">
                  <h3>Mapa de comunicação aplicado</h3>
                  ${communicationMapHtml(profileContent)}
                </div>
              </div>
              <div class="split-half-insight">
                <div class="card">
                  <h3>Recomendações para times</h3>
                  ${listHtml([
                    'Forme pares de alta dependência com base em complementaridade comportamental.',
                    'Adote rituais de alinhamento para mitigar atrito entre ritmos e critérios distintos.',
                    'Padronize linguagem de priorização para reduzir ruído de comunicação.',
                    'Use mediação estruturada em conflitos recorrentes com foco em comportamento observável.',
                  ])}
                  ${strategicNote('Governança de equipe', 'A influência positiva do perfil aumenta quando há clareza de papéis, fronteira de decisão e revisão de acordos relacionais.')}
                </div>
              </div>
            </div>
          `,
        })
      );

      pages.push(
        buildPage({
          number: 41,
          totalPages: meta.totalPages,
          title: 'Recomendações Estratégicas de Desenvolvimento',
          subtitle: 'Prioridades executivas para evolução comportamental sustentada',
          branding,
          content: `
            <div class="split-half-layout">
              <div class="split-half-visual">
                <div class="card">
                  <h3>Plano executivo 90 dias</h3>
                  <table class="table compact">
                    <thead>
                      <tr>
                        <th>Meta</th>
                        <th>Ação estratégica</th>
                        <th>Prazo</th>
                        <th>Evidência</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Decisão</td><td>Definir matriz de critério por risco</td><td>30 dias</td><td>redução de retrabalho crítico</td></tr>
                      <tr><td>Comunicação</td><td>Aplicar protocolo em reuniões-chave</td><td>60 dias</td><td>maior clareza de alinhamento</td></tr>
                      <tr><td>Liderança</td><td>Delegar com checkpoints objetivos</td><td>90 dias</td><td>ganho de autonomia com qualidade</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="split-half-insight">
                <div class="card">
                  <h3>Orientações de consultoria</h3>
                  ${listHtml([
                    'Concentre energia em dois ajustes críticos por ciclo para garantir aderência.',
                    'Monitore progresso com indicadores observáveis e revisão quinzenal.',
                    'Combine autopercepção com feedback externo para reduzir pontos cegos.',
                    'Atualize o plano conforme mudança de contexto e exigência do papel.',
                  ])}
                  ${enrichmentCard('Síntese final de desenvolvimento', 'Evolução comportamental sustentável exige método, contexto e disciplina de acompanhamento contínuo.')}
                </div>
              </div>
            </div>
          `,
        })
      );
    }
  }

  pages.push(
    buildPage({
      number: 30,
      totalPages: meta.totalPages,
      title: 'CONCLUSÃO DO PERFIL COMPORTAMENTAL',
      subtitle: 'Síntese final, direcionadores de evolução e assinatura institucional',
      branding,
      enforceDensity: false,
      content: `
        <div class="card">
          <h3>Conclusão do perfil comportamental</h3>
          ${paragraphsHtml(
            finalConclusionBlocks({ participant, profile, profileContent, insights, plans, isPremiumTier }),
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
            <p><strong>Custo de adaptação:</strong> ${esc(adaptation.label)} (${esc(adaptation.avgAbsDelta ?? 'n/d')} pontos)</p>
            <p>${esc(safeText(report?.lgpd?.notice, 'Dados pessoais tratados para finalidade de desenvolvimento comportamental, conforme consentimento e princípios da LGPD.'))}</p>
            <p><strong>Contato:</strong> ${esc(safeText(report?.lgpd?.contact, platformEmail))}</p>
            <p>Este relatório utiliza o modelo DISC como ferramenta de análise comportamental e não constitui diagnóstico psicológico.</p>
          </div>
          <div class="card">
            <h3>Encerramento institucional</h3>
            <p><strong>${esc(PLATFORM_BRAND_LINE)}</strong></p>
            <p><strong>Site:</strong> ${esc(platformWebsite)}</p>
            <p><strong>E-mail:</strong> ${esc(platformEmail)}</p>
            <p><strong>Instagram:</strong> ${esc(platformInstagram)}</p>
            <p><strong>Emissão:</strong> ${esc(issuerResponsibleName)} • ${esc(issuerResponsibleRole)}</p>
            <p><strong>Organização emissora:</strong> ${esc(coverIssuerOrganization)}</p>
            <p><strong>Contato da emissão:</strong> ${esc(issuerResponsibleContact)}</p>
          </div>
        </div>
        <div class="card final-lockup">
          ${
            shouldRenderFinalLockupLogo
              ? `<img src="${esc(finalLockupLogoSrc)}" alt="InsightDISC" class="final-lockup-logo" />`
              : '<div class="final-lockup-logo-fallback">InsightDISC</div>'
          }
          <p><strong>${esc(participant.name)}</strong>, o próximo nível do seu desenvolvimento começa quando cada insight se transforma em ação observável no seu contexto real de trabalho.</p>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Respaldo técnico-profissional</h3>
            <p><strong>Verônica Feuser</strong> – Psicanalista</p>
            <p>Responsável pelo respaldo técnico-profissional do modelo de leitura comportamental adotado neste relatório.</p>
          </div>
          <div class="card">
            <h3>Fechamento</h3>
            <p>Relatório gerado automaticamente pela plataforma InsightDISC.</p>
            <p>Use este documento como instrumento de decisão, desenvolvimento e acompanhamento contínuo, sempre combinado ao contexto real de atuação.</p>
          </div>
        </div>
      `,
    })
  );

  let selectedPagesRaw;
  if (reportType === REPORT_TIER.PERSONAL) {
    selectedPagesRaw = PERSONAL_PAGE_SEQUENCE.map((pageNumber) => pages[pageNumber - 1]).filter(Boolean);
  } else if (reportType === REPORT_TIER.PROFESSIONAL) {
    selectedPagesRaw = PROFESSIONAL_PAGE_SEQUENCE.map((pageNumber) => pages[pageNumber - 1]).filter(Boolean);
  } else {
    selectedPagesRaw = BUSINESS_PAGE_SEQUENCE.map((pageNumber) => pages[pageNumber - 1]).filter(Boolean);
  }

  const aiComplementPages = buildAiComplementPages({
    aiComplement: report?.aiComplement || EMPTY_AI_COMPLEMENT,
    reportType,
    branding,
    startingPageNumber: (selectedPagesRaw.length || meta.totalPages) + 1,
    includeAiComplement:
      input?.includeAiComplement !== false && report?.meta?.aiComplementEnabled !== false,
  });
  const visiblePagesRaw = [...selectedPagesRaw, ...aiComplementPages];
  const visibleTotalPages = visiblePagesRaw.length || meta.totalPages;
  const selectedPages = visiblePagesRaw.map((pageHtml, index) =>
    remapPageForTier(pageHtml, index + 1, visibleTotalPages, ''),
  );

  const html = `<!doctype html>
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
      --disc-d: ${FACTOR_META.D.color};
      --disc-i: ${FACTOR_META.I.color};
      --disc-s: ${FACTOR_META.S.color};
      --disc-c: ${FACTOR_META.C.color};
      --factor-primary: ${FACTOR_META[primaryFactor]?.color || FACTOR_META.D.color};
      --factor-secondary: ${FACTOR_META[secondaryFactor]?.color || FACTOR_META.I.color};
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
      font-family: Inter, "Plus Jakarta Sans", "Segoe UI", Arial, Helvetica, sans-serif;
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
        height: auto !important;
        min-height: 296mm !important;
        max-height: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        break-after: page !important;
        page-break-after: always !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        overflow: visible !important;
      }

      .content {
        height: auto !important;
        min-height: 250mm !important;
        overflow: visible !important;
        padding-bottom: 22mm !important;
      }

      .section-head {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid-page !important;
      }

      .section-head h2,
      h3,
      h4 {
        page-break-after: avoid !important;
        break-after: avoid-page !important;
      }

      .summary-grid,
      .summary-layout-grid,
      .summary-balance-grid,
      .grid.two.stack-on-print,
      .visual-panel-notes,
      .back-cover-columns {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .summary-layout-grid {
        grid-template-columns: 1.22fr 0.78fr !important;
      }

      .summary-balance-grid {
        grid-template-columns: 1.1fr 0.9fr !important;
      }

      .split-half-layout {
        grid-template-columns: 1fr 1fr !important;
      }

      .kpi-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      .kpi-pill-wide {
        grid-column: 1 / -1 !important;
      }

      .decision-path-row {
        grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr !important;
      }

      .decision-arrow {
        display: none !important;
      }

      .card,
      .factor-card,
      .factor-tech-card,
      .visual-panel,
      .behavior-matrix,
      .decision-path,
      .stress-escalation,
      .bullet-list {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }

    .page {
      width: 210mm;
      height: auto;
      min-height: 296mm;
      max-height: none;
      margin: 8mm auto;
      background: var(--paper);
      border-radius: 10px;
      overflow: visible;
      position: relative;
      box-shadow: var(--shadow);
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #e7ebf1;
      font-size: 11pt;
      line-height: 1.45;
      display: flex;
      flex-direction: column;
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
      padding: 8.5mm 16mm 20mm;
      min-height: 250mm;
      overflow: visible;
      flex: 1 1 auto;
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

    .report-header-line {
      font-size: 12px;
      font-weight: 700;
      color: #0b1f3b;
      line-height: 1.2;
      letter-spacing: 0.25px;
      white-space: nowrap;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 3.6mm;
      border-bottom: 1px solid var(--line);
      padding-bottom: 2.2mm;
      page-break-after: avoid;
      break-after: avoid-page;
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
      stroke: var(--factor-primary);
      stroke-width: 1.9;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .section-head h2 {
      margin: 0;
      color: var(--factor-primary);
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
      background: linear-gradient(90deg, var(--factor-primary), var(--factor-secondary));
    }

    .section-head span {
      font-size: 11px;
      color: var(--muted);
      text-align: right;
      max-width: 72mm;
    }

    .footer {
      position: relative;
      margin: 0 11mm 5.5mm;
      border-top: 1px solid var(--line);
      padding-top: 2.2mm;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 10px;
      color: #5b6474;
    }

    .premium-footer-label {
      position: absolute;
      left: 0;
      top: -7mm;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 1.4mm 3.2mm;
      border-radius: 999px;
      border: 1px solid rgba(216, 164, 68, 0.45);
      background: linear-gradient(180deg, rgba(216, 164, 68, 0.14), rgba(216, 164, 68, 0.04));
      color: #8a651e;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .cover-page {
      background: #eef2f7;
      border: 1px solid rgba(11, 31, 59, 0.08);
    }

    .cover-page::before {
      display: none;
    }

    .cover-content {
      --navy: #0b1f3b;
      --gold: #f7b500;
      --gold-2: #ff8a00;
      --white: #ffffff;
      --bg: #eef2f7;
      --text: #243447;
      --muted: #6b7280;
      position: relative;
      z-index: 1;
      padding: 0;
      min-height: 296mm;
      height: 296mm;
      width: 100%;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      overflow: hidden;
      background: linear-gradient(180deg, var(--bg) 0%, var(--white) 100%);
    }

    .cover-content::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 88% 10%, rgba(247, 181, 0, 0.18), transparent 28%),
        radial-gradient(circle at 10% 88%, rgba(11, 31, 59, 0.1), transparent 34%);
      z-index: 0;
      pointer-events: none;
    }

    .cover-content::after {
      content: "";
      position: absolute;
      right: 18mm;
      top: 58mm;
      width: 44mm;
      height: 44mm;
      border-radius: 999px;
      border: 1px solid rgba(11, 31, 59, 0.08);
      background: linear-gradient(135deg, rgba(247, 181, 0, 0.2), rgba(255, 138, 0, 0.12));
      z-index: 0;
      pointer-events: none;
    }

    .cover-art-image {
      display: none;
    }

    .cover-shell {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      height: 100%;
    }

    .cover-top-band {
      padding: 16mm 18mm 13mm;
      background: var(--navy);
      color: var(--white);
      text-align: center;
      box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
    }

    .cover-top-band::after {
      content: "";
      display: block;
      width: 32mm;
      height: 1.4mm;
      margin: 4mm auto 0;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--gold), var(--gold-2));
    }

    .cover-top-brand {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: 0.4px;
    }

    .cover-top-subtitle {
      margin-top: 2.2mm;
      font-size: 11.8px;
      line-height: 1.35;
      letter-spacing: 0.4px;
      color: rgba(255, 255, 255, 0.88);
    }

    .cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6.5mm;
      padding: 12mm 18mm 10mm;
    }

    .cover-central-block,
    .cover-identity-card,
    .cover-support-card {
      position: relative;
      z-index: 1;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(11, 31, 59, 0.08);
      box-shadow: 0 14px 34px rgba(11, 31, 59, 0.08);
    }

    .cover-central-block {
      padding: 9mm 10mm 8mm;
      border-radius: 22px;
    }

    .cover-report-kicker {
      margin: 0 0 2.8mm;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.15px;
      text-transform: uppercase;
      color: var(--navy);
    }

    .cover-mode-line {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1.5mm 3.8mm;
      margin-bottom: 4.2mm;
      border-radius: 999px;
      border: 1px solid rgba(247, 181, 0, 0.48);
      background: rgba(247, 181, 0, 0.16);
      color: var(--navy);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.9px;
      text-transform: uppercase;
    }

    .cover-name-highlight {
      display: block;
      margin: 0 0 5mm;
      font-size: 28px;
      font-weight: 800;
      line-height: 1.04;
      letter-spacing: 0.1px;
      color: var(--navy);
      overflow-wrap: anywhere;
    }

    .cover-name-highlight::after {
      content: "";
      display: block;
      width: 44mm;
      height: 1.8mm;
      margin-top: 3.4mm;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--gold), var(--gold-2));
    }

    .cover-meta-pair,
    .cover-id-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4.2mm 8mm;
    }

    .cover-meta-column,
    .cover-id-item {
      min-width: 0;
    }

    .cover-card-heading,
    .cover-meta-column span,
    .cover-id-item span {
      display: block;
      font-size: 9.8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      color: var(--muted);
    }

    .cover-meta-column strong,
    .cover-id-item strong {
      display: block;
      margin-top: 1.4mm;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text);
      overflow-wrap: anywhere;
    }

    .cover-identity-card {
      padding: 8mm 10mm 7.6mm;
      border-radius: 20px;
    }

    .cover-card-heading {
      margin-bottom: 4mm;
    }

    .cover-support-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 6mm;
      margin-top: auto;
    }

    .cover-support-card {
      padding: 6.5mm 7mm 6.5mm 9mm;
      border-radius: 18px;
      overflow: hidden;
    }

    .cover-support-card::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2.4mm;
      background: linear-gradient(180deg, var(--gold), var(--gold-2));
    }

    .cover-institution-title {
      font-size: 15.2px;
      font-weight: 800;
      line-height: 1.28;
      color: var(--navy);
      margin-bottom: 2.2mm;
    }

    .cover-institution-url {
      font-size: 12.2px;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text);
    }

    .cover-institution-contact {
      margin-top: 2mm;
      font-size: 11.4px;
      line-height: 1.35;
      color: var(--muted);
      font-weight: 600;
    }

    .cover-support-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text);
      margin-bottom: 3.2mm;
    }

    .cover-support-name {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.1;
      color: var(--navy);
      margin-bottom: 1.2mm;
    }

    .cover-support-role {
      font-size: 12.2px;
      line-height: 1.35;
      color: var(--muted);
      font-weight: 600;
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

    .cover-footer-note {
      position: relative;
      z-index: 1;
      padding: 4.6mm 18mm 9mm;
      border-top: 1px solid rgba(11, 31, 59, 0.08);
      background: rgba(255, 255, 255, 0.5);
      font-size: 9.8px;
      line-height: 1.45;
      text-align: center;
      color: var(--muted);
    }

    p {
      margin: 0 0 10px;
      font-size: 12.2px;
      color: #1f2937;
      line-height: 1.5;
    }

    h3 {
      margin: 0 0 6px;
      font-size: 15.1px;
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
      gap: 12px;
    }

    .grid.two {
      grid-template-columns: 1fr 1fr;
    }

    .grid.three {
      grid-template-columns: repeat(3, 1fr);
    }

    .grid-two {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }

    .card {
      background: var(--card);
      border: 1px solid #d9e0ea;
      border-radius: var(--radius);
      padding: 13px;
      box-shadow: 0 3px 14px rgba(15, 23, 42, 0.038);
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .ai-complementary-analysis {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .ai-complementary-intro p,
    .ai-block p:last-child {
      margin-bottom: 0;
    }

    .ai-block {
      height: 100%;
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

    .summary-grid-single {
      grid-template-columns: 1fr;
    }

    .summary-layout-grid {
      grid-template-columns: 1.22fr 0.78fr;
      align-items: start;
      gap: 10px;
      margin-bottom: 10px;
    }

    .summary-layout-grid-standard {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .summary-clean {
      margin-top: 2mm;
    }

    .summary-clean .summary-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 0;
    }

    .summary-balance-grid {
      grid-template-columns: 1.1fr 0.9fr;
      align-items: start;
      gap: 10px;
      margin-bottom: 10px;
    }

    .summary-balance-grid-standard {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .grid.two.stack-on-print {
      grid-template-columns: 1fr 1fr;
      align-items: start;
      gap: 10px;
    }

    .split-half-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      align-items: stretch;
    }

    .split-half-visual,
    .split-half-insight {
      min-width: 0;
    }

    .split-half-visual {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .split-half-bars {
      margin: 0;
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

    .summary-confidential-line {
      margin-top: 6px;
      font-size: 10.8px;
      color: #5d6b81;
      line-height: 1.35;
      border-top: 1px dashed #d5ddea;
      padding-top: 6px;
    }

    .factor-accent-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-top: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--accent), #ffffff 35%);
      background: color-mix(in srgb, var(--accent), #ffffff 86%);
      color: #0f172a;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .factor-accent-badge span {
      opacity: 0.72;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .factor-accent-badge strong {
      color: #0f172a;
      font-size: 11px;
      font-weight: 800;
    }

    .mini-disc-chart {
      margin-top: 4px;
      border: 1px solid #dce4ef;
      border-radius: 12px;
      background: #ffffff;
      padding: 9px 10px;
    }

    .mini-disc-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 6px;
    }

    .mini-disc-header h4 {
      margin: 0;
      font-size: 11.2px;
      color: #12315f;
      letter-spacing: 0.4px;
    }

    .mini-disc-header span {
      font-size: 10px;
      color: #5f708a;
    }

    .mini-disc-row {
      display: grid;
      grid-template-columns: 82px 1fr 38px;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .mini-disc-row:last-child {
      margin-bottom: 0;
    }

    .mini-disc-label {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    .mini-disc-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .mini-disc-label strong {
      font-size: 11px;
      color: #0f172a;
      line-height: 1;
    }

    .mini-disc-label small {
      font-size: 9.3px;
      color: #64748b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mini-disc-track {
      height: 7px;
      border-radius: 999px;
      background: #e4eaf2;
      overflow: hidden;
    }

    .mini-disc-fill {
      height: 100%;
      border-radius: 999px;
    }

    .mini-disc-value {
      text-align: right;
      font-size: 10.8px;
      color: #1e293b;
      font-weight: 700;
    }

    .behavior-matrix {
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      background: #ffffff;
      padding: 9px;
    }

    .behavior-matrix-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 7px;
    }

    .behavior-matrix-head h4 {
      margin: 0;
      color: #133160;
      font-size: 11.2px;
      letter-spacing: 0.45px;
    }

    .behavior-matrix-head span {
      font-size: 9.7px;
      color: #64748b;
    }

    .behavior-matrix-grid {
      position: relative;
      border: 1px solid #d8e2ef;
      border-radius: 10px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      min-height: 118px;
      margin-bottom: 8px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
    }

    .matrix-quadrant {
      padding: 8px;
      font-size: 10px;
      line-height: 1.3;
      color: #334155;
      border-right: 1px solid #e1e8f2;
      border-bottom: 1px solid #e1e8f2;
    }

    .matrix-quadrant small {
      color: #64748b;
      font-size: 9px;
      line-height: 1.3;
    }

    .q2,
    .q4 {
      border-right: none;
    }

    .q3,
    .q4 {
      border-bottom: none;
    }

    .matrix-marker {
      position: absolute;
      width: 12px;
      height: 12px;
      margin: -6px 0 0 -6px;
      border-radius: 50%;
      background: var(--marker);
      border: 2px solid #fff;
      box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.2);
    }

    .behavior-matrix p {
      margin: 0;
      font-size: 11px;
      line-height: 1.42;
      color: #334155;
    }

    .decision-path {
      border: 1px solid #d8e2ef;
      border-radius: 12px;
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      padding: 10px;
    }

    .decision-path h4 {
      margin: 0 0 7px;
      color: #12315f;
      font-size: 11.5px;
      letter-spacing: 0.4px;
    }

    .decision-path-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
      align-items: center;
      gap: 6px;
    }

    .decision-arrow {
      color: #64748b;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
    }

    .decision-step {
      border: 1px solid #dce4ef;
      border-radius: 10px;
      background: #fff;
      padding: 6px 7px;
      display: grid;
      gap: 1px;
      text-align: left;
    }

    .decision-step span {
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--factor-primary), #ffffff 80%);
      border: 1px solid color-mix(in srgb, var(--factor-primary), #ffffff 48%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 800;
      color: #1e293b;
    }

    .decision-step strong {
      font-size: 10.5px;
      color: #0f172a;
      line-height: 1.1;
    }

    .decision-step small {
      font-size: 9px;
      color: #64748b;
      line-height: 1.2;
    }

    .stress-escalation {
      border: 1px solid #d9e2ef;
      border-radius: 12px;
      background: #fff;
      padding: 9px 10px;
    }

    .stress-escalation h4 {
      margin: 0 0 7px;
      color: #143362;
      font-size: 11.4px;
      letter-spacing: 0.4px;
    }

    .stress-row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }

    .stress-row:last-child {
      margin-bottom: 0;
    }

    .stress-label {
      display: grid;
      gap: 1px;
    }

    .stress-label strong {
      font-size: 10.4px;
      color: #1e293b;
      line-height: 1.1;
    }

    .stress-label small {
      font-size: 9.2px;
      color: #64748b;
      line-height: 1.2;
    }

    .stress-track {
      height: 8px;
      border-radius: 999px;
      background: #e5ecf5;
      overflow: hidden;
    }

    .stress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--stress), #ffffff 18%), var(--stress));
    }

    .stress-escalation p {
      margin: 7px 0 0;
      font-size: 10.8px;
      line-height: 1.4;
      color: #334155;
    }

    .disc-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 19px;
      height: 19px;
      border-radius: 999px;
      margin-right: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      border: 1px solid rgba(15, 23, 42, 0.15);
    }

    .disc-chip-d { background: color-mix(in srgb, var(--disc-d), #ffffff 76%); border-color: color-mix(in srgb, var(--disc-d), #ffffff 48%); }
    .disc-chip-i { background: color-mix(in srgb, var(--disc-i), #ffffff 70%); border-color: color-mix(in srgb, var(--disc-i), #ffffff 48%); }
    .disc-chip-s { background: color-mix(in srgb, var(--disc-s), #ffffff 76%); border-color: color-mix(in srgb, var(--disc-s), #ffffff 48%); }
    .disc-chip-c { background: color-mix(in srgb, var(--disc-c), #ffffff 74%); border-color: color-mix(in srgb, var(--disc-c), #ffffff 48%); }

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

    .factor-tech-card {
      background: #ffffff;
      border: 1px solid color-mix(in srgb, var(--factor), #d8e2ef 68%);
      border-top: 4px solid var(--factor);
      border-radius: 14px;
      padding: 11px 12px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .factor-tech-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .factor-tech-head h3 {
      margin: 0;
      font-size: 14px;
      color: color-mix(in srgb, var(--factor), #0f172a 38%);
      line-height: 1.22;
    }

    .factor-pill {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--factor), #ffffff 74%);
      border: 1px solid color-mix(in srgb, var(--factor), #ffffff 45%);
      color: #0f172a;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .factor-mini-bars {
      margin: 7px 0 8px;
      display: grid;
      gap: 5px;
    }

    .factor-mini-row {
      display: grid;
      grid-template-columns: 58px 1fr 36px;
      align-items: center;
      gap: 7px;
    }

    .factor-mini-row span {
      font-size: 10px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .factor-mini-row strong {
      text-align: right;
      font-size: 10.7px;
      color: #0f172a;
      font-weight: 700;
    }

    .factor-mini-track {
      height: 7px;
      border-radius: 999px;
      background: #e4ebf4;
      overflow: hidden;
    }

    .factor-mini-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--factor), #ffffff 25%), var(--factor));
    }

    .factor-mini-fill-soft {
      opacity: 0.68;
    }

    .factor-mini-grid {
      gap: 7px;
    }

    .factor-mini-grid h4 {
      margin-bottom: 4px;
    }

    .bullet-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }

    .bullet-list li {
      position: relative;
      padding-left: 17px;
      font-size: 12.4px;
      color: #1f2937;
      line-height: 1.48;
    }

    .bullet-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      top: 0;
      color: var(--factor-primary);
      font-weight: 800;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      table-layout: fixed;
      page-break-inside: auto;
      break-inside: auto;
    }

    .table th,
    .table td {
      border-bottom: 1px solid #dee5ee;
      padding: 7px 8px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
      word-break: break-word;
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
      font-size: 11.6px;
    }

    .summary-item,
    .summary-col,
    .executive-hero,
    .cover-central-block,
    .cover-identity-card,
    .cover-support-card,
    .final-lockup {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .table tr,
    .table thead {
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .table thead {
      display: table-header-group;
    }

    .table tfoot {
      display: table-footer-group;
    }

    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
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

    .wheel-chart {
      max-width: 440px;
    }

    .gauge-chart {
      width: 100%;
      max-width: 360px;
      height: auto;
    }

    .heatmap-wrap {
      width: 100%;
      overflow: hidden;
    }

    .heatmap-table td,
    .heatmap-table th {
      text-align: center;
      font-weight: 700;
    }

    .heatmap-table td:first-child,
    .heatmap-table th:first-child {
      text-align: left;
      font-weight: 800;
    }

    .heatmap-primary-row {
      outline: 1px solid color-mix(in srgb, var(--factor-primary), #ffffff 52%);
      outline-offset: -1px;
    }

    .heatmap-caption {
      margin: 6px 0 0;
      font-size: 10.8px;
      color: #5f708a;
      line-height: 1.38;
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

    .final-lockup-logo-fallback {
      width: 108px;
      min-height: 52px;
      border-radius: 10px;
      border: 1px solid rgba(11, 31, 59, 0.18);
      background: linear-gradient(180deg, #f3f7ff, #ffffff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #0b1f3b;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    .final-lockup p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #1f2f46;
    }

    .back-cover-page {
      width: 210mm;
      height: 296mm;
      min-height: 296mm;
      max-height: 296mm;
      margin: 8mm auto;
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid #e7ebf1;
      box-shadow: var(--shadow);
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      page-break-inside: avoid;
      break-inside: avoid;
      break-after: page;
      page-break-after: always;
      overflow: hidden;
    }

    .back-cover-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    .premium-opening-page {
      background:
        linear-gradient(180deg, #ffffff, #fbfdff);
    }

    .standard-closing-page {
      background:
        linear-gradient(180deg, #ffffff, #fbfdff);
    }

    .back-cover {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      text-align: center;
      padding: 20mm 18mm 16mm;
      background: #ffffff;
    }

    .back-cover-ribbon {
      align-self: flex-end;
      margin-bottom: 7mm;
      padding: 1.5mm 4mm;
      border-radius: 999px;
      border: 1px solid rgba(216, 164, 68, 0.55);
      background: linear-gradient(180deg, rgba(216, 164, 68, 0.2), rgba(216, 164, 68, 0.05));
      color: #7a5a16;
      font-size: 9.8px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .back-cover-tier {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8mm;
      padding: 1.6mm 4mm;
      border-radius: 999px;
      border: 1px solid rgba(11, 31, 59, 0.2);
      background: linear-gradient(180deg, #f7fafc, #eef4fb);
      color: #213a63;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.9px;
      text-transform: uppercase;
    }

    .back-cover-logo {
      width: 280px;
      max-width: 68mm;
      height: auto;
      margin-bottom: 8mm;
      object-fit: contain;
    }

    .back-cover-logo-fallback {
      max-width: 78mm;
      min-height: 22mm;
      margin-bottom: 8mm;
      padding: 3.2mm 6mm;
      border-radius: 12px;
      border: 1px solid #d8e2ef;
      background: linear-gradient(180deg, #f8fbff, #eef4fc);
      color: #0b1f3b;
      font-size: 22px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.2px;
    }

    .back-cover-title {
      font-size: 34px;
      font-weight: 800;
      color: #0b1f3b;
      line-height: 1.08;
      letter-spacing: -0.4px;
    }

    .back-cover-subtitle {
      margin-top: 10px;
      font-size: 18px;
      color: #334155;
      line-height: 1.25;
    }

    .back-cover-divider {
      width: 100%;
      max-width: 138mm;
      height: 1px;
      margin: 8mm 0 7mm;
      background: linear-gradient(90deg, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.65), rgba(148, 163, 184, 0));
    }

    .back-cover-confidence {
      margin: 0 0 7mm;
      max-width: 140mm;
      font-size: 12px;
      line-height: 1.45;
      color: #334155;
      text-align: center;
    }

    .back-cover-columns {
      width: 100%;
      max-width: 148mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .back-cover-card {
      text-align: left;
      border: 1px solid #d7e1ef;
      border-radius: 12px;
      padding: 10px 11px;
      background: #fbfdff;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
    }

    .back-cover-card h4 {
      margin: 0 0 5px;
      font-size: 11px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #17335f;
      font-weight: 800;
    }

    .back-cover-card p {
      margin: 0 0 5px;
      font-size: 11.4px;
      line-height: 1.42;
      color: #40526f;
    }

    .back-cover-card p:last-child {
      margin-bottom: 0;
    }

    .back-cover-bottom {
      margin-top: auto;
      width: 100%;
      max-width: 148mm;
      border-top: 1px solid #dce5f2;
      padding-top: 7mm;
      text-align: center;
    }

    .back-cover-bottom p {
      margin: 0 0 4px;
      font-size: 10.8px;
      line-height: 1.4;
      color: #5b6d88;
    }

    .back-cover-bottom p:last-child {
      margin-bottom: 0;
    }

    body.theme-premium {
      background:
        radial-gradient(circle at 16% 12%, rgba(229, 54, 141, 0.15), transparent 20%),
        radial-gradient(circle at 84% 10%, rgba(55, 116, 255, 0.16), transparent 22%),
        linear-gradient(180deg, #050413 0%, #09081f 45%, #050412 100%);
      color: #eef2ff;
    }

    body.theme-premium .page {
      background: linear-gradient(180deg, #08061d 0%, #110c31 55%, #08051a 100%);
      border-color: rgba(139, 127, 255, 0.14);
      box-shadow: 0 18px 44px rgba(2, 4, 16, 0.45);
      color: #eef2ff;
    }

    body.theme-premium .page-even {
      background: linear-gradient(180deg, #0b0824 0%, #130d36 55%, #09061f 100%);
    }

    body.theme-premium .page-odd {
      background: linear-gradient(180deg, #070519 0%, #100b2f 55%, #070518 100%);
    }

    body.theme-premium .page-backdrop {
      background:
        radial-gradient(circle at 88% 8%, rgba(52, 113, 255, 0.2), transparent 22%),
        radial-gradient(circle at 14% 18%, rgba(235, 48, 148, 0.18), transparent 22%),
        radial-gradient(circle at 12% 92%, rgba(147, 69, 255, 0.16), transparent 24%);
      opacity: 1;
    }

    body.theme-premium .content {
      color: #eef2ff;
    }

    body.theme-premium .page-brand-strip {
      background: linear-gradient(180deg, rgba(20, 17, 58, 0.94), rgba(11, 10, 40, 0.94));
      border-color: rgba(136, 122, 255, 0.24);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 8px 20px rgba(0, 0, 0, 0.22);
    }

    body.theme-premium .report-header-line {
      color: #edf2ff;
      letter-spacing: 0.32px;
      text-shadow: none;
    }

    body.theme-premium .section-head {
      border-bottom-color: rgba(138, 123, 255, 0.18);
    }

    body.theme-premium .section-icon {
      border-color: rgba(138, 123, 255, 0.24);
      background: linear-gradient(180deg, rgba(63, 37, 133, 0.92), rgba(33, 21, 88, 0.96));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.26);
    }

    body.theme-premium .section-icon svg {
      stroke: #f7b500;
    }

    body.theme-premium .section-head h2,
    body.theme-premium h3,
    body.theme-premium h4 {
      color: #f5f7ff;
    }

    body.theme-premium .section-head span,
    body.theme-premium .muted-note,
    body.theme-premium .kpi-copy span,
    body.theme-premium .kpi-copy small,
    body.theme-premium .report-header-subtitle,
    body.theme-premium small {
      color: rgba(213, 221, 255, 0.74);
    }

    body.theme-premium p,
    body.theme-premium .bullet-list li,
    body.theme-premium .back-cover-card p,
    body.theme-premium .back-cover-confidence {
      color: #e5eaff;
    }

    body.theme-premium .card,
    body.theme-premium .strategic-note,
    body.theme-premium .callout-box,
    body.theme-premium .kpi-pill,
    body.theme-premium .factor-card,
    body.theme-premium .factor-tech-card,
    body.theme-premium .visual-panel,
    body.theme-premium .behavior-matrix,
    body.theme-premium .decision-path,
    body.theme-premium .stress-escalation,
    body.theme-premium .executive-hero,
    body.theme-premium .final-lockup,
    body.theme-premium .summary-item,
    body.theme-premium .summary-col {
      background: linear-gradient(180deg, rgba(66, 33, 140, 0.82), rgba(25, 19, 80, 0.94));
      border-color: rgba(156, 141, 255, 0.18);
      box-shadow: 0 12px 28px rgba(1, 3, 12, 0.3);
    }

    body.theme-premium .card::after {
      background: radial-gradient(circle, rgba(255, 66, 153, 0.18), rgba(255, 66, 153, 0));
    }

    body.theme-premium .strategic-note,
    body.theme-premium .callout-box {
      background: linear-gradient(180deg, rgba(57, 31, 125, 0.9), rgba(22, 19, 74, 0.96));
    }

    body.theme-premium .bullet-list li::before {
      color: #f7b500;
    }

    body.theme-premium .table,
    body.theme-premium .table td {
      color: #e7ecff;
    }

    body.theme-premium .table th {
      background: rgba(255, 255, 255, 0.06);
      color: #f6f8ff;
    }

    body.theme-premium .table th,
    body.theme-premium .table td,
    body.theme-premium .footer,
    body.theme-premium .back-cover-bottom {
      border-color: rgba(138, 123, 255, 0.18);
    }

    body.theme-premium .mini-disc-track,
    body.theme-premium .stress-track,
    body.theme-premium .factor-mini-track,
    body.theme-premium .bar-track {
      background: rgba(255, 255, 255, 0.08);
    }

    body.theme-premium .decision-arrow,
    body.theme-premium .mini-disc-header span,
    body.theme-premium .stress-label small,
    body.theme-premium .matrix-quadrant small {
      color: rgba(218, 225, 255, 0.7);
    }

    body.theme-premium .decision-step,
    body.theme-premium .matrix-quadrant,
    body.theme-premium .summary-item,
    body.theme-premium .summary-col,
    body.theme-premium .summary-copy,
    body.theme-premium .summary-order,
    body.theme-premium .kpi-pill-wide {
      border-color: rgba(156, 141, 255, 0.16);
      color: #eef2ff;
    }

    body.theme-premium .footer {
      color: rgba(212, 220, 255, 0.8);
    }

    body.theme-premium .footer span:first-child {
      color: #f2f5ff;
    }

    body.theme-premium .cover-page {
      background: linear-gradient(180deg, #060418 0%, #0d0a27 55%, #060515 100%);
      border-color: rgba(139, 127, 255, 0.16);
    }

    body.theme-premium .cover-content {
      background:
        radial-gradient(circle at 14% 42%, rgba(237, 55, 145, 0.2), transparent 24%),
        radial-gradient(circle at 74% 16%, rgba(57, 113, 255, 0.22), transparent 22%),
        linear-gradient(135deg, #060416 0%, #0d0a27 48%, #09061e 100%);
    }

    body.theme-premium .cover-content::before {
      background:
        radial-gradient(circle at 88% 10%, rgba(247, 181, 0, 0.12), transparent 24%),
        radial-gradient(circle at 10% 88%, rgba(146, 64, 255, 0.16), transparent 30%);
    }

    body.theme-premium .cover-content::after {
      border-color: rgba(129, 113, 255, 0.16);
      background: linear-gradient(135deg, rgba(229, 54, 141, 0.18), rgba(55, 116, 255, 0.15));
    }

    body.theme-premium .cover-top-band {
      background: linear-gradient(180deg, rgba(10, 9, 34, 0.94), rgba(8, 8, 26, 0.92));
    }

    body.theme-premium .cover-central-block,
    body.theme-premium .cover-identity-card,
    body.theme-premium .cover-support-card {
      background: linear-gradient(180deg, rgba(37, 25, 96, 0.84), rgba(18, 15, 58, 0.92));
      border-color: rgba(151, 136, 255, 0.16);
      box-shadow: 0 18px 38px rgba(1, 3, 12, 0.28);
    }

    body.theme-premium .cover-report-kicker,
    body.theme-premium .cover-mode-line,
    body.theme-premium .cover-card-heading,
    body.theme-premium .cover-meta-column span,
    body.theme-premium .cover-id-item span {
      color: rgba(229, 235, 255, 0.76);
    }

    body.theme-premium .cover-mode-line {
      border-color: rgba(247, 181, 0, 0.42);
      background: rgba(247, 181, 0, 0.1);
      color: #f7d78b;
    }

    body.theme-premium .cover-name-highlight,
    body.theme-premium .cover-meta-column strong,
    body.theme-premium .cover-id-item strong,
    body.theme-premium .cover-institution-title,
    body.theme-premium .cover-institution-url,
    body.theme-premium .cover-support-title,
    body.theme-premium .cover-support-name {
      color: #f4f7ff;
    }

    body.theme-premium .cover-top-subtitle,
    body.theme-premium .cover-support-role,
    body.theme-premium .cover-institution-contact,
    body.theme-premium .cover-footer-note {
      color: rgba(222, 229, 255, 0.76);
    }

    body.theme-premium .cover-footer-note {
      border-top-color: rgba(145, 131, 255, 0.14);
      background: rgba(5, 6, 20, 0.34);
    }

    @media print {
      .back-cover-page {
        margin: 0 !important;
        width: 210mm !important;
        height: 296mm !important;
        min-height: 296mm !important;
        max-height: 296mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
      }
    }
  </style>
</head>
<body class="${isPremiumTier ? 'theme-premium' : 'theme-standard'}">
  ${selectedPages.join('\n')}
</body>
</html>`;

  return applyUtf8Polish(applyGlobalWordingCorrections(html));
}

export default renderReportHtml;
