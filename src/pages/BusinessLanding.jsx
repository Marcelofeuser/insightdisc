import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const BUSINESS_CONFIG = {
  slug: 'business',
  metaTitle: 'InsightDISC Business: inteligência comportamental para equipes e liderança',
  metaDescription:
    'A versão Business do InsightDISC integra Team Map, visão organizacional e leitura estratégica para apoiar decisões de liderança, cultura e performance.',
  hero: {
    badge: 'Solução corporativa para equipes, líderes e RH estratégico',
    title: 'InsightDISC Business: inteligência comportamental para decisões organizacionais',
    subtitle:
      'Conecte comportamento, cultura e performance com uma visão estruturada da equipe para liderar com mais precisão e escalar com consistência.',
    primaryCta: {
      label: 'Aplicar na empresa',
      to: '/StartFree',
      source: 'hero_aplicar_na_empresa',
    },
    secondaryCta: {
      label: 'Ver solução para times',
      to: '#diferenciais',
      source: 'hero_ver_solucao_times',
    },
    panel: {
      eyebrow: 'Visão organizacional',
      title: 'Leitura coletiva com foco em performance',
      stats: [
        { label: 'Foco principal', value: 'Inteligência de equipe' },
        { label: 'Abordagem', value: 'Dados para liderança' },
      ],
      highlight: {
        label: 'Diferencial-chave',
        value: 'Team Map com leitura de distribuição DISC para apoiar decisões de gestão.',
      },
      secondaryEyebrow: 'Camadas da solução',
      pillars: [
        'Team Map e composição de times',
        'Leitura de riscos comportamentais',
        'Apoio à liderança e cultura',
        'Direcionamento para desenvolvimento',
      ],
    },
  },
  visualShowcase: {
    eyebrow: 'Visão de equipe',
    title: 'Visualizações para decisões organizacionais',
    description:
      'Team Map e leitura agregada DISC para apoiar liderança, cultura e performance com visão sistêmica.',
    variant: 'business',
    content: {
      teamMap: {
        title: 'Team Map',
        members: [
          'D', 'I', 'S', 'C', 'I',
          'S', 'D', 'C', 'I', 'S',
          'C', 'D', 'I', 'S', 'C',
          'D', 'I', 'S', 'C', 'D',
        ],
      },
      bars: {
        title: 'Distribuição DISC da equipe',
        values: { D: 32, I: 27, S: 24, C: 17 },
      },
      radar: {
        title: 'Radar médio da equipe',
        subtitle: 'Composição comportamental consolidada',
        values: { D: 68, I: 61, S: 54, C: 59 },
      },
      insights: [
        {
          title: 'Liderança',
          description: 'Ajustes de comunicação para melhorar alinhamento e execução.',
        },
        {
          title: 'Cultura',
          description: 'Leitura de aderência comportamental por contexto organizacional.',
        },
        {
          title: 'Performance',
          description: 'Sinais de equilíbrio e possíveis pontos de tensão do time.',
        },
      ],
    },
  },
  whatIs: {
    title: 'Uma camada de inteligência comportamental para gestão de pessoas',
    description:
      'O InsightDISC Business entrega uma visão integrada de comportamento individual e coletivo para decisões mais seguras em contexto corporativo.',
    supportText:
      'Com leitura organizacional estruturada, a empresa identifica padrões de equipe, oportunidades de liderança e riscos de desalinhamento cultural.',
    highlight: 'Não é só relatório individual. É visão estratégica de comportamento em escala.',
    bullets: [
      'Mapeamento de dinâmica comportamental do time',
      'Apoio à tomada de decisão em gestão de pessoas',
      'Leitura aplicada para performance e cultura',
      'Base analítica para liderança e desenvolvimento',
    ],
  },
  audience: {
    title: 'Para empresas que querem gestão orientada por comportamento',
    description:
      'Indicado para lideranças, RH e áreas estratégicas que precisam tomar decisões com visão de equipe.',
    items: [
      'Diretores e heads de área',
      'Líderes de times operacionais e estratégicos',
      'RH e People Analytics',
      'Business Partners',
      'Consultorias de gestão e cultura',
      'Organizações em escala de crescimento',
    ],
  },
  offers: {
    title: 'O que a versão Business oferece',
    description: 'Ferramentas para conectar leitura comportamental a resultados organizacionais.',
    items: [
      {
        title: 'Team Map inteligente',
        description: 'Distribuição DISC da equipe com leitura de equilíbrio, lacunas e concentrações.',
      },
      {
        title: 'Visão organizacional consolidada',
        description: 'Entendimento rápido de tendências comportamentais por time ou unidade.',
      },
      {
        title: 'Apoio à liderança',
        description: 'Indicadores para melhorar comunicação, delegação e gestão de conflitos.',
      },
      {
        title: 'Leitura para cultura e performance',
        description: 'Dados para decisões sobre aderência cultural, ritmo e alinhamento.',
      },
      {
        title: 'Estratégia de desenvolvimento em escala',
        description: 'Base para programas de evolução comportamental por público e contexto.',
      },
      {
        title: 'Relatórios executivos premium',
        description: 'Apresentação clara para comitês, lideranças e áreas de decisão.',
      },
    ],
  },
  differentials: {
    title: 'Da leitura individual para a inteligência de equipe',
    description:
      'A versão Business transforma dados comportamentais em visão sistêmica para apoiar estratégia de pessoas, cultura e liderança.',
    items: [
      'Team Map com visão coletiva acionável',
      'Leitura organizacional para decisões mais rápidas',
      'Base técnica para desenvolvimento de liderança',
      'Maior previsibilidade em performance de equipes',
    ],
  },
  workflow: {
    title: 'Como funciona no contexto corporativo',
    description: 'Fluxo operacional para capturar dados, gerar leitura e apoiar decisões de gestão.',
    steps: [
      {
        title: 'Mapeamento dos públicos e times',
        description: 'A organização define as áreas e grupos que participarão da análise comportamental.',
      },
      {
        title: 'Aplicação das avaliações',
        description: 'Os colaboradores respondem via link em um processo simples e rastreável.',
      },
      {
        title: 'Consolidação dos dados',
        description: 'A plataforma organiza o comportamento por indivíduo, equipe e visão agregada.',
      },
      {
        title: 'Leitura estratégica com Team Map',
        description: 'Lideranças visualizam padrões, riscos e oportunidades de composição.',
      },
      {
        title: 'Ação em performance e cultura',
        description: 'A empresa aplica os insights em liderança, desenvolvimento e decisões de pessoas.',
      },
    ],
  },
  benefits: {
    title: 'Benefícios para operação e estratégia empresarial',
    description: 'Mais clareza na gestão de pessoas, mais alinhamento de equipe e mais performance sustentável.',
    items: [
      {
        title: 'Decisões orientadas por comportamento',
        description: 'Reduz subjetividade e aumenta segurança na gestão de talentos.',
      },
      {
        title: 'Visão completa de equipe',
        description: 'Entenda como os perfis interagem e impactam resultados coletivos.',
      },
      {
        title: 'Fortalecimento da liderança',
        description: 'Apoie líderes com leitura prática para condução de times.',
      },
      {
        title: 'Aderência cultural mais precisa',
        description: 'Use dados comportamentais para ajustar contratação e desenvolvimento.',
      },
      {
        title: 'Melhor alocação de talentos',
        description: 'Posicione perfis nos contextos de maior aderência e impacto.',
      },
      {
        title: 'Escalabilidade com padronização',
        description: 'Estrutura replicável para múltiplos times e unidades de negócio.',
      },
    ],
  },
  finalCta: {
    title: 'Transforme comportamento em vantagem competitiva para sua empresa.',
    description:
      'Com o InsightDISC Business, sua organização ganha visão técnica de equipes para liderar melhor, desenvolver pessoas e sustentar performance.',
    primaryCta: {
      label: 'Aplicar na empresa',
      to: '/StartFree',
      source: 'cta_aplicar_na_empresa',
    },
    secondaryCta: {
      label: 'Ver solução para times',
      to: '#o-que-oferece',
      source: 'cta_ver_solucao_times',
    },
  },
};

export default function BusinessLandingPage() {
  return <ProductSegmentLandingBase {...BUSINESS_CONFIG} />;
}
