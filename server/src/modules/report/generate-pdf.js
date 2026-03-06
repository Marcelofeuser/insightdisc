import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePdfFromData } from '../../../../reporting/generatePdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../../../generated/reports');

export async function generatePremiumPdf(reportModel, assessmentId, assessment = null) {
  const safeId = String(assessmentId || reportModel?.meta?.reportId || 'export')
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `insightdisc-relatorio-${safeId}.pdf`;

  const data = {
    ...reportModel,
    ...(assessment ? { participant: { ...reportModel?.participant, assessmentId: assessment?.id || safeId } } : {}),
  };

  const result = await generatePdfFromData(data, {
    outputDir: OUTPUT_DIR,
    fileName,
  });

  return {
    pdfUrl: `/reports/${fileName}`,
    outputPath: result.outputPath,
    html: result.html,
  };
}

export default generatePremiumPdf;
