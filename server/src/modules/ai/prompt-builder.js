import { AI_DISC_TONES } from './schema.js';

const MODE_INSTRUCTIONS = {
  personal: [
    'Tom humano, direto, acessível e focado em autoconhecimento.',
    'Evite jargão executivo ou linguagem excessivamente corporativa.',
    'Traga recomendações práticas para rotina, relações e crescimento pessoal.',
    'Priorize contexto de vida pessoal, relações, rotina, autoconsciência e escolhas do dia a dia.',
    'Conecte traços comportamentais com impacto prático em convivência, energia, disciplina e tomada de consciência.',
  ],
  professional: [
    'Tom profissional, direto e útil para trabalho, carreira, comunicação e liderança.',
    'Foque em contexto de trabalho, colaboração, posicionamento e desenvolvimento.',
    'Mantenha objetividade, sem clichês e sem frases genéricas.',
    'Priorize ambiente de trabalho, colaboração, entregas, influência, posicionamento profissional e desenvolvimento de carreira.',
    'Conecte comportamento com impacto prático em performance, relacionamento com pares, gestão e execução.',
  ],
  business: [
    'Tom executivo, estratégico, organizacional e orientado a gestão.',
    'Foque em liderança, decisão, influência, produtividade e recomendações corporativas.',
    'Mantenha leitura premium, direta, sem clichês, sem frases genéricas e sem exagerar certezas ou promessas causais.',
    'Priorize estratégia, liderança, decisão, risco, alinhamento organizacional e consequência de negócio.',
    'Conecte comportamento com impacto prático em gestão, velocidade decisória, governança, influência e execução estratégica.',
  ],
};

function escPromptValue(value = '') {
  return String(value || '').trim() || '-';
}

export function buildDiscInsightsPrompt(payload = {}, options = {}) {
  const mode = AI_DISC_TONES.includes(payload.mode) ? payload.mode : 'business';
  const modeInstructions = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.business;
  const strictJsonRetry = options.strictJsonRetry === true;

  const systemInstruction = [
    'Você é um especialista sênior em interpretação comportamental DISC para a plataforma InsightDISC.',
    'Sua tarefa é gerar conteúdo premium, útil e seguro.',
    'Você deve escrever como um consultor experiente, não como um assistente genérico.',
    'Evite conteúdo genérico ou aplicável a qualquer pessoa.',
    'Traga sempre impacto prático do comportamento.',
    'Conecte comportamento → consequência.',
    'Evite repetição de ideias com palavras diferentes.',
    'Prefira densidade de informação ao invés de volume.',
    'Retorne apenas JSON válido, sem markdown, sem comentários e sem texto fora do objeto JSON.',
    'Não use code fences, não explique o conteúdo e não escreva nenhuma frase antes ou depois do JSON.',
    'Retorne exatamente um único objeto JSON.',
    'Todas as strings precisam ser strings JSON válidas, com aspas duplas e escapes corretos.',
    'Não produza diagnóstico clínico, psicológico ou psiquiátrico.',
    'Não trate DISC como ciência determinística; use linguagem prudente, comportamental e aplicada.',
    'Evite repetição, exagero, clichês e afirmações absolutas.',
    'Escreva em português do Brasil.',
    strictJsonRetry
      ? 'Sua resposta anterior foi inválida. Corrija e retorne somente um objeto JSON minificado, válido e completo.'
      : '',
  ].join(' ');

  const schemaDescription = `{
  "summary": "string",
  "executiveSummary": "string",
  "strengths": ["string"],
  "limitations": ["string"],
  "communicationStyle": "string",
  "leadershipStyle": "string",
  "decisionMaking": "string",
  "workStyle": "string",
  "pressureBehavior": "string",
  "riskProfile": "string",
  "relationshipStyle": "string",
  "developmentRecommendations": ["string"],
  "careerRecommendations": ["string"],
  "businessRecommendations": ["string"],
  "professionalPositioning": "string",
  "strategicProfile": "string",
  "tone": "personal|professional|business"
}`;

  const userPrompt = [
    strictJsonRetry
      ? 'Sua resposta anterior foi inválida como JSON. Retorne AGORA somente um único objeto JSON minificado e válido.'
      : 'Gere uma interpretação DISC estruturada para o perfil abaixo.',
    '',
    'Contexto do avaliado:',
    `- modo: ${escPromptValue(mode)}`,
    `- nome: ${escPromptValue(payload.nome)}`,
    `- cargo: ${escPromptValue(payload.cargo)}`,
    `- empresa: ${escPromptValue(payload.empresa)}`,
    `- código do perfil: ${escPromptValue(payload.profileCode)}`,
    `- nome do perfil: ${escPromptValue(payload.profileName)}`,
    `- D: ${escPromptValue(payload?.scores?.D)}`,
    `- I: ${escPromptValue(payload?.scores?.I)}`,
    `- S: ${escPromptValue(payload?.scores?.S)}`,
    `- C: ${escPromptValue(payload?.scores?.C)}`,
    '',
    'Regras de tom e foco para este modo:',
    ...modeInstructions.map((instruction) => `- ${instruction}`),
    '',
    'Regras obrigatórias de segurança e qualidade:',
    '- Mantenha a análise grounded, aplicada e comportamental.',
    '- Não patologize traços nem invente riscos clínicos.',
    '- Não use termos como transtorno, distúrbio, doença, laudo, patologia ou similar.',
    '- Quando houver risco ou limitação, descreva como ponto de atenção comportamental.',
    '- Gere conteúdo conciso, premium, diferente entre modos e sem frases genéricas repetidas.',
    '- Use linguagem profissional, direta e de valor prático.',
    '- Use linguagem profissional, direta e de valor prático.',
    '- Não use markdown, bullets fora do JSON, comentários, prefixos, sufixos ou observações extras.',
    '- Não envolva o JSON em ```json, aspas triplas ou qualquer bloco de código.',
    '- Retorne um único objeto JSON completo; não retorne array, múltiplos objetos ou texto solto.',
    '- Em modo personal, businessRecommendations ainda devem existir, mas podem ser leves e aplicadas a decisões ou contexto de vida/trabalho, sem obrigar linguagem corporativa.',
    '- Em modo professional, businessRecommendations podem focar atuação, gestão de stakeholders e impacto profissional.',
    '- Em modo business, businessRecommendations devem ser estratégicas e organizacionais.',
    '',
    'Regras avançadas de qualidade:',
    '- Cada parágrafo deve trazer insight real.',
    '- Evite frases genéricas.',
    '- Explique impacto prático.',
    '- Evite repetição.',
    '- Escreva como relatório premium pago.',
    '- Escreva como um consultor experiente, não como um assistente genérico.',
    '- Evite conteúdo genérico ou aplicável a qualquer pessoa.',
    '- Traga sempre impacto prático do comportamento.',
    '- Conecte comportamento → consequência.',
    '- Prefira densidade de informação ao invés de volume.',
    '',
    'Reforço de contexto por modo:',
    '- PERSONAL: vida pessoal, relações, rotina, autoconhecimento e escolhas práticas.',
    '- PROFESSIONAL: ambiente de trabalho, colaboração, carreira, comunicação, posicionamento e execução.',
    '- BUSINESS: estratégia, liderança, decisão, risco, influência e consequência organizacional.',
    '',
    'Estrutura obrigatória do JSON:',
    schemaDescription,
    '',
    'Restrições adicionais por campo:',
    '- summary: resumo principal do perfil, 1 parágrafo conciso e denso.',
    '- executiveSummary: leitura final mais conclusiva, ainda compatível com o modo.',
    '- strengths: 3 a 6 forças comportamentais práticas.',
    '- limitations: 3 a 6 fraquezas ou riscos comportamentais práticos, sem linguagem patologizante.',
    '- communicationStyle e workStyle: texto aplicado e observável, sem abstração genérica.',
    '- Em modo business, decisionMaking, riskProfile e strategicProfile devem trazer profundidade executiva real.',
    '- developmentRecommendations, careerRecommendations e businessRecommendations: 3 a 6 itens cada.',
    '- tone deve refletir exatamente o modo recebido.',
    '',
    strictJsonRetry
      ? 'Retorne somente um objeto JSON minificado, válido e completo.'
      : 'Retorne somente o JSON final.',
  ].join('\n');

  return {
    mode,
    strictJsonRetry,
    systemInstruction,
    userPrompt,
  };
}
