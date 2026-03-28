import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const PROFISSIONAL_CONFIG = {
  slug: 'profissional',
  metaTitle: 'InsightDISC Profissional: análise comportamental para especialistas',
  metaDescription:
    'A versão Profissional do InsightDISC foi criada para RH, consultores, analistas e coaches que precisam de leitura técnica consistente e produtividade.',
  hero: {
    badge: 'Camada técnica para atuação profissional com DISC',
    title: 'InsightDISC Profissional: leitura técnica para decisões comportamentais consistentes',
    titleHighlight: 'decisões comportamentais consistentes',
    subtitle:
      'Estruture devolutivas, recrutamento e desenvolvimento com uma base analítica confiável, reduzindo subjetividade e aumentando precisão.',
    primaryCta: {
      label: 'Usar na prática',
      to: '/checkout/profissional',
      source: 'hero_checkout_profissional',
    },
    secondaryCta: {
      label: 'Ver análise profissional',
      to: '/dossie',
      source: 'hero_ver_analise_profissional',
    },
    panel: {
      eyebrow: 'Operação profissional',
      title: 'Decisão técnica com leitura estruturada',
      stats: [
        { label: 'Foco principal', value: 'Consistência analítica' },
        { label: 'Formato', value: 'Fluxo pronto para devolutiva' },
      ],
      highlight: {
        label: 'Diferencial-chave',
        value: 'Dossiê estruturado para apoiar decisões com menos viés interpretativo.',
      },
      secondaryEyebrow: 'Aplicações técnicas',
      pillars: [
        'Análise comportamental profissional',
        'Recrutamento e seleção',
        'Devolutiva estruturada',
        'Planos de desenvolvimento',
      ],
    },
  },
  visualShowcase: {
    eyebrow: 'Painel técnico',
    title: 'Leitura DISC visual para atuação profissional',
    description:
      'Visualizações que apoiam interpretação consistente, devolutiva estruturada e tomada de decisão com menos ruído.',
    variant: 'profissional',
    content: {
      radar: {
        title: 'Radar DISC com intensidade',
        subtitle: 'Mapa dos fatores para leitura técnica',
        values: { D: 74, I: 63, S: 48, C: 82 },
      },
      bars: {
        title: 'Distribuição D/I/S/C',
        values: { D: 74, I: 63, S: 48, C: 82 },
      },
      technical: {
        title: 'Bloco de leitura técnica',
        bullets: [
          'Predominância com combinações secundárias.',
          'Estilo de comunicação em contexto profissional.',
          'Tendências decisórias e resposta à pressão.',
          'Indicadores de adaptação e esforço comportamental.',
        ],
      },
      preview: {
        title: 'Preview do relatório profissional',
        badge: 'Dossiê técnico',
        lines: [
          'Leitura estruturada por blocos analíticos.',
          'Evidências comportamentais para devolutiva.',
          'Pontos de tensão e hipóteses de investigação.',
          'Recomendações práticas para aplicação profissional.',
        ],
      },
    },
  },
  whatIs: {
    title: 'Uma solução profissional para leitura DISC orientada a decisão',
    description:
      'O InsightDISC Profissional organiza dados comportamentais em estruturas técnicas de interpretação para uso em contexto real.',
    supportText:
      'A plataforma apoia o especialista na condução de entrevistas, devolutivas e decisões de desenvolvimento com maior rigor analítico.',
    highlight: 'Não é apenas visualização de perfil. É método estruturado para atuação profissional.',
    bullets: [
      'Padronização de leitura entre atendimentos',
      'Redução de viés em análises comportamentais',
      'Mais clareza na preparação de devolutivas',
      'Base sólida para decisões em RH e consultoria',
    ],
  },
  audience: {
    title: 'Para especialistas que precisam de consistência técnica',
    description:
      'Ideal para profissionais que aplicam DISC em processos de desenvolvimento humano, seleção e performance.',
    items: [
      'Analistas comportamentais',
      'Profissionais de RH',
      'Consultores DISC',
      'Coaches e mentores',
      'Psicólogos organizacionais',
      'Especialistas em desenvolvimento humano',
    ],
  },
  offers: {
    title: 'O que a versão Profissional oferece',
    description: 'Ferramentas para transformar leitura DISC em prática técnica escalável.',
    items: [
      {
        title: 'Dossiê estruturado',
        description: 'Leitura organizada por blocos técnicos para análise aprofundada do comportamento.',
      },
      {
        title: 'Fluxo de análise padronizado',
        description: 'Da coleta ao relatório, com processo replicável para diferentes atendimentos.',
      },
      {
        title: 'Comparações estratégicas',
        description: 'Suporte para análise pessoa x pessoa e pessoa x contexto.',
      },
      {
        title: 'Histórico de acompanhamento',
        description: 'Registro contínuo para evolução e reavaliação comportamental.',
      },
      {
        title: 'Relatório premium para devolutiva',
        description: 'Entrega visual profissional para sessões, entrevistas e feedbacks estruturados.',
      },
      {
        title: 'Experiência preparada para produtividade',
        description: 'Menos tempo organizando dados, mais tempo gerando valor consultivo.',
      },
    ],
  },
  differentials: {
    title: 'Rigor técnico com aplicação prática',
    description:
      'A versão Profissional foi desenhada para especialistas que precisam de profundidade sem abrir mão de agilidade operacional.',
    items: [
      'Dossiê com estrutura analítica consistente',
      'Padronização de linguagem e interpretação',
      'Leitura técnica confiável em escala',
      'Maior produtividade na preparação de devolutivas',
    ],
  },
  workflow: {
    title: 'Como o especialista usa na rotina',
    description: 'Um fluxo direto para conduzir análise, devolutiva e acompanhamento com consistência.',
    steps: [
      {
        title: 'Cadastro e contexto do avaliado',
        description: 'O profissional registra dados essenciais e organiza o histórico em um único fluxo.',
      },
      {
        title: 'Aplicação da avaliação DISC',
        description: 'Envio por link com resposta estruturada para leitura técnica posterior.',
      },
      {
        title: 'Análise com dossiê estruturado',
        description: 'A plataforma organiza padrões, comunicação, decisão e sinais de adaptação.',
      },
      {
        title: 'Preparação da devolutiva',
        description: 'Com base na leitura, o profissional conduz feedback com maior objetividade.',
      },
      {
        title: 'Acompanhamento e evolução',
        description: 'Histórico salvo para continuidade, comparações futuras e desenvolvimento progressivo.',
      },
    ],
  },
  benefits: {
    title: 'Benefícios para operação técnica e estratégica',
    description: 'Mais precisão diagnóstica, mais agilidade de execução e mais segurança na decisão.',
    items: [
      {
        title: 'Redução de viés interpretativo',
        description: 'Estrutura de leitura que reduz subjetividade nas análises.',
      },
      {
        title: 'Maior precisão técnica',
        description: 'Identificação de padrões comportamentais com mais clareza e fundamento.',
      },
      {
        title: 'Ganho de produtividade',
        description: 'Menos retrabalho na preparação de devolutivas e pareceres.',
      },
      {
        title: 'Base forte para recrutamento',
        description: 'Apoio à análise de aderência comportamental para função e contexto.',
      },
      {
        title: 'Consistência em atendimentos',
        description: 'Padronização que facilita escalabilidade em consultorias e equipes.',
      },
      {
        title: 'Entrega premium ao cliente',
        description: 'Relatórios com acabamento profissional e linguagem técnica.',
      },
    ],
  },
  finalCta: {
    layout: 'single-centered',
    title: 'Escale sua atuação com leitura técnica consistente e fluxo profissional completo.',
    description:
      'Ative o plano Profissional para padronizar análises, ganhar produtividade e elevar sua entrega técnica.',
    primaryCta: {
      label: 'Adquirir acesso profissional',
      to: '/checkout/profissional',
      source: 'cta_checkout_profissional',
    },
  },
};

export default function ProfissionalLandingPage() {
  return <ProductSegmentLandingBase {...PROFISSIONAL_CONFIG} />;
}
