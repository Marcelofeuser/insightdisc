import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import { generatePdfFromData } from '../../../reporting/generatePdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = process.env.VERCEL
  ? '/tmp/insightdisc-reports'
  : path.resolve(__dirname, '../../../generated/reports');
const DEFAULT_PUPPETEER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

function createLocalPuppeteerLauncher() {
  return {
    name: 'puppeteer',
    launch: () =>
      puppeteer.launch({
        headless: true,
        args: DEFAULT_PUPPETEER_ARGS,
      }),
  };
}

async function createServerlessChromiumLauncher() {
  const executablePath = await chromium.executablePath();
  if (!executablePath) {
    throw new Error('CHROMIUM_EXECUTABLE_PATH_MISSING');
  }

  return {
    name: 'puppeteer-core',
    launch: () =>
      puppeteerCore.launch({
        executablePath,
        headless: true,
        args: Array.from(new Set([...(chromium.args || []), ...DEFAULT_PUPPETEER_ARGS])),
        defaultViewport: chromium.defaultViewport,
      }),
  };
}

export async function loadServerBrowserLauncher() {
  const localLauncher = createLocalPuppeteerLauncher();

  if (process.env.VERCEL) {
    try {
      const serverlessLauncher = await createServerlessChromiumLauncher();
      return {
        ...serverlessLauncher,
        launch: async () => {
          try {
            return await serverlessLauncher.launch();
          } catch (error) {
            console.warn(
              '[report/pdf] Serverless Chromium launch failed, falling back to puppeteer:',
              error?.message || error,
            );
            return localLauncher.launch();
          }
        },
      };
    } catch (error) {
      console.warn(
        '[report/pdf] Vercel Chromium unavailable, falling back to puppeteer:',
        error?.message || error,
      );
    }
  }

  return localLauncher;
}

function normalizePdfBuffer(pdfBuffer) {
  if (!pdfBuffer) return null;
  if (Buffer.isBuffer(pdfBuffer)) return pdfBuffer;
  if (pdfBuffer instanceof Uint8Array) return Buffer.from(pdfBuffer);
  if (ArrayBuffer.isView(pdfBuffer)) {
    return Buffer.from(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
  }
  if (pdfBuffer instanceof ArrayBuffer) {
    return Buffer.from(pdfBuffer);
  }
  return null;
}

export async function generatePremiumPdf(reportModel, assessmentId, assessment = null, options = {}) {
  const safeId = String(assessmentId || reportModel?.meta?.reportId || 'export')
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `insightdisc-relatorio-${safeId}.pdf`;
  const inMemory = Boolean(options.inMemory);

  const data = {
    ...reportModel,
    ...(assessment ? { participant: { ...reportModel?.participant, assessmentId: assessment?.id || safeId } } : {}),
  };
  const browserLauncher = await loadServerBrowserLauncher();

  const result = await generatePdfFromData(data, {
    ...(inMemory ? {} : { outputDir: OUTPUT_DIR }),
    returnBuffer: inMemory,
    fileName,
    browserLauncher,
  });
  const normalizedPdfBuffer = normalizePdfBuffer(result?.pdfBuffer);

  return {
    pdfUrl: inMemory ? '' : `/reports/${fileName}`,
    outputPath: result.outputPath || null,
    pdfBuffer: normalizedPdfBuffer,
    fileName: result.fileName || fileName,
    html: result.html,
  };
}

export default generatePremiumPdf;
