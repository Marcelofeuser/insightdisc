import {
  getReportTemplateDefinition,
  type ReportTemplateDefinition,
} from '../domain/reports/report-template-map';
import {
  REPORT_LANGUAGE_FALLBACK,
  REPORT_VERSION,
  type ReportType,
  assertReportType,
  normalizeReportLanguage,
} from '../domain/reports/report-types';
import { loadReportTemplate } from './load-report-template';
import {
  REPORT_PLACEHOLDER_KEYS,
  getReportPlaceholderToken,
  assertKnownPlaceholders,
  assertRequiredPlaceholders,
  type ReportPlaceholderKey,
} from './report-placeholder-schema';

type UnknownRecord = Record<string, unknown>;

export type BuildReportHtmlInput = {
  reportType: ReportType | string;
  language?: string | null;
  version?: string | null;
  input_snapshot?: UnknownRecord | null;
  scoring_snapshot?: UnknownRecord | null;
  template_snapshot?: UnknownRecord | null;
};

export type BuildReportHtmlResult = {
  reportType: ReportType;
  html: string;
  language: string;
  version: typeof REPORT_VERSION;
  templatePath: string;
  cacheKey: string;
  template_snapshot: {
    templatePath: string;
    language: string;
    version: typeof REPORT_VERSION;
    placeholders: readonly ReportPlaceholderKey[];
  };
};

function toRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function pickFirstDefined(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function normalizeScoreValue(value: unknown): string {
  const raw = asText(value);
  if (!raw) return '';

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return String(Math.round(numeric));
  }

  return raw;
}

function getAssessmentSnapshot(input: UnknownRecord): UnknownRecord {
  return toRecord(input.assessment);
}

function getAssessmentResultSnapshot(input: UnknownRecord): UnknownRecord {
  const assessmentResult = toRecord(input.assessment_result);
  return toRecord(assessmentResult.result);
}

function getTemplateSnapshotValue(
  templateSnapshot: UnknownRecord,
  key: ReportPlaceholderKey,
): string {
  const placeholders = toRecord(
    pickFirstDefined(templateSnapshot.placeholders, templateSnapshot.values),
  );

  return asText(
    pickFirstDefined(
      placeholders[key],
      placeholders[getReportPlaceholderToken(key)],
    ),
  );
}

function getTemplateSource(
  loadedTemplateHtml: string,
  templateSnapshot: UnknownRecord,
): string {
  const inlineTemplate = asText(
    pickFirstDefined(
      templateSnapshot.html,
      templateSnapshot.template_html,
      templateSnapshot.templateHtml,
    ),
  );

  return inlineTemplate || loadedTemplateHtml;
}

function getInlineTemplateSource(templateSnapshot: UnknownRecord): string {
  return asText(
    pickFirstDefined(
      templateSnapshot.html,
      templateSnapshot.template_html,
      templateSnapshot.templateHtml,
    ),
  );
}

function resolveName(
  assessment: UnknownRecord,
  templateSnapshot: UnknownRecord,
): string {
  return asText(
    pickFirstDefined(
      assessment.name,
      assessment.candidate_name,
      assessment.candidateName,
      assessment.respondent_name,
      assessment.respondentName,
      assessment.full_name,
      getTemplateSnapshotValue(templateSnapshot, 'name'),
    ),
  );
}

function resolveProfile(
  assessment: UnknownRecord,
  templateSnapshot: UnknownRecord,
): string {
  return asText(
    pickFirstDefined(
      assessment.profile,
      assessment.profile_name,
      assessment.profileName,
      assessment.profile_code,
      assessment.profileCode,
      assessment.disc_profile,
      getTemplateSnapshotValue(templateSnapshot, 'profile'),
    ),
  );
}

function resolveScore(
  result: UnknownRecord,
  key: ReportPlaceholderKey,
  templateSnapshot: UnknownRecord,
): string {
  const shortKey = key.slice(-1).toUpperCase();
  return normalizeScoreValue(
    pickFirstDefined(
      result[key],
      result[shortKey],
      result[shortKey.toLowerCase()],
      getTemplateSnapshotValue(templateSnapshot, key),
    ),
  );
}

function buildPlaceholderValues(
  assessment: UnknownRecord,
  result: UnknownRecord,
  templateSnapshot: UnknownRecord,
): Record<ReportPlaceholderKey, string> {
  return {
    name: resolveName(assessment, templateSnapshot),
    profile: resolveProfile(assessment, templateSnapshot),
    disc_d: resolveScore(result, 'disc_d', templateSnapshot),
    disc_i: resolveScore(result, 'disc_i', templateSnapshot),
    disc_s: resolveScore(result, 'disc_s', templateSnapshot),
    disc_c: resolveScore(result, 'disc_c', templateSnapshot),
  };
}

function resolveRequiredPlaceholders(
  templateHtml: string,
  definition: ReportTemplateDefinition,
  templateSnapshot: UnknownRecord,
): readonly ReportPlaceholderKey[] {
  const configured = pickFirstDefined(
    templateSnapshot.required_placeholders,
    templateSnapshot.requiredPlaceholders,
  );

  if (Array.isArray(configured)) {
    return configured.filter(
      (value): value is ReportPlaceholderKey =>
        typeof value === 'string' &&
        REPORT_PLACEHOLDER_KEYS.includes(value as ReportPlaceholderKey),
    );
  }

  return /\{\{\s*[a-z_]+\s*\}\}/.test(templateHtml)
    ? definition.requiredPlaceholders
    : [];
}

function applyWhitelistedPlaceholders(
  templateHtml: string,
  values: Record<ReportPlaceholderKey, string>,
): string {
  return templateHtml.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key) => {
    if (!REPORT_PLACEHOLDER_KEYS.includes(key as ReportPlaceholderKey)) {
      return match;
    }

    return escapeHtml(values[key as ReportPlaceholderKey] ?? '');
  });
}

export function buildReportHtml(
  input: BuildReportHtmlInput,
): BuildReportHtmlResult {
  const reportType = assertReportType(input.reportType);
  const language = normalizeReportLanguage(
    input.language ??
      input.template_snapshot?.language ??
      REPORT_LANGUAGE_FALLBACK,
  );
  const definition = getReportTemplateDefinition(reportType, language);
  const inputSnapshot = toRecord(input.input_snapshot);
  const scoringSnapshot = toRecord(input.scoring_snapshot);
  const templateSnapshot = toRecord(input.template_snapshot);
  const inlineTemplateHtml = getInlineTemplateSource(templateSnapshot);
  const loadedTemplate = inlineTemplateHtml
    ? {
        html: inlineTemplateHtml,
        templatePath: asText(
          pickFirstDefined(
            templateSnapshot.templatePath,
            templateSnapshot.path,
            definition.templatePath,
          ),
        ) || definition.templatePath,
        cacheKey: [
          REPORT_VERSION,
          definition.language,
          reportType,
          'inline',
        ].join(':'),
        reportType,
        version: REPORT_VERSION,
        language: definition.language,
        fromCache: false,
      }
    : loadReportTemplate(reportType, language);
  const assessment = getAssessmentSnapshot(inputSnapshot);
  const result = getAssessmentResultSnapshot(scoringSnapshot);
  const templateHtml = getTemplateSource(loadedTemplate.html, templateSnapshot);
  const requiredPlaceholders = resolveRequiredPlaceholders(
    templateHtml,
    definition,
    templateSnapshot,
  );
  const placeholderValues = buildPlaceholderValues(
    assessment,
    result,
    templateSnapshot,
  );

  assertKnownPlaceholders(templateHtml);
  assertRequiredPlaceholders(templateHtml, requiredPlaceholders);

  return {
    reportType,
    html: applyWhitelistedPlaceholders(templateHtml, placeholderValues),
    language: definition.language,
    version: REPORT_VERSION,
    templatePath: loadedTemplate.templatePath,
    cacheKey: loadedTemplate.cacheKey,
    template_snapshot: {
      templatePath: loadedTemplate.templatePath,
      language: definition.language,
      version: REPORT_VERSION,
      placeholders: requiredPlaceholders,
    },
  };
}

export default buildReportHtml;
