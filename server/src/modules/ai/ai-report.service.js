import { normalizeAiDiscResponse } from './schema.js';
import { env } from '../../config/env.js';
import { buildAiProviderChain } from './provider.js';
import { isProviderJsonParseError } from './json-utils.js';
import {
  countMeaningfulAiDiscFields,
  extractAiDiscProviderContent,
  normalizeAiDiscContentCandidate,
  safeValidateAiDiscContent,
} from './schema.js';

const PROFILE_NAMES = {
  DD: 'Dominante Puro',
  DI: 'Dominante Influente',
  DS: 'Dominante Estável',
  DC: 'Dominante Analítico',
  ID: 'Influente Dominante',
  II: 'Influente Puro',
  IS: 'Influente Estável',
  IC: 'Influente Analítico',
  SD: 'Estável Dominante',
  SI: 'Estável Influente',
  SS: 'Estável Puro',
  SC: 'Estável Analítico',
  CD: 'Analítico Dominante',
  CI: 'Analítico Influente',
  CS: 'Analítico Estável',
  CC: 'Analítico Puro',
};

const FACTOR_META = {
  D: {
    label: 'Dominância',
    emphasis: 'assertividade, ritmo e foco em resultado',
  },
  I: {
    label: 'Influência',
    emphasis: 'comunicação, persuasão e mobilização social',
  },
  S: {
    label: 'Estabilidade',
    emphasis: 'constância, cooperação e previsibilidade',
  },
  C: {
    label: 'Conformidade',
    emphasis: 'critério, análise e qualidade técnica',
  },
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMode(value = 'business') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'personal' || normalized === 'professional' || normalized === 'business') {
    return normalized;
  }

  return 'business';
}

function normalizeScores(rawScores = {}) {
  const initial = {
    D: Math.max(0, toNumber(rawScores.D, 34)),
    I: Math.max(0, toNumber(rawScores.I, 32)),
    S: Math.max(0, toNumber(rawScores.S, 23)),
    C: Math.max(0, toNumber(rawScores.C, 11)),
  };

  const total = initial.D + initial.I + initial.S + initial.C;
  if (!Number.isFinite(total) || total <= 0) {
    return { D: 34, I: 32, S: 23, C: 11 };
  }

  const normalized = {
    D: Math.round((initial.D / total) * 100),
    I: Math.round((initial.I / total) * 100),
    S: Math.round((initial.S / total) * 100),
    C: 0,
  };
  normalized.C = Math.max(0, 100 - normalized.D - normalized.I - normalized.S);
  return normalized;
}

function computeProfile(scores) {
  const sorted = Object.entries(scores)
    .map(([key, value]) => ({ key, value }))
    .sort((left, right) => right.value - left.value);

  const primary = sorted[0]?.key || 'D';
  const secondary = sorted[1]?.key || 'I';
  const profileCode = `${primary}${secondary}`;

  return {
    primary,
    secondary,
    profileCode,
    profileName: PROFILE_NAMES[profileCode] || `${FACTOR_META[primary].label} / ${FACTOR_META[secondary].label}`,
    sorted,
  };
}

function uniqueList(items = []) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

function resolveProviderModel(provider) {
  if (typeof provider?.getModel === 'function') {
    return String(provider.getModel() || '').trim() || provider?.name || 'unknown';
  }

  return String(provider?.model || provider?.name || 'unknown').trim() || 'unknown';
}

function sanitizeErrorMessage(error) {
  if (isProviderJsonParseError(error)) {
    return String(error?.parseErrorMessage || error?.message || 'INVALID_JSON_FROM_PROVIDER')
      .trim()
      .slice(0, 280);
  }

  const rawMessage = String(error?.message || error || '').trim();
  if (!rawMessage) return 'UNKNOWN_AI_ERROR';

  try {
    const parsed = JSON.parse(rawMessage);
    const providerMessage = String(parsed?.error?.message || '').trim();
    const providerCode = String(parsed?.error?.status || parsed?.error?.code || '').trim();
    const compact = [providerCode, providerMessage].filter(Boolean).join(': ');
    if (compact) {
      return compact.slice(0, 280);
    }
  } catch {
    // Keep the raw string if it is not JSON.
  }

  return rawMessage.slice(0, 280);
}

function normalizeProviderResponse(provider, rawResult) {
  const model = resolveProviderModel(provider);

  if (
    rawResult &&
    typeof rawResult === 'object' &&
    !Array.isArray(rawResult) &&
    'parsed' in rawResult
  ) {
    return {
      provider: String(rawResult.provider || provider.name || 'unknown').trim() || 'unknown',
      model: String(rawResult.model || model || 'unknown').trim() || 'unknown',
      raw: String(rawResult.raw || '').trim(),
      parsed: rawResult.parsed,
    };
  }

  return {
    provider: provider.name,
    model,
    raw: typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult ?? null),
    parsed: rawResult,
  };
}

function sanitizeValidationError(validationError) {
  try {
    const flattened = validationError?.flatten?.();
    if (flattened) {
      return JSON.stringify(flattened).slice(0, 280);
    }
  } catch {
    // Ignore serialization issues and fall through to generic message.
  }

  return String(validationError?.message || 'SCHEMA_VALIDATION_FAILED')
    .trim()
    .slice(0, 280);
}

async function callProviderWithValidation({
  provider,
  input,
  fallbackContent,
  attemptNumber,
  strictJsonRetry,
}) {
  const providerResult = normalizeProviderResponse(
    provider,
    await provider.generateStructuredDiscInsights(input, {
      attemptNumber,
      strictJsonRetry,
    }),
  );

  const normalizedContent = normalizeAiDiscContentCandidate(
    providerResult.parsed,
    fallbackContent,
    input.mode,
  );
  const meaningfulFieldCount = countMeaningfulAiDiscFields(providerResult.parsed);

  if (meaningfulFieldCount === 0) {
    return {
      ok: false,
      type: 'invalid_response',
      providerResult,
      error: 'NO_MEANINGFUL_AI_FIELDS',
    };
  }

  const validation = safeValidateAiDiscContent(normalizedContent);
  if (!validation.success) {
    return {
      ok: false,
      type: 'invalid_response',
      providerResult,
      error: sanitizeValidationError(validation.error),
    };
  }

  return {
    ok: true,
    providerResult,
    content: validation.data,
  };
}

export function normalizeAiDiscInput(input = {}) {
  const mode = normalizeMode(input.mode);
  const scores = normalizeScores(input.scores || input);
  const computedProfile = computeProfile(scores);

  return {
    mode,
    nome: String(input.nome || '').trim() || 'Pessoa avaliada',
    cargo: String(input.cargo || '').trim() || 'Profissional',
    empresa: String(input.empresa || '').trim() || 'InsightDISC',
    profileCode: String(input.profileCode || '').trim().toUpperCase() || computedProfile.profileCode,
    profileName: String(input.profileName || '').trim() || computedProfile.profileName,
    scores,
    primaryFactor: computedProfile.primary,
    secondaryFactor: computedProfile.secondary,
  };
}

export function buildFallbackDiscContent(input = {}) {
  const normalized = normalizeAiDiscInput(input);
  const primary = FACTOR_META[normalized.primaryFactor];
  const secondary = FACTOR_META[normalized.secondaryFactor];

  const modeSummary =
    normalized.mode === 'personal'
      ? `O perfil ${normalized.profileCode} combina ${primary.label.toLowerCase()} com ${secondary.label.toLowerCase()} e sugere um padrão de ação mais consciente, com ênfase em autoconhecimento, relações e escolhas do dia a dia.`
      : normalized.mode === 'professional'
        ? `O perfil ${normalized.profileCode} combina ${primary.label.toLowerCase()} com ${secondary.label.toLowerCase()} e indica uma atuação profissional marcada por ${primary.emphasis}, apoiada por ${secondary.emphasis}.`
        : `O perfil ${normalized.profileCode} combina ${primary.label.toLowerCase()} com ${secondary.label.toLowerCase()} e tende a operar com forte impacto em execução, alinhamento e tomada de decisão, sustentado por ${primary.emphasis} e ${secondary.emphasis}.`;

  const executiveSummary =
    normalized.mode === 'personal'
      ? `A leitura sugere que o melhor caminho de desenvolvimento está em usar a energia dominante com mais consciência relacional, ampliando repertório sem perder autenticidade.`
      : normalized.mode === 'professional'
        ? `No contexto de trabalho, o perfil tende a performar melhor quando o ambiente permite combinar sua energia dominante com clareza de prioridade, feedback e espaço para evolução.`
        : `Em contexto executivo, o perfil tende a gerar mais valor quando há clareza de mandato, contexto de decisão e mecanismos de compensação para os fatores menos presentes.`;

  const strengths = uniqueList([
    `Capacidade de operar com ${primary.emphasis}.`,
    `Apoio consistente de ${secondary.emphasis}.`,
    'Boa chance de imprimir identidade clara ao contexto em que atua.',
    normalized.mode === 'personal'
      ? 'Facilidade para perceber padrões próprios quando há reflexão intencional.'
      : normalized.mode === 'professional'
        ? 'Potencial para gerar contribuição visível em times e projetos.'
        : 'Potencial para influenciar ritmo, prioridade e tomada de decisão da equipe.',
  ]).slice(0, 4);

  const limitations = uniqueList([
    `Risco de exagerar ${primary.label.toLowerCase()} em cenários de alta pressão.`,
    `Possível ponto cego em comportamentos associados ao fator menos presente do perfil.`,
    normalized.mode === 'personal'
      ? 'Pode repetir padrões automáticos antes de refletir sobre impacto relacional.'
      : normalized.mode === 'professional'
        ? 'Pode gerar desalinhamento quando o estilo dominante não encontra contraponto no time.'
        : 'Pode concentrar decisão demais no estilo dominante sem calibrar contexto e stakeholders.',
    'Exige desenvolvimento consciente para ampliar flexibilidade comportamental.',
  ]).slice(0, 4);

  const communicationStyle =
    normalized.mode === 'personal'
      ? `A comunicação tende a refletir primeiro ${primary.label.toLowerCase()} e, em seguida, ${secondary.label.toLowerCase()}. Isso sugere uma forma de se expressar que ganha qualidade quando equilibra intenção, clareza e escuta.`
      : `A comunicação tende a ser guiada por ${primary.emphasis}, com complemento de ${secondary.emphasis}. O ganho principal está em ajustar profundidade, ritmo e tom ao público.`;

  const leadershipStyle =
    normalized.mode === 'personal'
      ? `Quando precisa conduzir pessoas ou contextos, o perfil tende a liderar a partir do fator dominante, sendo mais efetivo quando adiciona presença, constância e escuta ao seu estilo natural.`
      : normalized.mode === 'professional'
        ? `A liderança tende a aparecer por meio do fator dominante, apoiada pelo fator secundário. O melhor resultado costuma vir quando há combinação entre direção, contexto e adaptabilidade.`
        : `Em gestão, o perfil tende a liderar com a lógica do fator dominante e escalar impacto por meio do fator secundário. O principal ajuste executivo está em calibrar ritmo, alinhamento e governança.`;

  const decisionMaking =
    normalized.mode === 'personal'
      ? `A tomada de decisão tende a partir do fator dominante e ganha qualidade quando desacelera o impulso inicial para considerar impacto relacional, contexto e consequência prática.`
      : normalized.mode === 'professional'
        ? `No trabalho, a decisão tende a seguir o fator dominante com apoio do fator secundário. O ganho aparece quando o perfil combina velocidade, critério e validação proporcional ao risco.`
        : `Em contexto executivo, a decisão tende a refletir o fator dominante na priorização, no nível de risco tolerado e no ritmo de execução. O melhor ajuste está em explicitar critério, contrapesos e governança.`;

  const workStyle =
    normalized.mode === 'personal'
      ? `No cotidiano, o perfil tende a funcionar melhor quando consegue respeitar sua energia dominante sem perder consistência em rotina, combinado e relação com o outro.`
      : `No trabalho, o perfil tende a render mais quando o contexto permite usar ${primary.emphasis} com apoio de ${secondary.emphasis}, dentro de prioridades claras e ambiente coerente com sua forma de operar.`;

  const pressureBehavior =
    normalized.mode === 'business'
      ? `Sob pressão, o fator dominante tende a se intensificar e reduzir margem para nuance. O ganho está em criar checkpoints de contexto, escuta e decisão para evitar excesso de viés comportamental.`
      : `Sob pressão, o fator dominante tende a ficar mais visível. O desenvolvimento mais útil está em perceber esse padrão cedo e adicionar um comportamento compensatório antes que o excesso se consolide.`;

  const riskProfile =
    normalized.mode === 'personal'
      ? `O principal risco está em repetir o padrão dominante sem revisar contexto, impacto e limite pessoal. A mitigação mais útil é criar uma pausa curta de observação antes de agir.`
      : normalized.mode === 'professional'
        ? `O risco comportamental aparece quando o fator dominante se sobrepõe a escuta, método ou cadência do time. A mitigação mais útil é calibrar prioridade, critério e alinhamento antes da execução.`
        : `O risco executivo aparece quando o estilo dominante concentra decisão, acelera demais o ritmo ou reduz o espaço para contraponto. O antídoto está em governança simples, leitura de stakeholders e checkpoints de qualidade.`;

  const relationshipStyle =
    normalized.mode === 'personal'
      ? `Nos relacionamentos, o perfil tende a buscar conexão a partir do seu padrão dominante. A convivência melhora quando expectativas, limites e forma de comunicação ficam mais explícitos.`
      : `Na relação com pares, líderes e stakeholders, o perfil tende a reproduzir a lógica do fator dominante. A qualidade da relação cresce quando há ajuste consciente de escuta, timing e clareza.`;

  const developmentRecommendations = uniqueList([
    `Observar como ${primary.label.toLowerCase()} aparece nos momentos de maior exigência.`,
    `Criar um comportamento compensatório ligado a ${secondary.label.toLowerCase()} para ampliar repertório.`,
    normalized.mode === 'personal'
      ? 'Transformar insight em prática semanal simples e observável.'
      : normalized.mode === 'professional'
        ? 'Aplicar o desenvolvimento em reuniões, feedbacks e prioridades reais.'
        : 'Vincular desenvolvimento a rituais de gestão, tomada de decisão e comunicação executiva.',
    'Revisar semanalmente padrões de sucesso, ruído e ajuste necessário.',
  ]).slice(0, 4);

  const careerRecommendations = uniqueList([
    normalized.mode === 'personal'
      ? 'Buscar contextos e papéis que respeitem a energia dominante do perfil.'
      : 'Buscar funções, projetos ou contextos onde o perfil possa usar o fator dominante com clareza de expectativa.',
    `Desenvolver competências associadas a ${secondary.label.toLowerCase()} para ampliar aderência e alcance.`,
    normalized.mode === 'business'
      ? 'Avaliar aderência entre o desenho do cargo e o padrão real de decisão exigido.'
      : 'Construir trilha de crescimento com base em pontos fortes e compensações necessárias.',
    'Usar feedback estruturado para calibrar posicionamento e evolução.',
  ]).slice(0, 4);

  const businessRecommendations = uniqueList([
    normalized.mode === 'personal'
      ? 'Usar o autoconhecimento do perfil para decidir melhor onde investir energia, tempo e relacionamento.'
      : normalized.mode === 'professional'
        ? 'Traduzir o estilo comportamental em forma de atuação mais consistente com metas e stakeholders.'
        : 'Definir contrapesos de processo e equipe para equilibrar o fator dominante do perfil.',
    normalized.mode === 'business'
      ? 'Ajustar contexto de decisão, autonomia e governança ao padrão comportamental predominante.'
      : 'Aplicar a leitura DISC como apoio a decisões práticas, não como rótulo fixo.',
    'Criar rituais simples para monitorar excesso, equilíbrio e adaptação comportamental.',
  ]).slice(0, 4);

  const professionalPositioning =
    normalized.mode === 'personal'
      ? `O perfil pode se posicionar melhor quando entende como sua energia dominante impacta escolhas, relações e forma de se mostrar ao mundo.`
      : normalized.mode === 'professional'
        ? `Profissionalmente, o perfil tende a ser percebido pelo padrão dominante de atuação. O ganho está em tornar esse padrão mais consistente, legível e bem calibrado ao contexto.`
        : `Executivamente, o posicionamento do perfil tende a ganhar força quando há coerência entre estilo dominante, desenho de função, governança e composição de time.`;

  const strategicProfile =
    normalized.mode === 'business'
      ? `Estratégicamente, o perfil gera mais valor quando o estilo dominante é usado com clareza de mandato, composição complementar de time e disciplina de acompanhamento.`
      : `O perfil ganha força quando transforma sua energia dominante em posicionamento claro, previsível e ajustado ao contexto em que atua.`;

  return {
    summary: modeSummary,
    executiveSummary,
    strengths,
    limitations,
    communicationStyle,
    leadershipStyle,
    decisionMaking,
    workStyle,
    pressureBehavior,
    riskProfile,
    relationshipStyle,
    developmentRecommendations,
    careerRecommendations,
    businessRecommendations,
    professionalPositioning,
    strategicProfile,
    tone: normalized.mode,
  };
}

function mergeWithFallback(validatedContent, fallbackContent) {
  return {
    ...fallbackContent,
    ...validatedContent,
    strengths: uniqueList(validatedContent?.strengths || fallbackContent.strengths).slice(0, 6),
    limitations: uniqueList(validatedContent?.limitations || fallbackContent.limitations).slice(0, 6),
    developmentRecommendations: uniqueList(
      validatedContent?.developmentRecommendations || fallbackContent.developmentRecommendations,
    ).slice(0, 6),
    careerRecommendations: uniqueList(
      validatedContent?.careerRecommendations || fallbackContent.careerRecommendations,
    ).slice(0, 6),
    businessRecommendations: uniqueList(
      validatedContent?.businessRecommendations || fallbackContent.businessRecommendations,
    ).slice(0, 6),
  };
}

export async function generateAiDiscContent(input = {}, options = {}) {
  const normalizedInput = normalizeAiDiscInput(input);
  const fallbackContent = buildFallbackDiscContent(normalizedInput);
  const resolvedPrimaryName =
    options.providerOverride?.name ||
    options.providerChainOverride?.[0]?.name ||
    options.providerName ||
    env.aiProvider ||
    'gemini';
  const primaryProviderName = String(resolvedPrimaryName || '')
    .trim()
    .toLowerCase() || 'gemini';

  const providers = options.providerChainOverride
    ? options.providerChainOverride
    : options.providerOverride
      ? [options.providerOverride]
      : buildAiProviderChain([
          primaryProviderName,
          env.aiFallback1,
          env.aiFallback2,
        ]);

  const attempts = [];

  for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
    const provider = providers[providerIndex];
    const fallbackProvider = providers[providerIndex + 1] || null;
    const providerModel = resolveProviderModel(provider);
    let providerExhausted = false;

    for (let attemptNumber = 1; attemptNumber <= 2; attemptNumber += 1) {
      const strictJsonRetry = attemptNumber === 2;

      try {
        const attemptResult = await callProviderWithValidation({
          provider,
          input: normalizedInput,
          fallbackContent,
          attemptNumber,
          strictJsonRetry,
        });

        if (!attemptResult.ok) {
          console.warn('[ai/disc] provider validation failed', {
            provider: attemptResult.providerResult.provider,
            model: attemptResult.providerResult.model,
            attempt: attemptNumber,
            error: attemptResult.error,
          });
          attempts.push({
            provider: attemptResult.providerResult.provider,
            model: attemptResult.providerResult.model,
            attempt: attemptNumber,
            status: attemptResult.type,
            error: attemptResult.error,
          });
          providerExhausted = true;
          break;
        }

        const usedFallback = provider.name !== primaryProviderName;
        console.info('[ai/disc] provider selected', {
          provider: attemptResult.providerResult.provider,
          model: attemptResult.providerResult.model,
          attempt: attemptNumber,
          usedFallback,
        });

        return {
          ok: true,
          provider: attemptResult.providerResult.provider,
          model: attemptResult.providerResult.model,
          source: 'ai',
          usedFallback,
          attempts,
          rawContent: extractAiDiscProviderContent(
            attemptResult.providerResult.parsed,
            normalizedInput.mode,
          ),
          content: mergeWithFallback(attemptResult.content, fallbackContent),
          input: normalizedInput,
        };
      } catch (error) {
        const sanitizedError = sanitizeErrorMessage(error);
        const isParseFailure = isProviderJsonParseError(error);

        console.warn(
          isParseFailure ? '[ai/disc] provider parse failed' : '[ai/disc] provider request failed',
          {
            provider: provider.name,
            model: providerModel,
            attempt: attemptNumber,
            error: sanitizedError,
          },
        );

        attempts.push({
          provider: provider.name,
          model: providerModel,
          attempt: attemptNumber,
          status: isParseFailure ? 'parse_error' : 'error',
          error: sanitizedError,
        });

        if (isParseFailure && attemptNumber === 1) {
          console.info('[ai/disc] retrying with strict JSON prompt', {
            provider: provider.name,
            model: providerModel,
            nextAttempt: 2,
          });
          continue;
        }

        providerExhausted = true;
        break;
      }
    }

    if (providerExhausted && fallbackProvider) {
      console.info('[ai/disc] switching to fallback provider', {
        from: provider.name,
        to: fallbackProvider.name,
      });
    }
  }

  console.info('[ai/disc] deterministic fallback triggered', {
    provider: 'deterministic_engine',
    model: 'deterministic_engine',
    attempts: attempts.length,
  });

  return {
    ok: true,
    provider: 'deterministic_engine',
    model: 'deterministic_engine',
    source: 'fallback',
    usedFallback: true,
    attempts,
    rawContent: {},
    content: fallbackContent,
    input: normalizedInput,
  };
}
