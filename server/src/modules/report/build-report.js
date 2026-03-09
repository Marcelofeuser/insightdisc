import { buildReportModel } from '../../../../reporting/buildReportModel.js';
import { normalizeBrandingFromOrganization } from '../branding/branding-service.js';

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function firstNonEmpty(values = []) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function resolveParticipantFromAssessment(assessment = {}, meta = {}) {
  const name = firstNonEmpty([
    assessment?.candidateName,
    assessment?.respondent_name,
    assessment?.respondentName,
    assessment?.user_name,
    assessment?.name,
  ]);

  if (!name) {
    throw createBadRequest('Dado obrigatorio ausente: participant.name');
  }

  const email = firstNonEmpty([
    assessment?.candidateEmail,
    assessment?.respondent_email,
    assessment?.respondentEmail,
    assessment?.user_email,
    assessment?.email,
  ]);

  return {
    name,
    email: email || 'contato@participante.disc',
    assessmentId: firstNonEmpty([assessment?.id, meta?.reportId]) || `report-${Date.now()}`,
    role: firstNonEmpty([assessment?.candidateRole, assessment?.role, 'Profissional em desenvolvimento']),
    company: firstNonEmpty([assessment?.candidateCompany, assessment?.company, assessment?.organization?.name, 'Organizacao avaliada']),
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
  const normalized = discResult?.normalized || discResult?.natural || {};
  const adapted = discResult?.adapted || discResult?.adapted_profile || normalized;
  const summary = discResult?.summary || discResult?.summary_profile || normalized;

  const fallbackNatural =
    assessment?.results?.natural_profile || assessment?.disc_results?.natural || normalized;
  const fallbackAdapted =
    assessment?.results?.adapted_profile || assessment?.disc_results?.adapted || adapted;

  return {
    natural: Object.keys(normalized).length ? normalized : fallbackNatural,
    adapted: Object.keys(adapted).length ? adapted : fallbackAdapted,
    summary,
  };
}

export async function buildPremiumReportModel({
  assessment = {},
  discResult = {},
  assetBaseUrl = '',
  currentUser = null,
  reportType = 'standard',
}) {
  const branding = resolveBranding(assessment, assetBaseUrl);
  const normalizedReportType = String(reportType || '').toLowerCase() === 'premium' ? 'premium' : 'standard';

  const meta = {
    brand: branding.company_name,
    reportTitle:
      normalizedReportType === 'premium'
        ? 'RELATÓRIO DISC PREMIUM'
        : 'Relatorio de Analise Comportamental DISC',
    reportSubtitle:
      normalizedReportType === 'premium'
        ? 'Analise comportamental avancada'
        : 'Diagnostico comportamental completo com benchmark, comunicacao, lideranca, riscos, carreira e plano de desenvolvimento',
    generatedAt: new Date().toISOString(),
    reportId: assessment?.id || 'sem-id',
    version: '4.0',
    workspaceId: assessment?.organizationId || '',
    responsibleName: resolveResponsibleName({ assessment, currentUser }),
    responsibleRole: 'Analista Comportamental',
    reportType: normalizedReportType,
    assetBaseUrl: firstNonEmpty([assetBaseUrl, process.env.APP_BASE_URL]),
  };

  const participant = resolveParticipantFromAssessment(assessment, meta);

  const input = {
    strict: true,
    reportType: normalizedReportType,
    meta,
    participant,
    assessment,
    scores: normalizeScores(assessment, discResult),
    branding,
  };

  return buildReportModel(input);
}

export default buildPremiumReportModel;
