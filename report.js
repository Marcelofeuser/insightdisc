(() => {
  const PLATFORM_BRAND_LINE = 'InsightDISC – Plataforma de Análise Comportamental';
  const OFFICIAL_INSTITUTIONAL_EMAIL = 'contato@insightdisc.com';
  const DEFAULT_PLATFORM = Object.freeze({
    name: 'InsightDISC',
    subtitle: 'Plataforma de Análise Comportamental',
    website: 'www.insightdisc.app',
    email: OFFICIAL_INSTITUTIONAL_EMAIL,
    instagram: '@insightdisc',
  });
  const MODE_LABELS = Object.freeze({
    personal: 'Personal',
    professional: 'Professional',
    business: 'Business',
  });
  const INSTITUTIONAL_COPY_REPLACEMENTS = Object.freeze([
    ['Relatorio', 'Relatório'],
    ['relatorio', 'relatório'],
    ['Analise', 'Análise'],
    ['analise', 'análise'],
    ['Diagnostico', 'Diagnóstico'],
    ['diagnostico', 'diagnóstico'],
    ['comunicacao', 'comunicação'],
    ['Comunicacao', 'Comunicação'],
    ['lideranca', 'liderança'],
    ['Lideranca', 'Liderança'],
    ['tecnico-profissional', 'técnico-profissional'],
    ['Tecnico-profissional', 'Técnico-profissional'],
    ['aplicacao', 'aplicação'],
    ['Aplicacao', 'Aplicação'],
  ]);
  const SUMMARY_CONTENT = Object.freeze({
    standard: Object.freeze({
      title: 'Sumário Executivo',
      lead:
        'Este relatório cobre todos os eixos do perfil comportamental DISC, do diagnóstico à aplicação prática em liderança, comunicação e desenvolvimento.',
      items: Object.freeze([
        Object.freeze({
          index: '01',
          title: 'Visão Geral & Gráficos DISC',
          description: 'Radar, barras, natural vs. adaptado, intensidade e quadrante',
        }),
        Object.freeze({
          index: '02',
          title: 'Índices & Combinação DISC',
          description: 'Liderança, comunicação, execução, estabilidade emocional e perfis',
        }),
        Object.freeze({
          index: '03',
          title: 'Comportamento & Estilo',
          description: 'Pontos fortes, limitações, pressão, negociação, vendas e aprendizado',
        }),
        Object.freeze({
          index: '04',
          title: 'Desenvolvimento & Plano de Ação',
          description: 'Carreira, crescimento, relacionamentos, síntese e recomendações',
        }),
      ]),
    }),
    personal: Object.freeze({
      title: 'Sumário Executivo',
      lead:
        'Este relatório apresenta os principais eixos do perfil comportamental DISC, com foco em autoconhecimento, comunicação, adaptação ao ambiente e desenvolvimento prático.',
      items: Object.freeze([
        Object.freeze({
          index: '01',
          title: 'Fundamentos & Visão Geral',
          description: 'Introdução ao modelo DISC e leitura inicial das quatro dimensões do perfil',
        }),
        Object.freeze({
          index: '02',
          title: 'Gráficos & Intensidade',
          description: 'Barras, natural vs. adaptado, mapa de quadrante e intensidade comportamental',
        }),
        Object.freeze({
          index: '03',
          title: 'Estilo Pessoal & Ambiente',
          description: 'Pontos fortes, limitações, motivadores e contexto de melhor performance',
        }),
        Object.freeze({
          index: '04',
          title: 'Comunicação, Pressão & Síntese',
          description: 'Tomada de decisão, reação sob pressão, recomendações e conclusão',
        }),
      ]),
    }),
  });

  function safeText(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      const text = safeText(value);
      if (text) return text;
    }
    return '';
  }

  function normalizeInstitutionalEmail(value, fallback = OFFICIAL_INSTITUTIONAL_EMAIL) {
    const email = safeText(value).toLowerCase();
    if (!email || !email.includes('@')) return fallback;
    if (email.endsWith('@insightdisc.app') || email.endsWith('@insightdisc.com')) {
      return OFFICIAL_INSTITUTIONAL_EMAIL;
    }
    return email;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeInstitutionalCopy(value, fallback = '') {
    let text = safeText(value, fallback);
    if (!text) return '';

    INSTITUTIONAL_COPY_REPLACEMENTS.forEach(([source, target]) => {
      text = text.replaceAll(source, target);
    });

    return text;
  }

  function parseEmbeddedContext() {
    const node = document.getElementById('report-context');
    if (!node) return {};
    try {
      return JSON.parse(node.textContent || '{}');
    } catch {
      return {};
    }
  }

  function formatDate(value, fallback = '-') {
    if (!value) return fallback;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      const text = safeText(value);
      return text || fallback;
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  function normalizeContext(raw = {}, reportType = 'business') {
    const participant = raw?.participant || {};
    const meta = raw?.meta || {};
    const brand = raw?.branding || raw?.brand || {};
    const assessment = raw?.assessment || {};
    const organization = assessment?.organization || raw?.organization || {};
    const responsible = raw?.responsible || raw?.currentUser || {};

    const platformName = firstNonEmpty(brand.company_name, brand.name, DEFAULT_PLATFORM.name);
    const platformSubtitle = firstNonEmpty(brand.subtitle, DEFAULT_PLATFORM.subtitle);
    const platformWebsite = firstNonEmpty(brand.website, brand.site, raw?.platform?.website, DEFAULT_PLATFORM.website);
    const platformEmail = normalizeInstitutionalEmail(
      firstNonEmpty(
        brand.support_email,
        brand.email,
        raw?.platform?.email,
        meta?.responsibleEmail,
        responsible?.email,
        DEFAULT_PLATFORM.email
      )
    );
    const platformInstagram = firstNonEmpty(
      brand.instagram,
      raw?.platform?.instagram,
      DEFAULT_PLATFORM.instagram
    );

    const issuerOrganization = firstNonEmpty(
      meta?.issuerOrganization,
      organization?.companyName,
      organization?.name,
      participant?.company,
      platformName
    );
    const issuerResponsibleName = firstNonEmpty(
      meta?.responsibleName,
      responsible?.name,
      'Equipe InsightDISC'
    );
    const issuerResponsibleRole = firstNonEmpty(
      meta?.responsibleRole,
      responsible?.role,
      'Especialista em Análise Comportamental'
    );
    const issuerContact = normalizeInstitutionalEmail(
      firstNonEmpty(
        meta?.issuerContact,
        meta?.responsibleEmail,
        responsible?.email,
        platformEmail
      ),
      platformEmail
    );

    const participantName = firstNonEmpty(participant?.name, assessment?.candidateName, 'Avaliado');
    const participantEmail = firstNonEmpty(participant?.email, assessment?.candidateEmail, '-');
    const participantCompany = firstNonEmpty(
      participant?.company,
      organization?.companyName,
      organization?.name,
      issuerOrganization,
      '-'
    );
    const participantRole = firstNonEmpty(
      participant?.role,
      participant?.jobTitle,
      assessment?.candidateRole,
      assessment?.candidateJobTitle,
      '-'
    );
    const assessmentDate = formatDate(
      firstNonEmpty(
        participant?.assessmentDate,
        participant?.date,
        assessment?.completedAt,
        assessment?.createdAt,
        meta?.generatedAt
      ),
      '-'
    );
    const issueDate = formatDate(firstNonEmpty(meta?.generatedAt, raw?.issuedAt, new Date()), formatDate(new Date()));
    const reportId = firstNonEmpty(meta?.reportId, participant?.reportId, participant?.assessmentId, raw?.reportId, '-');

    return {
      reportTitle: normalizeInstitutionalCopy(
        firstNonEmpty(meta?.reportTitle, 'Relatório de Análise Comportamental DISC'),
        'Relatório de Análise Comportamental DISC'
      ),
      reportModeLabel: MODE_LABELS[reportType] || MODE_LABELS.professional,
      platformBrandLine: PLATFORM_BRAND_LINE,
      platformName,
      platformSubtitle,
      platformWebsite,
      platformEmail,
      platformInstagram,
      participantName,
      participantEmail,
      participantCompany,
      participantRole,
      assessmentDate,
      issueDate,
      reportId,
      issuerResponsibleName,
      issuerResponsibleRole: normalizeInstitutionalCopy(issuerResponsibleRole, issuerResponsibleRole),
      issuerOrganization,
      issuerContact,
      supportTitle: 'Supervisão e respaldo técnico-profissional',
      supportName: 'Verônica Feuser',
      supportRole: 'Psicanalista',
      coverDisclaimer:
        'Este relatório foi desenvolvido para apoio à análise comportamental, autoconhecimento, desenvolvimento pessoal e profissional, comunicação, liderança e tomada de decisão. Este material não substitui avaliação clínica, psicológica ou psiquiátrica.',
    };
  }

  function buildMetaItem(label, value, className = '') {
    return `
      <div class="official-cover-meta-item ${className}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function buildOfficialCoverMarkup(context) {
    return `
      <section class="page official-cover-page" id="page-cover" data-page="0" data-base-page="0" data-tier="all" aria-label="Capa institucional">
        <div class="official-cover-backdrop" aria-hidden="true"></div>
        <div class="official-cover-shell">
          <div class="official-cover-hero">
            <div class="official-cover-kicker">${escapeHtml(context.platformName)}</div>
            <h1 class="official-cover-title">${escapeHtml(context.reportTitle)}</h1>
            <p class="official-cover-subtitle">${escapeHtml(context.platformSubtitle)}</p>
            <div class="official-cover-mode">Modo ${escapeHtml(context.reportModeLabel)}</div>
          </div>

          <div class="official-cover-panels">
            <div class="official-cover-card official-cover-card--identity">
              <div class="official-cover-card-label">Dados do avaliado</div>
              <div class="official-cover-name">${escapeHtml(context.participantName)}</div>
              <div class="official-cover-meta-grid">
                ${buildMetaItem('E-mail', context.participantEmail)}
                ${buildMetaItem('Empresa', context.participantCompany)}
                ${buildMetaItem('Cargo / Função', context.participantRole)}
                ${buildMetaItem('Data da avaliação', context.assessmentDate)}
                ${buildMetaItem('Data de emissão', context.issueDate)}
                ${buildMetaItem('Código / ID do relatório', context.reportId, 'official-cover-meta-item--report-id')}
              </div>
            </div>

            <div class="official-cover-side">
              <div class="official-cover-card">
                <div class="official-cover-card-label">Emissão / aplicação</div>
                <div class="official-cover-side-title">${escapeHtml(context.issuerResponsibleName)}</div>
                <p>${escapeHtml(context.issuerResponsibleRole)}</p>
                <p><strong>Organização emissora:</strong> ${escapeHtml(context.issuerOrganization)}</p>
                <p><strong>Contato:</strong> ${escapeHtml(context.issuerContact)}</p>
              </div>

              <div class="official-cover-card">
                <div class="official-cover-card-label">Institucional</div>
                <div class="official-cover-side-title">${escapeHtml(context.platformBrandLine)}</div>
                <p>${escapeHtml(context.platformWebsite)}</p>
              </div>

              <div class="official-cover-card official-cover-card--support">
                <div class="official-cover-card-label">Respaldo técnico-profissional</div>
                <div class="official-cover-side-title">${escapeHtml(context.supportName)}</div>
                <p>${escapeHtml(context.supportRole)}</p>
                <p>${escapeHtml(context.supportTitle)}</p>
              </div>
            </div>
          </div>

          <div class="official-cover-note">${escapeHtml(context.coverDisclaimer)}</div>
        </div>
      </section>
    `;
  }

  function injectOfficialCover(context) {
    const report = document.querySelector('.report');
    const firstPage = report?.querySelector('.page');
    if (!report || !firstPage || report.querySelector('#page-cover')) return;
    firstPage.insertAdjacentHTML('beforebegin', buildOfficialCoverMarkup(context));
  }

  function buildFooterBrandImage(text) {
    try {
      const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
      const paddingX = 4;
      const height = 34;
      const measureCanvas = document.createElement('canvas');
      const measureContext = measureCanvas.getContext('2d');
      if (!measureContext) return '';

      measureContext.font = '600 22px Arial';
      const width = Math.ceil(measureContext.measureText(text).width) + paddingX * 2;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return '';

      canvas.width = width * scale;
      canvas.height = height * scale;
      context.scale(scale, scale);
      context.clearRect(0, 0, width, height);
      context.font = '600 22px Arial';
      context.fillStyle = 'rgba(255, 255, 255, 0.94)';
      context.textBaseline = 'middle';
      context.fillText(text, paddingX, height / 2);

      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  function repairInstitutionalFooters(context) {
    const footerBrandImage = buildFooterBrandImage(context.platformBrandLine);
    document.querySelectorAll('.page').forEach((page) => {
      const footers = [...page.querySelectorAll('.institutional-footer')];
      footers.slice(1).forEach((footer) => footer.remove());

      const footer = footers[0];
      if (!footer) return;

      if (footerBrandImage) {
        footer.classList.add('institutional-footer--graphic');
        footer.innerHTML = `<img class="institutional-footer-image" src="${footerBrandImage}" alt="" />`;
        return;
      }

      const textNode = footer.querySelector('.institutional-text');
      if (textNode) {
        textNode.textContent = context.platformBrandLine;
      } else {
        footer.innerHTML = `<span class="institutional-text">${escapeHtml(context.platformBrandLine)}</span>`;
      }
    });
  }

  function getSummaryContent(reportType) {
    if (reportType === 'personal') {
      return SUMMARY_CONTENT.personal;
    }
    return SUMMARY_CONTENT.standard;
  }

  function buildSummaryRepairMarkup(summary) {
    const first = summary.items[0];
    const second = summary.items[1];
    const fourth = summary.items[3];

    return `
      <div class="page-repair summary-line-repair" aria-hidden="true">
        ${escapeHtml(first.description)}
      </div>
      <div class="page-repair summary-page-repair" aria-hidden="true">
        <div class="summary-repair-block summary-repair-block--top">
          <span class="summary-repair-index">${escapeHtml(second.index)}</span>
          <strong>${escapeHtml(second.title)}</strong>
          <p>${escapeHtml(second.description)}</p>
        </div>
        <div class="summary-repair-block summary-repair-block--bottom">
          <span class="summary-repair-index">${escapeHtml(fourth.index)}</span>
          <strong>${escapeHtml(fourth.title)}</strong>
          <p>${escapeHtml(fourth.description)}</p>
        </div>
      </div>
    `;
  }

  function buildSummaryItemsMarkup(items) {
    return items
      .map(
        (item) => `
          <div class="summary-panel-item">
            <span class="summary-panel-index">${escapeHtml(item.index)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.description)}</p>
          </div>
        `
      )
      .join('');
  }

  function buildPersonalSummaryPageMarkup(summary) {
    return `
      <section class="page personal-summary-page" id="page-summary-personal" data-page="2-summary" data-base-page="2-summary" data-tier="all" aria-label="Sumário Executivo">
        <div class="page-media">
          <img class="page-image" src="assets/page-02-full.png" alt="Sumário Executivo do relatório InsightDISC Premium" loading="eager" decoding="sync" />
        </div>
        <div class="summary-panel summary-panel--personal">
          <div class="summary-panel-content">
            <h1>${escapeHtml(summary.title)}</h1>
            <p class="summary-panel-lead">${escapeHtml(summary.lead)}</p>
            <div class="summary-panel-grid">
              ${buildSummaryItemsMarkup(summary.items)}
            </div>
          </div>
          <div class="summary-panel-page-number">2</div>
        </div>
        <footer class="institutional-footer" aria-label="Rodape institucional">
          <span class="institutional-text">InsightDISC - Plataforma de Análise Comportamental</span>
        </footer>
      </section>
    `;
  }

  function injectSummaryContent(reportType) {
    const summary = getSummaryContent(reportType);

    if (reportType === 'personal') {
      const report = document.querySelector('.report');
      const openingPage = document.querySelector('.page[data-base-page="1"]');
      if (report && openingPage && !report.querySelector('#page-summary-personal')) {
        openingPage.insertAdjacentHTML('afterend', buildPersonalSummaryPageMarkup(summary));
      }
      return;
    }

    const page = document.querySelector('.page[data-base-page="2"]');
    if (!page || page.querySelector('.summary-page-repair')) return;
    page.insertAdjacentHTML('beforeend', buildSummaryRepairMarkup(summary));
  }

  function injectRelationshipRepair() {
    const page = document.querySelector('.page[data-base-page="23"]');
    if (!page || page.querySelector('.relationship-page-repair')) return;

    page.insertAdjacentHTML(
      'beforeend',
      `
        <div class="page-repair relationship-page-repair" aria-hidden="true">
          <div class="relationship-repair-cell relationship-repair-cell--synergy">
            Energia, criatividade e entusiasmo
          </div>
          <div class="relationship-repair-cell relationship-repair-cell--challenge">
            Falta de foco e superficialidade
          </div>
        </div>
      `
    );
  }

  function enrichFinalPage(context) {
    const finalContent = document.querySelector('.final-message-content');
    if (!finalContent) return;

    finalContent.classList.add('final-message-content--enriched');
    finalContent.innerHTML = `
      <div class="final-message-core">
        <h1 class="final-message-title">${escapeHtml(context.platformName)}</h1>
        <p class="final-message-subtitle">${escapeHtml(context.platformSubtitle)}</p>
      </div>

      <div class="final-message-panel">
        <div class="final-message-column">
          <div class="final-message-heading">${escapeHtml(context.platformBrandLine)}</div>
          <p><strong>Site:</strong> ${escapeHtml(context.platformWebsite)}</p>
          <p><strong>E-mail:</strong> ${escapeHtml(context.platformEmail)}</p>
          <p><strong>Instagram:</strong> ${escapeHtml(context.platformInstagram)}</p>
        </div>

        <div class="final-message-column">
          <div class="final-message-heading">Responsável pelo respaldo técnico-profissional</div>
          <p><strong>${escapeHtml(context.supportName)}</strong> – ${escapeHtml(context.supportRole)}</p>
          <p>${escapeHtml(context.supportTitle)}</p>
        </div>
      </div>

      <p class="final-message-note">Relatório gerado automaticamente pela plataforma InsightDISC.</p>
    `;
  }

  function buildRenderContext() {
    const reportType = safeText(document.body?.dataset?.report, 'business');
    return normalizeContext(parseEmbeddedContext(), reportType);
  }

  function waitForImage(image) {
    return new Promise((resolve) => {
      if (image.complete) {
        resolve();
        return;
      }
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }

  function isVisible(element) {
    return window.getComputedStyle(element).display !== 'none';
  }

  function applyPaginationAndReadyState() {
    const sections = Array.from(document.querySelectorAll('.page'));
    const visibleSections = sections.filter(isVisible);
    document.documentElement.setAttribute('data-report-ready', 'true');
    document.body.setAttribute('data-pages', String(visibleSections.length));
    window.dispatchEvent(
      new CustomEvent('report:ready', {
        detail: { pages: visibleSections.length },
      })
    );
  }

  document.documentElement.setAttribute('data-report-enhanced', 'true');

  const context = buildRenderContext();
  const reportType = safeText(document.body?.dataset?.report, 'business');
  injectOfficialCover(context);
  injectSummaryContent(reportType);
  repairInstitutionalFooters(context);
  injectRelationshipRepair();
  enrichFinalPage(context);

  const images = Array.from(document.querySelectorAll('.page-image'));
  Promise.all(images.map(waitForImage)).then(applyPaginationAndReadyState);
})();
