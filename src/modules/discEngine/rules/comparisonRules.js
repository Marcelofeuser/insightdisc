import { DISC_FACTORS, FACTOR_LABELS, clamp } from '../constants.js';
import { normalizeDiscScores } from '../builders/scoreResolver.js';

export function buildComparisonLayer(scores = {}, comparisonScores = null) {
  const base = {
    adaptationNotes: [],
    attentionPoints: [],
    developmentRecommendations: [],
    deltas: null,
  };

  const comparison = normalizeDiscScores(comparisonScores);
  if (!comparison.hasValidInput) {
    return base;
  }

  const current = normalizeDiscScores(scores);
  const deltas = DISC_FACTORS.reduce((acc, factor) => {
    acc[factor] = Math.round((clamp(current.normalized[factor]) - clamp(comparison.normalized[factor])) * 10) / 10;
    return acc;
  }, {});

  base.deltas = deltas;

  DISC_FACTORS.forEach((factor) => {
    const delta = deltas[factor];
    if (Math.abs(delta) < 10) return;

    if (delta > 0) {
      base.adaptationNotes.push(
        `${FACTOR_LABELS[factor]} aumentou ${delta.toFixed(1)} pontos em relação ao contexto comparativo informado.`
      );
    } else {
      base.adaptationNotes.push(
        `${FACTOR_LABELS[factor]} reduziu ${Math.abs(delta).toFixed(1)} pontos frente ao contexto comparativo informado.`
      );
    }
  });

  if ((deltas.D || 0) > 10 && (deltas.S || 0) < -10) {
    base.attentionPoints.push('No comparativo atual, houve aceleração de decisão com menor paciência para ritmos extensos.');
    base.developmentRecommendations.push('Reforçar rituais de alinhamento para evitar queda de adesão em mudanças rápidas.');
  }

  if ((deltas.C || 0) > 10 && (deltas.I || 0) < -10) {
    base.attentionPoints.push('A leitura comparativa indica maior rigor analítico com menor expansividade de comunicação.');
    base.developmentRecommendations.push('Ajustar linguagem de acordo com a audiência para preservar clareza e engajamento.');
  }

  return base;
}
