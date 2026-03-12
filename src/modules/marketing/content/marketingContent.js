export const MARKETING_MENU_ITEMS = Object.freeze([
  { label: 'Produto', path: '/' },
  { label: 'Empresas', path: '/empresa' },
  { label: 'RH', path: '/rh' },
  { label: 'Lideres', path: '/lideres' },
  { label: 'Recrutamento', path: '/recrutamento' },
  { label: 'Planos', path: '/Pricing' },
]);

export const MAIN_LANDING_CONTENT = Object.freeze({
  meta: {
    title: 'InsightDISC | Inteligencia comportamental DISC para pessoas e empresas',
    description:
      'Muito alem de um teste DISC: resultado individual, relatorio premium, comparacao de perfis, aderencia candidato x cargo e inteligencia de equipes.',
  },
  hero: {
    badge: 'Muito além de um teste DISC',
    title: 'Plataforma de inteligência comportamental para pessoas, líderes e empresas',
    subtitle:
      'Avaliação individual, relatório premium, comparação de perfis, aderência candidato x cargo e mapa comportamental de equipes em uma única plataforma.',
    primaryCta: { label: 'Fazer minha avaliacao', to: '/avaliacoes' },
    secondaryCta: { label: 'Ver demonstracao', to: '/demo' },
    compatibilityCta: { label: 'Fazer Teste Grátis', to: '/StartFree' },
    quickActions: [
      { label: 'Conhecer planos', to: '/Pricing' },
      { label: 'Falar com comercial', to: '/empresa' },
    ],
    trustPoints: [
      'Perfil: leitura individual detalhada',
      'Comparação: pessoa x pessoa e pessoa x cargo',
      'Team Map e relatório premium exportável',
    ],
  },
  productShowcase: [
    {
      title: 'Resultado individual oficial',
      description:
        'Leitura estruturada do perfil com resumo executivo, forcas, pontos de atencao e recomendacoes de desenvolvimento.',
      tag: 'Perfil individual',
      to: '/avaliacoes',
    },
    {
      title: 'Relatorio premium',
      description:
        'Relatorio HTML completo com estrutura profissional e exportacao PDF para uso comercial e consultivo.',
      tag: 'Relatorios',
      to: '/Pricing',
    },
    {
      title: 'Comparacao avancada',
      description:
        'Compatibilidade comportamental entre perfis com radar comparativo, sinergias, tensoes e recomendacoes praticas.',
      tag: 'Comparacao',
      to: '/compare-profiles',
    },
    {
      title: 'Mapa comportamental organizacional',
      description:
        'Visao executiva da composicao da equipe com distribuicao DISC, gaps, oportunidades e leitura por dimensao organizacional.',
      tag: 'Team intelligence',
      to: '/team-map',
    },
    {
      title: 'Aderencia candidato x cargo',
      description:
        'Score de fit comportamental entre pessoa e vaga para apoiar recrutamento e reduzir risco de contratacao.',
      tag: 'Job matching',
      to: '/JobMatching',
    },
  ],
  coreFlows: [
    {
      title: 'Fazer avaliacao',
      description: 'Inicie o diagnostico DISC com fluxo guiado e leitura clara.',
      to: '/avaliacoes',
    },
    {
      title: 'Ver resultado',
      description: 'Abra o resultado oficial com perfil predominante e interpretacao estruturada.',
      to: '/assessments/assessment-1/result',
    },
    {
      title: 'Gerar relatorio',
      description: 'Acesse o relatorio HTML oficial com secoes premium e leitura tecnica.',
      to: '/assessments/assessment-1/report',
    },
    {
      title: 'Exportar PDF',
      description: 'Converta o relatorio oficial em material profissional para uso comercial.',
      to: '/assessments/assessment-1/report',
    },
    {
      title: 'Comparar perfis',
      description: 'Entenda sinergias, tensoes e compatibilidade entre duas pessoas.',
      to: '/compare-profiles',
    },
    {
      title: 'Pessoa x cargo e Team Map',
      description: 'Analise aderencia comportamental e equilibrio organizacional da equipe.',
      to: '/JobMatching',
    },
  ],
  valuePillars: [
    {
      title: 'Perfil individual',
      description: 'Entenda forças, pontos de atenção, estilo de comunicação, ambiente ideal e desenvolvimento pessoal.',
    },
    {
      title: 'Relatorio premium',
      description: 'Gere dossiês comportamentais completos em HTML e PDF, com leitura técnica, executiva e prática.',
    },
    {
      title: 'Comparacao de perfis',
      description: 'Compare pessoas, líderes e liderados, candidato x cargo ideal e membro x equipe com leitura estratégica.',
    },
    {
      title: 'Recrutamento inteligente',
      description: 'Analise aderência comportamental à vaga, reduza decisões subjetivas e aumente segurança na contratação.',
    },
    {
      title: 'Mapa de equipe',
      description: 'Visualize distribuição DISC, lacunas, riscos de composição, perfis predominantes e equilíbrio organizacional.',
    },
    {
      title: 'Lideranca e desenvolvimento',
      description: 'Obtenha leituras automáticas de liderança, pressão, decisão, comunicação e gestão de conflitos.',
    },
  ],
  audiences: [
    {
      title: 'Empresas e RH',
      description: 'Use DISC para recrutamento, formação de equipes, liderança, cultura e desenvolvimento interno.',
      ctaLabel: 'Conhecer',
      to: '/rh',
    },
    {
      title: 'Consultores e analistas',
      description: 'Atenda clientes com relatórios premium, comparações e leitura profissional de perfis.',
      ctaLabel: 'Conhecer',
      to: '/consultores',
    },
    {
      title: 'Lideres e gestores',
      description: 'Entenda como liderar melhor cada perfil e melhore a dinâmica do time com dados comportamentais.',
      ctaLabel: 'Conhecer',
      to: '/lideres',
    },
    {
      title: 'Autoconhecimento',
      description: 'Descubra seu estilo, aprimore sua comunicação e crie um plano de desenvolvimento mais preciso.',
      ctaLabel: 'Conhecer',
      to: '/autoconhecimento',
    },
  ],
  differentials: [
    {
      title: 'Leitura aplicada',
      description: 'Não entregamos apenas pontuações. Entregamos contexto, interpretação e recomendação prática.',
    },
    {
      title: 'Comparação estratégica',
      description: 'Pessoa x pessoa, líder x liderado, candidato x vaga, membro x equipe.',
    },
    {
      title: 'Inteligência de equipe',
      description: 'Veja lacunas, excessos de perfil, riscos de composição e oportunidades de equilíbrio.',
    },
    {
      title: 'Recrutamento com aderência',
      description: 'Apoie decisões de contratação com base em fit comportamental para a função.',
    },
    {
      title: 'Relatório premium',
      description: 'Relatórios completos em tela e PDF para uso individual, corporativo e consultivo.',
    },
    {
      title: 'Plataforma SaaS',
      description: 'Painel por persona, créditos, planos, controle de uso e estrutura pronta para escalar.',
    },
  ],
  useCases: [
    {
      title: 'Contratação',
      description: 'Compare candidatos com o perfil ideal da vaga e aumente a consistência da escolha.',
      to: '/disc-para-recrutamento',
    },
    {
      title: 'Desenvolvimento de líderes',
      description: 'Entenda como cada líder decide, reage à pressão e se comunica com diferentes perfis.',
      to: '/analise-comportamental-para-lideres',
    },
    {
      title: 'Composição de equipes',
      description: 'Veja o equilíbrio comportamental do time e identifique onde faltam repertórios.',
      to: '/mapa-comportamental-de-equipe',
    },
    {
      title: 'Consultoria comportamental',
      description: 'Atenda clientes com uma entrega muito mais robusta do que um laudo DISC básico.',
      to: '/consultores',
    },
    {
      title: 'Autoconhecimento',
      description: 'Entenda seu estilo predominante e crie um plano claro de desenvolvimento.',
      to: '/autoconhecimento',
    },
    {
      title: 'Cultura e performance',
      description: 'Use dados comportamentais para apoiar comunicação, engajamento e decisão organizacional.',
      to: '/empresa',
    },
  ],
  comparison: {
    title: 'Comparativo de Relatórios',
    rows: [
      { metric: 'Avaliação individual', personal: '✓', professional: '✓', business: '✓' },
      { metric: 'Resultado completo', personal: '✓', professional: '✓', business: '✓' },
      { metric: 'Relatório básico', personal: '✓', professional: '✓', business: '✓' },
      { metric: 'Relatório premium', personal: '−', professional: '✓', business: '✓' },
      { metric: 'Exportação PDF', personal: '−', professional: '✓', business: '✓' },
      { metric: 'Comparação de perfis', personal: '−', professional: '✓', business: '✓' },
      { metric: 'Pessoa x pessoa', personal: '−', professional: '✓', business: '✓' },
      { metric: 'Candidato x cargo', personal: '−', professional: '✓', business: '✓' },
      { metric: 'Team map', personal: '−', professional: '−', business: '✓' },
      { metric: 'Inteligência de equipe', personal: '−', professional: '−', business: '✓' },
      { metric: 'Uso consultivo/clientes', personal: '−', professional: '✓', business: '✓' },
      { metric: 'Múltiplos usuários', personal: '−', professional: '−', business: '✓' },
    ],
  },
  plans: [
    {
      name: 'Personal',
      subtitle: 'Ideal para quem está começando com leitura individual.',
      pricing: { monthly: 'R$97', annual: 'R$78' },
      highlights: ['Avaliação individual', 'Resultado completo', 'Relatório básico', 'Histórico pessoal'],
      ctaLabel: 'Começar',
      to: '/StartFree',
    },
    {
      name: 'Professional',
      subtitle: 'Para uso profissional com análise avançada e entregáveis premium.',
      pricing: { monthly: 'R$297', annual: 'R$237' },
      highlights: ['Relatório premium', 'Exportação PDF', 'Comparação de perfis', 'Uso consultivo / clientes', 'Mais créditos e recursos'],
      ctaLabel: 'Assinar agora',
      to: '/Pricing',
      featured: true,
    },
    {
      name: 'Business',
      subtitle: 'Escala corporativa com inteligência organizacional e visão de equipe.',
      customLabel: 'Custom',
      highlights: ['Team map', 'Inteligência de equipe', 'Candidato x cargo', 'Múltiplos usuários', 'Recursos corporativos'],
      ctaLabel: 'Falar com comercial',
      to: '/empresa',
    },
  ],
  faq: [
    {
      question: 'A InsightDISC é só um teste DISC?',
      answer:
        'Não. Ela é uma plataforma de inteligência comportamental que usa DISC para gerar leitura individual, comparação, recrutamento, liderança e análise de equipes.',
    },
    {
      question: 'Posso usar com equipes?',
      answer:
        'Sim. A plataforma possui mapa comportamental organizacional, distribuição DISC, leitura de riscos de composição e inteligência de equilíbrio de time.',
    },
    {
      question: 'Existe relatório em PDF?',
      answer:
        'Sim. Os relatórios podem ser visualizados na plataforma e exportados em PDF profissional.',
    },
    {
      question: 'Posso comparar candidatos com vagas?',
      answer:
        'Sim. O módulo de aderência candidato x cargo permite analisar fit comportamental para recrutamento e alocação.',
    },
    {
      question: 'Qual é o tempo médio de avaliação?',
      answer:
        'A avaliação leva aproximadamente 15 minutos. Você recebe o resultado instantaneamente após concluir o teste.',
    },
  ],
  finalCta: {
    title: 'Transforme perfil em decisão prática',
    description:
      'Use a InsightDISC para desenvolver pessoas, apoiar líderes, contratar melhor e formar equipes mais inteligentes.',
    primary: { label: 'Criar conta grátis', to: '/StartFree' },
    secondary: { label: 'Agendar demonstração', to: '/empresa' },
  },
});

export const PERSONA_CONTENT = Object.freeze({
  empresa: {
    slug: 'empresa',
    reportTier: 'professional',
    metaTitle: 'InsightDISC para Empresas | Inteligencia comportamental organizacional',
    metaDescription:
      'Mapeie cultura, lideranca, equilibrio da equipe e riscos comportamentais com leitura executiva e acao pratica.',
    badge: 'InsightDISC para Empresas',
    title: 'Inteligencia comportamental para cultura, lideranca e performance organizacional',
    subtitle:
      'Consolide uma camada unica para decisao sobre pessoas: team map, comparacao de perfis, relatorios premium e leitura estrategica de equipe.',
    painPoints: [
      'Decisoes de pessoas sem criterio comportamental consistente',
      'Conflitos recorrentes entre lideranca e operacao',
      'Baixa visibilidade sobre gaps de composicao de equipe',
    ],
    benefits: [
      'Mapa comportamental organizacional com leitura executiva',
      'Insights automaticos de riscos e oportunidades da equipe',
      'Relatorio premium para alinhamento entre RH e lideranca',
    ],
    modules: ['teamMap', 'comparison', 'organizationReport', 'leadership'],
    primaryCta: { label: 'Falar com comercial', to: '/Pricing' },
    secondaryCta: { label: 'Explorar demo', to: '/demo' },
  },
  rh: {
    slug: 'rh',
    reportTier: 'premium',
    metaTitle: 'InsightDISC para RH | Recrutamento e desenvolvimento com DISC aplicado',
    metaDescription:
      'Avalie aderencia candidato x cargo, compare perfis e tome decisoes de recrutamento e desenvolvimento com mais seguranca.',
    badge: 'InsightDISC para RH',
    title: 'Recrutamento e desenvolvimento com leitura comportamental acionavel',
    subtitle:
      'Aumente a qualidade de contratacao e fortalece trilhas de desenvolvimento com compatibilidade DISC e relatorio estruturado.',
    painPoints: [
      'Risco alto de mismatch entre candidato e vaga',
      'Dificuldade para comparar perfis com criterio tecnico',
      'Falta de historico comportamental para desenvolvimento',
    ],
    benefits: [
      'Score de aderencia candidato x cargo com justificativa',
      'Comparador avancado para contexto lider x liderado',
      'Relatorios premium para onboarding e feedback',
    ],
    modules: ['jobFit', 'comparison', 'reports', 'teamMap'],
    primaryCta: { label: 'Ver job matching', to: '/recrutamento' },
    secondaryCta: { label: 'Conhecer planos', to: '/Pricing' },
  },
  lideres: {
    slug: 'lideres',
    reportTier: 'premium',
    metaTitle: 'InsightDISC para Lideres | Comunicacao, decisao e desenvolvimento de equipe',
    metaDescription:
      'Entenda dinamicas do time, reduza atritos e melhore a lideranca com inteligencia comportamental DISC aplicada.',
    badge: 'InsightDISC para Lideres',
    title: 'Lidere com clareza comportamental e elevacao de performance do time',
    subtitle:
      'Use comparacoes e insights de lideranca para calibrar comunicacao, decisao e gestao de pressao em cada contexto.',
    painPoints: [
      'Conflitos de comunicacao entre perfis diferentes',
      'Dificuldade de calibrar autonomia e acompanhamento',
      'Tomada de decisao desalinhada com o ritmo do time',
    ],
    benefits: [
      'Leitura automatica do estilo de lideranca',
      'Comparacao de perfil para reduzir atritos recorrentes',
      'Recomendacoes praticas para colaboracao e decisao',
    ],
    modules: ['leadership', 'comparison', 'coach', 'teamMap'],
    primaryCta: { label: 'Explorar para lideres', to: '/analise-comportamental-para-lideres' },
    secondaryCta: { label: 'Ver demonstracao', to: '/demo' },
  },
  consultores: {
    slug: 'consultores',
    reportTier: 'premium',
    metaTitle: 'InsightDISC para Consultores | Operacao premium de analise comportamental',
    metaDescription:
      'Entregue analise DISC com profundidade profissional, comparacao avancada e relatorios premium exportaveis.',
    badge: 'InsightDISC para Consultores',
    title: 'Escalone entregas de consultoria DISC com profundidade e acabamento premium',
    subtitle:
      'Use uma base semantica unica para resultado, comparacao, relatorio e recomendacoes praticas para clientes.',
    painPoints: [
      'Ferramentas rasas para diagnostico comportamental',
      'Dificuldade para padronizar qualidade de relatorios',
      'Baixa escalabilidade da interpretacao manual',
    ],
    benefits: [
      'DiscEngine estruturado para consistencia de leitura',
      'Relatorios premium com exportacao PDF comercial',
      'Comparador avancado para sessoes de devolutiva',
    ],
    modules: ['reports', 'comparison', 'coach', 'jobFit'],
    primaryCta: { label: 'Conhecer plano Professional', to: '/Pricing' },
    secondaryCta: { label: 'Ver relatorio demo', to: '/r/demo' },
  },
  autoconhecimento: {
    slug: 'autoconhecimento',
    reportTier: 'standard',
    metaTitle: 'InsightDISC para Autoconhecimento | Perfil DISC e plano de desenvolvimento',
    metaDescription:
      'Descubra seu perfil predominante, pontos fortes e recomendacoes de evolucao para carreira, comunicacao e tomada de decisao.',
    badge: 'InsightDISC para Desenvolvimento Pessoal',
    title: 'Entenda seu estilo comportamental e desenvolva competencias com direcao',
    subtitle:
      'Da leitura individual ao plano de evolucao, transforme autoconhecimento em proximos passos objetivos.',
    painPoints: [
      'Falta de clareza sobre padroes de comportamento',
      'Dificuldade para priorizar desenvolvimento pessoal',
      'Inseguranca sobre como melhorar comunicacao e decisao',
    ],
    benefits: [
      'Resultado DISC oficial com leitura clara',
      'Resumo executivo e pontos de desenvolvimento',
      'Recomendacoes praticas por contexto profissional',
    ],
    modules: ['result', 'reports', 'development', 'coach'],
    primaryCta: { label: 'Fazer minha avaliacao', to: '/avaliacoes' },
    secondaryCta: { label: 'Explorar demonstracao', to: '/demo' },
  },
  recrutamento: {
    slug: 'recrutamento',
    reportTier: 'professional',
    metaTitle: 'InsightDISC para Recrutamento | Aderencia candidato x cargo',
    metaDescription:
      'Use job matching comportamental para comparar candidato e vaga ideal, reduzir risco de contratacao e melhorar fit da equipe.',
    badge: 'InsightDISC para Recrutamento',
    title: 'Contrate com mais seguranca usando aderencia comportamental candidato x cargo',
    subtitle:
      'Conecte score de fit, leitura tecnica e recomendacoes praticas para fortalecer decisoes de selecao.',
    painPoints: [
      'Contratacoes desalinhadas ao contexto da vaga',
      'Decisao de selecao sem criterio comportamental estruturado',
      'Baixa previsibilidade de performance e adaptacao',
    ],
    benefits: [
      'Score de aderencia com explicacao de convergencia e risco',
      'Perfil ideal de cargo com biblioteca de referencia',
      'Comparacao comportamental integrada ao pipeline de decisao',
    ],
    modules: ['jobFit', 'comparison', 'teamMap', 'reports'],
    primaryCta: { label: 'Ver job matching', to: '/JobMatching' },
    secondaryCta: { label: 'Conhecer planos para RH', to: '/rh' },
  },
  vendas: {
    slug: 'vendas',
    reportTier: 'professional',
    metaTitle: 'InsightDISC para Vendas | Conversao com inteligencia comportamental',
    metaDescription:
      'Aplique DISC em selecao, desenvolvimento e composicao comercial para elevar previsibilidade e performance de vendas.',
    badge: 'InsightDISC para Vendas',
    title: 'Performance comercial com perfil comportamental aplicado',
    subtitle:
      'Mapeie aderencia de funcao, estilo de influencia e dinamica de equipe para ganhar consistencia de execucao comercial.',
    painPoints: [
      'Time comercial com perfis desalinhados ao ciclo de venda',
      'Baixa previsibilidade de comunicacao e influencia',
      'Dificuldade para desenvolver liderancas comerciais',
    ],
    benefits: [
      'Leitura de fit comportamental por funcao comercial',
      'Comparacao de perfil para gestao de lider x vendedor',
      'Plano de desenvolvimento com foco em performance',
    ],
    modules: ['jobFit', 'comparison', 'leadership', 'reports'],
    primaryCta: { label: 'Conhecer plataforma', to: '/empresa' },
    secondaryCta: { label: 'Ver planos', to: '/Pricing' },
  },
});

export const USE_CASE_CONTENT = Object.freeze({
  'disc-para-empresas': {
    slug: 'disc-para-empresas',
    badge: 'Caso de uso',
    title: 'DISC para empresas: de diagnostico comportamental a decisao estrategica',
    subtitle:
      'Conecte lideranca, equipe e cultura com analytics DISC, mapa organizacional e relatorios executivos.',
    primaryCta: { label: 'Ver solucao empresarial', to: '/empresa' },
    secondaryCta: { label: 'Solicitar apresentacao', to: '/Pricing' },
    metaTitle: 'DISC para Empresas | InsightDISC',
    metaDescription:
      'Use DISC para cultura, lideranca e equilibrio de equipe com leitura executiva e recomendacoes acionaveis.',
  },
  'analise-disc-para-rh': {
    slug: 'analise-disc-para-rh',
    badge: 'Caso de uso',
    title: 'Analise DISC para RH: recrutamento, desenvolvimento e alocacao de talentos',
    subtitle:
      'Avalie aderencia comportamental, compare perfis e apoie decisoes de gente com criterio semantico.',
    primaryCta: { label: 'Ver solucao para RH', to: '/rh' },
    secondaryCta: { label: 'Explorar job matching', to: '/JobMatching' },
    metaTitle: 'Analise DISC para RH | InsightDISC',
    metaDescription:
      'Use comparacao DISC e candidato x cargo para reduzir risco de contratacao e acelerar desenvolvimento de times.',
  },
  'teste-disc-com-relatorio': {
    slug: 'teste-disc-com-relatorio',
    badge: 'Caso de uso',
    title: 'Teste DISC com relatorio premium para leitura profissional',
    subtitle:
      'Entregue muito mais que um resultado simples com resumo executivo, analise comportamental e plano de desenvolvimento.',
    primaryCta: { label: 'Fazer avaliacao', to: '/avaliacoes' },
    secondaryCta: { label: 'Ver relatorio demo', to: '/r/demo' },
    metaTitle: 'Teste DISC com Relatorio Premium | InsightDISC',
    metaDescription:
      'Resultado DISC oficial com relatorio aprofundado, visual premium e orientacoes praticas de desenvolvimento.',
  },
  'comparacao-de-perfis-disc': {
    slug: 'comparacao-de-perfis-disc',
    badge: 'Caso de uso',
    title: 'Comparacao de perfis DISC para colaboracao, lideranca e decisao',
    subtitle:
      'Analise sinergias, tensoes e dinamica comportamental entre dois perfis com recomendacoes praticas.',
    primaryCta: { label: 'Abrir comparador', to: '/compare-profiles' },
    secondaryCta: { label: 'Ver para lideres', to: '/lideres' },
    metaTitle: 'Comparacao de Perfis DISC | InsightDISC',
    metaDescription:
      'Compare dois perfis DISC com score de compatibilidade, leitura de tensao e orientacoes para colaboracao.',
  },
  'mapa-comportamental-de-equipe': {
    slug: 'mapa-comportamental-de-equipe',
    badge: 'Caso de uso',
    title: 'Mapa comportamental de equipe para equilibrio e performance organizacional',
    subtitle:
      'Visualize composicao DISC da equipe, lacunas comportamentais e riscos de concentracao de perfil.',
    primaryCta: { label: 'Abrir team map', to: '/team-map' },
    secondaryCta: { label: 'Ver solucao empresarial', to: '/empresa' },
    metaTitle: 'Mapa Comportamental de Equipe | InsightDISC',
    metaDescription:
      'Leitura organizacional DISC com distribuicao agregada, gaps de equipe e recomendacoes de equilibrio comportamental.',
  },
  'analise-comportamental-para-lideres': {
    slug: 'analise-comportamental-para-lideres',
    badge: 'Caso de uso',
    title: 'Analise comportamental para lideres: comunicacao, conflito e execucao',
    subtitle:
      'Use DISC aplicado para ajustar decisao, ritmo de trabalho e colaboracao entre perfis diferentes.',
    primaryCta: { label: 'Explorar para lideres', to: '/lideres' },
    secondaryCta: { label: 'Abrir coach comportamental', to: '/coach' },
    metaTitle: 'Analise Comportamental para Lideres | InsightDISC',
    metaDescription:
      'Ferramenta de inteligencia comportamental para lideres com comparacao DISC e orientacoes praticas.',
  },
  'disc-para-recrutamento': {
    slug: 'disc-para-recrutamento',
    badge: 'Caso de uso',
    title: 'DISC para recrutamento com aderencia candidato x cargo',
    subtitle:
      'Conecte perfil comportamental, vaga ideal e recomendacoes de decisao para contratar com mais seguranca.',
    primaryCta: { label: 'Ver job matching', to: '/JobMatching' },
    secondaryCta: { label: 'Falar com RH da InsightDISC', to: '/rh' },
    metaTitle: 'DISC para Recrutamento | InsightDISC',
    metaDescription:
      'Aplique DISC no recrutamento com score de fit comportamental e comparacao estruturada entre candidatos.',
  },
});

export const USE_CASE_COMMON_BLOCKS = Object.freeze({
  comparisonTableTitle: 'InsightDISC x DISC simples',
  comparisonRows: [
    {
      metric: 'Resultado individual',
      basic: 'Perfil dominante resumido',
      insightdisc: 'Leitura estruturada com resumo executivo e recomendacoes',
    },
    {
      metric: 'Comparacao entre perfis',
      basic: 'Nao disponivel',
      insightdisc: 'Comparacao avancada com score, sinergias e tensoes',
    },
    {
      metric: 'Aderencia candidato x cargo',
      basic: 'Nao disponivel',
      insightdisc: 'Score de fit com leitura de convergencia e risco',
    },
    {
      metric: 'Inteligencia de equipe',
      basic: 'Visao limitada',
      insightdisc: 'Mapa organizacional com gaps e oportunidades',
    },
    {
      metric: 'Relatorio',
      basic: 'Texto generico',
      insightdisc: 'Relatorio premium HTML + exportacao PDF profissional',
    },
  ],
});

export const MARKETING_MODULE_LABELS = Object.freeze({
  result: {
    title: 'Resultado oficial',
    description: 'Leitura clara do perfil predominante, combinacao DISC e interpretacao pratica.',
  },
  reports: {
    title: 'Relatorios premium',
    description: 'Estrutura aprofundada pronta para uso em desenvolvimento, RH e consultoria.',
  },
  comparison: {
    title: 'Comparador avancado',
    description: 'Compatibilidade, sinergias e tensoes entre perfis em contextos reais de trabalho.',
  },
  teamMap: {
    title: 'Team intelligence',
    description: 'Composicao agregada da equipe com analise de equilibrio e lacunas comportamentais.',
  },
  jobFit: {
    title: 'Job matching',
    description: 'Aderencia comportamental entre pessoa e cargo ideal para recrutamento inteligente.',
  },
  leadership: {
    title: 'Inteligencia de lideranca',
    description: 'Leitura automatica de decisao, conflito, pressao e gestao de equipe.',
  },
  development: {
    title: 'Plano de desenvolvimento',
    description: 'Recomendacoes praticas de evolucao para os proximos ciclos de crescimento.',
  },
  coach: {
    title: 'Coach comportamental',
    description: 'Orientacoes contextuais para perguntas de lideranca e colaboracao.',
  },
  organizationReport: {
    title: 'Relatorio organizacional',
    description: 'Sintese executiva da cultura comportamental com recomendacoes estrategicas.',
  },
});
