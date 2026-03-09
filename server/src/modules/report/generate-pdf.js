import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePdfFromData } from '../../../../reporting/generatePdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = process.env.VERCEL
  ? '/tmp/insightdisc-reports'
  : path.resolve(__dirname, '../../../generated/reports');

export async function generatePremiumPdf(reportModel, assessmentId, assessment = null, options = {}) {
  const safeId = String(assessmentId || reportModel?.meta?.reportId || 'export')
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `insightdisc-relatorio-${safeId}.pdf`;
  const inMemory = Boolean(options.inMemory);

  const data = {
    ...reportModel,
    ...(assessment ? { participant: { ...reportModel?.participant, assessmentId: assessment?.id || safeId } } : {}),
  };

  const result = await generatePdfFromData(data, {
    ...(inMemory ? {} : { outputDir: OUTPUT_DIR }),
    returnBuffer: inMemory,
    fileName,
  });

  return {
    pdfUrl: inMemory ? '' : `/reports/${fileName}`,
    outputPath: result.outputPath || null,
    pdfBuffer: result.pdfBuffer || null,
    fileName: result.fileName || fileName,
    html: result.html,
  };
}

export default generatePremiumPdf;
