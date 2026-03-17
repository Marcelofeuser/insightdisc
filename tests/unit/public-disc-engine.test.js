import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContext,
  generateFinalHtml,
} from '../../public/relatorio_teste/disc_engine.js';

function countMatches(input, pattern) {
  return (input.match(pattern) || []).length;
}

test('disc_engine injeta texto da IA no relatório business sem alterar a quantidade de slides', () => {
  const baseContext = buildContext({
    mode: 'business',
    d: 34,
    i: 32,
    s: 23,
    c: 11,
    nome: 'João Silva',
    cargo: 'Gerente Comercial',
    empresa: 'Empresa XYZ',
  });

  const htmlDefault = generateFinalHtml(baseContext);
  const htmlWithAi = generateFinalHtml({
    ...baseContext,
    ai: {
      requested: true,
      enabled: true,
      rawContent: {
        summary:
          'A síntese gerada pela IA destaca um perfil que acelera decisões, influencia interlocutores com energia e responde melhor quando converte impulso em direção clara.',
        executiveSummary:
          'A visão executiva da IA aponta um profissional que produz tração comercial e liderança visível quando combina velocidade com checkpoints de qualidade e alinhamento.',
        strengths: [
          'Conduz prioridades com energia e clareza.',
          'Move stakeholders com argumentação objetiva.',
          'Cria senso de direção em cenários ambíguos.',
          'Sustenta ritmo alto quando o contexto exige avanço.',
        ],
        limitations: [
          'Pode avançar rápido demais sem capturar nuances operacionais.',
          'Corre o risco de encurtar a escuta sob pressão elevada.',
        ],
        communicationStyle:
          'A comunicação tende a ser direta, mobilizadora e orientada a próximo passo, com melhor resultado quando o interlocutor recebe contexto e critério ao mesmo tempo.',
        leadershipStyle:
          'A liderança aparece com direção clara, senso de urgência e forte poder de engajamento, ganhando escala quando abre espaço para contraditório qualificado.',
        workStyle:
          'No trabalho em equipe, assume a frente com naturalidade, organiza o ritmo do grupo e entrega mais quando distribui autonomia com acordos explícitos.',
        pressureBehavior:
          'Sob pressão, intensifica controle, acelera a cadência e cobra resposta rápida; o ganho está em pausar para recalibrar escuta e priorização.',
        relationshipStyle:
          'Nas relações, tende a ser percebido como confiável, intenso e mobilizador, desde que ajuste o tom ao ritmo de cada interlocutor.',
        developmentRecommendations: [
          'Criar checkpoints curtos para escuta antes das decisões críticas.',
          'Transformar feedback em ajuste visível de ritmo e priorização.',
        ],
        careerRecommendations: [
          'Atuar em contextos com mandato claro para liderar crescimento e transformação.',
          'Buscar posições onde influência comercial e execução estratégica caminhem juntas.',
          'Combinar protagonismo com rituais de alinhamento transversal.',
          'Escolher ambientes com autonomia, metas altas e governança objetiva.',
        ],
        businessRecommendations: [
          'Definir rituais de alinhamento para sustentar velocidade sem perder coordenação.',
          'Traduzir ambição em cadência simples de execução e acompanhamento.',
          'Usar times complementares para equilibrar impulso, consistência e detalhe.',
          'Preservar clareza de decisão mesmo em ciclos de pressão contínua.',
        ],
        professionalPositioning:
          'O posicionamento profissional ganha força quando a energia de execução é percebida como direção confiável, não apenas como aceleração.',
        tone: 'business',
      },
      content: {},
    },
  });

  assert.equal(countMatches(htmlDefault, /<div class="slide"/g), countMatches(htmlWithAi, /<div class="slide"/g));
  assert.equal(countMatches(htmlDefault, /<div class="pgn">/g), countMatches(htmlWithAi, /<div class="pgn">/g));
  assert.match(htmlWithAi, /A síntese gerada pela IA destaca um perfil que acelera decisões/);
  assert.match(htmlWithAi, /A visão executiva da IA aponta um profissional/);
  assert.match(htmlWithAi, /Conduz prioridades com energia e clareza\./);
  assert.match(htmlWithAi, /Definir rituais de alinhamento para sustentar velocidade/);
  assert.doesNotMatch(
    htmlWithAi,
    /O perfil apresenta predominância em Dominância e Influência\. Forte iniciativa, persuasão e facilidade para assumir liderança/,
  );
});
