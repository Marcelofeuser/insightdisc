import ProductSegmentLandingBase from '@/pages/ProductSegmentLandingBase';

const PROFISSIONAL_CONFIG = {
  slug: 'profissional',
  metaTitle: 'InsightDISC Profissional: leitura comportamental aplicada ao trabalho',
  metaDescription:
    'Leitura comportamental aplicada ao ambiente profissional para melhorar comunicação, produtividade e relações de trabalho.',
  hero: {
    badge: 'Uso prático no trabalho',
    title: 'Entenda seu comportamento no ambiente profissional',
    titleHighlight: 'ambiente profissional',
    subtitle:
      'Uma leitura comportamental aplicada para melhorar comunicação, produtividade e relacionamento no trabalho.',
    primaryCta: {
      label: 'Ativar plano profissional',
      to: '/checkout/plan/professional',
      source: 'hero_checkout_profissional',
    },
    secondaryCta: {
      label: 'Ver como funciona na prática',
      to: '#como-funciona',
      source: 'hero_ver_analise_profissional',
    },
    panel: {
      eyebrow: 'Aplicação no trabalho',
      title: 'Leitura aplicada para evoluir no dia a dia',
      stats: [
        { label: 'Foco principal', value: 'Trabalho e performance' },
        { label: 'Formato', value: 'Leitura aplicada' },
      ],
      highlight: {
        label: 'Você melhora',
        value: 'Comunicação, produtividade e relacionamento em contextos reais do trabalho.',
      },
      secondaryEyebrow: 'Na prática',
      pillars: [
        'Comunicação',
        'Produtividade',
        'Relacionamento',
        'Decisão sob pressão',
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
    title: 'Leitura comportamental aplicada ao trabalho',
    description:
      'Entenda seu estilo de comunicação, decisão e execução quando o contexto é profissional.',
    supportText:
      'O objetivo é clareza prática: o que tende a funcionar para você, o que tende a gerar atrito e como ajustar com consistência.',
    highlight: 'Leitura aplicada: menos tentativa e erro, mais previsibilidade e evolução.',
    bullets: [
      'Comunicação no ambiente profissional',
      'Produtividade e estilo de execução',
      'Relacionamento e colaboração',
      'Decisão sob pressão e prazos curtos',
    ],
  },
  audience: {
    title: 'Para quem é',
    description:
      'Para quem quer aplicar leitura comportamental no trabalho com clareza e prática.',
    items: [
      'Profissionais em crescimento ou transição',
      'Lideranças em formação',
      'Especialistas que precisam comunicar melhor',
      'Quem busca mais consistência em decisões',
      'Quem quer reduzir atrito no trabalho',
      'Quem quer produtividade com menos desgaste',
    ],
  },
  offers: {
    title: 'O que você recebe',
    description: 'Uma leitura mais profunda e aplicada ao contexto profissional.',
    items: [
      {
        title: 'Leitura aprofundada do perfil',
        description: 'Entenda seu padrão predominante e combinações secundárias com clareza.',
      },
      {
        title: 'Aplicação no trabalho',
        description: 'Como seu perfil aparece em reuniões, prazos, conflitos e decisões.',
      },
      {
        title: 'Comunicação e colaboração',
        description: 'Ajustes práticos para reduzir ruído e aumentar alinhamento.',
      },
      {
        title: 'Produtividade',
        description: 'Como você tende a executar, onde trava e como criar rotinas mais fluídas.',
      },
      {
        title: 'Relatório premium (tela e PDF)',
        description: 'Material claro para revisitar e usar como base de desenvolvimento.',
      },
      {
        title: 'Direcionamento de evolução',
        description: 'Próximos passos objetivos para evoluir com consistência no trabalho.',
      },
    ],
  },
  differentials: {
    title: 'Aplicável e direto ao ponto',
    description:
      'Uma experiência premium pensada para uso real: clareza, aplicabilidade e evolução.',
    items: [
      'Leitura aplicada ao dia a dia do trabalho',
      'Insights acionáveis (não genéricos)',
      'Melhora de comunicação e produtividade',
      'Relatório premium para consulta',
    ],
  },
  workflow: {
    title: 'Como funciona',
    description: 'Um fluxo direto para entender seu perfil e aplicar no trabalho.',
    steps: [
      {
        title: 'Você responde a avaliação',
        description: 'Perguntas focadas em padrões de comportamento — sem linguagem confusa.',
      },
      {
        title: 'O sistema organiza sua leitura',
        description: 'Seu perfil fica claro em uma estrutura visual e objetiva.',
      },
      {
        title: 'Você aplica no contexto profissional',
        description: 'Comunicação, execução, decisão e colaboração em cenários reais.',
      },
      {
        title: 'Você ajusta com próximos passos',
        description: 'Direcionamentos práticos para reduzir atritos e aumentar consistência.',
      },
      {
        title: 'Você acompanha sua evolução',
        description: 'Use o relatório como referência contínua para desenvolvimento.',
      },
    ],
  },
  benefits: {
    title: 'Resultado',
    description: 'Comunicação melhor, produtividade mais fluída e menos ruído nas relações de trabalho.',
    items: [
      {
        title: 'Comunicação',
        description: 'Mais clareza para se expressar e alinhar expectativas.',
      },
      {
        title: 'Produtividade',
        description: 'Rotina com menos fricção e mais consistência na execução.',
      },
      {
        title: 'Relacionamento',
        description: 'Menos atrito recorrente e mais colaboração com pessoas diferentes.',
      },
      {
        title: 'Decisão sob pressão',
        description: 'Entenda como você decide em prazos curtos e como reduzir impulsividade.',
      },
      {
        title: 'Clareza de rotina',
        description: 'Reconheça gatilhos e ajuste respostas em cenários de cobrança.',
      },
      {
        title: 'Relatório premium',
        description: 'Material claro para revisitar e aplicar continuamente.',
      },
    ],
  },
  finalCta: {
    layout: 'single-centered',
    title: 'Ativar plano profissional',
    description:
      'Leve leitura comportamental para o trabalho com clareza e aplicação prática.',
    primaryCta: {
      label: 'Ativar plano profissional',
      to: '/checkout/plan/professional',
      source: 'cta_checkout_profissional',
    },
  },
};

export default function ProfissionalLandingPage() {
  return <ProductSegmentLandingBase {...PROFISSIONAL_CONFIG} />;
}
