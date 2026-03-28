import { MARKETING_MODULE_LABELS, USE_CASE_COMMON_BLOCKS } from '@/modules/marketing/content/marketingContent';

const FACTORS = Object.freeze(['D', 'I', 'S', 'C']);

const DEFAULT_PERSONA_MODULES = Object.freeze(['result', 'reports', 'comparison', 'teamMap', 'leadership']);
const DEFAULT_USE_CASE_MODULES = Object.freeze(['result', 'comparison', 'jobFit', 'teamMap', 'reports']);

const MODULE_HINTS_BY_SLUG = Object.freeze({
  empresa: ['teamMap', 'organizationReport', 'leadership', 'comparison', 'reports'],
  rh: ['jobFit', 'comparison', 'reports', 'teamMap'],
  lideres: ['leadership', 'comparison', 'teamMap', 'reports'],
  vendas: ['jobFit', 'comparison', 'leadership', 'reports'],
  consultores: ['reports', 'comparison', 'jobFit', 'leadership'],
  autoconhecimento: ['result', 'reports', 'development', 'comparison'],
  recrutamento: ['jobFit', 'comparison', 'reports', 'teamMap'],
  'disc-para-empresas': ['teamMap', 'organizationReport', 'leadership', 'comparison', 'reports'],
  'analise-disc-para-rh': ['jobFit', 'comparison', 'reports', 'teamMap'],
  'teste-disc-com-relatorio': ['result', 'reports', 'comparison', 'development'],
  'comparacao-de-perfis-disc': ['comparison', 'leadership', 'reports', 'teamMap'],
  'mapa-comportamental-de-equipe': ['teamMap', 'organizationReport', 'leadership', 'comparison'],
  'analise-comportamental-para-lideres': ['leadership', 'comparison', 'teamMap', 'reports'],
  'disc-para-recrutamento': ['jobFit', 'comparison', 'reports', 'teamMap'],
});

const AUDIENCE_HINTS_BY_SLUG = Object.freeze({
  empresa: [
    'Diretores e heads de area',
    'RH estrategico e BP',
    'Liderancas de operacao',
    'Times de cultura e performance',
    'Consultorias organizacionais',
    'Empresas em escala',
  ],
  rh: [
    'RH e Talent Acquisition',
    'Business Partners',
    'People Analytics',
    'Especialistas em onboarding',
    'Lideres de desenvolvimento',
    'Consultorias de RH',
  ],
  lideres: [
    'Lideres de equipe',
    'Coordenadores e gerentes',
    'Heads de area',
    'Lideres de projetos',
    'Mentores internos',
    'Programas de lideranca',
  ],
  vendas: [
    'Lideres comerciais',
    'Times de SDR e closer',
    'Gestores de receita',
    'Enablement comercial',
    'Recrutamento de vendas',
    'Consultorias de performance',
  ],
  consultores: [
    'Consultores DISC',
    'Analistas comportamentais',
    'Coaches e mentores',
    'Psicologia organizacional',
    'Consultorias de desenvolvimento',
    'Treinadores corporativos',
  ],
  autoconhecimento: [
    'Profissionais em transicao',
    'Pessoas em desenvolvimento pessoal',
    'Estudantes e jovens profissionais',
    'Quem busca comunicacao mais clara',
    'Quem quer decisoes mais conscientes',
    'Planos individuais de evolucao',
  ],
  recrutamento: [
    'Talent Acquisition',
    'Recrutamento e selecao',
    'Lideres contratantes',
    'People Partners',
    'Consultorias de recrutamento',
    'Comites de contratacao',
  ],
});

const VARIANT_BY_SLUG = Object.freeze({
  autoconhecimento: 'personal',
  consultores: 'profissional',
  'teste-disc-com-relatorio': 'profissional',
  'comparacao-de-perfis-disc': 'profissional',
});

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function safeText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function hashString(value) {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash >>> 0;
}

function seededRange(seed, min, max) {
  const span = max - min + 1;
  return min + (Math.abs(seed) % span);
}

function toTitleFromSlug(slug) {
  return String(slug || 'landing')
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function normalizeTitle(text, fallback) {
  return safeText(text, fallback).replace(/\s+/g, ' ');
}

function pickTitleHighlight(title) {
  const normalized = normalizeTitle(title, '');
  if (!normalized) return '';

  const colonParts = normalized.split(':');
  if (colonParts.length > 1) {
    const right = colonParts.slice(1).join(':').trim();
    if (right && right.split(/\s+/).length <= 8) {
      return right;
    }
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return normalized;
  return words.slice(-3).join(' ');
}

function withSource(cta, slug, suffix, fallbackLabel, fallbackTo) {
  const label = safeText(cta?.label, fallbackLabel);
  const to = safeText(cta?.to, fallbackTo);
  return {
    label,
    to,
    source: safeText(cta?.source, `${slug}_${suffix}`),
  };
}

function resolveModuleKeys(content, kind) {
  const slug = safeText(content?.slug, 'landing');
  const explicit = toArray(content?.modules);
  const hinted = toArray(MODULE_HINTS_BY_SLUG[slug]);
  const base = kind === 'use_case' ? DEFAULT_USE_CASE_MODULES : DEFAULT_PERSONA_MODULES;
  return unique([...explicit, ...hinted, ...base]).slice(0, 6);
}

function resolveAudienceItems(slug, moduleKeys) {
  const explicit = toArray(AUDIENCE_HINTS_BY_SLUG[slug]);
  if (explicit.length) return explicit.slice(0, 6);

  return moduleKeys.slice(0, 6).map((moduleKey) => {
    const moduleMeta = MARKETING_MODULE_LABELS[moduleKey];
    return moduleMeta ? `Times que aplicam ${moduleMeta.title.toLowerCase()}` : `Operacoes com foco em ${toTitleFromSlug(moduleKey).toLowerCase()}`;
  });
}

function resolveVariant(slug, kind) {
  if (VARIANT_BY_SLUG[slug]) return VARIANT_BY_SLUG[slug];
  if (kind === 'use_case' && /recrut|rh/.test(slug)) return 'profissional';
  return 'business';
}

function buildDiscValues(slug, flavor) {
  const seed = hashString(`${slug}:${flavor}`);
  return {
    D: seededRange(seed + 11, 52, 86),
    I: seededRange(seed + 23, 48, 84),
    S: seededRange(seed + 37, 44, 80),
    C: seededRange(seed + 53, 50, 88),
  };
}

function buildTeamMembers(slug, total = 20) {
  const seed = hashString(`${slug}:team-map`);
  const start = seed % FACTORS.length;
  const step = (seed % 3) + 1;
  const members = [];
  for (let index = 0; index < total; index += 1) {
    members.push(FACTORS[(start + index * step) % FACTORS.length]);
  }
  return members;
}

function buildInsights(rawBenefits, rawPainPoints, moduleKeys) {
  const benefitPool = toArray(rawBenefits);
  const painPointPool = toArray(rawPainPoints).map((item) => `Resposta para ${item.toLowerCase()}.`);
  const modulePool = moduleKeys.map((moduleKey) => MARKETING_MODULE_LABELS[moduleKey]).filter(Boolean);
  const descriptions = unique([...benefitPool, ...painPointPool, ...modulePool.map((item) => item.description)]);

  return modulePool.slice(0, 3).map((moduleMeta, index) => ({
    title: moduleMeta.title,
    description: descriptions[index] || moduleMeta.description,
  }));
}

function shortCardTitle(text, fallback) {
  const normalized = safeText(text, fallback).replace(/\.$/, '');
  if (!normalized) return fallback;

  const colonParts = normalized.split(':');
  if (colonParts[0] && colonParts[0].split(/\s+/).length <= 6) {
    return colonParts[0];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 6) return normalized;
  return words.slice(0, 5).join(' ');
}

function buildOfferItems(moduleKeys) {
  return moduleKeys.slice(0, 6).map((moduleKey, index) => {
    const moduleMeta = MARKETING_MODULE_LABELS[moduleKey];
    if (moduleMeta) {
      return {
        title: moduleMeta.title,
        description: moduleMeta.description,
      };
    }

    return {
      title: `Modulo ${index + 1}`,
      description: `Aplicacao estruturada para ${toTitleFromSlug(moduleKey).toLowerCase()}.`,
    };
  });
}

function buildBenefitItems(content, moduleKeys) {
  const rawBenefits = toArray(content?.benefits);
  if (rawBenefits.length) {
    return rawBenefits.slice(0, 6).map((benefit, index) => ({
      title: shortCardTitle(benefit, `Beneficio ${index + 1}`),
      description: benefit,
    }));
  }

  const mapped = USE_CASE_COMMON_BLOCKS.comparisonRows.slice(0, 5).map((row) => ({
    title: row.metric,
    description: row.insightdisc,
  }));

  if (mapped.length) return mapped;
  return buildOfferItems(moduleKeys);
}

function buildWorkflowSteps(content) {
  const primaryAction = safeText(content?.primaryCta?.label, 'Acessar a plataforma');
  return [
    {
      title: 'Defina o objetivo do ciclo',
      description: 'Escolha o contexto de aplicacao para direcionar leitura, comparacoes e tomada de decisao.',
    },
    {
      title: 'Aplique a avaliacao DISC',
      description: 'Colete respostas em um fluxo simples para formar uma base comportamental confiavel.',
    },
    {
      title: 'Consolide dados e insights',
      description: 'A plataforma organiza padroes, pontos de atencao e sinais de oportunidade em um painel unico.',
    },
    {
      title: 'Priorize com comparacoes estrategicas',
      description: 'Use comparacoes e leitura contextual para reduzir subjetividade nas decisoes mais criticas.',
    },
    {
      title: 'Ative a execucao',
      description: `Com os insights em maos, siga para "${primaryAction}" e execute o proximo passo com consistencia.`,
    },
  ];
}

function buildVisualShowcase(content, kind, moduleKeys) {
  const slug = safeText(content?.slug, 'landing');
  const variant = resolveVariant(slug, kind);
  const titleBase = safeText(content?.title, `InsightDISC para ${toTitleFromSlug(slug)}`);
  const subtitleBase = safeText(content?.subtitle, 'Leitura comportamental aplicada para decisao com mais consistencia.');
  const insights = buildInsights(content?.benefits, content?.painPoints, moduleKeys);

  if (variant === 'personal') {
    return {
      eyebrow: 'Preview visual',
      title: 'Leitura pessoal com visual premium',
      description: subtitleBase,
      variant: 'personal',
      content: {
        radar: {
          title: 'Radar DISC pessoal',
          subtitle: 'Intensidade comportamental por fator',
          values: buildDiscValues(slug, 'radar'),
        },
        insights: insights.length
          ? insights
          : [
              { title: 'Comunicacao', description: 'Ajuste de linguagem para relacionamentos mais claros.' },
              { title: 'Decisao', description: 'Leitura de ritmo e criterio para escolhas mais conscientes.' },
              { title: 'Desenvolvimento', description: 'Plano de evolucao com foco no contexto real.' },
            ],
        preview: {
          title: 'Preview do relatorio',
          badge: 'Leitura pessoal',
          lines: unique([
            ...toArray(content?.benefits),
            ...toArray(content?.painPoints).map((item) => `Resposta pratica para ${item.toLowerCase()}.`),
            'Resumo executivo com foco em aplicacao.',
            'Direcionamentos de evolucao para o dia a dia.',
          ]).slice(0, 4),
        },
      },
    };
  }

  if (variant === 'profissional') {
    return {
      eyebrow: 'Painel tecnico',
      title: 'Estrutura analitica para operacao profissional',
      description: subtitleBase,
      variant: 'profissional',
      content: {
        radar: {
          title: 'Radar tecnico de perfil',
          subtitle: 'Combinacao de fatores para leitura aplicada',
          values: buildDiscValues(slug, 'radar'),
        },
        bars: {
          title: 'Distribuicao D/I/S/C',
          values: buildDiscValues(slug, 'bars'),
        },
        technical: {
          title: 'Bloco de leitura tecnica',
          bullets: unique([
            ...toArray(content?.painPoints),
            ...toArray(content?.benefits),
            ...moduleKeys.map((moduleKey) => MARKETING_MODULE_LABELS[moduleKey]?.description),
          ]).slice(0, 4),
        },
        preview: {
          title: 'Preview do relatorio premium',
          badge: 'Dossie tecnico',
          lines: unique([
            ...toArray(content?.benefits),
            'Leitura estruturada por blocos para devolutiva.',
            'Comparacoes aplicadas para reduzir subjetividade.',
            'Plano de acao orientado por contexto.',
          ]).slice(0, 4),
        },
      },
    };
  }

  return {
    eyebrow: 'Visao de equipe',
    title: 'Visualizacoes premium para decisao em escala',
    description: subtitleBase,
    variant: 'business',
    content: {
      teamMap: {
        title: 'Team Map estrategico',
        members: buildTeamMembers(slug),
      },
      bars: {
        title: 'Distribuicao DISC consolidada',
        values: buildDiscValues(slug, 'bars'),
      },
      radar: {
        title: 'Radar medio da operacao',
        subtitle: 'Tendencias comportamentais do contexto',
        values: buildDiscValues(slug, 'radar'),
      },
      insights: insights.length
        ? insights
        : [
            { title: 'Lideranca', description: 'Direcionamentos para alinhar comunicacao e execucao.' },
            { title: 'Cultura', description: 'Indicadores de aderencia e riscos comportamentais.' },
            { title: 'Performance', description: 'Leitura de equilibrio para acelerar resultado coletivo.' },
          ],
    },
  };
}

export function buildUnifiedLandingConfig(content, kind = 'persona') {
  const slug = safeText(content?.slug, kind === 'use_case' ? 'caso-de-uso' : 'persona');
  const slugLabel = toTitleFromSlug(slug);
  const moduleKeys = resolveModuleKeys(content, kind);
  const moduleCards = moduleKeys.map((moduleKey) => MARKETING_MODULE_LABELS[moduleKey]).filter(Boolean);
  const painPoints = toArray(content?.painPoints);
  const benefits = toArray(content?.benefits);
  const metaTitle = safeText(content?.metaTitle, `InsightDISC ${slugLabel}`);
  const metaDescription = safeText(
    content?.metaDescription,
    safeText(content?.subtitle, 'Leitura comportamental com padrao premium para decisao mais consistente.')
  );
  const contextLabel = kind === 'use_case' ? 'caso de uso' : 'publico estrategico';

  const primaryCta = withSource(content?.primaryCta, slug, 'hero_primary', 'Conhecer planos', '/planos');
  const secondaryCta = withSource(content?.secondaryCta, slug, 'hero_secondary', 'Ver estrutura da plataforma', '#o-que-oferece');
  const finalSecondaryCta = withSource(content?.secondaryCta, slug, 'final_secondary', secondaryCta.label, secondaryCta.to);

  const visualShowcase = buildVisualShowcase(content, kind, moduleKeys);
  const audienceItems = resolveAudienceItems(slug, moduleKeys);
  const offerItems = buildOfferItems(moduleKeys);
  const benefitItems = buildBenefitItems(content, moduleKeys);
  const highlightText =
    benefits[0] ||
    moduleCards[0]?.description ||
    'Estrutura unificada para transformar leitura comportamental em decisao acionavel.';

  const differentialItems = unique([
    ...benefits,
    ...painPoints.map((item) => `Resposta orientada para ${item.toLowerCase()}.`),
    ...moduleCards.map((item) => item.title),
  ]).slice(0, 4);

  return {
    slug,
    metaTitle,
    metaDescription,
    hero: {
      badge: safeText(content?.badge, `InsightDISC para ${slugLabel}`),
      title: normalizeTitle(content?.title, `InsightDISC para ${slugLabel}`),
      titleHighlight: pickTitleHighlight(content?.title),
      subtitle: safeText(
        content?.subtitle,
        'Unifique avaliacao, leitura estrategica e aplicacao pratica em uma experiencia premium de ponta a ponta.'
      ),
      primaryCta,
      secondaryCta,
      panel: {
        eyebrow: kind === 'use_case' ? 'Aplicacao estrategica' : 'Operacao premium',
        title: `Estrutura pronta para ${contextLabel}`,
        stats: [
          { label: 'Contexto', value: kind === 'use_case' ? 'Caso de uso' : 'Landing por publico' },
          { label: 'Frentes ativas', value: `${moduleKeys.length} modulos` },
        ],
        highlight: {
          label: 'Impacto esperado',
          value: highlightText,
        },
        secondaryEyebrow: 'Frentes cobertas',
        pillars: moduleCards.length
          ? moduleCards.slice(0, 4).map((item) => item.title)
          : ['Resultado', 'Comparacao', 'Relatorio premium', 'Inteligencia de equipe'],
      },
    },
    visualShowcase,
    whatIs: {
      title: 'O que a plataforma entrega',
      description: safeText(
        content?.subtitle,
        'Uma camada de inteligencia comportamental para reduzir subjetividade e acelerar decisao.'
      ),
      supportText:
        painPoints.length > 0
          ? `A estrutura foi desenhada para responder desafios como: ${painPoints.slice(0, 2).join(' e ')}.`
          : 'Com uma unica base visual, voce conecta avaliacao, leitura e execucao sem trocar de contexto.',
      highlight: highlightText,
      bullets: unique([
        ...moduleCards.slice(0, 4).map((item) => item.title),
        ...benefits.slice(0, 4),
      ]).slice(0, 4),
    },
    audience: {
      title: 'Para quem essa jornada foi desenhada',
      description: metaDescription,
      items: audienceItems,
    },
    offers: {
      title: 'O que voce desbloqueia com esta landing',
      description: 'Recursos conectados em uma experiencia unificada para analise, comparacao e execucao.',
      items: offerItems,
    },
    differentials: {
      title: 'Diferenciais de uma landing premium unificada',
      description:
        'Mesmo padrao visual, mesma escala tipografica e mesma logica de animacao para garantir consistencia em toda a jornada comercial.',
      items: differentialItems.length
        ? differentialItems
        : ['Visual premium consistente', 'Estrutura modular reutilizavel', 'Animacoes suaves com reveal', 'Identidade unica entre rotas'],
    },
    workflow: {
      title: 'Como funciona na pratica',
      description: 'Fluxo padronizado para sair da navegacao e chegar em decisao com clareza.',
      steps: buildWorkflowSteps(content),
    },
    benefits: {
      title: 'Beneficios diretos da solucao',
      description: 'Uma experiencia premium para comunicar valor com mais consistencia e conversao.',
      items: benefitItems,
    },
    finalCta: {
      layout: 'single-centered',
      title: 'Pronto para ativar essa solucao com padrao premium da InsightDISC?',
      description:
        'Use a mesma base visual da pagina Business para reforcar autoridade, clareza de oferta e consistencia de marca em todas as landings.',
      primaryCta: withSource(content?.primaryCta, slug, 'final_primary', primaryCta.label, primaryCta.to),
      secondaryCta: finalSecondaryCta,
    },
  };
}

export function buildPersonaLandingConfig(content) {
  return buildUnifiedLandingConfig(content, 'persona');
}

export function buildUseCaseLandingConfig(content) {
  return buildUnifiedLandingConfig(content, 'use_case');
}
