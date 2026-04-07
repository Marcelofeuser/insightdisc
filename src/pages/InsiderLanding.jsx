import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const INSIDER_CONFIG = {
  slug: 'insider',
  metaTitle: 'InsightDISC Insider: mais recursos e profundidade na leitura comportamental',
  metaDescription:
    'Para usuários que desejam mais controle, análise e profundidade na utilização do DISC com uma experiência mais estratégica.',
  hero: {
    badge: 'Plano com mais profundidade e recursos',
    title: 'Plano Insider — Mais recursos e profundidade',
    titleHighlight: 'Mais recursos e profundidade',
    subtitle:
      'Para usuários que desejam mais controle, análise e profundidade na utilização do DISC.',
    primaryCta: {
      label: 'Assinar Insider',
      to: '/checkout/plan/insider',
      source: 'hero_checkout_insider',
    },
    secondaryCta: {
      label: 'Ver planos',
      to: '/planos',
      source: 'hero_ver_planos',
    },
    panel: {
      eyebrow: 'Uso avançado individual',
      title: 'Mais profundidade, com leitura mais estratégica',
      stats: [
        { label: 'Assinatura mensal', value: 'R$ 129,90' },
        { label: 'Nível', value: 'Profundidade e análise' },
      ],
      highlight: {
        label: 'Resumo financeiro',
        value: 'Total hoje: R$ 129,90 • Próximas cobranças: R$ 129,90/mês',
      },
      secondaryEyebrow: 'Você desbloqueia',
      pillars: [
        'Recursos avançados de análise',
        'Visualizações mais claras',
        'Uso mais estratégico',
        'Evolução comportamental',
      ],
    },
  },
  visualShowcase: {
    eyebrow: 'Leitura avançada',
    title: 'Mais profundidade para uso recorrente do DISC',
    description:
      'Uma experiência mais analítica para acompanhar evolução, comparar perfis e extrair insights mais claros — sem entrar em uma operação profissional ou empresarial.',
    variant: 'profissional',
    content: {
      radar: {
        title: 'Radar DISC aprofundado',
        subtitle: 'Intensidade comportamental por fator (exemplo)',
        values: { D: 68, I: 72, S: 54, C: 77 },
      },
      bars: {
        title: 'Comparação rápida',
        values: { D: 68, I: 72, S: 54, C: 77 },
      },
      technical: {
        title: 'Insights com mais profundidade',
        bullets: [
          'Leitura mais estratégica do padrão comportamental.',
          'Comparação entre avaliações para acompanhar evolução.',
          'Recomendações mais claras para aplicação no dia a dia.',
          'Visualizações melhores para tomada de decisão pessoal.',
        ],
      },
      preview: {
        title: 'Preview da experiência Insider',
        badge: 'Mais profundidade',
        lines: [
          'Recursos avançados de análise',
          'Melhor visualização de dados comportamentais',
          'Uso mais estratégico da plataforma',
          'Histórico e evolução comportamental ao longo do tempo',
        ],
      },
    },
  },
  whatIs: {
    title: 'Mais profundidade para quem quer usar o DISC de forma recorrente',
    description:
      'O plano Insider foi criado para quem deseja uma experiência mais completa dentro da plataforma, com maior profundidade de análise e melhor aproveitamento dos recursos disponíveis.',
    supportText:
      'O Insider é ideal para quem quer ir além do uso básico, com uma experiência mais estratégica, mais analítica e com melhor aproveitamento da plataforma no dia a dia.',
    highlight:
      'Mais clareza para decidir e evoluir com consistência — com apoio de IA e comparação de perfis, sem competir com uma estrutura corporativa premium.',
    bullets: [
      'Recursos avançados de análise',
      'Melhor visualização de dados comportamentais',
      'Uso mais estratégico da plataforma',
      'Ideal para quem já utiliza DISC com frequência',
    ],
  },
  audience: {
    title: 'Para quem quer evoluir além do uso básico',
    description:
      'Uma camada mais robusta para usuários recorrentes que querem mais clareza, mais análise e mais estratégia na leitura comportamental.',
    items: [
      'Usuários recorrentes da plataforma',
      'Profissionais que valorizam mais profundidade',
      'Quem deseja analisar com mais clareza',
      'Quem quer usar o DISC com mais estratégia',
      'Quem quer acompanhar evolução comportamental',
      'Quem busca uma experiência mais analítica com IA',
    ],
  },
  offers: {
    title: 'Uma camada mais robusta de uso e leitura',
    description:
      'Recursos avançados para aprofundar sua leitura comportamental e usar a plataforma com mais estratégia no dia a dia.',
    items: [
      {
        title: 'Recursos avançados de análise',
        description: 'Mais ferramentas para interpretar padrões e entender nuances do comportamento.',
      },
      {
        title: 'Visualização aprimorada de dados',
        description: 'Melhor leitura visual para reduzir ruído e aumentar clareza nas decisões.',
      },
      {
        title: 'Experiência mais estratégica',
        description: 'Use o DISC com mais intenção, acompanhando evolução e ajustando ações com consistência.',
      },
      {
        title: 'Uso contínuo com mais profundidade',
        description: 'Uma assinatura mensal para evoluir e consultar seu histórico sempre que precisar.',
      },
      {
        title: 'Comparação de perfis e evolução',
        description: 'Compare avaliações e acompanhe mudanças comportamentais ao longo do tempo.',
      },
      {
        title: 'IA para aprofundar insights',
        description: 'Apoio de IA para recomendações e leitura mais profunda (sem virar um plano corporativo).',
      },
    ],
  },
  differentials: {
    title: 'Mais clareza, mais profundidade, mais estratégia',
    description:
      'O Insider entrega uma experiência mais madura para quem já entende o valor do DISC e quer extrair mais da plataforma, sem ainda entrar em uma estrutura profissional ou empresarial.',
    items: [
      'Mais profundidade com IA para insights e recomendações',
      'Comparação entre avaliações para acompanhar evolução',
      'Visualizações mais claras para reduzir subjetividade',
      'Uso recorrente com histórico e contexto',
    ],
  },
  workflow: {
    title: 'Como funciona na prática',
    description: 'Ative o plano, gere suas leituras e acompanhe evolução com mais clareza e consistência.',
    steps: [
      {
        title: 'Ative o Insider',
        description: 'Escolha a assinatura mensal e destrave a camada avançada de análise e leitura.',
      },
      {
        title: 'Gere e acompanhe relatórios',
        description: 'Use o DISC de forma recorrente e consulte seu histórico sempre que precisar.',
      },
      {
        title: 'Compare perfis e evolução',
        description: 'Acompanhe mudanças e padrões ao longo do tempo para decisões mais conscientes.',
      },
      {
        title: 'Aprofunde insights com IA',
        description: 'Use recomendações e leitura aprofundada para evoluir com mais estratégia.',
      },
      {
        title: 'Aplique no dia a dia',
        description: 'Transforme leitura comportamental em ações práticas para rotina, decisões e relações.',
      },
    ],
  },
  benefits: {
    title: 'Benefícios práticos para uso recorrente',
    description:
      'Uma experiência mais profunda e analítica para quem já usa o DISC com frequência e quer extrair mais valor.',
    items: [
      {
        title: 'Mais clareza nas decisões',
        description: 'Menos ruído e mais previsibilidade no seu padrão de resposta e tomada de decisão.',
      },
      {
        title: 'Evolução comportamental acompanhável',
        description: 'Histórico e comparação para entender mudanças e ajustar com consistência.',
      },
      {
        title: 'Leitura mais estratégica com IA',
        description: 'Aprofunde recomendações e insights sem precisar migrar para uma operação corporativa.',
      },
      {
        title: 'Uso recorrente sem complexidade',
        description: 'A evolução natural para quem quer ir além do básico, mantendo o uso simples e direto.',
      },
      {
        title: 'Resumo financeiro claro',
        description: 'Assinatura mensal: R$ 129,90 • Total hoje: R$ 129,90 • Próximas cobranças: R$ 129,90/mês.',
      },
      {
        title: 'Pronto para o próximo nível',
        description: 'Quando você precisar de créditos e operação profissional, o caminho de evolução é natural.',
      },
    ],
  },
  finalCta: {
    layout: 'single-centered',
    title: 'Ative o Insider e aprofunde sua leitura comportamental',
    description:
      'Se você quer mais profundidade, melhor análise e uma experiência mais estratégica, o Insider é a evolução natural.',
    primaryCta: {
      label: 'Assinar Insider',
      to: '/checkout/plan/insider',
      source: 'final_checkout_insider',
    },
    secondaryCta: {
      label: 'Ver planos',
      to: '/planos',
      source: 'final_ver_planos',
    },
  },
};

export default function InsiderLanding() {
  return <ProductSegmentLandingBase {...INSIDER_CONFIG} />;
}

