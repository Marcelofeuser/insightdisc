import { AI_DISC_TONES } from './schema.js';

const MODE_INSTRUCTIONS = {
  personal: [
    'Tom humano, reflexivo, acessível e focado em autoconhecimento.',
    'Evite jargão executivo ou linguagem excessivamente corporativa.',
    'Traga recomendações práticas para rotina, relações e crescimento pessoal.',
  ],
  professional: [
    'Tom profissional, claro e útil para trabalho, carreira, comunicação e liderança.',
    'Foque em contexto de trabalho, colaboração, posicionamento e desenvolvimento.',
    'Mantenha objetividade, sem perder sofisticação interpretativa.',
  ],
  business: [
    'Tom executivo, estratégico, organizacional e orientado a gestão.',
    'Foque em liderança, decisão, influência, produtividade e recomendações corporativas.',
    'Mantenha leitura premium, sem exagerar certezas ou promessas causais.',
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
  "workStyle": "string",
  "pressureBehavior": "string",
  "relationshipStyle": "string",
  "developmentRecommendations": ["string"],
  "careerRecommendations": ["string"],
  "businessRecommendations": ["string"],
  "professionalPositioning": "string",
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
    '- Não use markdown, bullets fora do JSON, comentários, prefixos, sufixos ou observações extras.',
    '- Não envolva o JSON em ```json, aspas triplas ou qualquer bloco de código.',
    '- Retorne um único objeto JSON completo; não retorne array, múltiplos objetos ou texto solto.',
    '- Em modo personal, businessRecommendations ainda devem existir, mas podem ser leves e aplicadas a decisões ou contexto de vida/trabalho, sem obrigar linguagem corporativa.',
    '- Em modo professional, businessRecommendations podem focar atuação, gestão de stakeholders e impacto profissional.',
    '- Em modo business, businessRecommendations devem ser estratégicas e organizacionais.',
    '',
    'Estrutura obrigatória do JSON:',
    schemaDescription,
    '',
    'Restrições adicionais por campo:',
    '- summary: resumo principal do perfil, 1 parágrafo conciso e denso.',
    '- executiveSummary: leitura final mais conclusiva, ainda compatível com o modo.',
    '- strengths: 3 a 6 forças comportamentais práticas.',
    '- limitations: 3 a 6 limitações ou riscos comportamentais práticos.',
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
