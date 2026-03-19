export const REPORT_TYPE = Object.freeze({
  PERSONAL: 'personal',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
});

const LEGACY_REPORT_TYPE_MAP = Object.freeze({
  standard: REPORT_TYPE.PERSONAL,
  personal: REPORT_TYPE.PERSONAL,
  professional: REPORT_TYPE.PROFESSIONAL,
  premium: REPORT_TYPE.BUSINESS,
  business: REPORT_TYPE.BUSINESS,
});

export function normalizeReportType(value, fallback = REPORT_TYPE.BUSINESS) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (LEGACY_REPORT_TYPE_MAP[normalized]) {
    return LEGACY_REPORT_TYPE_MAP[normalized];
  }

  return LEGACY_REPORT_TYPE_MAP[String(fallback || '').trim().toLowerCase()] || REPORT_TYPE.BUSINESS;
}

export function resolveStoredReportType(source = {}, fallback = REPORT_TYPE.BUSINESS) {
  return normalizeReportType(
    source?.reportType ||
      source?.meta?.reportType ||
      source?.report?.discProfile?.meta?.reportType ||
      source?.report?.discProfile?.reportType,
    fallback,
  );
}

export function reportTypeLabel(reportType) {
  const normalized = normalizeReportType(reportType);
  if (normalized === REPORT_TYPE.PERSONAL) return 'Personal';
  if (normalized === REPORT_TYPE.PROFESSIONAL) return 'Professional';
  return 'Business';
}

export default normalizeReportType;
