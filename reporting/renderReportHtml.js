const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_META = {
  D: { label: 'Dominancia', color: '#e74c3c' },
  I: { label: 'Influencia', color: '#f1c40f' },
  S: { label: 'Estabilidade', color: '#2ecc71' },
  C: { label: 'Conformidade', color: '#3498db' },
};

const DEFAULT_BRANDING = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-logo.svg',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Analise Comportamental',
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
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function pct(value) {
  return `${clamp(value)}%`;
}

function safeText(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeArray(value, fallback = []) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function normalizeHexColor(value, fallback) {
  const color = String(value || '').trim();
  if (!color || !HEX_COLOR_REGEX.test(color)) return fallback;
  return color.toLowerCase();
}

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('pt-BR');
  return date.toLocaleDateString('pt-BR');
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
  };
}

function normalizeParticipant(participant = {}, meta = {}) {
  const name = safeText(participant?.name, '');
  const email = safeText(participant?.email, '');
  const assessmentId = safeText(participant?.assessmentId || meta?.reportId, '');

  if (!name) {
    throw createBadRequest('Dado obrigatorio ausente: participant.name');
  }

  return {
    name,
    email: email || 'contato@participante.disc',
    assessmentId: assessmentId || meta?.reportId || `report-${Date.now()}`,
    role: safeText(participant?.role, 'Profissional em desenvolvimento'),
    company: safeText(participant?.company, 'Organizacao avaliada'),
  };
}

function ensureBrandingCompleteness(branding) {
  if (!String(branding?.company_name || '').trim() || !String(branding?.logo_url || '').trim()) {
    throw createBadRequest('Branding incompleto para geracao white-label');
  }
}

function listHtml(items, fallback = ['Aplicar recomendacoes em contexto real de trabalho.']) {
  return `<ul class="clean">${safeArray(items, fallback)
    .map((item) => `<li>${esc(item)}</li>`)
    .join('')}</ul>`;
}

function barsHtml(scores = {}) {
  return FACTORS.map((factor) => {
    const value = clamp(scores[factor]);
    const color = FACTOR_META[factor].color;

    return `
      <div class="bar-row">
        <div class="bar-label"><span class="dot" style="background:${color}"></span>${factor} - ${FACTOR_META[factor].label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${value}%;background:${color}"></div></div>
        <div class="bar-value">${value}%</div>
      </div>
    `;
  }).join('');
}

function radarSvg(scores = {}) {
  const size = 280;
  const cx = 140;
  const cy = 140;
  const maxR = 100;
  const axes = [
    { factor: 'D', angle: -90 },
    { factor: 'I', angle: 0 },
    { factor: 'S', angle: 90 },
    { factor: 'C', angle: 180 },
  ];

  const point = (factor, value) => {
    const angle = (axes.find((item) => item.factor === factor)?.angle || 0) * (Math.PI / 180);
    const radius = (clamp(value) / 100) * maxR;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const rings = [25, 50, 75, 100]
    .map((ring) => {
      const points = axes
        .map((axis) => {
          const [x, y] = point(axis.factor, ring);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      return `<polygon points="${points}" fill="none" stroke="rgba(15,23,42,.14)" stroke-width="1" />`;
    })
    .join('');

  const axisLines = axes
    .map((axis) => {
      const [x, y] = point(axis.factor, 100);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(15,23,42,.16)" stroke-width="1" />`;
    })
    .join('');

  const labels = axes
    .map((axis) => {
      const [x, y] = point(axis.factor, 112);
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">${axis.factor}</text>`;
    })
    .join('');

  const profilePolygon = axes
    .map((axis) => {
      const [x, y] = point(axis.factor, scores[axis.factor]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Radar DISC">
      ${rings}
      ${axisLines}
      <polygon points="${profilePolygon}" fill="rgba(59,130,246,.20)" stroke="rgba(37,99,235,.85)" stroke-width="2" />
      <circle cx="${cx}" cy="${cy}" r="2.6" fill="#334155" />
      ${labels}
    </svg>
  `;
}

function tableRows(rows = []) {
  return rows
    .map(
      (row) =>
        `<tr><td>${esc(row.factor)}</td><td>${esc(row.score)}</td><td>${esc(row.range)}</td><td>${esc(row.reading)}</td></tr>`
    )
    .join('');
}

function compatibilityByProfile(profile) {
  const map = {
    D: {
      synergy: ['D/I', 'D/C', 'I/D'],
      friction: ['S/S', 'C/S'],
    },
    I: {
      synergy: ['I/S', 'I/D', 'S/I'],
      friction: ['C/C', 'D/C'],
    },
    S: {
      synergy: ['S/C', 'S/I', 'C/S'],
      friction: ['D/D', 'D/I'],
    },
    C: {
      synergy: ['C/S', 'C/D', 'S/C'],
      friction: ['I/I', 'I/D'],
    },
  };

  return map[profile?.primary] || map.D;
}

function pageTemplate({
  branding,
  pageNumber,
  totalPages,
  title,
  subtitle,
  content,
  cover = false,
}) {
  if (cover) {
    return `
      <section class="page cover-page">
        <div class="cover-bg"></div>
        <div class="cover-content">
          <div class="cover-logo-wrap">
            <img src="${esc(branding.logo_url)}" class="cover-logo" alt="${esc(branding.company_name)}" />
          </div>
          <div class="cover-kicker">Relatorio White-Label Premium</div>
          <h1 class="cover-title">Relatorio de Analise Comportamental <span>DISC</span></h1>
          <p class="cover-subtitle">Diagnostico completo com benchmark, mapa comportamental, plano de acao e recomendacoes de lideranca.</p>
          ${content}
        </div>
        <div class="cover-footer">${esc(branding.report_footer_text)} • Pagina 1 de ${totalPages}</div>
      </section>
    `;
  }

  return `
    <section class="page">
      <header class="header">
        <div class="logo-wrap">
          <img src="${esc(branding.logo_url)}" alt="${esc(branding.company_name)}" class="logo" />
          <div>
            <div class="brand-title">${esc(branding.company_name)}</div>
            <div class="brand-subtitle">Plataforma de Analise Comportamental</div>
          </div>
        </div>
        <div class="header-meta">
          <div><strong>${esc(title)}</strong></div>
          <div>${esc(subtitle)}</div>
        </div>
      </header>
      <main class="content">${content}</main>
      <footer class="footer">
        <span>${esc(branding.report_footer_text)}</span>
        <span><strong>Pagina ${pageNumber} de ${totalPages}</strong></span>
      </footer>
    </section>
  `;
}

export function renderReportHtml(input = {}) {
  const report = input?.reportModel || input || {};

  const meta = {
    brand: safeText(report?.meta?.brand, DEFAULT_BRANDING.company_name),
    reportTitle: safeText(report?.meta?.reportTitle, 'Relatorio DISC Premium'),
    reportSubtitle: safeText(
      report?.meta?.reportSubtitle,
      'Diagnostico comportamental com orientacoes praticas para performance, lideranca e carreira'
    ),
    generatedAt: formatDate(report?.meta?.generatedAt),
    reportId: safeText(report?.meta?.reportId, `report-${Date.now()}`),
    version: safeText(report?.meta?.version, '4.0'),
    responsibleName: safeText(report?.meta?.responsibleName, 'Especialista InsightDISC'),
    responsibleRole: safeText(report?.meta?.responsibleRole, 'Analista Comportamental'),
  };

  const branding = normalizeBranding(report?.branding || {}, meta);
  ensureBrandingCompleteness(branding);

  const participant = normalizeParticipant(report?.participant || {}, meta);

  const scores = {
    natural: report?.scores?.natural || { D: 25, I: 25, S: 25, C: 25 },
    adapted: report?.scores?.adapted || report?.scores?.natural || { D: 25, I: 25, S: 25, C: 25 },
    summary: report?.scores?.summary || report?.scores?.natural || { D: 25, I: 25, S: 25, C: 25 },
    deltas: report?.scores?.deltas || { D: 0, I: 0, S: 0, C: 0 },
  };

  const profile = {
    primary: safeText(report?.profile?.primary, 'D'),
    secondary: safeText(report?.profile?.secondary, 'I'),
    key: safeText(report?.profile?.key, 'DI'),
    mode: safeText(report?.profile?.mode, 'combo'),
    label: safeText(report?.profile?.label, 'Combinacao comportamental com foco em resultado e relacao'),
    archetype: safeText(report?.profile?.archetype, 'Perfil orientado a desempenho sustentavel'),
  };

  const adaptation = {
    band: safeText(report?.adaptation?.band, 'mid').toUpperCase(),
    avgAbsDelta: Number(report?.adaptation?.avgAbsDelta || 0).toFixed(2),
    interpretation: safeText(
      report?.adaptation?.interpretation,
      'A adaptacao atual exige calibracao de comportamento para manter performance sem desgaste excessivo.'
    ),
  };

  const combined = report?.combinedProfile || {};
  const factors = report?.factors || {};
  const plans = report?.plans || {};
  const snippets = report?.snippets || {};
  const lgpd = report?.lgpd || {};
  const benchmarkRows = safeArray(report?.benchmark?.rows, FACTORS.map((factor) => ({
    factor: `${factor} - ${FACTOR_META[factor].label}`,
    score: pct(scores.natural[factor]),
    range: factor === profile.primary ? '67-100' : factor === profile.secondary ? '45-85' : '20-65',
    reading: 'Faixa de referencia interna para acompanhamento de evolucao.',
  })));

  const compatibility = compatibilityByProfile(profile);
  const totalPages = 20;
  const pages = [];

  // 1) Capa
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 1,
      totalPages,
      title: meta.reportTitle,
      subtitle: meta.generatedAt,
      cover: true,
      content: `
        <div class="cover-card">
          <p><strong>Participante:</strong> ${esc(participant.name)}</p>
          <p><strong>E-mail:</strong> ${esc(participant.email)}</p>
          <p><strong>Data:</strong> ${esc(meta.generatedAt)}</p>
          <p><strong>Perfil predominante:</strong> ${esc(profile.primary)} + ${esc(profile.secondary)}</p>
        </div>
        <div class="cover-meta">
          <p>Responsavel: <strong>${esc(meta.responsibleName)}</strong> (${esc(meta.responsibleRole)})</p>
          <p>ID do relatorio: <strong>${esc(meta.reportId)}</strong></p>
        </div>
      `,
    })
  );

  // 2) Metodologia
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 2,
      totalPages,
      title: 'Metodologia DISC',
      subtitle: meta.generatedAt,
      content: `
        <h2 class="section-title">1. O que e DISC e como interpretar este relatorio</h2>
        <p>O DISC descreve tendencias comportamentais observaveis em quatro fatores: Dominancia, Influencia, Estabilidade e Conformidade.</p>
        <p>Esta leitura e deterministica, baseada em regras fixas e em score de fatores, sem geracao de texto por IA.</p>
        <div class="panel">
          <h3 class="sub-title">Leitura recomendada</h3>
          ${listHtml([
            'Use o relatorio para orientar desenvolvimento comportamental pratico.',
            'Conecte cada insight a situacoes reais de trabalho e lideranca.',
            'Acompanhe evolucao em ciclos de 30, 60 e 90 dias.',
            'Evite usar o DISC como rotulo fixo; contexto influencia comportamento.',
          ])}
        </div>
      `,
    })
  );

  // 3) 4 fatores cards
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 3,
      totalPages,
      title: 'Os 4 Fatores DISC',
      subtitle: participant.name,
      content: `
        <h2 class="section-title">2. Estrutura dos fatores comportamentais</h2>
        <div class="disc-grid">
          <div class="disc-card d-card"><strong>D - Dominancia</strong><p>Decisao, assertividade e foco em resultado.</p></div>
          <div class="disc-card i-card"><strong>I - Influencia</strong><p>Persuasao, conexao e energia relacional.</p></div>
          <div class="disc-card s-card"><strong>S - Estabilidade</strong><p>Consistencia, cooperacao e previsibilidade.</p></div>
          <div class="disc-card c-card"><strong>C - Conformidade</strong><p>Analise, criterio e qualidade de execucao.</p></div>
        </div>
        <div class="panel-white">
          <p><strong>Combinacao identificada:</strong> ${esc(profile.key)} (${esc(profile.label)})</p>
          <p>${esc(profile.archetype)}</p>
        </div>
      `,
    })
  );

  // 4) Resumo executivo
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 4,
      totalPages,
      title: 'Resumo Executivo',
      subtitle: participant.name,
      content: `
        <h2 class="section-title">3. Sintese executiva do perfil</h2>
        <p class="lead">${esc(profile.archetype)}</p>
        ${listHtml(combined?.executiveSummary, [
          'Perfil com potencial de entrega consistente quando opera com criterios claros.',
          'Ajustes de comunicacao e follow-up ampliam previsibilidade de resultado.',
          'A combinacao dos fatores favorece impacto pratico em ambientes colaborativos.',
          'O ganho principal vem de rotina de melhoria com feedback estruturado.',
        ])}
        <div class="panel">
          <p><strong>Custo de adaptacao:</strong> ${esc(adaptation.band)} (media de delta ${esc(adaptation.avgAbsDelta)} pontos)</p>
          <p>${esc(adaptation.interpretation)}</p>
        </div>
      `,
    })
  );

  // 5) Barras de perfil natural
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 5,
      totalPages,
      title: 'Indices DISC',
      subtitle: 'Perfil Natural',
      content: `
        <h2 class="section-title">4. Indices comportamentais (Perfil Natural)</h2>
        <div class="panel-white">${barsHtml(scores.natural)}</div>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">Leitura natural</h3>
            <p><strong>Primario:</strong> ${esc(profile.primary)} - ${esc(FACTOR_META[profile.primary]?.label || '')}</p>
            <p><strong>Secundario:</strong> ${esc(profile.secondary)} - ${esc(FACTOR_META[profile.secondary]?.label || '')}</p>
          </div>
          <div class="panel-white">
            <h3 class="sub-title">Perfil adaptado (resumo)</h3>
            ${barsHtml(scores.adapted)}
          </div>
        </div>
      `,
    })
  );

  // 6) Radar chart SVG
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 6,
      totalPages,
      title: 'Radar DISC',
      subtitle: 'Mapa de eixos comportamentais',
      content: `
        <h2 class="section-title">5. Radar comportamental</h2>
        <div class="grid-2">
          <div class="panel-white chart-wrap">${radarSvg(scores.natural)}</div>
          <div class="panel-white">
            <h3 class="sub-title">Interpretacao dos eixos</h3>
            ${listHtml([
              `Eixo D-I: combina assertividade e influencia em intensidade proporcional ao score de ${esc(profile.key)}.`,
              `Eixo S-C: regula estabilidade operacional e padrao de qualidade com foco em consistencia.`,
              `Fator primario (${esc(profile.primary)}) orienta sua resposta inicial em decisoes criticas.`,
              `Fator secundario (${esc(profile.secondary)}) complementa seu estilo em contexto colaborativo.`,
            ])}
          </div>
        </div>
      `,
    })
  );

  // 7) Benchmark por perfil
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 7,
      totalPages,
      title: 'Benchmark por Perfil',
      subtitle: `Combinacao ${profile.key}`,
      content: `
        <h2 class="section-title">6. Benchmark do participante vs faixa tipica do perfil</h2>
        <table class="table">
          <thead><tr><th>Fator</th><th>Score da pessoa</th><th>Faixa tipica</th><th>Leitura</th></tr></thead>
          <tbody>
            ${tableRows(
              benchmarkRows.map((row) => ({
                factor: `${row.factor}`,
                score: `${clamp(row.score)}%`,
                range: row.typicalRange,
                reading: row.reading,
              }))
            )}
          </tbody>
        </table>
        <p class="muted small">Referencia: ${esc(report?.benchmark?.note || 'Faixas internas deterministicas por combinacao DISC.')}</p>
      `,
    })
  );

  // 8-11) Deep dive D/I/S/C
  FACTORS.forEach((factor, idx) => {
    const f = factors?.[factor] || {};

    pages.push(
      pageTemplate({
        branding,
        pageNumber: 8 + idx,
        totalPages,
        title: `Leitura detalhada de ${FACTOR_META[factor].label}`,
        subtitle: `Fator ${factor}`,
        content: `
          <h2 class="section-title">${7 + idx}. ${FACTOR_META[factor].label}</h2>
          <div class="panel-white">
            <p><strong>Score:</strong> ${pct(scores.natural[factor])} • <strong>Banda:</strong> ${esc((f.band || 'mid').toUpperCase())}</p>
            <p><strong>Headline:</strong> ${esc(f.headline || `Expressao de ${FACTOR_META[factor].label} observada no instrumento.`)}</p>
            <p>${esc(safeArray(f.paragraphs, [
              `O fator ${FACTOR_META[factor].label} influencia sua forma de agir em demandas criticas.`,
              'A melhor alavanca de evolucao e aplicar ajustes com metrica semanal.',
            ])[0])}</p>
            <p>${esc(safeArray(f.paragraphs, [
              `O fator ${FACTOR_META[factor].label} influencia sua forma de agir em demandas criticas.`,
              'A melhor alavanca de evolucao e aplicar ajustes com metrica semanal.',
            ])[1])}</p>
          </div>
          <div class="grid-2">
            <div class="panel-white">
              <h3 class="sub-title">Acoes praticas</h3>
              ${listHtml(f.actions, [
                'Definir uma acao prioritaria para este fator nas proximas duas semanas.',
                'Estabelecer indicador de melhoria observavel em reunioes e execucao.',
                'Revisar progresso quinzenal com feedback estruturado.',
                'Alinhar criterio de decisao com impacto esperado.',
                'Reforcar consistencia de follow-up apos acordos.',
              ])}
            </div>
            <div class="panel-white">
              <h3 class="sub-title">Sinais de alerta</h3>
              ${listHtml(f.redFlags, [
                'Oscilacao de clareza em momentos de pressao.',
                'Reducao de escuta em conversas complexas.',
                'Acordos sem fechamento operacional completo.',
                'Desalinhamento de ritmo com o restante da equipe.',
                'Perda de consistencia na execucao de combinados.',
              ])}
            </div>
          </div>
        `,
      })
    );
  });

  // 12) comportamento profissional
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 12,
      totalPages,
      title: 'Comportamento Profissional',
      subtitle: participant.company,
      content: `
        <h2 class="section-title">11. Comportamento no ambiente de trabalho</h2>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">Forcas observaveis</h3>
            ${listHtml(combined?.strengths)}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">Pontos de atencao</h3>
            ${listHtml(combined?.risks)}
          </div>
        </div>
        <div class="panel">
          <h3 class="sub-title">Ajuste recomendado</h3>
          ${listHtml(combined?.coachingTips)}
        </div>
      `,
    })
  );

  // 13) lideranca e decisao
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 13,
      totalPages,
      title: 'Lideranca e Decisao',
      subtitle: profile.key,
      content: `
        <h2 class="section-title">12. Estilo de lideranca e tomada de decisao</h2>
        <div class="panel-white">
          ${listHtml(combined?.leadershipStyle)}
        </div>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">Principios de gestao</h3>
            ${listHtml(snippets?.leadership?.principles, [
              'Definir direcao com criterio claro de sucesso.',
              'Equilibrar ritmo de execucao com qualidade.',
              'Estabelecer checkpoints curtos para decisao.',
            ])}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">Rituais recomendados</h3>
            ${listHtml(snippets?.leadership?.rituals, [
              'Check-in semanal com tres prioridades.',
              'Feedback quinzenal orientado a comportamento.',
              'Revisao mensal de riscos e aprendizados.',
            ])}
          </div>
        </div>
      `,
    })
  );

  // 14) comunicacao
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 14,
      totalPages,
      title: 'Estilo de Comunicacao',
      subtitle: 'Playbook pratico',
      content: `
        <h2 class="section-title">13. Comunicacao eficaz por perfil</h2>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">Como se comunica melhor</h3>
            ${listHtml(combined?.communicationPlaybook?.do)}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">Como deve ser abordado</h3>
            ${listHtml(combined?.communicationPlaybook?.dont)}
          </div>
        </div>
        <div class="panel">
          <h3 class="sub-title">Boas praticas universais</h3>
          ${listHtml(snippets?.communication?.defaultDo, [
            'Comecar com objetivo e impacto esperado.',
            'Concluir com dono, prazo e criterio de sucesso.',
            'Validar entendimento antes de encerrar alinhamento.',
          ])}
        </div>
      `,
    })
  );

  // 15) riscos sob pressao
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 15,
      totalPages,
      title: 'Riscos sob Pressao',
      subtitle: adaptation.band,
      content: `
        <h2 class="section-title">14. Riscos comportamentais em pressao</h2>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">Padrao de estresse</h3>
            ${listHtml(combined?.stressPattern)}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">Sinais de alerta</h3>
            ${listHtml(snippets?.stress?.signals, [
              'Aumento de reatividade em situacoes urgentes.',
              'Queda de clareza em reunioes decisivas.',
              'Oscilacao de energia em periodos de alta demanda.',
            ])}
          </div>
        </div>
        <div class="panel">
          <h3 class="sub-title">Estrategia de recuperacao</h3>
          ${listHtml(snippets?.stress?.recovery, [
            'Redefinir prioridades com criterio objetivo.',
            'Criar pausas estrategicas para restabelecer clareza.',
            'Solicitar feedback curto para recalibrar abordagem.',
          ])}
        </div>
      `,
    })
  );

  // 16) compatibilidade de equipe
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 16,
      totalPages,
      title: 'Compatibilidade de Equipe',
      subtitle: `Perfil ${profile.key}`,
      content: `
        <h2 class="section-title">15. Sinergia e atrito em equipe</h2>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">Perfis com maior sinergia</h3>
            ${listHtml(compatibility.synergy.map((item) => `Combinacao ${item} em projetos colaborativos.`))}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">Perfis com maior atrito potencial</h3>
            ${listHtml(compatibility.friction.map((item) => `Combinacao ${item} exige alinhamento adicional de expectativas.`))}
          </div>
        </div>
        <div class="panel">
          <h3 class="sub-title">Estilo de conflito</h3>
          ${listHtml(combined?.conflictStyle)}
        </div>
      `,
    })
  );

  // 17) ambiente ideal
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 17,
      totalPages,
      title: 'Ambiente Ideal',
      subtitle: participant.company,
      content: `
        <h2 class="section-title">16. Ambiente ideal de trabalho</h2>
        <div class="grid-2">
          <div class="panel-white">
            <h3 class="sub-title">O que energiza</h3>
            ${listHtml(combined?.idealEnvironment)}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">O que drena energia</h3>
            ${listHtml(snippets?.environment?.drains, [
              'Ambiguidade de prioridade por longos periodos.',
              'Excesso de retrabalho sem criterio de qualidade.',
              'Baixa previsibilidade de decisao em temas-chave.',
            ])}
          </div>
        </div>
        <div class="panel">
          ${listHtml(snippets?.environment?.energizes, [
            'Autonomia com responsabilidade definida.',
            'Metas claras e acompanhamento frequente.',
            'Cultura de feedback e colaboracao madura.',
          ])}
        </div>
      `,
    })
  );

  // 18) funcoes recomendadas
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 18,
      totalPages,
      title: 'Funcoes Recomendadas',
      subtitle: 'Aderencia por perfil',
      content: `
        <h2 class="section-title">17. Areas de maior aderencia</h2>
        <table class="table">
          <thead><tr><th>#</th><th>Funcao</th><th>Aplicacao sugerida</th></tr></thead>
          <tbody>
            ${safeArray(combined?.recommendedRoles, [
              'Gestao de projetos',
              'Lideranca de time',
              'Operacoes',
              'Desenvolvimento de negocios',
              'Relacionamento com clientes',
              'Performance comercial',
              'Consultoria interna',
              'Planejamento estrategico',
            ])
              .map(
                (role, index) =>
                  `<tr><td>${index + 1}</td><td>${esc(role)}</td><td>Priorizar escopo alinhado ao fator predominante e contexto da equipe.</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
        <div class="panel-white">
          <h3 class="sub-title">Framework de carreira</h3>
          ${listHtml(snippets?.career?.recommendationFramework, [
            'Alinhar funcao ao estilo de decisao predominante.',
            'Garantir contexto de desenvolvimento com metas claras.',
            'Combinar desafio tecnico com ambiente de suporte comportamental.',
          ])}
        </div>
      `,
    })
  );

  // 19) plano 30/60/90
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 19,
      totalPages,
      title: 'Plano 30/60/90 Dias',
      subtitle: 'Evolucao comportamental',
      content: `
        <h2 class="section-title">18. Plano de acao 30/60/90 dias</h2>
        <div class="grid-3">
          <div class="panel-white">
            <h3 class="sub-title">30 dias</h3>
            ${listHtml(plans?.days30)}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">60 dias</h3>
            ${listHtml(plans?.days60)}
          </div>
          <div class="panel-white">
            <h3 class="sub-title">90 dias</h3>
            ${listHtml(plans?.days90)}
          </div>
        </div>
        <div class="panel">
          <strong>Ritmo recomendado:</strong> executar um ajuste por vez, medir semanalmente e consolidar aprendizado com feedback quinzenal.
        </div>
      `,
    })
  );

  // 20) fechamento + lgpd + contracapa
  pages.push(
    pageTemplate({
      branding,
      pageNumber: 20,
      totalPages,
      title: 'Fechamento e LGPD',
      subtitle: 'Conclusao executiva',
      content: `
        <h2 class="section-title">19. Fechamento executivo</h2>
        <p>Este relatorio traduz seu padrao comportamental em acoes praticas para elevar performance com consistencia. O ganho real ocorre quando os insights sao aplicados em rotina de trabalho e acompanhados por indicadores objetivos.</p>
        <div class="panel-white">
          <h3 class="sub-title">Resumo final</h3>
          ${listHtml(report?.profileNarrative, [
            `${profile.key} indica estilo com potencial de impacto quando ha clareza de objetivos.`,
            'A evolucao comportamental depende de pratica deliberada e feedback estruturado.',
            'A combinacao de fatores deve orientar decisoes de comunicacao, lideranca e carreira.',
          ])}
        </div>
        <div class="panel">
          <h3 class="sub-title">LGPD e confidencialidade</h3>
          <p>${esc(safeText(lgpd?.notice, 'Este relatorio contem dados pessoais e deve ser utilizado apenas para desenvolvimento comportamental, observando finalidade, consentimento e seguranca da informacao.'))}</p>
          <p><strong>Contato:</strong> ${esc(safeText(lgpd?.contact, 'suporte@insightdisc.app'))}</p>
        </div>
        <div class="signature-box">
          <div class="sig"><strong>${esc(meta.responsibleName)}</strong><br/>${esc(meta.responsibleRole)}</div>
          <div class="sig right"><strong>${esc(branding.company_name)}</strong><br/>Relatorio confidencial white-label</div>
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
      --navy: ${esc(branding.brand_primary_color)};
      --gold: ${esc(branding.brand_secondary_color)};
      --gold-2: #ff8a00;
      --white: #ffffff;
      --bg: #eef2f7;
      --text: #243447;
      --muted: #6b7280;
      --line: #e5e7eb;
      --soft: #f8fafc;
      --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      --radius: 16px;
      --disc-d: #e74c3c;
      --disc-i: #f1c40f;
      --disc-s: #2ecc71;
      --disc-c: #3498db;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: "Segoe UI", Arial, Helvetica, sans-serif; line-height: 1.55; }
    @page { size: A4; margin: 14mm 14mm 16mm 14mm; }
    @media print {
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; border-radius: 0; width: 100%; min-height: auto; }
    }
    .page { width: 210mm; min-height: 297mm; margin: 10mm auto; background: #fff; border-radius: 10px; box-shadow: var(--shadow); overflow: hidden; position: relative; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 10mm 12mm 5mm; border-bottom: 1px solid var(--line); margin-bottom: 8mm; }
    .logo-wrap { display: flex; align-items: center; gap: 12px; }
    .logo { width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: #fff; }
    .brand-title { font-weight: 800; font-size: 20px; color: var(--navy); line-height: 1.1; }
    .brand-subtitle { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .header-meta { text-align: right; font-size: 11px; color: var(--muted); line-height: 1.5; }
    .header-meta strong { color: var(--text); }
    .footer { position: absolute; left: 12mm; right: 12mm; bottom: 8mm; border-top: 1px solid var(--line); padding-top: 4mm; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--muted); }
    .footer strong { color: var(--text); }
    .content { padding: 0 12mm 16mm; }
    .cover-page { min-height: 297mm; position: relative; overflow: hidden; background: linear-gradient(180deg, #071429 0%, var(--navy) 55%, #0d2345 100%); color: #fff; }
    .cover-bg { position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(255,255,255,.12), transparent 35%), radial-gradient(circle at left center, rgba(255,255,255,.08), transparent 25%); }
    .cover-content { position: relative; z-index: 1; padding: 22mm; }
    .cover-logo-wrap { display: flex; justify-content: center; margin-bottom: 14mm; }
    .cover-logo { max-width: 120mm; max-height: 30mm; object-fit: contain; }
    .cover-kicker { text-align: center; font-size: 12px; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,.8); margin-bottom: 8mm; }
    .cover-title { text-align: center; font-size: 34px; line-height: 1.15; margin: 0; font-weight: 800; color: #fff; }
    .cover-title span { color: var(--gold); }
    .cover-subtitle { text-align: center; font-size: 16px; color: rgba(255,255,255,.88); margin: 8mm auto 10mm; max-width: 150mm; }
    .cover-card { max-width: 172mm; margin: 0 auto; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18); border-radius: 18px; padding: 16px 20px; text-align: center; }
    .cover-card p { margin: 6px 0; font-size: 14px; color: rgba(255,255,255,.92); }
    .cover-card strong { color: #fff; }
    .cover-meta { margin-top: 10mm; text-align: center; color: rgba(255,255,255,.85); }
    .cover-meta p { margin: 4px 0; color: inherit; }
    .cover-footer { position: absolute; bottom: 8mm; left: 22mm; right: 22mm; text-align: center; font-size: 12px; color: rgba(255,255,255,.75); }
    h2.section-title { font-size: 24px; color: var(--navy); margin: 0 0 7mm; padding-left: 12px; border-left: 4px solid var(--gold); line-height: 1.2; }
    h3.sub-title { font-size: 17px; color: var(--navy); margin: 4mm 0 3mm; padding-bottom: 4px; border-bottom: 1px solid var(--line); }
    p { margin: 0 0 10px; font-size: 14px; color: var(--text); }
    .lead { font-size: 15px; }
    .muted { color: var(--muted); }
    .small { font-size: 12px; }
    .panel { background: var(--soft); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; margin: 12px 0; }
    .panel-white { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; margin: 12px 0; box-shadow: 0 2px 10px rgba(0,0,0,.03); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .disc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 8px; }
    .disc-card { min-height: 122px; border-radius: 14px; padding: 14px; color: #fff; position: relative; overflow: hidden; box-shadow: var(--shadow); }
    .disc-card strong { display: block; font-size: 17px; margin-bottom: 8px; line-height: 1.2; }
    .disc-card p { color: inherit; font-size: 13.5px; margin: 0; }
    .d-card { background: linear-gradient(135deg, #e74c3c, #c0392b); }
    .i-card { background: linear-gradient(135deg, #f1c40f, #e67e22); color: #1f2937; }
    .s-card { background: linear-gradient(135deg, #2ecc71, #27ae60); }
    .c-card { background: linear-gradient(135deg, #3498db, #2980b9); }
    .bar-row { display: grid; grid-template-columns: 130px 1fr 44px; gap: 10px; align-items: center; margin: 8px 0; }
    .bar-label { font-size: 12px; color: #334155; display: flex; align-items: center; gap: 7px; }
    .bar-track { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; }
    .bar-value { text-align: right; font-weight: 700; font-size: 12px; }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
    ul.clean { list-style: none; padding: 0; margin: 0; }
    ul.clean li { position: relative; padding-left: 20px; margin-bottom: 8px; font-size: 14px; }
    ul.clean li::before { content: "•"; position: absolute; left: 0; top: 0; color: var(--gold); font-weight: 800; font-size: 18px; line-height: 1; }
    .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .table th, .table td { border-bottom: 1px solid var(--line); padding: 10px 12px; text-align: left; font-size: 13px; vertical-align: top; }
    .table th { background: var(--soft); color: var(--navy); font-weight: 700; }
    .chart-wrap { display: flex; align-items: center; justify-content: center; min-height: 330px; }
    .signature-box { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; }
    .sig { flex: 1; border-top: 1px solid var(--line); padding-top: 8px; font-size: 13px; color: var(--muted); }
    .sig.right { text-align: right; }
  </style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}

export default renderReportHtml;
