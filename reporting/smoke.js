#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReportModel } from './buildReportModel.js';
import { renderReportHtml } from './renderReportHtml.js';
import { generatePdfFromData } from './generatePdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_LOGO = '/brand/insightdisc-report-logo.png';
const PROFILES_DIR = path.resolve(__dirname, 'content', 'profiles');
const REQUIRED_PROFILE_KEYS = ['D', 'I', 'S', 'C', 'DI', 'ID', 'DS', 'SD', 'DC', 'CD', 'IS', 'SI', 'IC', 'CI', 'SC', 'CS'];
const REQUIRED_PROFILE_FIELDS = [
  'key',
  'title',
  'archetype',
  'summary',
  'executiveSummary',
  'identityDynamics',
  'decisionStyle',
  'motivators',
  'energyDrainers',
  'workStrengths',
  'workRisks',
  'communicationStyle',
  'communicationNeeds',
  'communicationDo',
  'communicationDont',
  'leadershipStyle',
  'leadershipStrengths',
  'leadershipRisks',
  'stressPattern',
  'stressSignals',
  'recoveryStrategy',
  'conflictStyle',
  'teamContribution',
  'bestMatches',
  'frictionMatches',
  'idealEnvironment',
  'lowFitEnvironment',
  'recommendedRoles',
  'lowFitRoles',
  'naturalStrengths',
  'developmentPoints',
  'developmentRisks',
  'managerGuidance',
  'selfLeadershipGuidance',
  'plan30',
  'plan60',
  'plan90',
  'executiveClosing',
];

function baseData() {
  return {
    strict: true,
    meta: {
      brand: 'InsightDISC',
      reportTitle: 'Relatorio de Analise Comportamental DISC',
      reportSubtitle:
        'Diagnostico comportamental completo com benchmark, comunicacao, lideranca, riscos, carreira e plano de desenvolvimento',
      generatedAt: '2026-03-06T12:00:00.000Z',
      version: '5.0',
      workspaceId: 'workspace-insightdisc',
      responsibleName: 'Especialista InsightDISC',
      responsibleRole: 'Especialista em Analise Comportamental',
    },
    participant: {
      name: 'Participante Smoke',
      email: 'smoke@example.com',
      assessmentId: `smoke-${Date.now()}`,
      role: 'Gestor(a)',
      company: 'InsightDISC',
    },
    branding: {
      company_name: 'InsightDISC',
      logo_url: REQUIRED_LOGO,
      brand_primary_color: '#0b1f3b',
      brand_secondary_color: '#f7b500',
      report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
    },
    scores: {
      natural: { D: 25, I: 25, S: 25, C: 25 },
      adapted: { D: 25, I: 25, S: 25, C: 25 },
    },
  };
}

function scenarioPureD() {
  const data = baseData();
  data.meta.reportId = `smoke-pure-D-${Date.now()}`;
  data.participant.name = 'Smoke D Puro';
  data.scores.natural = { D: 86, I: 34, S: 27, C: 20 };
  data.scores.adapted = { D: 80, I: 39, S: 33, C: 28 };
  return data;
}

function scenarioComboIS() {
  const data = baseData();
  data.meta.reportId = `smoke-combo-IS-${Date.now()}`;
  data.participant.name = 'Smoke Combo IS';
  data.scores.natural = { D: 32, I: 74, S: 69, C: 30 };
  data.scores.adapted = { D: 37, I: 66, S: 62, C: 36 };
  return data;
}

function scenarioComboDC() {
  const data = baseData();
  data.meta.reportId = `smoke-combo-DC-${Date.now()}`;
  data.participant.name = 'Smoke Combo DC';
  data.scores.natural = { D: 72, I: 29, S: 35, C: 68 };
  data.scores.adapted = { D: 76, I: 34, S: 41, C: 62 };
  return data;
}

function scenarioLogoLockup() {
  const data = baseData();
  data.meta.reportId = `smoke-logo-lockup-${Date.now()}`;
  data.participant.name = 'Smoke Lockup Logo';
  data.branding.logo_contains_tagline = true;
  data.scores.natural = { D: 58, I: 61, S: 42, C: 38 };
  data.scores.adapted = { D: 55, I: 57, S: 48, C: 44 };
  return data;
}

function stripTags(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPageBodies(html) {
  const matches = [...String(html || '').matchAll(/<section class="page[^"]*">([\s\S]*?)<\/section>/g)];
  return matches.map((match) => String(match[1] || ''));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateHtml(model, html, { expectTaglineHidden = false } = {}) {
  const pageBodies = getPageBodies(html);
  assert(pageBodies.length === 30, `Esperado 30 paginas, encontrado ${pageBodies.length}.`);
  assert(html.includes('class="page cover-page"'), 'Pagina 1 (capa) nao encontrada como cover-page.');
  assert(/\.cover-page\s*\{[\s\S]*background:\s*#ffffff;/m.test(html), 'Capa nao esta branca.');
  assert(!html.includes('/brand/insightdisc-logo-transparent.png'), 'Logo antiga ainda encontrada.');
  assert(html.includes(REQUIRED_LOGO), 'Logo oficial nao encontrada no HTML.');
  assert(!html.includes('Nao informado'), 'Placeholder "Nao informado" encontrado.');
  assert(!html.includes('Arquetipo nao informado'), 'Placeholder de arquetipo encontrado.');
  assert(html.includes('Sinergia com Outros Perfis DISC'), 'Secao de compatibilidade nao encontrada.');
  assert(
    html.includes('Aderência a Funções e Carreira') || html.includes('Aderencia a Funcoes e Carreira'),
    'Secao de carreira nao encontrada.'
  );
  assert(html.includes('Forças Naturais') || html.includes('Forcas Naturais'), 'Secao de forcas nao encontrada.');
  assert(html.includes('Pontos de Desenvolvimento'), 'Secao de desenvolvimento nao encontrada.');

  const logoMatches = [...html.matchAll(/<img[^>]+class="cover-logo"[^>]*>/g)];
  assert(logoMatches.length === 1, `Esperado 1 bloco de logo na capa, encontrado ${logoMatches.length}.`);
  if (expectTaglineHidden) {
    assert(!html.includes('class="cover-tagline"'), 'Tagline duplicada encontrada quando o lockup da logo ja contem subtitulo.');
  }

  for (let index = 0; index < pageBodies.length; index += 1) {
    const plain = stripTags(pageBodies[index]);
    const minChars = index === 0 ? 220 : 520;
    assert(
      plain.length >= minChars,
      `Pagina ${index + 1} com densidade baixa (${plain.length} caracteres).`
    );
  }

  assert(model?.meta?.totalPages === 30, 'ReportModel nao sinaliza 30 paginas.');
  assert(model?.profileContent?.bestMatches?.length >= 4, 'Compatibilidade de perfis insuficiente.');
  assert(model?.profileContent?.recommendedRoles?.length >= 6, 'Carreira sem recomendacoes suficientes.');
  assert(model?.profileContent?.naturalStrengths?.length >= 6, 'Forcas naturais insuficientes.');
  assert(model?.profileContent?.developmentPoints?.length >= 6, 'Pontos de desenvolvimento insuficientes.');
}

async function validateProfileLibrary() {
  const entries = await fs.readdir(PROFILES_DIR, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name);
  const keys = fileNames.map((fileName) => fileName.replace(/\.json$/, '')).sort();

  for (const key of REQUIRED_PROFILE_KEYS) {
    assert(keys.includes(key), `Perfil ${key}.json nao encontrado em reporting/content/profiles.`);
  }

  for (const key of REQUIRED_PROFILE_KEYS) {
    const filePath = path.join(PROFILES_DIR, `${key}.json`);
    const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

    for (const field of REQUIRED_PROFILE_FIELDS) {
      assert(field in content, `Campo obrigatorio "${field}" ausente em ${key}.json.`);
    }

    assert(Array.isArray(content.executiveSummary) && content.executiveSummary.length >= 4, `${key}.json com executiveSummary insuficiente.`);
    assert(Array.isArray(content.identityDynamics) && content.identityDynamics.length >= 4, `${key}.json com identityDynamics insuficiente.`);
    assert(Array.isArray(content.workStrengths) && content.workStrengths.length >= 6, `${key}.json com workStrengths insuficiente.`);
    assert(Array.isArray(content.developmentPoints) && content.developmentPoints.length >= 6, `${key}.json com developmentPoints insuficiente.`);
    assert(Array.isArray(content.executiveClosing) && content.executiveClosing.length >= 3, `${key}.json com executiveClosing insuficiente.`);
  }
}

async function run() {
  const outputDir = path.resolve(ROOT_DIR, 'dist', 'reports');
  await validateProfileLibrary();

  const scenarios = [
    { data: scenarioPureD(), options: {} },
    { data: scenarioComboIS(), options: {} },
    { data: scenarioComboDC(), options: {} },
    { data: scenarioLogoLockup(), options: { expectTaglineHidden: true } },
  ];

  for (const scenarioEntry of scenarios) {
    const scenario = scenarioEntry.data;
    const reportModel = await buildReportModel(scenario);
    const html = renderReportHtml({ reportModel });
    validateHtml(reportModel, html, scenarioEntry.options);

    const result = await generatePdfFromData(scenario, { outputDir });
    // eslint-disable-next-line no-console
    console.log(`${scenario.meta.reportId}: ${result.outputRelative}`);
  }

  // eslint-disable-next-line no-console
  console.log('Smoke de relatorio concluido com sucesso.');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error?.message || error);
  process.exit(1);
});
