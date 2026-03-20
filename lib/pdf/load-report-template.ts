import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getReportTemplateDefinition } from '../domain/reports/report-template-map';
import {
  REPORT_VERSION,
  createReportError,
  type ReportType,
} from '../domain/reports/report-types';

type CachedTemplate = {
  html: string;
  templatePath: string;
  cacheKey: string;
  reportType: ReportType;
  version: typeof REPORT_VERSION;
  language: string;
};

const templateCache = new Map<string, CachedTemplate>();

export type LoadedReportTemplate = CachedTemplate & {
  fromCache: boolean;
};

export function clearReportTemplateCache(): void {
  templateCache.clear();
}

export function loadReportTemplate(
  reportType: unknown,
  language?: unknown,
): LoadedReportTemplate {
  const definition = getReportTemplateDefinition(reportType, language);
  const absoluteTemplatePath = resolve(process.cwd(), definition.templatePath);
  const cacheKey = [
    definition.version,
    definition.language,
    definition.reportType,
    absoluteTemplatePath,
  ].join(':');

  const cached = templateCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      fromCache: true,
    };
  }

  let html = '';

  try {
    html = readFileSync(absoluteTemplatePath, 'utf8');
  } catch (error) {
    throw createReportError(
      'TEMPLATE_NOT_FOUND',
      'Report template not found.',
      {
        reportType: definition.reportType,
        templatePath: absoluteTemplatePath,
        cause:
          error instanceof Error ? error.message : 'UNKNOWN_TEMPLATE_READ_ERROR',
      },
    );
  }

  const loaded: CachedTemplate = {
    html,
    templatePath: absoluteTemplatePath,
    cacheKey,
    reportType: definition.reportType,
    version: definition.version,
    language: definition.language,
  };

  templateCache.set(cacheKey, loaded);

  return {
    ...loaded,
    fromCache: false,
  };
}
