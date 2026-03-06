const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_META = {
  D: { label: 'Dominancia', color: '#e74c3c' },
  I: { label: 'Influencia', color: '#f1c40f' },
  S: { label: 'Estabilidade', color: '#2ecc71' },
  C: { label: 'Conformidade', color: '#3498db' },
};

const DEFAULT_BRANDING = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-report-logo.png',
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

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function automaticEnrichment(title, subtitle) {
  const scope = safeText(title, 'perfil');
  const detail = safeText(subtitle, 'contexto profissional');
  return `
    <div class="grid two">
      ${enrichmentCard(
        'Exemplo de aplicacao',
        `Em um cenario real de ${scope.toLowerCase()}, observe como o comportamento se expressa em reunioes de alinhamento, priorizacao de tarefas e tomada de decisao sob prazo.`
      )}
      ${enrichmentCard(
        'Leitura do gestor',
        `Para ${detail.toLowerCase()}, combine metas claras, feedback observavel e revisoes curtas para transformar insight comportamental em consistencia de entrega.`
      )}
    </div>
  `;
}

function buildPage({ number, totalPages, title, subtitle, content, cover = false, branding }) {
  if (cover) {
    return `
      <section class="page cover-page">
        <div class="cover-content">
          <div class="cover-logo-block">
            <img src="${esc(branding.logo_url)}" alt="${esc(branding.company_name)}" class="cover-logo" />
            ${
              branding.logo_contains_tagline
                ? ''
                : '<div class="cover-tagline">Plataforma de Análise Comportamental</div>'
            }
          </div>
          ${content}
        </div>
        <footer class="footer cover-footer">
          <span>InsightDISC • Relatorio Confidencial</span>
          <span>Pagina 1 de ${totalPages}</span>
        </footer>
      </section>
    `;
  }

  const parityClass = number % 2 === 0 ? 'page-even' : 'page-odd';
  const densityChars = stripHtml(content).length;
  const contentWithDensity =
    densityChars < 1200
      ? `${content}\n${automaticEnrichment(title, subtitle)}`
      : content;

  return `
    <section class="page ${parityClass}">
      <main class="content">
        <div class="section-head">
          <h2>${esc(title)}</h2>
          ${subtitle ? `<span>${esc(subtitle)}</span>` : ''}
        </div>
        ${contentWithDensity}
      </main>
      <footer class="footer">
        <span>${esc(branding.report_footer_text)}</span>
        <span>Pagina ${number} de ${totalPages}</span>
      </footer>
    </section>
  `;
}

export function renderReportHtml(input = {}) {
  const report = input?.reportModel || input || {};

  ensureCriticalData(report);

  const meta = {
    reportTitle: safeText(report?.meta?.reportTitle, 'Relatorio de Analise Comportamental DISC'),
    reportSubtitle: safeText(
      report?.meta?.reportSubtitle,
      'Diagnostico comportamental completo com benchmark, comunicacao, lideranca, riscos, carreira e plano de desenvolvimento'
    ),
    generatedAt: formatDate(report?.meta?.generatedAt),
    reportId: safeText(report?.meta?.reportId, `report-${Date.now()}`),
    responsibleName: safeText(report?.meta?.responsibleName, 'Especialista InsightDISC'),
    responsibleRole: safeText(report?.meta?.responsibleRole, 'Especialista em Analise Comportamental'),
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
      content: `
        <div class="cover-rule"></div>
        <h1 class="cover-title">RELATORIO DE PERFIL COMPORTAMENTAL</h1>
        <p class="cover-name">${esc(participant.name)}</p>
        <p class="cover-subtitle">Analise comportamental baseada na metodologia DISC</p>
        <div class="cover-participant-box">
          <div><strong>Empresa:</strong> ${esc(participant.company)}</div>
          <div><strong>Data:</strong> ${esc(meta.generatedAt)}</div>
          <div><strong>E-mail:</strong> ${esc(participant.email)}</div>
          <div><strong>Perfil predominante:</strong> ${esc(profile.primary)}${esc(profile.secondary ? ` + ${profile.secondary}` : '')}</div>
          <div><strong>Responsavel:</strong> ${esc(meta.responsibleName)}</div>
          <div><strong>ID da avaliacao:</strong> ${esc(participant.assessmentId)}</div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 2,
      totalPages: meta.totalPages,
      title: 'Apresentacao Executiva',
      subtitle: 'Como utilizar este relatorio com foco em resultado',
      branding,
      content: `
        <div class="grid two">
          <div class="card">${paragraphsHtml(methodologyOverview)}</div>
          <div class="card">${listHtml(methodologyUse)}</div>
        </div>
        <div class="card">
          <h3>Aviso de confidencialidade</h3>
          <p>${esc(safeText(report?.lgpd?.notice, 'Documento confidencial para uso profissional. Compartilhamento externo somente com autorizacao do titular e responsavel pelo processo.'))}</p>
        </div>
        ${enrichmentCard('Insight comportamental', safeText(insights?.executive, 'Priorize aplicacao pratica, rotina de acompanhamento e feedback observavel para transformar leitura em ganho de performance.'))}
        ${enrichmentCard('Atenção comportamental', 'Este relatorio deve orientar decisoes de desenvolvimento, nao substituir avaliacao tecnica, historico de desempenho ou contexto da funcao.')}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 3,
      totalPages: meta.totalPages,
      title: 'O Que e DISC',
      subtitle: 'Modelo, limites de uso e leitura responsavel',
      branding,
      content: `
        <div class="card">
          <p>O DISC e um modelo comportamental que organiza tendencias de resposta em quatro fatores: Dominancia, Influencia, Estabilidade e Conformidade.</p>
          <p>O modelo apoia desenvolvimento, comunicacao, lideranca e desenho de ambiente de trabalho. Nao mede carater nem competencia tecnica de forma isolada.</p>
          <p>Aplicacao correta exige leitura de contexto, historico de desempenho e maturidade da funcao.</p>
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
      title: 'Visao Geral dos 4 Fatores',
      subtitle: 'D, I, S, C com forcas e riscos tipicos',
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
      title: 'Sintese Executiva do Perfil',
      subtitle: 'Leitura geral, arquetipo e custo de adaptacao',
      branding,
      content: `
        <div class="card">
          <p><strong>Perfil identificado:</strong> ${esc(profile.key)} (${esc(profile.mode)})</p>
          <p><strong>Perfil primario:</strong> ${esc(profile.primary)} • <strong>Perfil secundario:</strong> ${esc(profile.secondary)}</p>
          <p><strong>Arquetipo:</strong> ${esc(profile.archetype)}</p>
          <p><strong>Custo de adaptacao:</strong> ${esc(adaptation.label)} (${esc(adaptation.avgAbsDelta)} pontos)</p>
          <p>${esc(adaptation.interpretation)}</p>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Resumo executivo</h3>
            ${listHtml(profileContent?.executiveSummary, ['Leitura executiva do perfil com foco em aplicacao de negocio.'])}
          </div>
          <div class="card">
            <h3>Leitura geral</h3>
            ${paragraphsHtml(narratives?.summaryParagraphs, [safeText(insights?.executive, 'Perfil com potencial de impacto quando combina forcas naturais com rotina de calibragem.')])}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 6,
      totalPages: meta.totalPages,
      title: 'Graficos DISC',
      subtitle: 'Perfil natural, adaptado e leitura comparativa',
      branding,
      content: `
        <div class="grid two">
          ${barsHtml(scores.natural, 'Perfil Natural')}
          ${barsHtml(scores.adapted, 'Perfil Adaptado')}
        </div>
        <div class="card">
          <h3>Leitura executiva dos scores</h3>
          ${scoresTable(scores)}
          <p>Este grafico mostra a intensidade relativa dos quatro fatores comportamentais. A predominancia de <strong>${esc(profile.primary)}</strong> com apoio de <strong>${esc(profile.secondary)}</strong> indica o eixo principal de resposta no ambiente profissional.</p>
          <p>${esc(safeText(insights?.practicalByPage?.dynamics, 'Compare natural e adaptado para entender onde ha maior esforco de ajuste comportamental.'))}</p>
          ${enrichmentCard('Aplicacao pratica', `Quando ${profile.primary} e ${profile.secondary} aparecem acima dos demais fatores, a pessoa tende a influenciar o ritmo da equipe por esse estilo dominante.`)}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 7,
      totalPages: meta.totalPages,
      title: 'Radar Comportamental',
      subtitle: 'Equilibrio dos eixos D, I, S, C',
      branding,
      content: `
        <div class="grid two">
          <div class="card radar-card">${radarSvg(scores.natural)}</div>
          <div class="card">
            <h3>Interpretacao dos eixos</h3>
            <p>O radar traduz a distribuicao relativa dos fatores em uma visao unica. Areas mais extensas indicam maior ativacao no perfil natural.</p>
            ${listHtml([
              `Eixo D-I: combina decisao e influencia para gerar tracao no contexto atual.`,
              `Eixo S-C: regula consistencia, previsibilidade e qualidade operacional.`,
              `Fator primario (${profile.primary}) orienta a resposta inicial em situacoes criticas.`,
              `Fator secundario (${profile.secondary}) ajusta o estilo para colaboracao e entrega.`
            ])}
            ${enrichmentCard('Leitura executiva', safeText(insights?.executiveByPage?.dynamics, safeText(insights?.executive, 'Use o radar para alinhar distribuicao de responsabilidade e estilo de lideranca no time.')))}
            ${enrichmentCard('Exemplo de aplicacao', `Em projetos com alta pressao, o eixo ${profile.primary}-${profile.secondary} tende a definir como a pessoa negocia prioridade, comunica urgencia e fecha compromissos.`)}
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
      subtitle: 'Comparacao do participante com faixa tipica',
      branding,
      content: `
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
            <h3>Aplicacao pratica</h3>
            <p>${esc(safeText(insights?.practicalByPage?.decision, 'Use benchmark para calibrar plano de desenvolvimento sem rotular de forma fixa.'))}</p>
            ${enrichmentCard('Risco de exagero', safeText(insights?.behavioralRisk, 'Excesso de um unico fator pode elevar risco relacional e reduzir sustentabilidade de resultado.'))}
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
      title: 'Comunicacao',
      subtitle: 'Como este perfil se comunica e como deve ser abordado',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Estilo de comunicacao</h3>
            ${listHtml(narratives?.communicationStyle, ['Comunicacao com foco em clareza, ritmo e objetivo de negocio.'])}
          </div>
          <div class="card">
            <h3>Necessidades de comunicacao</h3>
            ${listHtml(narratives?.communicationNeeds, ['Definicao explicita de prioridade, dono e proximo passo.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Boas praticas</h3>
            ${listHtml(profileContent?.communicationDo, ['Comunicar objetivo, impacto e proximo passo com clareza.'])}
          </div>
          <div class="card">
            <h3>Evitar</h3>
            ${listHtml(profileContent?.communicationDont, ['Evitar ambiguidade, promessas sem alinhamento e fechamento incompleto.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Principios de comunicacao</h3>
            ${listHtml(narratives?.communicationPrinciples, ['Ajustar profundidade por publico e risco de decisao.'])}
          </div>
          <div class="card">
            <h3>Como abordar este perfil</h3>
            ${listHtml(narratives?.communicationManagerNotes, ['Dar feedback observavel e fechar com compromisso de acao.'])}
          </div>
        </div>
        ${enrichmentCard(enrichment.insight, safeText(insights?.executiveByPage?.communication, 'Comunicar com metodo aumenta velocidade de resposta e qualidade da colaboracao.'))}
      `,
    })
  );

  pages.push(
    buildPage({
      number: 15,
      totalPages: meta.totalPages,
      title: 'Estilo de Lideranca',
      subtitle: 'Potencial de gestao, forcas e riscos como lider',
      branding,
      content: `
        <div class="card">
          ${paragraphsHtml(profileContent?.leadershipStyle, ['Estilo de lideranca orientado ao contexto do perfil e a maturidade da equipe.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Forcas de gestao</h3>
            ${listHtml(
              [...safeArray(narratives?.leadershipStrengths, []), ...safeArray(narratives?.leadershipPrinciples, [])].slice(0, 10),
              ['Direcao, contexto e acompanhamento curto aumentam resultado.']
            )}
          </div>
          <div class="card">
            <h3>Riscos de lideranca</h3>
            ${listHtml(profileContent?.leadershipRisks, ['Monitorar centralizacao, tom e ritmo de cobranca em alta pressao.'])}
          </div>
        </div>
        ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.leadership, 'Lideranca eficaz neste perfil depende de criterio claro, feedback recorrente e ajuste de estilo por contexto.'))}
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
      subtitle: 'Sinais de alerta e estrategia de recuperacao',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Padrao de estresse do perfil</h3>
            ${listHtml(profileContent?.stressPattern, ['Sinais comportamentais de pressao que afetam clareza e colaboracao.'])}
          </div>
          <div class="card">
            <h3>Sinais de alerta universais</h3>
            ${listHtml(
              [...safeArray(narratives?.stressSignals, []), ...safeArray(narratives?.stressSignalsShared, [])].slice(0, 10),
              ['Reatividade, queda de clareza e oscilacao de consistencia.']
            )}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Reacoes emocionais provaveis</h3>
            ${listHtml([
              `Sob pressao, o fator ${profile.primary} tende a aumentar a intensidade de resposta.`,
              'A percepcao de perda de controle pode gerar comunicacao mais curta e defensiva.',
              'Quando nao ha alinhamento de prioridade, cresce o risco de tensao com pares e lideranca.',
              'A falta de retorno rapido amplia desgaste e reduz qualidade de colaboracao.'
            ])}
          </div>
          <div class="card">
            <h3>Impacto no ambiente de trabalho</h3>
            ${listHtml([
              'Pode ocorrer queda de escuta em reunioes criticas.',
              'Retrabalho cresce quando o time nao tem checkpoint de risco.',
              'Conflitos latentes tendem a escalar sem ritual de alinhamento.',
              'A performance se recupera quando ha clareza de dono, prazo e criterio.'
            ])}
          </div>
        </div>
        <div class="card">
          <h3>Como recuperar equilibrio</h3>
          ${listHtml(profileContent?.recoveryStrategy, ['Repriorizar, reduzir ruido e retomar rotina de acompanhamento.'])}
          ${enrichmentCard('Leitura do gestor', safeText(insights?.practicalByPage?.stress, 'Gestores devem atuar cedo quando sinais de estresse aparecem para evitar escalada de conflito e queda de performance.'))}
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
      subtitle: 'Combinacoes complementares e pontos de atrito',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Perfis complementares</h3>
            ${listHtml(profileContent?.bestMatches, ['Perfil complementar para equilibrar decisao e relacionamento.'])}
            <p>Perfis complementares ampliam resultado quando ha acordo claro de papeis e criterio de colaboracao.</p>
          </div>
          <div class="card">
            <h3>Perfis com atrito potencial</h3>
            ${listHtml(profileContent?.frictionMatches, ['Atrito tende a surgir quando ritmo e criterio divergem sem alinhamento.'])}
            <p>Conflitos diminuem com contratos de convivio, objetivo comum e rituais curtos de alinhamento.</p>
          </div>
        </div>
        ${enrichmentCard(enrichment.application, 'Diferenca de perfil nao e problema; problema e falta de combinados claros sobre decisao, prazo e qualidade.')}
        ${enrichmentCard(enrichment.managerLens, safeText(insights?.managerLens, 'Leitura do gestor para compor equipes complementares com acordos claros de colaboracao.'))}
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
      title: 'Aderencia a Funcoes e Carreira',
      subtitle: 'Areas recomendadas e baixa aderencia',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Funcoes recomendadas</h3>
            ${listHtml(profileContent?.recommendedRoles, ['Funcao com aderencia comportamental alta ao perfil identificado.'])}
          </div>
          <div class="card">
            <h3>Funcoes de menor aderencia</h3>
            ${listHtml(profileContent?.lowFitRoles, ['Funcao que pode gerar desgaste sem ajuste de contexto e suporte.'])}
          </div>
        </div>
        <div class="card">
          <h3>Framework de crescimento</h3>
          ${listHtml(narratives?.careerFramework, ['Evolucao de carreira combina contexto adequado e desenvolvimento intencional.'])}
          ${enrichmentCard(enrichment.application, safeText(insights?.practicalByPage?.career, 'Aderencia de carreira melhora quando forca natural e exigencia da funcao estao em equilibrio.'))}
          ${enrichmentCard('Observacao de carreira', safeText(insights?.careerCallout, 'Aderencia de carreira melhora quando forca natural e exigencia da funcao estao em equilibrio.'))}
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
      subtitle: 'Areas de maturidade para reduzir risco de exagero',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.developmentPoints, ['Ponto de desenvolvimento com alto potencial de impacto no resultado.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Risco de exagero do perfil</h3>
            <p>${esc(safeText(insights?.riskOfExcess, safeText(insights?.behavioralRisk, 'Exagero de fator primario sem calibragem pode gerar queda de qualidade relacional e impacto em performance sustentavel.')))}</p>
            ${listHtml(narratives?.developmentRisks, ['Exagero comportamental sem revisao de contexto pode reduzir performance sustentavel.'])}
          </div>
          <div class="card">
            <h3>Impacto na carreira</h3>
            <p>Tratar os pontos de desenvolvimento com rotina e medicao reduz gargalo de progressao e aumenta confiabilidade de entrega em contextos complexos.</p>
            ${enrichmentCard(enrichment.developmentLens, safeText(insights?.developmentLens, 'Consolidar habitos de melhoria acelera maturidade de carreira.'))}
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
      subtitle: 'Guia para gestores: feedback, cobranca, delegacao e engajamento',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.managerGuidance, ['Diretriz de lider para aumentar aderencia, ritmo e qualidade de entrega.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Como dar feedback</h3>
            ${listHtml([
              'Use fato, impacto e ajuste esperado.',
              'Traga exemplo observavel e contexto de negocio.',
              'Feche com acao e prazo de revisao.',
              'Evite feedback generico ou sem criterio.',
              'Reconheca evolucao com evidencia concreta.'
            ])}
          </div>
          <div class="card">
            <h3>Como engajar</h3>
            <p>${esc(safeText(insights?.managerCallout, 'Engajamento cresce quando o lider combina autonomia, clareza de expectativa e acompanhamento objetivo.'))}</p>
            ${enrichmentCard(enrichment.managerLens, safeText(insights?.managerLens, 'Leitura do gestor para aumentar aderencia, ritmo e qualidade de entrega.'))}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 27,
      totalPages: meta.totalPages,
      title: 'Como Este Perfil Deve Liderar',
      subtitle: 'Guia de autolideranca para o participante',
      branding,
      content: `
        <div class="card">
          ${listHtml(profileContent?.selfLeadershipGuidance, ['Diretriz de autolideranca para ampliar impacto com equilibrio comportamental.'])}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Armadilhas de lideranca</h3>
            ${listHtml(narratives?.leadershipPitfalls, ['Armadilha recorrente quando o estilo nao e calibrado ao contexto.'])}
          </div>
          <div class="card">
            <h3>Roteiro de evolucao</h3>
            ${listHtml([
              'Definir intencao de lideranca por ciclo semanal.',
              'Revisar linguagem e tom em conversas criticas.',
              'Delegar com checkpoints claros.',
              'Criar rotina de feedback bilateral.',
              'Consolidar aprendizado em plano trimestral.'
            ])}
            ${enrichmentCard(enrichment.developmentLens, safeText(insights?.developmentLens, 'Autolideranca evolui quando insight vira rotina semanal com medicao observavel.'))}
          </div>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 28,
      totalPages: meta.totalPages,
      title: 'Plano de Acao 30/60/90 Dias',
      subtitle: 'Roteiro pratico com indicadores de acompanhamento',
      branding,
      content: `
        <div class="grid three">
          <div class="card">
            <h3>30 dias</h3>
            ${listHtml(plans?.days30, ['Definir foco comportamental e rotina de checkpoint semanal.'])}
          </div>
          <div class="card">
            <h3>60 dias</h3>
            ${listHtml(plans?.days60, ['Consolidar ajuste de comunicacao e decisao em contexto real.'])}
          </div>
          <div class="card">
            <h3>90 dias</h3>
            ${listHtml(plans?.days90, ['Escalar rotina de alta performance sustentavel com feedback estruturado.'])}
          </div>
        </div>
        <div class="card">
          <h3>Indicadores recomendados</h3>
          ${listHtml([
            'Qualidade de fechamento de acordos por semana.',
            'Reducao de retrabalho por falta de alinhamento.',
            'Consistencia de follow-up em temas criticos.',
            'Percepcao de clareza de comunicacao pelo time.',
            'Evolucao de autonomia com responsabilidade.'
          ])}
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 29,
      totalPages: meta.totalPages,
      title: 'Sintese Executiva do Perfil',
      subtitle: 'Resumo para lideranca, desenvolvimento e tomada de decisao',
      branding,
      content: `
        <div class="grid two">
          <div class="card">
            <h3>Principais forcas</h3>
            ${listHtml(profileContent?.naturalStrengths, ['Forcas naturais com alto impacto no ambiente profissional.'])}
          </div>
          <div class="card">
            <h3>Possiveis desafios</h3>
            ${listHtml(profileContent?.developmentPoints, ['Desafios de maturidade para ganho de consistencia e escala.'])}
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Estilo de trabalho</h3>
            ${paragraphsHtml(
              profileContent?.identityDynamics,
              ['Estilo de atuacao orientado por fatores dominantes do perfil e contexto de performance.']
            )}
          </div>
          <div class="card">
            <h3>Ambiente ideal e recomendacao geral</h3>
            ${listHtml(profileContent?.idealEnvironment, ['Contexto com clareza de prioridade, autonomia e responsabilidade compartilhada.'])}
            ${enrichmentCard('Aplicacao pratica', safeText(insights?.executiveByPage?.environment, safeText(insights?.executive, 'A sintese executiva apoia lideres a decidir alocacao, desenvolvimento e ajustes de contexto.')))}
          </div>
        </div>
        <div class="card">
          <h3>Glossario tecnico (resumo)</h3>
          <table class="table compact">
            <thead><tr><th>Termo</th><th>Definicao</th></tr></thead>
            <tbody>
              ${safeArray(report?.glossary?.items, [
                { term: 'Perfil Natural', definition: 'Tendencia espontanea de comportamento.' },
                { term: 'Perfil Adaptado', definition: 'Ajuste comportamental exigido pelo contexto.' },
                { term: 'Benchmark', definition: 'Comparacao com faixa tipica de referencia.' },
              ])
                .slice(0, 5)
                .map(
                  (item) => `<tr><td>${esc(item.term)}</td><td>${esc(item.definition)}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `,
    })
  );

  pages.push(
    buildPage({
      number: 30,
      totalPages: meta.totalPages,
      title: 'Fechamento Executivo',
      subtitle: 'Sintese final, LGPD e assinatura institucional',
      branding,
      content: `
        <div class="card">
          <h3>Conclusao</h3>
          <p>O perfil analisado revela caracteristicas comportamentais que influenciam diretamente a forma como a pessoa percebe desafios, interage com outras pessoas e toma decisoes.</p>
          <p>Compreender essas tendencias permite criar ambientes de trabalho mais produtivos, equipes mais equilibradas e estrategias de desenvolvimento mais eficazes.</p>
          <p>O InsightDISC tem como objetivo fornecer uma leitura clara e aplicada do comportamento humano no contexto profissional.</p>
          ${paragraphsHtml(
            profileContent?.executiveClosing || narratives?.executiveClosing,
            [
              safeText(profileContent?.closingSummary, 'Este perfil gera alto valor quando transforma consciencia comportamental em rotina de execucao com ajuste continuo.'),
              safeText(insights?.executiveByPage?.career, safeText(insights?.executive, 'A aplicacao pratica deste relatorio deve ser acompanhada por metas observaveis e revisao recorrente de comportamento.')),
            ]
          )}
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Confidencialidade e LGPD</h3>
            <p>${esc(safeText(report?.lgpd?.notice, 'Dados pessoais tratados para finalidade de desenvolvimento comportamental, conforme consentimento e principios da LGPD.'))}</p>
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
      margin: 12mm 10mm 14mm;
    }

    @media print {
      body {
        background: #fff;
      }

      .page {
        margin: 0;
        width: 100%;
        min-height: auto;
        box-shadow: none;
        border-radius: 0;
      }
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 10mm auto;
      background: var(--paper);
      border-radius: 10px;
      overflow: hidden;
      position: relative;
      box-shadow: var(--shadow);
      page-break-after: always;
      border: 1px solid #e7ebf1;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .page-even {
      background: var(--paper-alt);
    }

    .page-odd {
      background: var(--paper);
    }

    .content {
      padding: 9mm 11mm 18mm;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 5.5mm;
      border-bottom: 1px solid var(--line);
      padding-bottom: 3.2mm;
    }

    .section-head h2 {
      margin: 0;
      color: var(--primary);
      font-size: 25px;
      line-height: 1.16;
      letter-spacing: -0.35px;
      font-weight: 750;
    }

    .section-head span {
      font-size: 11.5px;
      color: var(--muted);
      text-align: right;
      max-width: 72mm;
    }

    .footer {
      position: absolute;
      bottom: 7mm;
      left: 11mm;
      right: 11mm;
      border-top: 1px solid var(--line);
      padding-top: 3mm;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 10px;
      color: #5b6474;
    }

    .cover-page {
      background: #ffffff;
      border: 1px solid #e9edf4;
    }

    .cover-content {
      padding: 22mm 20mm 28mm;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8mm;
    }

    .cover-logo-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3.2mm;
      margin-top: 2mm;
    }

    .cover-logo {
      width: 146mm;
      max-width: 100%;
      max-height: 42mm;
      object-fit: contain;
      display: block;
    }

    .cover-tagline {
      font-size: 12.5px;
      color: #4b5563;
      letter-spacing: 0.4px;
    }

    .cover-rule {
      width: 126mm;
      max-width: 100%;
      height: 2px;
      margin: 1mm auto 0;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(247, 181, 0, 0.05), var(--secondary), rgba(11, 31, 59, 0.28));
    }

    .cover-title {
      margin: 0;
      text-align: center;
      color: var(--primary);
      font-size: 33px;
      line-height: 1.08;
      letter-spacing: 0.4px;
      font-weight: 800;
      text-transform: uppercase;
      max-width: 154mm;
      margin-inline: auto;
    }

    .cover-name {
      margin: 0 auto;
      font-size: 22px;
      line-height: 1.16;
      font-weight: 650;
      color: #0b1f3b;
      text-align: center;
    }

    .cover-subtitle {
      margin: 0 auto 1mm;
      max-width: 160mm;
      text-align: center;
      color: #334155;
      font-size: 15.5px;
      line-height: 1.45;
    }

    .cover-participant-box {
      margin: 0 auto;
      width: 100%;
      max-width: 165mm;
      background: linear-gradient(180deg, #ffffff, #f7f8fb);
      border: 1px solid #dbe2ec;
      border-radius: 18px;
      padding: 17px 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px 18px;
      font-size: 12.8px;
      color: #1f2937;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }

    .cover-participant-box strong {
      color: #0f172a;
    }

    .cover-footer {
      background: transparent;
    }

    p {
      margin: 0 0 10px;
      font-size: 13.6px;
      color: #1f2937;
      line-height: 1.58;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 16.3px;
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

    .card {
      background: var(--card);
      border: 1px solid #d9e0ea;
      border-radius: var(--radius);
      padding: 15px;
      box-shadow: 0 3px 14px rgba(15, 23, 42, 0.038);
    }

    .callout-box {
      border-radius: 12px;
      padding: 12px 14px;
      margin-top: 10px;
      border-left: 4px solid transparent;
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
      padding: 9px 10px;
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
      min-height: 330px;
    }

    .radar {
      width: 100%;
      max-width: 420px;
      height: auto;
    }
  </style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}

export default renderReportHtml;
