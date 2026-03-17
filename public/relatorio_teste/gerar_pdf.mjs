import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const inputArg = process.argv[2];
const outputArg = process.argv[3];

if (!inputArg || !outputArg) {
  console.log('Uso:');
  console.log('node gerar_pdf.mjs input.html output.pdf');
  process.exit(1);
}

const baseDir = path.dirname(fileURLToPath(import.meta.url));

function resolveFile(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(baseDir, targetPath);
}

const inputPath = resolveFile(inputArg);
const outputPath = resolveFile(outputArg);

let browser;

try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
  });

  await page.emulateMediaType('screen');
  await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
    },
    preferCSSPageSize: true,
  });

  console.log(`PDF gerado com sucesso: ${outputPath}`);
} catch (error) {
  console.error('Erro ao gerar PDF:', error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }
}
