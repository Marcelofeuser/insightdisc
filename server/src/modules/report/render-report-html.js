import { renderReportHtml as renderDeterministicReportHtml } from '../../shared/reporting/renderReportHtml.js';
import { assertOfficialTemplateCompatibility } from '../../services/reportGenerator.js';

export async function assertOfficialReportHtml(input = {}) {
  return assertOfficialTemplateCompatibility(input);
}

export function renderReportHtml(input) {
  return renderDeterministicReportHtml(input);
}

export default renderReportHtml;
