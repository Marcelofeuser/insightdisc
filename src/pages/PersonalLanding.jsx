import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const PERSONAL_CONFIG = {
  slug: 'personal',
  metaTitle: 'InsightDISC Personal: entenda como você realmente funciona',
  metaDescription:
    'Leitura comportamental clara e aplicada para melhorar decisões, relações e rotina com mais consciência.',
  hero: {
    badge: 'Autoconhecimento aplicável',
    title: 'Entenda como você realmente funciona',
    titleHighlight: 'realmente funciona',
    subtitle:
      'Uma leitura comportamental clara para melhorar decisões, relações e rotina.',
    primaryCta: {
      label: 'Fazer minha análise',
      to: '/checkout/plan/personal',
      source: 'hero_checkout_personal',
    },
    secondaryCta: {
      label: 'Ver o que eu descubro',
      to: '#o-que-e',
      source: 'hero_descobrir_meu_perfil',
    },
    panel: {
      eyebrow: 'Leitura pessoal guiada',
      title: 'Seu comportamento explicado com clareza',
      stats: [
        { label: 'Foco principal', value: 'Autoconhecimento aplicado' },
        { label: 'Linguagem', value: 'Clara e acessível' },
      ],
      highlight: {
        label: 'Você enxerga',
        value: 'Como você reage sob pressão, decide e se ajusta em diferentes contextos.',
      },
      secondaryEyebrow: 'Você recebe',
      pillars: [
        'Padrões comportamentais claros',
        'Pontos fortes e riscos',
        'Direcionamento prático',
        'Relatório para consulta',
      ],
    },
  },
  visualShowcase: {
    eyebrow: 'Preview visual',
    title: 'Veja seu perfil DISC de forma clara e aplicada',
    description:
      'Um painel visual objetivo para transformar autoconhecimento em ações práticas no dia a dia.',
    variant: 'personal',
    content: {
      radar: {
        title: 'Radar DISC pessoal',
        subtitle: 'Intensidade comportamental por fator',
        values: { D: 62, I: 78, S: 55, C: 67 },
      },
      insights: [
        {
          title: 'Comunicação',
          description: 'Tendência a interações diretas com boa capacidade de engajamento.',
        },
        {
          title: 'Decisão',
          description: 'Equilíbrio entre velocidade e cautela conforme o contexto.',
        },
        {
          title: 'Desenvolvimento',
          description: 'Pontos de evolução priorizados para rotina e relações.',
        },
      ],
      preview: {
        title: 'Preview do relatório',
        badge: 'Leitura pessoal',
        lines: [
          'Síntese do padrão predominante com linguagem acessível.',
          'Forças naturais e pontos de atenção no comportamento.',
          'Insights práticos para decisões e comunicação.',
          'Direcionamentos de evolução para o cotidiano.',
        ],
      },
    },
  },
  whatIs: {
    title: 'O que você descobre',
    description:
      'Uma leitura objetiva do seu padrão comportamental e de como ele aparece na sua rotina.',
    supportText:
      'Você entende o que te move, onde você tende a exagerar e como ajustar sua comunicação e suas decisões.',
    highlight: 'Leitura comportamental aplicada: clareza para agir, não apenas para “se definir”.',
    bullets: [
      'Como você reage sob pressão',
      'Como você toma decisões',
      'Seu padrão emocional e comportamental',
      'O que tende a facilitar ou travar sua rotina',
    ],
  },
  audience: {
    title: 'Para quem é',
    description:
      'Para quem quer autoconhecimento aplicável, com clareza e próximos passos.',
    items: [
      'Pessoas em transição',
      'Quem busca autoconhecimento',
      'Quem quer melhorar relações e comunicação',
      'Quem quer decisões mais conscientes',
      'Quem quer mais clareza e direção',
      'Quem quer rotina com menos ruído interno',
    ],
  },
  offers: {
    title: 'O que a versão Personal oferece',
    description: 'Recursos essenciais para compreender seu comportamento e agir com mais segurança.',
    items: [
      {
        title: 'Perfil DISC estruturado',
        description: 'Leitura clara do seu padrão predominante e das combinações comportamentais.',
      },
      {
        title: 'Relatório claro e prático',
        description: 'Conteúdo objetivo, direto e fácil de aplicar no seu contexto.',
      },
      {
        title: 'Insights de comunicação',
        description: 'Entenda como você tende a se expressar e como gerar interações mais eficazes.',
      },
      {
        title: 'Pontos de atenção',
        description: 'Mapeamento de situações que podem gerar desgaste, conflitos ou decisões impulsivas.',
      },
      {
        title: 'Direcionamento de desenvolvimento',
        description: 'Sugestões práticas para evoluir com consistência.',
      },
      {
        title: 'Visual premium em tela e PDF',
        description: 'Acesso ao resultado em formato profissional para consulta sempre que necessário.',
      },
    ],
  },
  differentials: {
    title: 'Leitura acessível, sem superficialidade',
    description:
      'A versão Personal combina profundidade técnica com linguagem simples, para transformar dados comportamentais em entendimento real.',
    items: [
      'Relatório claro e de fácil interpretação',
      'Insights acionáveis desde o primeiro acesso',
      'Experiência de uso fluida em desktop e mobile',
      'Estrutura premium com foco em aplicabilidade',
    ],
  },
  workflow: {
    title: 'Do resultado à prática em poucos passos',
    description: 'Fluxo simples para sair da leitura e chegar em ações concretas de desenvolvimento pessoal.',
    steps: [
      {
        title: 'Você responde a avaliação',
        description: 'Preenchimento rápido com perguntas focadas em padrões de comportamento.',
      },
      {
        title: 'O sistema gera sua leitura',
        description: 'Seu perfil é organizado em uma estrutura visual clara e objetiva.',
      },
      {
        title: 'Você identifica seus principais padrões',
        description: 'Forças, riscos e estilo de comunicação ficam evidentes no relatório.',
      },
      {
        title: 'Recebe direcionamentos práticos',
        description: 'Sugestões de aplicação para rotina, relações e decisões do dia a dia.',
      },
      {
        title: 'Acompanha sua evolução',
        description: 'Use a leitura como base para desenvolvimento contínuo com mais consciência.',
      },
    ],
  },
  benefits: {
    title: 'Resultado',
    description: 'Clareza aplicável para reduzir dúvida, melhorar relações e agir com mais controle.',
    items: [
      {
        title: 'Clareza pessoal',
        description: 'Você entende seus padrões com linguagem simples e aplicável.',
      },
      {
        title: 'Menos dúvida',
        description: 'Você reduz indecisão ao entender como você decide e o que te influencia.',
      },
      {
        title: 'Mais controle',
        description: 'Você reconhece gatilhos e ajusta respostas em cenários de pressão.',
      },
      {
        title: 'Relações mais leves',
        description: 'Você ajusta comunicação e expectativas para reduzir atrito desnecessário.',
      },
      {
        title: 'Próximos passos',
        description: 'Você transforma leitura comportamental em ações práticas no dia a dia.',
      },
      {
        title: 'Consulta contínua',
        description: 'Um relatório claro para revisitar e acompanhar sua evolução.',
      },
    ],
  },
  finalCta: {
    layout: 'single-centered',
    title: 'Começar agora',
    description:
      'Ative o Personal e comece sua leitura comportamental com clareza e próximos passos.',
    primaryCta: {
      label: 'Começar agora',
      to: '/checkout/plan/personal',
      source: 'cta_checkout_personal',
    },
  },
};

export default function PersonalLandingPage() {
  return <ProductSegmentLandingBase {...PERSONAL_CONFIG} />;
}
