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

function toFileBaseUrl(absoluteDirPath) {
  const normalized = String(absoluteDirPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  return `file://${normalized}/`;
}

function normalizeHtmlAssetPaths(html) {
  const publicBaseUrl = toFileBaseUrl(resolvePath('public'));
  let normalizedHtml = String(html || '');

  if (!/<base\s/i.test(normalizedHtml)) {
    normalizedHtml = normalizedHtml.replace(
      /<head>/i,
      `<head>\n    <base href="${publicBaseUrl}">`
    );
  }

  // Resolve root-based assets (/brand, /report-assets, etc.) when rendering HTML directly from setContent.
  normalizedHtml = normalizedHtml.replace(
    /(["'(])\/(brand|report-assets|assets|reports)\//g,
    `$1${publicBaseUrl}$2/`
  );

  return normalizedHtml;
}

async function inlineOfficialCoverAsset(html) {
  const replacements = [
    {
      publicPath: '/brand/report-cover-premium.jpg',
      diskPath: resolvePath('public', 'brand', 'report-cover-premium.jpg'),
      mimeType: 'image/jpeg',
    },
    {
      publicPath: '/brand/report-cover-standard.jpg',
      diskPath: resolvePath('public', 'brand', 'report-cover-standard.jpg'),
      mimeType: 'image/jpeg',
    },
    {
      publicPath: '/report-assets/cover-insightdisc-premium.png',
      diskPath: resolvePath('public', 'report-assets', 'cover-insightdisc-premium.png'),
      mimeType: 'image/png',
    },
  ];

  let normalizedHtml = String(html || '');

  for (const entry of replacements) {
    try {
      const bytes = await fs.readFile(entry.diskPath);
      const dataUrl = `data:${entry.mimeType};base64,${bytes.toString('base64')}`;
      normalizedHtml = normalizedHtml.replaceAll(entry.publicPath, dataUrl);
    } catch {
      // Keep the original path if local asset is not available.
    }
  }

  return normalizedHtml;
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

  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  if (puppeteer?.launch) {
    return {
      name: 'puppeteer',
      launch: () => puppeteer.launch(launchOptions),
    };
  }

  try {
    const playwright = await import('playwright');
    return {
      name: 'playwright',
      launch: () => playwright.chromium.launch(launchOptions),
    };
  } catch {
    throw new Error(
      'Nenhum motor de browser disponível. Instale puppeteer (raiz ou server/) ou playwright.'
    );
  }
}

export async function generatePdfFromData(rawData, options = {}) {
  const normalizedType =
    String(options?.reportType || rawData?.reportType || rawData?.meta?.reportType || 'standard').toLowerCase() === 'premium'
      ? 'premium'
      : 'standard';
  const input = {
    ...(rawData || {}),
    reportType: normalizedType,
    meta: {
      ...(rawData?.meta || {}),
      reportType: normalizedType,
    },
  };

  const reportModel = await buildReportModel(input);
  const html = renderReportHtml({ reportModel });
  const htmlWithInlinedCover = await inlineOfficialCoverAsset(html);
  const htmlForPdf = normalizeHtmlAssetPaths(htmlWithInlinedCover);

  const fileName = options.fileName || outputFileName(reportModel);
  const shouldReturnBuffer = Boolean(options.returnBuffer);
  let outputPath = '';
  let pdfBuffer = null;
  let outputRelative = '';

  if (!shouldReturnBuffer) {
    const defaultOutputDir = resolvePath('dist', 'reports');
    const outputDir = path.resolve(options.outputDir || defaultOutputDir);
    await ensureDir(outputDir);
    outputPath = path.join(outputDir, fileName);
    outputRelative = path.relative(ROOT_DIR, outputPath);
  }

  const engine = options.browserLauncher || (await loadBrowserLauncher());
  const browser = await engine.launch();

  try {
    const page = await browser.newPage();
    await page.setContent(htmlForPdf, {
      waitUntil: engine.name === 'playwright' ? 'networkidle' : 'networkidle0',
    });
    const coverStatus = await page.evaluate(() => {
      const cover = document.querySelector('.cover-content');
      if (!cover) return { found: false };
      const coverImage = cover.querySelector('.cover-art-image');
      const rect = cover.getBoundingClientRect();
      const computed = window.getComputedStyle(cover);
      const backgroundImage = String(computed.backgroundImage || '');
      return {
        found: true,
        width: Number(rect.width || 0),
        height: Number(rect.height || 0),
        hasBackgroundImage: Boolean(backgroundImage && backgroundImage !== 'none'),
        hasCoverImage:
          Boolean(coverImage) &&
          Number(coverImage?.naturalWidth || 0) > 0 &&
          Number(coverImage?.naturalHeight || 0) > 0,
      };
    });
    if (
      !coverStatus?.found ||
      (!coverStatus?.hasBackgroundImage && !coverStatus?.hasCoverImage) ||
      coverStatus.width === 0 ||
      coverStatus.height === 0
    ) {
      throw new Error('Falha ao carregar a capa oficial do relatório no HTML antes de gerar PDF.');
    }
    if (typeof page.emulateMediaType === 'function') {
      await page.emulateMediaType('print');
    }

    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true,
    };

    if (shouldReturnBuffer) {
      pdfBuffer = await page.pdf(pdfOptions);
    } else {
      await page.pdf({
        ...pdfOptions,
        path: outputPath,
      });
    }
  } finally {
    await browser.close();
  }

  return {
    engine: engine.name,
    outputPath: outputPath || null,
    outputRelative: outputRelative || null,
    pdfBuffer,
    fileName,
    html: htmlForPdf,
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
