#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { input: 'reports/sample-data.json', output: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--input') {
      args.input = argv[i + 1] || args.input;
      i += 1;
    } else if (current === '--output') {
      args.output = argv[i + 1] || args.output;
      i += 1;
    }
  }
  return args;
}

async function loadJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function escapeForScriptTag(jsonValue) {
  return JSON.stringify(jsonValue)
    .replace(/<\//g, '<\\/')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(ROOT_DIR, input);
  const templatePath = path.resolve(ROOT_DIR, 'reports/report-international.html');

  const data = await loadJson(inputPath);
  const template = await fs.readFile(templatePath, 'utf8');
  const injectedHtml = template.replace('__REPORT_DATA__', escapeForScriptTag(data));

  const reportId = data?.participant?.reportId || 'sample-report';
  const outputPath = output
    ? path.resolve(ROOT_DIR, output)
    : path.resolve(ROOT_DIR, `dist/reports/${reportId}.pdf`);

  await ensureDir(path.dirname(outputPath));

  let launchBrowser;
  try {
    const puppeteerModule = await import('puppeteer');
    launchBrowser = () => puppeteerModule.default.launch({ headless: 'new' });
  } catch {
    try {
      const playwrightModule = await import('playwright');
      launchBrowser = () => playwrightModule.chromium.launch({ headless: true });
    } catch (error) {
      throw new Error(
        `Nem Puppeteer nem Playwright disponíveis para gerar PDF. Erro: ${error?.message || 'desconhecido'}`
      );
    }
  }

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(injectedHtml, { waitUntil: 'networkidle0' });
    if (typeof page.emulateMediaType === 'function') {
      await page.emulateMediaType('screen');
    }

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '8mm',
        bottom: '10mm',
        left: '8mm',
      },
    });
  } finally {
    await browser.close();
  }

  const outputRelative = path.relative(ROOT_DIR, outputPath);
  // eslint-disable-next-line no-console
  console.log(`PDF gerado em: ${outputRelative}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error?.message || error);
  process.exit(1);
});
