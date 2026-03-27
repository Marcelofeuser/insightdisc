// IA Coach DISC: resposta dinâmica mockada

/**
 * Gera resposta de coach DISC baseada em IA (mock ou integração futura)
 * @param {Object} params
 * @param {string} params.profile Perfil DISC (ex: DI, SC, etc)
 * @param {string} params.question Pergunta do usuário
 * @param {Object} params.context Contexto adicional (opcional)
 * @returns {Promise<{response: string, recommendedActions: string[]}>}
 */
export async function generateCoachResponse({ profile, question, context }) {
  // Prompt IA (mock)
  // Futuro: integrar com endpoint real de IA
  const prompt = `Você é um especialista em comportamento humano baseado em DISC.\nPerfil: ${profile}\nPergunta: ${question}\nResponda com:\n- 1 explicação direta (máx 2 linhas)\n- 3 ações práticas aplicáveis\nEvite teoria. Seja direto, profissional e acionável.`;

  // Mock de resposta dinâmica
  return {
    response: `Perfil ${profile}: ${question} → Foque em comunicação clara, acordos objetivos e ações práticas.`,
    recommendedActions: [
      'Defina um objetivo claro para a situação.',
      'Estabeleça um acordo de acompanhamento semanal.',
      'Dê feedback imediato e específico após cada ação.',
    ],
  };
}
