#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildReportModel } from './buildReportModel.js';
import { renderReportHtml } from './renderReportHtml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function resolvePath(...parts) {
  return path.resolve(ROOT_DIR, ...parts);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function outputFileName(reportModel) {
  const reportId =
    reportModel?.meta?.reportId ||
    reportModel?.participant?.assessmentId ||
    `report-${Date.now()}`;
  return `${String(reportId).replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
}

async function loadBrowserLauncher() {
  const localRequire = createRequire(import.meta.url);
  const serverPackagePath = resolvePath('server', 'package.json');
  let serverRequire = null;

  try {
    serverRequire = createRequire(serverPackagePath);
  } catch {
    serverRequire = null;
  }

  const tryRequire = (req, name) => {
    try {
      return req(name);
    } catch {
      return null;
    }
  };

  const puppeteer =
    tryRequire(localRequire, 'puppeteer') ||
    (serverRequire ? tryRequire(serverRequire, 'puppeteer') : null);

  if (puppeteer?.launch) {
    return {
      name: 'puppeteer',
      launch: () => puppeteer.launch({ headless: 'new' }),
    };
  }

  try {
    const playwright = await import('playwright');
    return {
      name: 'playwright',
      launch: () => playwright.chromium.launch({ headless: true }),
    };
  } catch {
    throw new Error(
      'Nenhum motor de browser disponível. Instale puppeteer (raiz ou server/) ou playwright.'
    );
  }
}

export async function generatePdfFromData(rawData, options = {}) {
  const reportModel = await buildReportModel(rawData || {});
  const html = renderReportHtml({ reportModel });

  const defaultOutputDir = resolvePath('dist', 'reports');
  const outputDir = path.resolve(options.outputDir || defaultOutputDir);
  await ensureDir(outputDir);

  const fileName = options.fileName || outputFileName(reportModel);
  const outputPath = path.join(outputDir, fileName);

  const engine = await loadBrowserLauncher();
  const browser = await engine.launch();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    if (typeof page.emulateMediaType === 'function') {
      await page.emulateMediaType('print');
    }

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }

  return {
    engine: engine.name,
    outputPath,
    outputRelative: path.relative(ROOT_DIR, outputPath),
    html,
    reportModel,
  };
}

export async function generatePdfFromFile(inputFilePath, options = {}) {
  const absoluteInput = path.resolve(inputFilePath || resolvePath('reporting', 'sample-data.json'));
  const input = await readJson(absoluteInput);
  return generatePdfFromData(input, options);
}

async function cli() {
  const inputArg = process.argv[2] || resolvePath('reporting', 'sample-data.json');
  const result = await generatePdfFromFile(inputArg);
  // eslint-disable-next-line no-console
  console.log(`PDF gerado com ${result.engine}: ${result.outputRelative}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cli().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error?.message || error);
    process.exit(1);
  });
}
