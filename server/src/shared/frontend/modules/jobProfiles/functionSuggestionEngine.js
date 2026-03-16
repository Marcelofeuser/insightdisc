import { buildDiscInterpretation, normalizeDiscScores } from '../discEngine/index.js';
import { listJobProfiles } from './jobProfilesLibrary.js';
import { calculateJobFit } from '../jobFit/jobFitEngine.js';

function safeText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveProfileInput(rawProfile = {}) {
  const source = rawProfile?.scores || rawProfile?.disc || rawProfile;
  const normalized = normalizeDiscScores(source);
  const interpretation = buildDiscInterpretation(normalized.normalized, {
    context: 'job_function_suggestion',
    detailLevel: 'short',
  });

  return {
    scores: normalized.normalized,
    hasValidScores: normalized.hasValidInput,
    interpretation,
  };
}

function buildRoleStrengthMatch(jobProfile = {}, interpretation = {}) {
  const profileCode = safeText(interpretation?.profileCode).toUpperCase();
  const suggestions = Array.isArray(jobProfile?.suitableFor) ? jobProfile.suitableFor : [];
  if (!profileCode || !suggestions.length) return false;
  return suggestions.some((code) => profileCode.startsWith(String(code || '').toUpperCase()));
}

function buildSuggestionNarrative({ fit, roleStrengthMatch, interpretation, job }) {
  const base = `Aderência de ${fit.jobFitScore.toFixed(1)}% para ${job.label}.`;
  if (fit.jobFitScore >= 75 && roleStrengthMatch) {
    return `${base} O estilo ${interpretation.styleLabel} tende a performar bem neste contexto.`;
  }
  if (fit.jobFitScore >= 60) {
    return `${base} Há encaixe funcional com pontos de desenvolvimento direcionados.`;
  }
  return `${base} Recomenda-se avaliar plano de adaptação antes de alocar a função.`;
}

export function suggestCompatibleJobFunctions(rawProfile = {}, options = {}) {
  const { scores, hasValidScores, interpretation } = resolveProfileInput(rawProfile);
  const limit = Math.max(1, Math.min(12, toNumber(options?.limit, 6)));
  const jobs = Array.isArray(options?.jobProfiles) && options.jobProfiles.length
    ? options.jobProfiles
    : listJobProfiles();

  if (!hasValidScores) {
    return {
      profileCode: interpretation?.profileCode || 'DISC',
      styleLabel: interpretation?.styleLabel || 'Perfil em consolidação',
      hasValidScores: false,
      summary:
        'Não há scores DISC suficientes para sugerir funções com confiança. Conclua a avaliação para habilitar recomendações.',
      recommendations: [],
    };
  }

  const ranked = jobs
    .map((job) => {
      const fit = calculateJobFit(
        { scores },
        {
          key: job.key,
          label: job.label,
          scores: job.scores,
          ideal_profile: job.ideal_profile,
        },
        { context: 'function_suggestion' },
      );
      const roleStrengthMatch = buildRoleStrengthMatch(job, interpretation);
      const weightedScore = fit.jobFitScore + (roleStrengthMatch ? 4 : 0);

      return {
        key: job.key,
        label: job.label,
        category: job.category,
        description: job.description,
        fitScore: Number(weightedScore.toFixed(1)),
        fitLevel: fit.compatibilityLevel,
        roleStrengthMatch,
        rationale: buildSuggestionNarrative({
          fit,
          roleStrengthMatch,
          interpretation,
          job,
        }),
        focusPoints: fit.practicalRecommendations.slice(0, 3),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, limit);

  return {
    profileCode: interpretation?.profileCode || 'DISC',
    styleLabel: interpretation?.styleLabel || 'Perfil DISC',
    hasValidScores: true,
    summary: `Top ${ranked.length} funções compatíveis com ${interpretation?.profileCode || 'DISC'} para aplicação profissional.`,
    recommendations: ranked,
  };
}
