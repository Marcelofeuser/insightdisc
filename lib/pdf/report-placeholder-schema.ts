import { createReportError } from '../domain/reports/report-types';

export const REPORT_PLACEHOLDER_TOKENS = {
  name: '{{name}}',
  profile: '{{profile}}',
  disc_d: '{{disc_d}}',
  disc_i: '{{disc_i}}',
  disc_s: '{{disc_s}}',
  disc_c: '{{disc_c}}',
} as const;

export type ReportPlaceholderKey = keyof typeof REPORT_PLACEHOLDER_TOKENS;
export type ReportPlaceholderToken =
  (typeof REPORT_PLACEHOLDER_TOKENS)[ReportPlaceholderKey];

export const REPORT_PLACEHOLDER_KEYS = Object.freeze(
  Object.keys(REPORT_PLACEHOLDER_TOKENS),
) as readonly ReportPlaceholderKey[];

export const REPORT_REQUIRED_PLACEHOLDERS = REPORT_PLACEHOLDER_KEYS;

const PLACEHOLDER_TOKEN_SET = new Set<string>(
  Object.values(REPORT_PLACEHOLDER_TOKENS),
);

const PLACEHOLDER_MATCHER = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function isReportPlaceholderKey(
  value: unknown,
): value is ReportPlaceholderKey {
  return (
    typeof value === 'string' &&
    REPORT_PLACEHOLDER_KEYS.includes(value as ReportPlaceholderKey)
  );
}

export function getReportPlaceholderToken(
  key: ReportPlaceholderKey,
): ReportPlaceholderToken {
  return REPORT_PLACEHOLDER_TOKENS[key];
}

export function listTemplatePlaceholderTokens(templateHtml: string): string[] {
  const matches = templateHtml.match(/\{\{\s*[a-z_]+\s*\}\}/g) ?? [];
  return [...new Set(matches)];
}

export function listTemplatePlaceholderKeys(
  templateHtml: string,
): ReportPlaceholderKey[] {
  const keys = new Set<ReportPlaceholderKey>();

  for (const match of templateHtml.matchAll(PLACEHOLDER_MATCHER)) {
    const key = match[1]?.trim();
    if (isReportPlaceholderKey(key)) {
      keys.add(key);
    }
  }

  return [...keys];
}

export function assertKnownPlaceholders(templateHtml: string): void {
  const unknownTokens = listTemplatePlaceholderTokens(templateHtml).filter(
    (token) => !PLACEHOLDER_TOKEN_SET.has(token.replace(/\s+/g, '')),
  );

  if (unknownTokens.length > 0) {
    throw createReportError(
      'UNKNOWN_PLACEHOLDER',
      'Unknown placeholder found in report template.',
      { placeholders: unknownTokens },
    );
  }
}

export function assertRequiredPlaceholders(
  templateHtml: string,
  requiredPlaceholders: readonly ReportPlaceholderKey[],
): void {
  if (requiredPlaceholders.length === 0) {
    return;
  }

  const available = new Set(listTemplatePlaceholderKeys(templateHtml));
  const missing = requiredPlaceholders.filter((key) => !available.has(key));

  if (missing.length > 0) {
    throw createReportError(
      'MISSING_REQUIRED_PLACEHOLDER',
      'Missing required placeholder in report template.',
      { placeholders: missing },
    );
  }
}
