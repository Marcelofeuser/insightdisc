const DEFAULT_PUBLIC_REPORT_URL =
  'http://localhost:5173/c/report?id=assessment-2&token=tok-2';

export const publicReportUrl = process.env.PW_PUBLIC_REPORT_URL || DEFAULT_PUBLIC_REPORT_URL;
