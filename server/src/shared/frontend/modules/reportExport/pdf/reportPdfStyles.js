export const REPORT_PDF_STYLES = `
:root {
  --brand-900: #0f172a;
  --brand-800: #1e293b;
  --brand-700: #334155;
  --brand-500: #475569;
  --brand-300: #cbd5e1;
  --surface-0: #ffffff;
  --surface-1: #f8fafc;
  --surface-2: #f1f5f9;
  --accent: #4f46e5;
  --accent-soft: #e0e7ff;
  --positive-soft: #ecfdf5;
  --positive-border: #a7f3d0;
  --warning-soft: #fffbeb;
  --warning-border: #fde68a;
  --danger-soft: #fef2f2;
  --danger-border: #fecaca;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  color: var(--brand-900);
  background: var(--surface-0);
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.45;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@page {
  size: A4;
  margin: 12mm;
}

h1,
h2,
h3,
h4,
p,
ul,
ol {
  margin: 0;
}

.report-document {
  width: 100%;
}

.report-page {
  position: relative;
  padding-bottom: 6mm;
  page-break-after: always;
}

.report-page:last-child {
  page-break-after: auto;
}

.cover {
  min-height: 271mm;
  border: 1px solid var(--brand-300);
  border-radius: 16px;
  padding: 14mm;
  background: linear-gradient(165deg, #ffffff 0%, #eef2ff 38%, #f8fafc 100%);
}

.cover-kicker {
  font-size: 10px;
  letter-spacing: 0.14em;
  font-weight: 700;
  text-transform: uppercase;
  color: #3730a3;
}

.cover-title {
  margin-top: 6px;
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.cover-subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: var(--brand-700);
}

.cover-summary {
  margin-top: 14px;
  border: 1px solid var(--brand-300);
  border-radius: 10px;
  background: var(--surface-0);
  padding: 10px;
  color: var(--brand-700);
}

.badge-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--brand-300);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 10px;
  font-weight: 700;
  background: var(--surface-0);
  color: var(--brand-700);
}

.badge-accent {
  border-color: #c7d2fe;
  background: var(--accent-soft);
  color: #3730a3;
}

.cover-meta {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.meta-card {
  border: 1px solid var(--brand-300);
  border-radius: 10px;
  background: var(--surface-0);
  padding: 9px;
}

.meta-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--brand-500);
  font-weight: 700;
}

.meta-value {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-900);
}

.section-shell {
  border: 1px solid var(--brand-300);
  border-radius: 14px;
  background: var(--surface-0);
  padding: 10px;
  break-inside: avoid-page;
  page-break-inside: avoid;
}

.section-shell + .section-shell {
  margin-top: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--brand-900);
  break-after: avoid;
  page-break-after: avoid;
}

.section-subtitle {
  margin-top: 3px;
  color: var(--brand-500);
  font-size: 11px;
  break-after: avoid;
  page-break-after: avoid;
}

.grid-2 {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.grid-3 {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.card {
  border: 1px solid var(--brand-300);
  border-radius: 10px;
  background: var(--surface-0);
  padding: 8px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.card-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-900);
}

.card-text {
  margin-top: 5px;
  color: var(--brand-700);
  font-size: 11px;
  orphans: 3;
  widows: 3;
}

.list {
  margin-top: 6px;
  list-style: none;
  padding: 0;
  display: grid;
  gap: 5px;
}

.list li {
  border: 1px solid var(--brand-300);
  border-radius: 8px;
  background: var(--surface-1);
  padding: 6px;
  color: var(--brand-700);
  font-size: 11px;
}

.list-positive li {
  border-color: var(--positive-border);
  background: var(--positive-soft);
}

.list-warning li {
  border-color: var(--warning-border);
  background: var(--warning-soft);
}

.list-danger li {
  border-color: var(--danger-border);
  background: var(--danger-soft);
}

.score-row {
  margin-top: 6px;
  border: 1px solid var(--brand-300);
  border-radius: 8px;
  background: var(--surface-1);
  padding: 6px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.score-track {
  margin-top: 5px;
  height: 6px;
  width: 100%;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 999px;
}

.radar-wrap {
  margin-top: 8px;
  border: 1px solid var(--brand-300);
  border-radius: 10px;
  padding: 8px;
  background: var(--surface-1);
}

.radar-wrap svg {
  width: 100%;
  height: auto;
  display: block;
}

.avoid-break {
  break-inside: avoid;
  page-break-inside: avoid;
}

.break-before {
  page-break-before: always;
}

.footer-note {
  margin-top: 8px;
  color: var(--brand-500);
  font-size: 10px;
}

.page-footer {
  margin-top: 10px;
  border-top: 1px solid var(--brand-300);
  padding-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--brand-500);
  font-size: 9px;
}

.page-index::before {
  content: "Página " counter(page) " de " counter(pages);
}
`;

export default REPORT_PDF_STYLES;
