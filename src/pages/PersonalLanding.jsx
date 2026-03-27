import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const PERSONAL_CONFIG = {
  slug: 'personal',
  metaTitle: 'InsightDISC Personal: autoconhecimento com clareza comportamental',
  metaDescription:
    'A experiência Personal do InsightDISC entrega leitura comportamental clara, prática e acessível para autoconhecimento e desenvolvimento pessoal.',
  hero: {
    badge: 'Experiência individual para autoconhecimento prático',
    title: 'InsightDISC Personal: clareza comportamental para evolução pessoal',
    subtitle:
      'Uma jornada simples e estruturada para entender seu perfil, melhorar sua comunicação e tomar decisões com mais consciência emocional.',
    primaryCta: {
      label: 'Fazer minha análise',
      to: '/avaliacoes',
      source: 'hero_fazer_minha_analise',
    },
    secondaryCta: {
      label: 'Descobrir meu perfil',
      to: '#como-funciona',
      source: 'hero_descobrir_meu_perfil',
    },
    panel: {
      eyebrow: 'Leitura pessoal guiada',
      title: 'Seu comportamento explicado de forma prática',
      stats: [
        { label: 'Foco principal', value: 'Autoconhecimento aplicado' },
        { label: 'Linguagem', value: 'Clara e acessível' },
      ],
      highlight: {
        label: 'Insight central',
        value: 'Entenda como você reage, comunica e decide em diferentes contextos.',
      },
      secondaryEyebrow: 'Você recebe',
      pillars: [
        'Leitura objetiva do perfil',
        'Pontos fortes e riscos',
        'Direcionamentos de evolução',
        'Relatório claro para consulta',
      ],
    },
  },
  whatIs: {
    title: 'Uma experiência DISC desenhada para quem quer se entender melhor',
    description:
      'O InsightDISC Personal organiza seu perfil comportamental em uma leitura simples, sem perder profundidade.',
    supportText:
      'Você visualiza seus padrões com clareza e transforma o resultado em ações práticas para rotina, relações e desenvolvimento pessoal.',
    highlight: 'Não é apenas um teste. É uma base prática para autoconhecimento contínuo.',
    bullets: [
      'Compreensão rápida do seu estilo comportamental',
      'Clareza sobre forças naturais e pontos de atenção',
      'Leitura acessível para uso no dia a dia',
      'Insights diretos para evolução pessoal',
    ],
  },
  audience: {
    title: 'Feito para pessoas que querem evoluir com direção',
    description:
      'Ideal para quem busca autoconhecimento com estrutura, sem linguagem excessivamente técnica.',
    items: [
      'Pessoas em transição de carreira',
      'Profissionais que querem se comunicar melhor',
      'Quem busca clareza emocional e comportamental',
      'Estudantes e jovens profissionais',
      'Pessoas em processo de desenvolvimento pessoal',
      'Quem quer decisões mais conscientes no cotidiano',
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
    description: 'Fluxo simples para sair do teste e chegar em ações concretas de desenvolvimento pessoal.',
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
    title: 'Benefícios reais para seu dia a dia',
    description: 'Mais clareza pessoal, melhor comunicação e decisões mais alinhadas ao seu perfil.',
    items: [
      {
        title: 'Autoconhecimento com direção',
        description: 'Entenda padrões que influenciam suas escolhas e relações.',
      },
      {
        title: 'Clareza emocional',
        description: 'Reconheça gatilhos e respostas comportamentais em cenários de pressão.',
      },
      {
        title: 'Comunicação mais efetiva',
        description: 'Ajuste sua forma de se expressar para gerar conexões melhores.',
      },
      {
        title: 'Decisões mais conscientes',
        description: 'Reduza impulsividade e aumente consistência nas suas escolhas.',
      },
      {
        title: 'Plano de evolução pessoal',
        description: 'Transforme leitura comportamental em ações práticas de melhoria.',
      },
      {
        title: 'Experiência premium e intuitiva',
        description: 'Visual sofisticado e linguagem clara para uso contínuo.',
      },
    ],
  },
  finalCta: {
    title: 'Comece hoje sua leitura comportamental com clareza e aplicabilidade real.',
    description:
      'Use o InsightDISC Personal para transformar percepção em ação e evoluir com mais segurança no seu ritmo.',
    primaryCta: {
      label: 'Fazer minha análise',
      to: '/avaliacoes',
      source: 'cta_fazer_minha_analise',
    },
    secondaryCta: {
      label: 'Descobrir meu perfil',
      to: '#o-que-e',
      source: 'cta_descobrir_meu_perfil',
    },
  },
};

export default function PersonalLandingPage() {
  return <ProductSegmentLandingBase {...PERSONAL_CONFIG} />;
}

