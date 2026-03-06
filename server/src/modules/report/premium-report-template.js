const FACTORS = ['D', 'I', 'S', 'C'];

const FACTOR_COLORS = {
  D: '#c62828',
  I: '#b26a00',
  S: '#1b7f3b',
  C: '#1d4ed8',
};

const FACTOR_NAMES = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ptDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}

function list(items = []) {
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function factorBars(title, scores = {}) {
  return `
    <div class="figure">
      <h3>${esc(title)}</h3>
      ${FACTORS.map((factor) => {
        const value = pct(scores[factor]);
        return `
          <div class="bar-row">
            <div class="bar-label">${factor}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${value}; background:${FACTOR_COLORS[factor]}"></div>
            </div>
            <div class="bar-value">${value}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function comparisonTable(natural = {}, adapted = {}) {
  const rows = FACTORS.map((factor) => {
    const n = Number(natural[factor] || 0);
    const a = Number(adapted[factor] || 0);
    const delta = Math.round(a - n);
    return `<tr>
      <td><b>${factor}</b> - ${FACTOR_NAMES[factor]}</td>
      <td>${pct(n)}</td>
      <td>${pct(a)}</td>
      <td>${delta >= 0 ? '+' : ''}${delta} pts</td>
    </tr>`;
  }).join('');
  return `<table><thead><tr><th>Fator</th><th>Natural</th><th>Adaptado</th><th>Variação</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function scriptsForFactor(factor) {
  const scripts = {
    D: ['"Vamos alinhar o objetivo, prazo e responsável."', '"Qual decisão precisamos tomar agora?"', '"Qual risco crítico deve ser mitigado?"'],
    I: ['"Qual impacto essa decisão terá no time?"', '"Vamos fechar esse acordo em 3 pontos."', '"Como comunicamos para gerar adesão?"'],
    S: ['"Quais etapas garantem execução estável?"', '"Como manter previsibilidade sem perder velocidade?"', '"Que suporte você precisa para entregar bem?"'],
    C: ['"Quais dados validam esta hipótese?"', '"Quais critérios definem qualidade?"', '"Vamos documentar decisão e próximos passos."'],
  };
  return scripts[factor] || [];
}

function pageTemplate(pageNumber, totalPages, pageTitle, pageSubtitle, content) {
  return `
    <section class="page">
      <header class="header">
        <div>
          <div class="brand">${esc('InsightDISC')}</div>
          <div class="sub">${esc('Plataforma de Análise Comportamental')}</div>
        </div>
        <div class="meta">
          <div>${esc(pageTitle)}</div>
          <div>Página ${pageNumber} de ${totalPages}</div>
        </div>
      </header>
      <main>
        <h1>${esc(pageTitle)}</h1>
        <p class="subtitle">${esc(pageSubtitle || '')}</p>
        ${content}
      </main>
      <footer class="footer">
        <span>Confidencial • Uso para desenvolvimento profissional</span>
        <span>${pageNumber}/${totalPages}</span>
      </footer>
    </section>
  `;
}

function factorOverviewPage(factor, report) {
  const guide = report?.factors?.[factor] || {};
  return `
    <div class="grid-2">
      <div class="card">
        <h2>Leitura do fator ${factor}</h2>
        <p><b>${FACTOR_NAMES[factor]}</b> representa um conjunto específico de tendências comportamentais.</p>
        <p>${esc(report?.profile?.archetype || '')}</p>
        <p class="note">Cor de referência: <span style="color:${FACTOR_COLORS[factor]}">${FACTOR_COLORS[factor]}</span></p>
      </div>
      <div class="card">
        <h2>Pontos fortes</h2>
        ${list(guide.strengths || [])}
      </div>
    </div>
    <div class="card">
      <h2>Pontos de atenção</h2>
      ${list(guide.risks || [])}
    </div>
  `;
}

function factorCommunicationPage(factor, report) {
  const guide = report?.factors?.[factor] || {};
  return `
    <div class="grid-2">
      <div class="card">
        <h2>Como comunicar com ${factor}</h2>
        <p>${esc(guide.communication || '')}</p>
        <h3>Scripts prontos</h3>
        ${list(scriptsForFactor(factor))}
      </div>
      <div class="card">
        <h2>Gatilhos sob pressão</h2>
        ${list(guide.triggers || [])}
      </div>
    </div>
    <div class="card">
      <h2>Ajustes recomendados</h2>
      ${list(guide.actions || [])}
    </div>
  `;
}

export function renderPremiumReportHtml(report) {
  const safeReport = report || {};
  const totalPages = 30;
  const natural = safeReport?.scores?.natural || {};
  const adapted = safeReport?.scores?.adapted || {};
  const summary = safeReport?.scores?.summary || {};

  const tocItems = [
    '1. Capa',
    '2. Sumário',
    '3. Como ler o relatório',
    '4. Metodologia DISC',
    '5. Confiabilidade e limitações',
    '6. Visão geral do perfil',
    '7. Gráfico Natural',
    '8. Gráfico Adaptado',
    '9. Comparativo Natural vs Adaptado',
    '10. Narrativa do perfil',
    '11-14. Deep Dive D',
    '15-18. Deep Dive I',
    '19-22. Deep Dive S',
    '23-26. Deep Dive C',
    '27. Liderança e decisão',
    '28. Conflitos e trabalho em equipe',
    '29. Plano 30/60/90 dias',
    '30. Apêndice técnico + LGPD',
  ];

  const pages = [];

  pages.push(
    pageTemplate(
      1,
      totalPages,
      safeReport?.meta?.reportTitle || 'Relatório DISC Profissional',
      'Diagnóstico comportamental completo com recomendações práticas',
      `
      <div class="cover">
        <div class="cover-card">
          <h2>Participante</h2>
          <p><b>Nome:</b> ${esc(safeReport?.participant?.name || '-')}</p>
          <p><b>E-mail:</b> ${esc(safeReport?.participant?.email || '-')}</p>
          <p><b>ID:</b> ${esc(safeReport?.participant?.assessmentId || safeReport?.meta?.reportId || '-')}</p>
          <p><b>Data:</b> ${esc(ptDate(safeReport?.meta?.generatedAt))}</p>
        </div>
        <div class="cover-card">
          <h2>Síntese de perfil</h2>
          <p><b>Dominante:</b> ${esc(safeReport?.profile?.dominant || '-')}</p>
          <p><b>Secundário:</b> ${esc(safeReport?.profile?.secondary || '-')}</p>
          <p><b>Combinação:</b> ${esc(safeReport?.profile?.combination || '-')}</p>
          <p>${esc(safeReport?.profile?.label || '-')}</p>
        </div>
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      2,
      totalPages,
      'Sumário',
      'Estrutura do relatório premium',
      `<div class="card">${list(tocItems)}</div>`
    )
  );

  pages.push(
    pageTemplate(
      3,
      totalPages,
      'Como ler este relatório',
      'Orientações para interpretação profissional',
      `
      <div class="card">
        <p>Este relatório descreve tendências comportamentais observadas no assessment DISC.</p>
        <p>Use a leitura para melhorar comunicação, liderança, tomada de decisão e colaboração.</p>
        <p>Perfis não são rótulos fixos. Contexto, cultura e maturidade influenciam a expressão comportamental.</p>
      </div>
      <div class="grid-2">
        <div class="card"><h2>Perfil Natural</h2><p>Expressa seu padrão espontâneo em cenários de menor pressão.</p></div>
        <div class="card"><h2>Perfil Adaptado</h2><p>Representa ajustes comportamentais no contexto atual de trabalho.</p></div>
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      4,
      totalPages,
      'Metodologia DISC',
      'Fundamentos para leitura técnica',
      `
      <div class="card">
        <h2>Dimensões avaliadas</h2>
        <p><b>D</b> Dominância: direção, decisão e foco em resultado.</p>
        <p><b>I</b> Influência: comunicação, conexão e persuasão.</p>
        <p><b>S</b> Estabilidade: consistência, cooperação e previsibilidade.</p>
        <p><b>C</b> Conformidade: método, precisão e qualidade.</p>
      </div>
      <div class="card">
        <h2>Escala</h2>
        <p>Os percentuais (0-100) indicam intensidade relativa entre fatores e não julgamento de valor.</p>
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      5,
      totalPages,
      'Confiabilidade e limitações',
      'Uso responsável do resultado',
      `
      <div class="card">
        <p>O DISC não mede inteligência, caráter ou competência técnica.</p>
        <p>Resultados devem ser combinados com contexto, histórico de performance e feedback 360.</p>
        <p>Para decisões de alto impacto, recomenda-se triangulação com entrevistas estruturadas e dados de desempenho.</p>
      </div>
      <div class="card">
        <h2>Boas práticas</h2>
        ${list([
          'Aplicar o relatório em conjunto com metas e indicadores reais.',
          'Evitar uso isolado para decisões críticas de carreira.',
          'Revisar perfil periodicamente (90-180 dias) em contextos de mudança.',
        ])}
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      6,
      totalPages,
      'Visão geral do perfil',
      'Dominante, secundário e narrativa comportamental',
      `
      <div class="grid-2">
        <div class="card">
          <h2>Perfil principal</h2>
          <p><b>${esc(safeReport?.profile?.label || '-')}</b></p>
          <p>${esc(safeReport?.profile?.archetype || '-')}</p>
          <p><b>Dominante:</b> ${esc(safeReport?.profile?.dominant || '-')} • <b>Secundário:</b> ${esc(safeReport?.profile?.secondary || '-')}</p>
        </div>
        <div class="card">
          <h2>Resumo executivo</h2>
          ${list(safeReport?.executiveSummary || [])}
        </div>
      </div>
      ${factorBars('Distribuição consolidada (resumo)', summary)}
      `
    )
  );

  pages.push(
    pageTemplate(7, totalPages, 'Gráfico Natural', 'Leitura do padrão espontâneo', factorBars('Perfil Natural', natural))
  );

  pages.push(
    pageTemplate(8, totalPages, 'Gráfico Adaptado', 'Ajustes no contexto atual', factorBars('Perfil Adaptado', adapted))
  );

  pages.push(
    pageTemplate(
      9,
      totalPages,
      'Comparativo Natural vs Adaptado',
      'Variações por fator DISC',
      `<div class="card">${comparisonTable(natural, adapted)}</div>`
    )
  );

  pages.push(
    pageTemplate(
      10,
      totalPages,
      'Narrativa do perfil',
      'Leitura integrativa da combinação comportamental',
      `
      <div class="card">
        <p>${esc(safeReport?.profile?.archetype || '')}</p>
        <p>Quando bem calibrado, este perfil tende a combinar efetividade de execução com qualidade relacional.</p>
        <p>O principal risco está no excesso de estilo dominante sob estresse e prazos curtos.</p>
      </div>
      <div class="grid-2">
        <div class="card"><h2>Força central</h2><p>Converter intenção em comportamento observável com consistência.</p></div>
        <div class="card"><h2>Ajuste-chave</h2><p>Fechar decisões com critérios e prazos explícitos para reduzir ruído.</p></div>
      </div>
      `
    )
  );

  const factorPageOrder = [
    { factor: 'D', startPage: 11 },
    { factor: 'I', startPage: 15 },
    { factor: 'S', startPage: 19 },
    { factor: 'C', startPage: 23 },
  ];

  factorPageOrder.forEach(({ factor, startPage }) => {
    const guide = safeReport?.factors?.[factor] || {};
    pages.push(
      pageTemplate(
        startPage,
        totalPages,
        `${factor} — ${FACTOR_NAMES[factor]} (Forças e Riscos)`,
        'Deep dive comportamental',
        factorOverviewPage(factor, safeReport)
      )
    );

    pages.push(
      pageTemplate(
        startPage + 1,
        totalPages,
        `${factor} — ${FACTOR_NAMES[factor]} (Aplicação prática)`,
        'Tomada de decisão e rotina',
        `
        <div class="grid-2">
          <div class="card">
            <h2>Em projetos</h2>
            <p>Use este fator para priorizar atividades de maior impacto e clareza de execução.</p>
            ${list((guide.actions || []).slice(0, 3))}
          </div>
          <div class="card">
            <h2>Sob pressão</h2>
            ${list(guide.triggers || [])}
          </div>
        </div>
        <div class="card">
          <h2>Indicadores comportamentais</h2>
          <table>
            <thead><tr><th>Indicador</th><th>Meta semanal</th><th>Evidência</th></tr></thead>
            <tbody>
              <tr><td>Clareza de prioridade</td><td>3 prioridades definidas</td><td>Plano semanal documentado</td></tr>
              <tr><td>Fechamento de acordos</td><td>100% com prazo/responsável</td><td>Ata ou registro em ferramenta</td></tr>
              <tr><td>Feedback aplicado</td><td>1 ajuste quinzenal</td><td>Registro de evolução</td></tr>
            </tbody>
          </table>
        </div>
        `
      )
    );

    pages.push(
      pageTemplate(
        startPage + 2,
        totalPages,
        `${factor} — ${FACTOR_NAMES[factor]} (Comunicação)`,
        'Scripts e alinhamento de mensagem',
        factorCommunicationPage(factor, safeReport)
      )
    );

    pages.push(
      pageTemplate(
        startPage + 3,
        totalPages,
        `${factor} — ${FACTOR_NAMES[factor]} (Plano de ajuste)`,
        'Ações de mitigação e evolução',
        `
        <div class="card">
          <h2>Plano tático (4 semanas)</h2>
          <table>
            <thead><tr><th>Semana</th><th>Ação</th><th>Resultado esperado</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>Definir comportamento foco ligado ao fator ${factor}</td><td>Direção clara de mudança</td></tr>
              <tr><td>2</td><td>Aplicar ajuste em 2 interações críticas</td><td>Maior aderência na comunicação</td></tr>
              <tr><td>3</td><td>Coletar feedback de 2 stakeholders</td><td>Correção de rota baseada em evidência</td></tr>
              <tr><td>4</td><td>Consolidar ritual e métrica permanente</td><td>Sustentação da evolução</td></tr>
            </tbody>
          </table>
        </div>
        `
      )
    );
  });

  pages.push(
    pageTemplate(
      27,
      totalPages,
      'Liderança e tomada de decisão',
      'Aplicação em gestão de pessoas e resultados',
      `
      <div class="grid-2">
        <div class="card">
          <h2>Estilo de liderança</h2>
          <p>${esc(safeReport?.leadership?.style || '')}</p>
          <p>A combinação entre direção e comunicação define o impacto de liderança deste perfil.</p>
        </div>
        <div class="card">
          <h2>Checklist de decisão</h2>
          ${list(safeReport?.leadership?.decisionChecklist || [])}
        </div>
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      28,
      totalPages,
      'Conflitos, negociação e equipe',
      'Estratégias de colaboração sob tensão',
      `
      <div class="card">
        <h2>Como este perfil reage a conflito</h2>
        <p>Tende a intensificar o fator dominante quando o contexto aumenta pressão e incerteza.</p>
        <p>A mitigação exige clareza de critérios, escuta ativa e fechamento estruturado.</p>
      </div>
      <div class="grid-2">
        <div class="card"><h2>Prática de negociação</h2>${list(['Separar fatos de interpretação', 'Definir concessões mínimas', 'Encerrar com acordos verificáveis'])}</div>
        <div class="card"><h2>Trabalho em equipe</h2>${list(['Papéis claros por sprint', 'Ritual semanal de alinhamento', 'Feedback de ajuste em tempo curto'])}</div>
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      29,
      totalPages,
      'Plano 30/60/90 dias',
      'Roadmap de evolução comportamental',
      `
      <div class="card">
        <h2>30 dias</h2>
        ${list(safeReport?.plans?.days30 || [])}
      </div>
      <div class="card">
        <h2>60 dias</h2>
        ${list(safeReport?.plans?.days60 || [])}
      </div>
      <div class="card">
        <h2>90 dias</h2>
        ${list(safeReport?.plans?.days90 || [])}
      </div>
      `
    )
  );

  pages.push(
    pageTemplate(
      30,
      totalPages,
      'Apêndice técnico + LGPD',
      'Percentuais finais e confidencialidade',
      `
      <div class="card">
        <h2>Tabela técnica</h2>
        ${comparisonTable(natural, adapted)}
      </div>
      <div class="card">
        <h2>LGPD e confidencialidade</h2>
        <p>${esc(safeReport?.lgpd?.notice || '')}</p>
        <p><b>Contato:</b> ${esc(safeReport?.lgpd?.contact || '')}</p>
      </div>
      `
    )
  );

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${esc(safeReport?.meta?.reportTitle || 'Relatório InsightDISC')}</title>
      <style>
        @page { size: A4; margin: 14mm 12mm 16mm 12mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #0b1220;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          min-height: 268mm;
          page-break-after: always;
          position: relative;
          padding-bottom: 14mm;
        }
        .page:last-child { page-break-after: auto; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid #e6ebf2;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .brand { font-weight: 800; font-size: 13px; }
        .sub { color: #5b6678; font-size: 10.5px; }
        .meta { text-align: right; font-size: 10.5px; color: #5b6678; }
        main { padding-bottom: 8mm; }
        h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: -.2px; }
        .subtitle { margin: 0 0 10px; color: #5b6678; font-size: 12px; }
        h2 { margin: 0 0 6px; font-size: 13px; }
        h3 { margin: 0 0 6px; font-size: 11px; color: #5b6678; text-transform: uppercase; letter-spacing: .4px; }
        p, li { font-size: 11.4px; line-height: 1.45; color: #1f2937; }
        ul { margin: 6px 0; padding-left: 18px; }
        .footer {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          border-top: 1px solid #e6ebf2;
          padding-top: 7px;
          font-size: 10px;
          color: #5b6678;
          display: flex;
          justify-content: space-between;
        }
        .cover {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .cover-card,
        .card,
        .figure {
          border: 1px solid #e6ebf2;
          border-radius: 12px;
          padding: 10px;
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .note { color: #5b6678; font-size: 10.5px; }
        .bar-row {
          display: grid;
          grid-template-columns: 26px 1fr 42px;
          gap: 8px;
          align-items: center;
          margin: 7px 0;
        }
        .bar-label { font-weight: 700; font-size: 11px; }
        .bar-track {
          height: 10px;
          border-radius: 999px;
          background: #eef2f8;
          overflow: hidden;
        }
        .bar-fill { height: 100%; border-radius: 999px; }
        .bar-value { text-align: right; font-size: 10.5px; color: #5b6678; }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-top: 4px;
        }
        th, td {
          border-bottom: 1px solid #e6ebf2;
          padding: 7px;
          text-align: left;
          vertical-align: top;
        }
        th {
          font-weight: 700;
          color: #334155;
          background: #f6f9ff;
        }
      </style>
    </head>
    <body>
      ${pages.join('')}
    </body>
  </html>`;
}
