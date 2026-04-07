import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const BUSINESS_CONFIG = {
  slug: 'business',
  metaTitle: 'InsightDISC Business: entenda como sua equipe funciona',
  metaDescription:
    'Inteligência comportamental para equipes: decisões mais assertivas, menos conflito interno e mais alinhamento com dados.',
  hero: {
    badge: 'Leitura de equipe para decisões e alinhamento',
    title: 'Entenda como sua equipe funciona',
    titleHighlight: 'sua equipe funciona',
    subtitle:
      'Tome decisões de pessoas com mais precisão — sem achismo, com dados comportamentais.',
    primaryCta: {
      label: 'Aplicar na minha empresa',
      to: '/checkout/plan/business',
      source: 'hero_checkout_business',
    },
    secondaryCta: {
      label: 'Ver como funciona',
      to: '#como-funciona',
      source: 'hero_ver_solucao_times',
    },
    panel: {
      eyebrow: 'Visão de equipe',
      title: 'Leitura coletiva para decisões melhores',
      stats: [
        { label: 'Foco principal', value: 'Equipe e cultura' },
        { label: 'Abordagem', value: 'Dados comportamentais' },
      ],
      highlight: {
        label: 'Diferencial',
        value: 'Sem achismo: leitura de equipe com Team Map e interpretação aplicada.',
      },
      secondaryEyebrow: 'Camadas da solução',
      pillars: [
        'Team Map e composição de times',
        'Decisões mais assertivas',
        'Menos conflito interno',
        'Apoio à liderança',
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
    title: 'Leitura de equipe aplicada à gestão de pessoas',
    description:
      'Uma visão estruturada do comportamento individual e coletivo para decisões mais seguras no contexto corporativo.',
    supportText:
      'Você enxerga padrões, lacunas e riscos de composição — e usa isso para ajustar liderança, comunicação e decisões de gente.',
    highlight: 'Sem achismo, com dados comportamentais.',
    bullets: [
      'Leitura de equipe com Team Map',
      'Decisões mais assertivas',
      'Menos conflito interno',
      'Alinhamento de cultura e execução',
    ],
  },
  audience: {
    title: 'Para quem é',
    description:
      'Para pequenas empresas e times que precisam reduzir ruído e tomar decisões com mais clareza.',
    items: [
      'Lideranças de time',
      'RH e People',
      'Gestores de operação',
      'Empresas em crescimento',
      'Consultorias e BPs',
      'Times com conflitos recorrentes',
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
    title: 'Resultado',
    description: 'Mais alinhamento, menos conflito e decisões de pessoas com mais previsibilidade.',
    items: [
      {
        title: 'Decisões mais assertivas',
        description: 'Use leitura comportamental para reduzir subjetividade e aumentar segurança.',
      },
      {
        title: 'Visão de equipe',
        description: 'Entenda como os perfis interagem e impactam o resultado coletivo.',
      },
      {
        title: 'Menos conflito interno',
        description: 'Reduza atritos recorrentes ao entender os padrões de interação do time.',
      },
      {
        title: 'Alinhamento cultural',
        description: 'Calibre cultura e comunicação com dados comportamentais e leitura aplicada.',
      },
      {
        title: 'Melhor alocação',
        description: 'Posicione perfis nos contextos com maior aderência e impacto.',
      },
      {
        title: 'Gestão mais previsível',
        description: 'Uma base comum para decisões, comunicação e desenvolvimento do time.',
      },
    ],
  },
  finalCta: {
    layout: 'single-centered',
    title: 'Aplicar na minha empresa',
    description:
      'Ative o Business e comece a usar dados comportamentais para liderar com mais clareza.',
    primaryCta: {
      label: 'Aplicar na minha empresa',
      to: '/checkout/plan/business',
      source: 'cta_checkout_business',
    },
  },
};

export default function BusinessLandingPage() {
  return <ProductSegmentLandingBase {...BUSINESS_CONFIG} />;
}
