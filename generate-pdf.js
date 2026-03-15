import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { buildReportModel } from "./reporting/buildReportModel.js";
import { renderOfficialSlidesHtml } from "./reporting/renderOfficialSlidesHtml.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VARIANTS = {
  personal: {
    reportType: "standard",
    pdf: "report-personal.pdf",
  },
  professional: {
    reportType: "professional",
    pdf: "report-professional.pdf",
  },
  business: {
    reportType: "premium",
    pdf: "report-business.pdf",
  },
};

function parseArgs(argv) {
  const args = {
    variant: String(argv[0] || "business").toLowerCase(),
    data: "",
  };

  for (let index = 1; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--data") {
      args.data = argv[index + 1] || "";
      index += 1;
    }
  }

  return args;
}

function loadContext(filePath) {
  if (!filePath) return {};
  const resolvedPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Arquivo de contexto não encontrado: ${resolvedPath}`);
  }
  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

async function buildRuntimeHtml(variant, dataArg) {
  const seed = loadContext(dataArg || "reporting/sample-data.json");
  const model = await buildReportModel({
    ...seed,
    reportType: VARIANTS[variant].reportType,
  });
  return renderOfficialSlidesHtml({ variant, model });
}

const { variant, data } = parseArgs(process.argv.slice(2));

if (!VARIANTS[variant]) {
  console.error("Uso: node generate-pdf.js <personal|professional|business> [--data caminho/do/contexto.json]");
  process.exit(1);
}

const outputDir = path.resolve(__dirname, "reports", "insightdisc");
fs.mkdirSync(outputDir, { recursive: true });

const runtimeHtmlPath = path.resolve(__dirname, `.tmp-report-${variant}.html`);
const targetPdf = path.resolve(outputDir, VARIANTS[variant].pdf);

const pdfOptions = {
  path: targetPdf,
  landscape: false,
  width: "1600px",
  height: "900px",
  printBackground: true,
  preferCSSPageSize: true,
  margin: {
    top: "0mm",
    right: "0mm",
    bottom: "0mm",
    left: "0mm",
  },
};

async function runWithPuppeteer() {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.goto(`file://${runtimeHtmlPath}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-report-ready") === "true",
      { timeout: 45000 }
    );
    await page.pdf(pdfOptions);
  } finally {
    await browser.close();
  }
}

async function runWithPlaywright() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`file://${runtimeHtmlPath}`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.documentElement.getAttribute("data-report-ready") === "true",
      undefined,
      { timeout: 45000 }
    );
    await page.pdf(pdfOptions);
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    const runtimeHtml = await buildRuntimeHtml(variant, data);
    fs.writeFileSync(runtimeHtmlPath, runtimeHtml, "utf8");

    try {
      await runWithPuppeteer();
      console.log(`PDF gerado com Puppeteer: ${targetPdf}`);
      return;
    } catch (error) {
      if (error && (error.code === "MODULE_NOT_FOUND" || /Cannot find module/.test(String(error.message)))) {
        await runWithPlaywright();
        console.log(`PDF gerado com Playwright (fallback): ${targetPdf}`);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("Falha ao gerar PDF:", error);
    process.exit(1);
  } finally {
    try {
      fs.unlinkSync(runtimeHtmlPath);
    } catch {
      // noop
    }
  }
})();
