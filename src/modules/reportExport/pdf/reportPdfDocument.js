import {
  DISC_FACTORS,
  DISC_FACTOR_COLORS,
  DISC_FACTOR_LABELS,
} from '../../analytics/constants.js';
import { REPORT_PDF_STYLES } from './reportPdfStyles.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value) {
  return `${numberValue(value).toFixed(1)}%`;
}

function unique(items = []) {
  const seen = new Set();
  return items
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function formatDate(value) {
  if (!value) return 'Data indisponível';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível';
  return parsed.toLocaleDateString('pt-BR');
}

function renderList(items = [], className = '') {
  if (!items.length) {
    return '<p class="card-text">Sem pontos adicionais para este bloco.</p>';
  }

  return `<ul class="list ${className}">${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`;
}

function renderRadarSvg(scores = {}) {
  const size = 340;
  const center = size / 2;
  const radius = 120;
  const factors = DISC_FACTORS;
  const angleStep = (Math.PI * 2) / factors.length;

  const toPoint = (index, ratio) => {
    const angle = -Math.PI / 2 + angleStep * index;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  };

  const rings = [0.25, 0.5, 0.75, 1].map((ring) =>
    factors
      .map((_, index) => {
        const point = toPoint(index, ring);
        return `${point.x},${point.y}`;
      })
      .join(' ')
  );

  const polygon = factors
    .map((factor, index) => {
      const point = toPoint(index, Math.max(0, Math.min(1, numberValue(scores?.[factor]) / 100)));
      return `${point.x},${point.y}`;
    })
    .join(' ');

  const axes = factors
    .map((factor, index) => {
      const point = toPoint(index, 1);
      const labelPoint = toPoint(index, 1.12);
      return `
        <line x1="${center}" y1="${center}" x2="${point.x}" y2="${point.y}" stroke="#cbd5e1" stroke-width="1" />
        <text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="#334155">
          ${factor}
        </text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Radar DISC">
      ${rings
        .map(
          (points, index) =>
            `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="${index === rings.length - 1 ? 1.3 : 1}" />`,
        )
        .join('')}
      ${axes}
      <polygon points="${polygon}" fill="rgba(79,70,229,0.26)" stroke="#4f46e5" stroke-width="2" />
      ${factors
        .map((factor, index) => {
          const point = toPoint(index, Math.max(0, Math.min(1, numberValue(scores?.[factor]) / 100)));
          return `<circle cx="${point.x}" cy="${point.y}" r="4.5" fill="#4f46e5" stroke="#fff" stroke-width="1.5" />`;
        })
        .join('')}
    </svg>
  `;
}

function renderFactorCards(factorAnalysis = []) {
  return factorAnalysis
    .map((item) => {
      const value = Math.max(0, Math.min(100, numberValue(item?.score)));
      const color = DISC_FACTOR_COLORS[item?.factor] || '#64748b';
      return `
        <article class="card avoid-break">
          <h4 class="card-title">${escapeHtml(item?.factor)} • ${escapeHtml(item?.label)}</h4>
          <p class="card-text">Score ${percent(value)} • Intensidade ${escapeHtml(item?.intensity?.label || 'Moderada')}</p>
          <div class="score-track">
            <div class="score-fill" style="width:${value}%;background:${color};"></div>
          </div>
          <p class="card-text"><strong>Leitura semântica:</strong> ${escapeHtml(item?.semanticReading)}</p>
          <p class="card-text"><strong>Impacto comportamental:</strong> ${escapeHtml(item?.impact)}</p>
        </article>
      `;
    })
    .join('');
}

function renderExecutiveCards(items = []) {
  return items
    .map(
      (item) => `
      <article class="card avoid-break">
        <h4 class="card-title">${escapeHtml(item?.title)}</h4>
        <p class="card-text">${escapeHtml(item?.value || 'Leitura em consolidação para este eixo.')}</p>
      </article>
    `,
    )
    .join('');
}

function renderBehavioralCards(interpretation = {}) {
  const cards = [
    ['Comunicação', interpretation?.communicationStyle],
    ['Tomada de decisão', interpretation?.decisionMaking],
    ['Liderança', interpretation?.leadershipStyle],
    ['Estilo de trabalho', interpretation?.workStyle],
    ['Relacionamento e colaboração', interpretation?.relationshipStyle],
    ['Comportamento sob pressão', interpretation?.pressureResponse],
    ['Ambiente ideal', interpretation?.idealEnvironment],
    ['Estilo de aprendizagem', interpretation?.learningStyle],
  ];

  return cards
    .map(
      ([title, content]) => `
      <article class="card avoid-break">
        <h4 class="card-title">${escapeHtml(title)}</h4>
        <p class="card-text">${escapeHtml(content || 'Leitura em consolidação para este eixo comportamental.')}</p>
      </article>
    `,
    )
    .join('');
}

function renderPageFooter(label = 'Relatório Oficial InsightDISC') {
  return `
    <footer class="page-footer">
      <span>${escapeHtml(label)}</span>
      <span class="page-index"></span>
    </footer>
  `;
}

export function renderAssessmentReportPdfHtml({
  viewModel,
  meta = {},
} = {}) {
  const safeViewModel = viewModel || {};
  const identity = safeViewModel.identity || {};
  const interpretation = safeViewModel.interpretation || {};
  const technical = safeViewModel.technical || {};
  const discSnapshot = safeViewModel.discSnapshot || {};

  const strengths = unique(safeViewModel.strengths || []).slice(0, 8);
  const attentionPoints = unique(safeViewModel.attentionPoints || []).slice(0, 8);
  const potentialChallenges = unique(safeViewModel.potentialChallenges || []).slice(0, 8);
  const developmentRecommendations = unique(safeViewModel.developmentRecommendations || []).slice(0, 8);
  const motivators = unique(interpretation.motivators || []).slice(0, 8);
  const adaptationNotes = unique(interpretation.adaptationNotes || []).slice(0, 8);
  const combinationRisks = unique([...attentionPoints, ...potentialChallenges]).slice(0, 8);

  const factors = DISC_FACTORS.map((factor) => {
    const score = numberValue(technical?.normalizedScores?.[factor] ?? discSnapshot?.summary?.[factor]);
    return `
      <div class="score-row avoid-break">
        <div class="score-header">
          <span><strong>${factor}</strong> • ${DISC_FACTOR_LABELS[factor]}</span>
          <span>${percent(score)}</span>
        </div>
        <div class="score-track"><div class="score-fill" style="width:${Math.max(0, Math.min(100, score))}%;background:${DISC_FACTOR_COLORS[factor]}"></div></div>
      </div>
    `;
  }).join('');

  const generatedAt = meta?.generatedAt ? formatDate(meta.generatedAt) : formatDate(new Date().toISOString());

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatório InsightDISC - ${escapeHtml(identity?.id || 'assessment')}</title>
    <style>${REPORT_PDF_STYLES}</style>
  </head>
  <body>
    <main class="report-document">
      <section class="report-page cover">
        <p class="cover-kicker">Relatório Oficial InsightDISC</p>
        <h1 class="cover-title">Relatório DISC</h1>
        <p class="cover-subtitle">${escapeHtml(interpretation?.profileCode || 'DISC')} • ${escapeHtml(interpretation?.styleLabel || 'Estilo em consolidação')}</p>

        <div class="cover-summary">
          ${escapeHtml(interpretation?.summaryShort || 'Leitura comportamental em consolidação para esta avaliação.')}
        </div>

        <div class="badge-row">
          <span class="badge badge-accent">Primário: ${escapeHtml(interpretation?.primaryFactor || '-')}</span>
          <span class="badge">Secundário: ${escapeHtml(interpretation?.secondaryFactor || '-')}</span>
          <span class="badge">Combinação: ${escapeHtml(interpretation?.profileCode || 'DISC')}</span>
        </div>

        <div class="cover-meta">
          <article class="meta-card">
            <p class="meta-label">Participante</p>
            <p class="meta-value">${escapeHtml(identity?.respondentName || 'Participante')}</p>
          </article>
          <article class="meta-card">
            <p class="meta-label">Avaliação</p>
            <p class="meta-value">${escapeHtml(identity?.id || 'indisponível')}</p>
          </article>
          <article class="meta-card">
            <p class="meta-label">Conclusão</p>
            <p class="meta-value">${escapeHtml(formatDate(identity?.completedAt))}</p>
          </article>
          <article class="meta-card">
            <p class="meta-label">Gerado em</p>
            <p class="meta-value">${escapeHtml(generatedAt)}</p>
          </article>
        </div>
        ${renderPageFooter('InsightDISC • Relatório Oficial')}
      </section>

      <section class="report-page">
        <article class="section-shell avoid-break">
          <h2 class="section-title">Visão geral do perfil</h2>
          <p class="section-subtitle">Radar DISC, intensidades D/I/S/C e síntese de leitura predominante.</p>
          <div class="grid-2">
            <div class="radar-wrap">
              ${renderRadarSvg(technical?.normalizedScores || discSnapshot?.summary || {})}
            </div>
            <div>
              ${factors}
            </div>
          </div>
          <p class="card-text">${escapeHtml(interpretation?.summaryMedium || interpretation?.summaryShort)}</p>
          <p class="card-text">${escapeHtml(interpretation?.summaryLong || interpretation?.summaryMedium)}</p>
        </article>

        <article class="section-shell avoid-break">
          <h2 class="section-title">Resumo executivo</h2>
          <p class="section-subtitle">Como tende a agir, interagir, decidir e performar melhor.</p>
          <div class="grid-2">${renderExecutiveCards(safeViewModel.executiveSummary || [])}</div>
        </article>

        <article class="section-shell avoid-break">
          <h2 class="section-title">Forças e pontos de atenção</h2>
          <p class="section-subtitle">Potenciais do perfil e riscos comportamentais em contexto real.</p>
          <div class="grid-3">
            <article class="card avoid-break">
              <h4 class="card-title">Forças</h4>
              ${renderList(strengths, 'list-positive')}
            </article>
            <article class="card avoid-break">
              <h4 class="card-title">Pontos de atenção</h4>
              ${renderList(attentionPoints, 'list-warning')}
            </article>
            <article class="card avoid-break">
              <h4 class="card-title">Desafios potenciais</h4>
              ${renderList(potentialChallenges, 'list-danger')}
            </article>
          </div>
        </article>
        ${renderPageFooter('InsightDISC • Visão geral e resumo executivo')}
      </section>

      <section class="report-page break-before">
        <article class="section-shell avoid-break">
          <h2 class="section-title">Leituras comportamentais</h2>
          <p class="section-subtitle">Comunicação, decisão, liderança, estilo de trabalho e colaboração.</p>
          <div class="grid-2">${renderBehavioralCards(interpretation)}</div>
          <div class="grid-2">
            <article class="card avoid-break">
              <h4 class="card-title">Motivadores</h4>
              ${renderList(motivators, 'list-positive')}
            </article>
            <article class="card avoid-break">
              <h4 class="card-title">Notas de adaptação</h4>
              ${renderList(adaptationNotes)}
            </article>
          </div>
        </article>

        <article class="section-shell avoid-break">
          <h2 class="section-title">Análise dos fatores D, I, S, C</h2>
          <p class="section-subtitle">Score, intensidade, leitura semântica e impacto comportamental por fator.</p>
          <div class="grid-2">
            ${renderFactorCards(safeViewModel.factorAnalysis || [])}
          </div>
        </article>
        ${renderPageFooter('InsightDISC • Leituras comportamentais e fatores DISC')}
      </section>

      <section class="report-page break-before">
        <article class="section-shell avoid-break">
          <h2 class="section-title">Análise da combinação DISC</h2>
          <p class="section-subtitle">Como os fatores se combinam, onde há maior performance e quais riscos merecem gestão ativa.</p>
          <article class="card avoid-break">
            <h4 class="card-title">${escapeHtml(interpretation?.profileCode || 'DISC')} • ${escapeHtml(interpretation?.styleLabel || 'Estilo DISC')}</h4>
            <p class="card-text">${escapeHtml(safeViewModel?.archetype?.summaryMedium || interpretation?.summaryMedium)}</p>
            <p class="card-text">${escapeHtml(safeViewModel?.archetype?.summaryLong || interpretation?.summaryLong)}</p>
            <p class="card-text"><strong>Ambiente de melhor performance:</strong> ${escapeHtml(interpretation?.idealEnvironment || 'Contextos com clareza de expectativas e métricas objetivas.')}</p>
          </article>
          <div class="grid-2">
            <article class="card avoid-break">
              <h4 class="card-title">Forças da combinação</h4>
              ${renderList(strengths, 'list-positive')}
            </article>
            <article class="card avoid-break">
              <h4 class="card-title">Riscos da combinação</h4>
              ${renderList(combinationRisks, 'list-warning')}
            </article>
          </div>
        </article>

        <article class="section-shell avoid-break">
          <h2 class="section-title">Desenvolvimento e próximos passos</h2>
          <p class="section-subtitle">Recomendações práticas e plano inicial de evolução comportamental.</p>
          <div class="grid-2">
            <article class="card avoid-break">
              <h4 class="card-title">Recomendações de desenvolvimento</h4>
              ${renderList(developmentRecommendations)}
            </article>
            <article class="card avoid-break">
              <h4 class="card-title">Plano inicial</h4>
              ${renderList((safeViewModel.nextSteps || []).map((step) => `${step.title}: ${step.description}`))}
            </article>
          </div>
        </article>

        <article class="section-shell avoid-break">
          <h2 class="section-title">Resumo técnico final</h2>
          <p class="section-subtitle">Scores, fatores líderes, gap e observações técnicas de equilíbrio/intensidade.</p>
          <div class="grid-2">
            <article class="card avoid-break">
              <h4 class="card-title">Dados técnicos</h4>
              <p class="card-text"><strong>Código do perfil:</strong> ${escapeHtml(technical?.profileCode || 'DISC')}</p>
              <p class="card-text"><strong>Fator primário:</strong> ${escapeHtml(technical?.primaryFactor || '-')}</p>
              <p class="card-text"><strong>Fator secundário:</strong> ${escapeHtml(technical?.secondaryFactor || '-')}</p>
              <p class="card-text"><strong>Gap entre fatores:</strong> ${Number.isFinite(numberValue(technical?.topGap)) ? `${numberValue(technical?.topGap).toFixed(1)} p.p.` : '—'}</p>
              <p class="card-text"><strong>Classificação:</strong> ${technical?.hasValidInput ? (technical?.isPure ? 'Perfil puro' : 'Perfil combinado') : 'Amostra insuficiente'}</p>
              <p class="card-text"><strong>Arquétipo:</strong> ${escapeHtml(technical?.styleLabel || interpretation?.styleLabel || 'DISC')}</p>
            </article>
            <article class="card avoid-break">
              <h4 class="card-title">Scores normalizados</h4>
              ${factors}
            </article>
          </div>
          <p class="footer-note">${escapeHtml(technical?.balanceNote || 'Sem observações adicionais de equilíbrio no momento.')}</p>
        </article>
        ${renderPageFooter('InsightDISC • Resumo técnico final')}
      </section>
    </main>
  </body>
</html>
`;
}

export default renderAssessmentReportPdfHtml;
