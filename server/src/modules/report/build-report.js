import { buildReportModel } from '../../shared/reporting/buildReportModel.js';
import { generateAiDiscContent } from '../ai/ai-report.service.js';
import { normalizeBrandingFromOrganization } from '../branding/branding-service.js';
import { REPORT_TYPE, normalizeReportType } from './report-type.js';

function firstNonEmpty(values = []) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function uniqueItems(items = [], limit = 0) {
  const normalized = Array.from(
    new Set(
      items
        .flatMap((item) => (Array.isArray(item) ? item : [item]))
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  );

  return limit > 0 ? normalized.slice(0, limit) : normalized;
}

function normalizeParagraphs(value, limit = 0) {
  const chunks = Array.isArray(value)
    ? value
    : String(value || '')
        .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/u);

  const normalized = Array.from(
    new Set(
      chunks
        .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  );

  return limit > 0 ? normalized.slice(0, limit) : normalized;
}

function resolveParticipantFromAssessment(assessment = {}, meta = {}, discResult = {}) {
  const reportParticipant = assessment?.report?.discProfile?.participant || {};
  const name = firstNonEmpty([
    assessment?.candidateName,
    assessment?.respondent_name,
    assessment?.respondentName,
    assessment?.user_name,
    assessment?.name,
    discResult?.participant?.name,
    discResult?.participant?.candidateName,
    discResult?.participant?.respondent_name,
    reportParticipant?.name,
    reportParticipant?.candidateName,
    reportParticipant?.respondent_name,
    assessment?.candidateEmail,
    assessment?.email,
    'Participante DISC',
  ]);

  const email = firstNonEmpty([
    assessment?.candidateEmail,
    assessment?.respondent_email,
    assessment?.respondentEmail,
    assessment?.user_email,
    assessment?.email,
    discResult?.participant?.email,
    discResult?.participant?.candidateEmail,
    discResult?.participant?.respondent_email,
    reportParticipant?.email,
    reportParticipant?.candidateEmail,
    reportParticipant?.respondent_email,
  ]);

  return {
    name,
    email: email || 'contato@participante.disc',
    assessmentId: firstNonEmpty([assessment?.id, meta?.reportId]) || `report-${Date.now()}`,
    role: firstNonEmpty([
      assessment?.candidateRole,
      assessment?.role,
      discResult?.participant?.role,
      reportParticipant?.role,
      'Profissional em desenvolvimento',
    ]),
    company: firstNonEmpty([
      assessment?.candidateCompany,
      assessment?.company,
      discResult?.participant?.company,
      reportParticipant?.company,
      assessment?.organization?.name,
      'Organizacao avaliada',
    ]),
  };
}

function resolveResponsibleName({ assessment = {}, currentUser = null }) {
  return firstNonEmpty([
    currentUser?.name,
    assessment?.creator?.name,
    assessment?.organization?.owner?.name,
    'Especialista InsightDISC',
  ]);
}

function resolveBranding(assessment = {}, assetBaseUrl = '') {
  const organization = assessment?.organization || null;
  if (!organization) {
    return {
      company_name: 'InsightDISC',
      logo_url: '/brand/insightdisc-report-logo.png',
      cover_url: '',
      brand_primary_color: '#0b1f3b',
      brand_secondary_color: '#f7b500',
      report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
    };
  }

  const normalized = normalizeBrandingFromOrganization(organization);
  const companyName = firstNonEmpty([
    organization?.companyName,
    organization?.name,
    normalized?.company_name,
    'InsightDISC',
  ]);
  const logoUrl = firstNonEmpty([
    organization?.logoUrl,
    normalized?.logo_url,
    '/brand/insightdisc-report-logo.png',
  ]);
  const absoluteLogo =
    logoUrl.startsWith('/') && assetBaseUrl
      ? `${assetBaseUrl}${logoUrl}`
      : logoUrl;

  return {
    company_name: companyName,
    logo_url: absoluteLogo,
    cover_url: '',
    brand_primary_color: normalized.brand_primary_color,
    brand_secondary_color: normalized.brand_secondary_color,
    report_footer_text: normalized.report_footer_text,
  };
}

function normalizeScores(assessment = {}, discResult = {}) {
  const normalized =
    discResult?.normalized ||
    discResult?.natural ||
    discResult?.scores?.natural ||
    {};
  const adapted =
    discResult?.adapted ||
    discResult?.adapted_profile ||
    discResult?.scores?.adapted ||
    normalized;
  const summary =
    discResult?.summary ||
    discResult?.summary_profile ||
    discResult?.scores?.summary ||
    normalized;

  const fallbackNatural =
    assessment?.results?.natural_profile ||
    assessment?.disc_results?.natural ||
    discResult?.scores?.natural ||
    normalized;
  const fallbackAdapted =
    assessment?.results?.adapted_profile ||
    assessment?.disc_results?.adapted ||
    discResult?.scores?.adapted ||
    adapted;

  return {
    natural: Object.keys(normalized).length ? normalized : fallbackNatural,
    adapted: Object.keys(adapted).length ? adapted : fallbackAdapted,
    summary,
  };
}

function resolveReportCopy(reportType) {
  if (reportType === REPORT_TYPE.PERSONAL) {
    return {
      reportTitle: 'INSIGHTDISC · RELATÓRIO PERSONAL',
      reportSubtitle: 'Leitura comportamental essencial com foco em autoconhecimento e aplicação prática.',
    };
  }

  if (reportType === REPORT_TYPE.PROFESSIONAL) {
    return {
      reportTitle: 'INSIGHTDISC · RELATÓRIO PROFESSIONAL',
      reportSubtitle: 'Leitura intermediária com aprofundamento consultivo para trabalho, comunicação e desenvolvimento.',
    };
  }

  return {
    reportTitle: 'INSIGHTDISC · RELATÓRIO PREMIUM',
    reportSubtitle: 'Relatório completo com profundidade analítica, leitura executiva e recomendações comportamentais por IA.',
  };
}

function resolveAiScores(scores = {}) {
  return {
    D: Number(scores?.natural?.D || scores?.summary?.D || 0),
    I: Number(scores?.natural?.I || scores?.summary?.I || 0),
    S: Number(scores?.natural?.S || scores?.summary?.S || 0),
    C: Number(scores?.natural?.C || scores?.summary?.C || 0),
  };
}

function mergePreferredParagraphs(preferred, fallback, limit) {
  const normalizedPreferred = normalizeParagraphs(preferred, limit);
  if (normalizedPreferred.length) return normalizedPreferred;
  return normalizeParagraphs(fallback, limit);
}

function mergePreferredItems(preferredItems, fallbackItems, limit) {
  const normalizedPreferred = uniqueItems(preferredItems, limit);
  if (normalizedPreferred.length) return normalizedPreferred;
  return uniqueItems(fallbackItems, limit);
}

const EMPTY_AI_COMPLEMENT = Object.freeze({
  ai_summary: '',
  ai_strengths: '',
  ai_development: '',
  ai_communication: '',
  ai_workstyle: '',
  ai_recommendations: '',
  ai_leadership: '',
  ai_decision_making: '',
  ai_risk_profile: '',
});

const AI_COMPLEMENT_FIELD_LIMITS = Object.freeze({
  ai_summary: 680,
  ai_strengths: 520,
  ai_development: 560,
  ai_communication: 520,
  ai_workstyle: 520,
  ai_recommendations: 560,
  ai_leadership: 480,
  ai_decision_making: 480,
  ai_risk_profile: 480,
});

function normalizeComplementText(value, maxLength = 480) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeComplementItems(items = [], options = {}) {
  const normalized = uniqueItems(items, Number(options.maxItems) || 4)
    .map((item) => normalizeComplementText(item, Number(options.maxLength) || 180))
    .filter(Boolean);

  return normalized.join('\n');
}

function buildAiComplement(aiResult = {}, reportType = REPORT_TYPE.BUSINESS, options = {}) {
  const aiContent = aiResult?.content || {};
  const includeAiComplement =
    options.includeAiComplement !== false && options.disableAiComplement !== true;

  if (!includeAiComplement) {
    return { ...EMPTY_AI_COMPLEMENT };
  }

  if (aiResult?.source !== 'ai') {
    console.info('[report/ai-complement] skipped', {
      reportType,
      reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'AI_SOURCE_UNAVAILABLE',
    });
    return { ...EMPTY_AI_COMPLEMENT };
  }

  const normalized = {
    ai_summary: normalizeComplementText(
      firstNonEmpty([
        aiContent.executiveSummary,
        aiContent.strategicProfile,
        aiContent.summary,
      ]),
      AI_COMPLEMENT_FIELD_LIMITS.ai_summary,
    ),
    ai_strengths: normalizeComplementItems(aiContent.strengths, {
      maxItems: 4,
      maxLength: 160,
    }).slice(0, AI_COMPLEMENT_FIELD_LIMITS.ai_strengths),
    ai_development: normalizeComplementItems(
      [
        ...(Array.isArray(aiContent.limitations) ? aiContent.limitations : []),
        ...(Array.isArray(aiContent.developmentRecommendations)
          ? aiContent.developmentRecommendations
          : []),
      ],
      {
        maxItems: 4,
        maxLength: 170,
      },
    ).slice(0, AI_COMPLEMENT_FIELD_LIMITS.ai_development),
    ai_communication: normalizeComplementText(
      aiContent.communicationStyle,
      AI_COMPLEMENT_FIELD_LIMITS.ai_communication,
    ),
    ai_workstyle: normalizeComplementText(
      aiContent.workStyle,
      AI_COMPLEMENT_FIELD_LIMITS.ai_workstyle,
    ),
    ai_recommendations: normalizeComplementItems(
      [
        ...(reportType === REPORT_TYPE.BUSINESS
          ? Array.isArray(aiContent.businessRecommendations)
            ? aiContent.businessRecommendations
            : []
          : []),
        ...(Array.isArray(aiContent.careerRecommendations) ? aiContent.careerRecommendations : []),
        ...(Array.isArray(aiContent.developmentRecommendations)
          ? aiContent.developmentRecommendations
          : []),
      ],
      {
        maxItems: 4,
        maxLength: 180,
      },
    ).slice(0, AI_COMPLEMENT_FIELD_LIMITS.ai_recommendations),
    ai_leadership:
      reportType === REPORT_TYPE.BUSINESS
        ? normalizeComplementText(
            aiContent.leadershipStyle,
            AI_COMPLEMENT_FIELD_LIMITS.ai_leadership,
          )
        : '',
    ai_decision_making:
      reportType === REPORT_TYPE.BUSINESS
        ? normalizeComplementText(
            firstNonEmpty([aiContent.decisionMaking, aiContent.professionalPositioning]),
            AI_COMPLEMENT_FIELD_LIMITS.ai_decision_making,
          )
        : '',
    ai_risk_profile:
      reportType === REPORT_TYPE.BUSINESS
        ? normalizeComplementText(
            firstNonEmpty([
              aiContent.riskProfile,
              aiContent.pressureBehavior,
              Array.isArray(aiContent.limitations) ? aiContent.limitations[0] : '',
            ]),
            AI_COMPLEMENT_FIELD_LIMITS.ai_risk_profile,
          )
        : '',
  };

  const hasAnyContent = Object.values(normalized).some((value) => String(value || '').trim());
  if (!hasAnyContent) {
    console.info('[report/ai-complement] skipped', {
      reportType,
      reason: 'EMPTY_AI_COMPLEMENT',
    });
    return { ...EMPTY_AI_COMPLEMENT };
  }

  return normalized;
}

function mergeReportModelWithAiContent(reportModel, aiResult = {}, reportType = REPORT_TYPE.BUSINESS) {
  const aiContent = aiResult?.content || {};
  const aiSummaryParagraphs = normalizeParagraphs(aiContent.summary, 3);
  const aiExecutiveParagraphs = normalizeParagraphs(aiContent.executiveSummary, 3);
  const aiPositioningParagraphs = normalizeParagraphs(aiContent.professionalPositioning, 3);
  const aiStrategicParagraphs = normalizeParagraphs(aiContent.strategicProfile, 3);
  const aiCommunicationParagraphs = normalizeParagraphs(aiContent.communicationStyle, 4);
  const aiLeadershipParagraphs = normalizeParagraphs(aiContent.leadershipStyle, 4);
  const aiDecisionParagraphs = normalizeParagraphs(aiContent.decisionMaking, 4);
  const aiWorkParagraphs = normalizeParagraphs(aiContent.workStyle, 4);
  const aiRiskParagraphs = normalizeParagraphs(aiContent.riskProfile, 3);

  const strengths = uniqueItems(aiContent.strengths, 6);
  const limitations = uniqueItems(aiContent.limitations, 6);
  const developmentRecommendations = uniqueItems(aiContent.developmentRecommendations, 6);
  const careerRecommendations = uniqueItems(aiContent.careerRecommendations, 6);
  const businessRecommendations = uniqueItems(aiContent.businessRecommendations, 6);

  const mergedProfileContent = {
    ...(reportModel?.profileContent || {}),
    summary: firstNonEmpty([
      aiContent.summary,
      aiContent.strategicProfile,
      aiContent.professionalPositioning,
      reportModel?.profileContent?.summary,
    ]),
    executiveSummary: mergePreferredItems(
      [aiContent.executiveSummary, ...strengths],
      reportModel?.profileContent?.executiveSummary,
      6,
    ),
    identityDynamics: mergePreferredParagraphs(
      [
        ...aiSummaryParagraphs,
        ...aiWorkParagraphs,
        ...aiStrategicParagraphs,
        ...aiPositioningParagraphs,
      ],
      reportModel?.profileContent?.identityDynamics,
      5,
    ),
    deepDynamics: mergePreferredParagraphs(
      [
        ...aiSummaryParagraphs,
        ...aiWorkParagraphs,
        ...aiStrategicParagraphs,
        ...aiPositioningParagraphs,
      ],
      reportModel?.profileContent?.deepDynamics,
      5,
    ),
    decisionStyle: mergePreferredParagraphs(
      [
        ...aiDecisionParagraphs,
        ...aiStrategicParagraphs,
        ...normalizeParagraphs(aiContent.professionalPositioning, 2),
        ...aiWorkParagraphs,
        ...aiSummaryParagraphs,
      ],
      reportModel?.profileContent?.decisionStyle,
      4,
    ),
    motivators: mergePreferredItems(
      [...businessRecommendations, ...careerRecommendations],
      reportModel?.profileContent?.motivators,
      5,
    ),
    energyDrainers: mergePreferredItems(
      reportType === REPORT_TYPE.BUSINESS
        ? [...aiRiskParagraphs, ...limitations, aiContent.pressureBehavior]
        : [...limitations, aiContent.pressureBehavior],
      reportModel?.profileContent?.energyDrainers,
      5,
    ),
    workStrengths: mergePreferredItems(
      [...strengths, ...businessRecommendations],
      reportModel?.profileContent?.workStrengths,
      6,
    ),
    workRisks: mergePreferredItems(limitations, reportModel?.profileContent?.workRisks, 6),
    communicationStyle: mergePreferredParagraphs(
      aiCommunicationParagraphs,
      reportModel?.profileContent?.communicationStyle,
      4,
    ),
    communicationNeeds: mergePreferredItems(
      [...businessRecommendations, ...strengths],
      reportModel?.profileContent?.communicationNeeds,
      4,
    ),
    leadershipStyle: mergePreferredParagraphs(
      aiLeadershipParagraphs,
      reportModel?.profileContent?.leadershipStyle,
      4,
    ),
    leadershipStrengths: mergePreferredItems(
      [...strengths, ...businessRecommendations],
      reportModel?.profileContent?.leadershipStrengths,
      5,
    ),
    leadershipRisks: mergePreferredItems(
      limitations,
      reportModel?.profileContent?.leadershipRisks,
      5,
    ),
    stressPattern: mergePreferredItems(
      reportType === REPORT_TYPE.BUSINESS
        ? [aiContent.riskProfile, aiContent.pressureBehavior, ...limitations]
        : [aiContent.pressureBehavior, ...limitations],
      reportModel?.profileContent?.stressPattern,
      4,
    ),
    stressSignals: mergePreferredItems(
      reportType === REPORT_TYPE.BUSINESS
        ? [aiContent.riskProfile, aiContent.pressureBehavior, ...limitations]
        : [aiContent.pressureBehavior, ...limitations],
      reportModel?.profileContent?.stressSignals,
      5,
    ),
    recoveryStrategy: mergePreferredItems(
      developmentRecommendations,
      reportModel?.profileContent?.recoveryStrategy,
      5,
    ),
    conflictStyle: mergePreferredItems(
      [aiContent.relationshipStyle, ...limitations],
      reportModel?.profileContent?.conflictStyle,
      5,
    ),
    teamContribution: mergePreferredItems(
      [...strengths, aiContent.relationshipStyle],
      reportModel?.profileContent?.teamContribution,
      5,
    ),
    idealEnvironment: mergePreferredItems(
      [...businessRecommendations, ...careerRecommendations],
      reportModel?.profileContent?.idealEnvironment,
      5,
    ),
    lowFitEnvironment: mergePreferredItems(
      limitations,
      reportModel?.profileContent?.lowFitEnvironment,
      4,
    ),
    naturalStrengths: mergePreferredItems(
      [...strengths, ...developmentRecommendations],
      reportModel?.profileContent?.naturalStrengths,
      8,
    ),
    developmentPoints: mergePreferredItems(
      [...developmentRecommendations, ...limitations],
      reportModel?.profileContent?.developmentPoints,
      8,
    ),
    developmentRisks: mergePreferredItems(
      limitations,
      reportModel?.profileContent?.developmentRisks,
      4,
    ),
    managerGuidance: mergePreferredItems(
      [...businessRecommendations, ...developmentRecommendations],
      reportModel?.profileContent?.managerGuidance,
      5,
    ),
    selfLeadershipGuidance: mergePreferredItems(
      [...developmentRecommendations, ...careerRecommendations],
      reportModel?.profileContent?.selfLeadershipGuidance,
      5,
    ),
    plan30: mergePreferredItems(
      developmentRecommendations,
      reportModel?.profileContent?.plan30,
      4,
    ),
    plan60: mergePreferredItems(
      [...developmentRecommendations, ...businessRecommendations],
      reportModel?.profileContent?.plan60,
      4,
    ),
    plan90: mergePreferredItems(
      [...careerRecommendations, ...developmentRecommendations],
      reportModel?.profileContent?.plan90,
      4,
    ),
    executiveClosing: mergePreferredParagraphs(
      [...aiStrategicParagraphs, ...aiPositioningParagraphs, ...aiExecutiveParagraphs],
      reportModel?.profileContent?.executiveClosing,
      3,
    ),
    closingSummary: firstNonEmpty([
      aiContent.strategicProfile,
      aiContent.professionalPositioning,
      aiContent.executiveSummary,
      reportModel?.profileContent?.closingSummary,
    ]),
  };

  const executiveInsight = firstNonEmpty([
    aiContent.executiveSummary,
    aiContent.summary,
    reportModel?.insights?.executive,
  ]);

  return {
    ...reportModel,
    reportType,
    meta: {
      ...(reportModel?.meta || {}),
      reportType,
      aiProvider: aiResult?.provider || 'deterministic_engine',
      aiModel: aiResult?.model || 'deterministic_engine',
      aiSource: aiResult?.source || 'fallback',
      aiUsedFallback: Boolean(aiResult?.usedFallback),
    },
    profileContent: mergedProfileContent,
    narratives: {
      ...(reportModel?.narratives || {}),
      summaryParagraphs: mergePreferredParagraphs(
        [...aiSummaryParagraphs, ...aiExecutiveParagraphs, ...aiStrategicParagraphs, ...aiPositioningParagraphs],
        reportModel?.narratives?.summaryParagraphs,
        4,
      ),
      identityDynamics: mergedProfileContent.identityDynamics,
      decisionParagraphs: mergedProfileContent.decisionStyle,
      communicationStyle: mergedProfileContent.communicationStyle,
      communicationNeeds: mergedProfileContent.communicationNeeds,
      stressSignals: mergedProfileContent.stressSignals,
      environmentDrainers: mergedProfileContent.lowFitEnvironment,
      careerFramework: mergePreferredItems(
        [...careerRecommendations, ...businessRecommendations],
        reportModel?.narratives?.careerFramework,
        5,
      ),
      developmentHabits: mergePreferredItems(
        developmentRecommendations,
        reportModel?.narratives?.developmentHabits,
        5,
      ),
      developmentQuestions: mergePreferredItems(
        [...businessRecommendations, ...developmentRecommendations],
        reportModel?.narratives?.developmentQuestions,
        5,
      ),
      developmentRisks: mergedProfileContent.developmentRisks,
      executiveClosing: mergedProfileContent.executiveClosing,
    },
    insights: {
      ...(reportModel?.insights || {}),
      executive: executiveInsight,
      practicalByPage: {
        ...(reportModel?.insights?.practicalByPage || {}),
        dynamics: firstNonEmpty([aiContent.summary, reportModel?.insights?.practicalByPage?.dynamics]),
        decision: firstNonEmpty([
          aiContent.decisionMaking,
          aiContent.strategicProfile,
          aiContent.professionalPositioning,
          aiContent.workStyle,
          reportModel?.insights?.practicalByPage?.decision,
        ]),
        communication: firstNonEmpty([
          aiContent.communicationStyle,
          reportModel?.insights?.practicalByPage?.communication,
        ]),
        leadership: firstNonEmpty([
          aiContent.leadershipStyle,
          reportModel?.insights?.practicalByPage?.leadership,
        ]),
        stress: firstNonEmpty([
          aiContent.pressureBehavior,
          reportModel?.insights?.practicalByPage?.stress,
        ]),
        environment: firstNonEmpty([
          businessRecommendations[0],
          aiContent.strategicProfile,
          reportModel?.insights?.practicalByPage?.environment,
        ]),
        career: firstNonEmpty([
          aiContent.strategicProfile,
          aiContent.professionalPositioning,
          careerRecommendations[0],
          reportModel?.insights?.practicalByPage?.career,
        ]),
      },
      executiveByPage: {
        ...(reportModel?.insights?.executiveByPage || {}),
        dynamics: firstNonEmpty([aiContent.executiveSummary, aiContent.strategicProfile, executiveInsight]),
        decision: firstNonEmpty([aiContent.decisionMaking, aiContent.professionalPositioning, executiveInsight]),
        communication: firstNonEmpty([aiContent.communicationStyle, executiveInsight]),
        leadership: firstNonEmpty([aiContent.leadershipStyle, executiveInsight]),
        stress: firstNonEmpty([aiContent.riskProfile, aiContent.pressureBehavior, executiveInsight]),
        environment: firstNonEmpty([aiContent.strategicProfile, businessRecommendations[0], executiveInsight]),
        career: firstNonEmpty([aiContent.strategicProfile, careerRecommendations[0], executiveInsight]),
      },
      behavioralRisk: firstNonEmpty([
        aiContent.riskProfile,
        limitations[0],
        aiContent.pressureBehavior,
        reportModel?.insights?.behavioralRisk,
      ]),
      managerCallout: firstNonEmpty([
        businessRecommendations[0],
        developmentRecommendations[0],
        reportModel?.insights?.managerCallout,
      ]),
      managerLens: firstNonEmpty([
        aiContent.strategicProfile,
        businessRecommendations[0],
        reportModel?.insights?.managerLens,
      ]),
      riskOfExcess: firstNonEmpty([
        aiContent.riskProfile,
        limitations[0],
        aiContent.pressureBehavior,
        reportModel?.insights?.riskOfExcess,
      ]),
      developmentLens: firstNonEmpty([
        developmentRecommendations[0],
        reportModel?.insights?.developmentLens,
      ]),
      careerCallout: firstNonEmpty([
        aiContent.strategicProfile,
        careerRecommendations[0],
        aiContent.professionalPositioning,
        reportModel?.insights?.careerCallout,
      ]),
    },
    plans: {
      ...(reportModel?.plans || {}),
      days30: mergedProfileContent.plan30,
      days60: mergedProfileContent.plan60,
      days90: mergedProfileContent.plan90,
    },
    quality: {
      ...(reportModel?.quality || {}),
      noAi: false,
      deterministic: aiResult?.source !== 'ai',
    },
    aiComplement: reportModel?.aiComplement || { ...EMPTY_AI_COMPLEMENT },
    ai: {
      enabled: true,
      provider: aiResult?.provider || 'deterministic_engine',
      model: aiResult?.model || 'deterministic_engine',
      source: aiResult?.source || 'fallback',
      usedFallback: Boolean(aiResult?.usedFallback),
      attempts: Array.isArray(aiResult?.attempts) ? aiResult.attempts : [],
    },
  };
}

export async function buildPremiumReportModel({
  assessment = {},
  discResult = {},
  assetBaseUrl = '',
  currentUser = null,
  reportType = REPORT_TYPE.BUSINESS,
  includeAiComplement = true,
  useAi = true,
  aiOptions = {},
}) {
  const branding = resolveBranding(assessment, assetBaseUrl);
  const normalizedReportType = normalizeReportType(reportType, REPORT_TYPE.BUSINESS);
  const reportCopy = resolveReportCopy(normalizedReportType);

  const meta = {
    brand: branding.company_name,
    reportTitle: reportCopy.reportTitle,
    reportSubtitle: reportCopy.reportSubtitle,
    generatedAt: new Date().toISOString(),
    reportId: assessment?.id || 'sem-id',
    version: '5.0',
    workspaceId: assessment?.organizationId || '',
    responsibleName: resolveResponsibleName({ assessment, currentUser }),
    responsibleRole: 'Analista Comportamental',
    reportType: normalizedReportType,
    assetBaseUrl: firstNonEmpty([assetBaseUrl, process.env.APP_BASE_URL]),
  };

  const participant = resolveParticipantFromAssessment(assessment, meta, discResult);

  const input = {
    strict: true,
    reportType: normalizedReportType,
    meta,
    participant,
    assessment,
    scores: normalizeScores(assessment, discResult),
    branding,
  };

  const reportModel = await buildReportModel(input);
  if (useAi === false) {
    return {
      ...reportModel,
      reportType: normalizedReportType,
      meta: {
        ...(reportModel?.meta || {}),
        reportType: normalizedReportType,
        aiProvider: 'deterministic_engine',
        aiModel: 'deterministic_engine',
        aiSource: 'disabled',
        aiUsedFallback: false,
        aiComplementEnabled: false,
      },
      quality: {
        ...(reportModel?.quality || {}),
        noAi: true,
        deterministic: true,
      },
      aiComplement: { ...EMPTY_AI_COMPLEMENT },
      ai: {
        enabled: false,
        provider: 'deterministic_engine',
        model: 'deterministic_engine',
        source: 'disabled',
        usedFallback: false,
        attempts: [],
      },
    };
  }

  const aiResult = await generateAiDiscContent({
    mode: normalizedReportType,
    nome: participant.name,
    cargo: participant.role,
    empresa: participant.company,
    profileCode: reportModel?.profile?.key,
    profileName: reportModel?.profile?.title,
    scores: resolveAiScores(reportModel?.scores),
  }, aiOptions);
  const aiComplement = buildAiComplement(aiResult, normalizedReportType, {
    includeAiComplement,
  });
  const mergedReportModel = mergeReportModelWithAiContent(reportModel, aiResult, normalizedReportType);

  return {
    ...mergedReportModel,
    meta: {
      ...(mergedReportModel?.meta || {}),
      aiComplementEnabled: includeAiComplement !== false,
    },
    aiComplement,
  };
}

export default buildPremiumReportModel;
