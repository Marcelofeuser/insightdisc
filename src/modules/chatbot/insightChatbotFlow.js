export const insightChatbotFlow = {
  chatbot: {
    id: 'insightdisc-prechat',
    name: 'Assistente InsightDISC',
    version: '1.0.0',
    settings: {
      whatsappUrl:
        'https://wa.me/5562994090276?text=Olá%20quero%20saber%20mais%20sobre%20o%20InsightDISC',
      leadCaptureEnabled: true,
      showOnAllPages: true,
      storageKey: 'insightdisc_chatbot_session',
      startNode: 'welcome',
    },
    nodes: {
      welcome: {
        type: 'message',
        message:
          'Olá 👋 Sou o assistente do InsightDISC. Posso te ajudar a entender como funciona a análise comportamental DISC e como a plataforma pode ajudar você ou sua empresa. Como posso ajudar?',
        options: [
          { label: 'O que é DISC', next: 'what_is_disc' },
          { label: 'Como funciona o teste', next: 'how_test_works' },
          { label: 'Quero fazer o teste', next: 'start_test' },
          { label: 'Ver exemplo de relatório', next: 'report_example' },
          { label: 'Usar DISC na minha empresa', next: 'for_companies' },
          { label: 'Preços e planos', next: 'pricing' },
          { label: 'Falar com atendimento', next: 'contact' },
        ],
      },
      what_is_disc: {
        type: 'message',
        message:
          'O DISC é um modelo de análise comportamental que identifica quatro estilos principais de comportamento: D — Dominância, I — Influência, S — Estabilidade e C — Conformidade. A análise ajuda pessoas e empresas a entender melhor como cada pessoa pensa, decide e se comunica.',
        options: [
          { label: 'Como funciona o teste', next: 'how_test_works' },
          { label: 'Ver relatório exemplo', next: 'report_example' },
          { label: 'Usar DISC em empresas', next: 'for_companies' },
          { label: 'Fazer teste agora', next: 'start_test' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      how_test_works: {
        type: 'message',
        message:
          'O teste DISC do InsightDISC é um questionário estruturado que avalia padrões de comportamento. O processo é simples: 1) você responde o questionário, 2) o sistema analisa o perfil comportamental, 3) é gerado um relatório detalhado automaticamente. O teste leva em média 8 a 10 minutos.',
        options: [
          { label: 'Iniciar teste', action: 'navigate', to: '/StartFree' },
          { label: 'Ver relatório exemplo', next: 'report_example' },
          { label: 'Para que serve', next: 'disc_uses' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      disc_uses: {
        type: 'message',
        message:
          'A análise DISC é utilizada para desenvolvimento pessoal, liderança, recrutamento e seleção, gestão de equipes, melhoria de comunicação e autoconhecimento. Muitas empresas usam DISC para formar equipes mais eficientes e identificar talentos.',
        options: [
          { label: 'Usar DISC em empresas', next: 'for_companies' },
          { label: 'Fazer teste', next: 'start_test' },
          { label: 'Ver relatório', next: 'report_example' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      report_example: {
        type: 'message',
        message:
          'O relatório do InsightDISC apresenta gráfico DISC, perfil predominante, pontos fortes, pontos de atenção, estilo de comunicação, estilo de liderança, ambiente ideal de trabalho e recomendações de desenvolvimento.',
        options: [
          { label: 'Abrir relatório demo', action: 'navigate', to: '/r/demo' },
          { label: 'Fazer teste', action: 'navigate', to: '/StartFree' },
          { label: 'Usar DISC na empresa', next: 'for_companies' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      start_test: {
        type: 'message',
        message:
          'Você pode iniciar uma avaliação DISC agora mesmo. O teste leva cerca de 10 minutos e ao final você recebe um relatório com seu perfil comportamental.',
        options: [
          { label: 'Iniciar teste', action: 'navigate', to: '/StartFree' },
          { label: 'Ver exemplo de relatório', next: 'report_example' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      for_companies: {
        type: 'message',
        message:
          'O InsightDISC é utilizado por empresas para recrutamento e seleção, desenvolvimento de líderes, avaliação de equipes, melhoria da comunicação interna e identificação de perfis comportamentais. A plataforma permite aplicar avaliações em colaboradores e candidatos e gerar relatórios profissionais automaticamente.',
        options: [
          { label: 'Plano corporativo', next: 'corporate_plan' },
          { label: 'Aplicar DISC em candidatos', next: 'recruitment' },
          { label: 'Falar com especialista', next: 'lead_capture_company' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      recruitment: {
        type: 'message',
        message:
          'Muitas empresas utilizam DISC para melhorar processos seletivos. A análise comportamental ajuda a entender se o perfil do candidato está alinhado com a vaga e com a cultura da empresa, reduzindo erros de contratação.',
        options: [
          { label: 'Ver solução para RH', next: 'lead_capture_company' },
          { label: 'Falar com especialista', next: 'lead_capture_company' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      corporate_plan: {
        type: 'message',
        message:
          'O plano corporativo é ideal para empresas que desejam aplicar DISC em times, candidatos e lideranças, com relatórios profissionais, visão comparativa e possibilidade white-label.',
        options: [
          { label: 'Capturar meus dados', next: 'lead_capture_company' },
          { label: 'Ver planos', action: 'navigate', to: '/Pricing' },
          { label: 'WhatsApp', action: 'whatsapp' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      pricing: {
        type: 'message',
        message:
          'O InsightDISC possui opções para uso individual, profissional e corporativo. Posso te mostrar os planos ou te direcionar para nosso atendimento.',
        options: [
          { label: 'Ver planos', action: 'navigate', to: '/Pricing' },
          { label: 'Capturar meus dados', next: 'lead_capture_general' },
          { label: 'Falar com atendimento', next: 'contact' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      contact: {
        type: 'message',
        message:
          'Perfeito. Posso te encaminhar para nosso WhatsApp ou registrar seus dados para retorno.',
        options: [
          { label: 'Abrir WhatsApp', action: 'whatsapp' },
          { label: 'Deixar meus dados', next: 'lead_capture_general' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      lead_capture_general: {
        type: 'lead_form',
        title: 'Antes de continuar, deixe seus dados',
        fields: [
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'email', label: 'E-mail', type: 'email', required: true },
          { name: 'company', label: 'Empresa', type: 'text', required: false },
          { name: 'goal', label: 'Objetivo', type: 'textarea', required: false },
        ],
        onSubmitNext: 'lead_capture_general_success',
      },
      lead_capture_general_success: {
        type: 'message',
        message:
          'Perfeito. Seus dados foram registrados. Agora posso te levar para os planos ou para o WhatsApp.',
        options: [
          { label: 'Ver planos', action: 'navigate', to: '/Pricing' },
          { label: 'Abrir WhatsApp', action: 'whatsapp' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
      lead_capture_company: {
        type: 'lead_form',
        title: 'Vamos entender sua empresa',
        fields: [
          { name: 'name', label: 'Nome', type: 'text', required: true },
          { name: 'email', label: 'E-mail', type: 'email', required: true },
          { name: 'company', label: 'Empresa', type: 'text', required: true },
          {
            name: 'teamSize',
            label: 'Tamanho da equipe',
            type: 'select',
            required: false,
            options: ['1-10', '11-50', '51-200', '200+'],
          },
          {
            name: 'goal',
            label: 'O que você quer resolver?',
            type: 'textarea',
            required: false,
          },
        ],
        onSubmitNext: 'lead_capture_company_success',
      },
      lead_capture_company_success: {
        type: 'message',
        message:
          'Perfeito. Registramos seu interesse corporativo. Agora posso te levar para o WhatsApp ou para a página de planos.',
        options: [
          { label: 'Abrir WhatsApp', action: 'whatsapp' },
          { label: 'Ver planos', action: 'navigate', to: '/Pricing' },
          { label: 'Voltar ao início', next: 'welcome' },
        ],
      },
    },
  },
};

export default insightChatbotFlow;
