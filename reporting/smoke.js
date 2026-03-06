#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePdfFromData } from './generatePdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function baseData() {
  return {
    meta: {
      brand: 'InsightDISC',
      reportTitle: 'Relatório DISC Profissional',
      reportSubtitle: 'Smoke test determinístico',
      generatedAt: '2026-03-05',
      version: '3.0',
    },
    participant: {
      name: 'Participante Smoke',
      email: 'smoke@example.com',
      assessmentId: `smoke-${Date.now()}`,
      role: 'Gestor(a)',
      company: 'InsightDISC Labs',
    },
    scores: {
      natural: { D: 25, I: 25, S: 25, C: 25 },
      adapted: { D: 25, I: 25, S: 25, C: 25 },
    },
  };
}

function scenarioD() {
  const data = baseData();
  data.meta.reportId = `smoke-pure-D-${Date.now()}`;
  data.participant.name = 'Smoke D Puro';
  data.scores.natural = { D: 86, I: 36, S: 29, C: 21 };
  data.scores.adapted = { D: 78, I: 40, S: 35, C: 28 };
  return data;
}

function scenarioIS() {
  const data = baseData();
  data.meta.reportId = `smoke-combo-IS-${Date.now()}`;
  data.participant.name = 'Smoke Combo IS';
  data.scores.natural = { D: 30, I: 72, S: 66, C: 32 };
  data.scores.adapted = { D: 38, I: 67, S: 62, C: 36 };
  return data;
}

function scenarioDC() {
  const data = baseData();
  data.meta.reportId = `smoke-combo-DC-${Date.now()}`;
  data.participant.name = 'Smoke Combo DC';
  data.scores.natural = { D: 71, I: 38, S: 34, C: 66 };
  data.scores.adapted = { D: 74, I: 42, S: 37, C: 61 };
  return data;
}

async function run() {
  const outputDir = path.resolve(ROOT_DIR, 'dist', 'reports');
  const scenarios = [scenarioD(), scenarioIS(), scenarioDC()];

  for (const data of scenarios) {
    const result = await generatePdfFromData(data, { outputDir });
    // eslint-disable-next-line no-console
    console.log(`${data.meta.reportId}: ${result.outputRelative}`);
  }
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error?.message || error);
  process.exit(1);
});

