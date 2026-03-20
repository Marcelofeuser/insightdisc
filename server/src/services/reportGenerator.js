import { exec } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateAiDiscContent } from '../modules/ai/ai-report.service.js';

const basePath = '/Users/marcelofeuser/Projects/insightdisc/public/relatorio_teste';
const MASTER_TEMPLATE_PATH = path.join(basePath, 'relatorio_disc_pdf.html');
const REPORT_PLACEHOLDER_KEYS = Object.freeze([
  'name',
  'profile',
  'disc_d',
  'disc_i',
  'disc_s',
  'disc_c',
]);
const PROFILE_NAMES = Object.freeze({
  DD: 'Dominante Puro',
  DI: 'Dominante Influente',
  DS: 'Dominante Estável',
  DC: 'Dominante Analítico',
  ID: 'Influente Dominante',
  II: 'Influente Puro',
  IS: 'Influente Estável',
  IC: 'Influente Analítico',
  SD: 'Estável Dominante',
  SI: 'Estável Influente',
  SS: 'Estável Puro',
  SC: 'Estável Analítico',
  CD: 'Analítico Dominante',
  CI: 'Analítico Influente',
  CS: 'Analítico Estável',
  CC: 'Analítico Puro',
});
const REPORT_LIB_TS_FILES = Object.freeze([
  'lib/domain/reports/report-types.ts',
  'lib/domain/reports/report-template-map.ts',
  'lib/pdf/load-report-template.ts',
  'lib/pdf/report-placeholder-schema.ts',
  'lib/pdf/build-report-html.ts',
]);

const REPORT_OUTPUTS = {
  personal: {
    html: 'relatorio_disc_personal.html',
    pdf: 'relatorio_disc_personal.pdf',
  },
  professional: {
    html: 'relatorio_disc_professional.html',
    pdf: 'relatorio_disc_professional.pdf',
  },
  business: {
    html: 'relatorio_disc_business.html',
    pdf: 'relatorio_disc_business.pdf',
  },
};
const OFFICIAL_TEMPLATE_PATHS = Object.freeze({
  personal: 'templates/reports/relatorio_disc_personal.html',
  professional: 'templates/reports/relatorio_disc_professional.html',
  business: 'templates/reports/relatorio_disc_business.html',
});
const OFFICIAL_TEMPLATE_VALIDATION_HTML =
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" /></head><body>{{name}} {{profile}} {{disc_d}} {{disc_i}} {{disc_s}} {{disc_c}}</body></html>';
const modeLocks = new Map();
const templateCache = new Map();
const templateInflight = new Map();
let reportHtmlEnginePromise = null;
let discEngineRuntimePromise = null;

function normalizeMode(mode = 'business') {
  const normalized = String(mode || '').trim().toLowerCase();
  return REPORT_OUTPUTS[normalized] ? normalized : 'business';
}

function sanitizeLogValue(value, maximumLength = 400) {
  return String(value || '')
    .trim()
    .slice(0, maximumLength);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildArg(name, value) {
  if (value === undefined || value === null || value === '') return '';
  return ` --${name}=${shellEscape(value)}`;
}

function hasMeaningfulAiSourceContent(content) {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      Object.entries(content).some(([field, value]) => {
        if (field === 'tone') return false;
        if (typeof value === 'string') return Boolean(value.trim());
        if (Array.isArray(value)) return value.some((item) => Boolean(String(item || '').trim()));
        return false;
      }),
  );
}

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function toPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function createReportGeneratorError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;

  if (details && Object.keys(details).length > 0) {
    error.details = details;
  }

  return error;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeScoresSnapshot(scores = {}, options = {}) {
  const allowDefaultValues = options.allowDefaultValues !== false;
  const raw = {
    D: Math.max(0, toNumber(scores.D, allowDefaultValues ? 34 : 0)),
    I: Math.max(0, toNumber(scores.I, allowDefaultValues ? 32 : 0)),
    S: Math.max(0, toNumber(scores.S, allowDefaultValues ? 23 : 0)),
    C: Math.max(0, toNumber(scores.C, allowDefaultValues ? 11 : 0)),
  };
  const total = raw.D + raw.I + raw.S + raw.C;

  if (!Number.isFinite(total) || total <= 0) {
    return allowDefaultValues
      ? { D: 34, I: 32, S: 23, C: 11 }
      : { D: 0, I: 0, S: 0, C: 0 };
  }

  const normalized = {
    D: Math.round((raw.D / total) * 100),
    I: Math.round((raw.I / total) * 100),
    S: Math.round((raw.S / total) * 100),
    C: 0,
  };
  normalized.C = Math.max(0, 100 - normalized.D - normalized.I - normalized.S);
  return normalized;
}

function computeProfileLabel(scores = {}) {
  const sorted = Object.entries(scores)
    .map(([factor, score]) => ({ factor, score: toNumber(score, 0) }))
    .sort((left, right) => right.score - left.score);
  const primary = sorted[0]?.factor || 'D';
  const secondary = sorted[1]?.factor || 'I';
  const compactCode = `${primary}${secondary}`;
  const profileName =
    PROFILE_NAMES[compactCode] || `${primary}/${secondary}`;

  return `${compactCode} (${profileName})`;
}

function rewriteTranspiledTsSpecifiers(source = '') {
  return String(source || '')
    .replaceAll(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2')
    .replaceAll(/(import\(\s*['"][^'"]+)\.ts(['"]\s*\))/g, '$1.js$2')
    .replaceAll(
      /(from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g,
      (match, prefix, specifier, suffix) =>
        /\.[a-z]+$/i.test(specifier) ? match : `${prefix}${specifier}.js${suffix}`,
    )
    .replaceAll(
      /(import\(\s*['"])(\.{1,2}\/[^'"]+?)(['"]\s*\))/g,
      (match, prefix, specifier, suffix) =>
        /\.[a-z]+$/i.test(specifier) ? match : `${prefix}${specifier}.js${suffix}`,
    );
}

function placeholderizeLegacyMasterTemplate(rawTemplate = '') {
  return String(rawTemplate || '')
    .replaceAll('João Silva', '{{name}}')
    .replaceAll('DI (Dominante Influente)', '{{profile}}')
    .replaceAll('34%', '{{disc_d}}%')
    .replaceAll('32%', '{{disc_i}}%')
    .replaceAll('23%', '{{disc_s}}%')
    .replaceAll('11%', '{{disc_c}}%');
}

function resolveAssessmentSnapshot(inputSnapshot = {}) {
  const normalized = toPlainObject(inputSnapshot);
  const assessment = toPlainObject(normalized.assessment);
  return Object.keys(assessment).length > 0 ? assessment : normalized;
}

function resolveScoringResultSnapshot(scoringSnapshot = {}) {
  const normalized = toPlainObject(scoringSnapshot);
  const assessmentResult = toPlainObject(normalized.assessment_result);
  const nestedResult = toPlainObject(assessmentResult.result);
  const result = toPlainObject(normalized.result);

  if (Object.keys(nestedResult).length > 0) {
    return nestedResult;
  }

  if (Object.keys(result).length > 0) {
    return result;
  }

  return normalized;
}

function filterRequiredPlaceholders(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => REPORT_PLACEHOLDER_KEYS.includes(item));
}

function resolveRequiredPlaceholders(templateSnapshot = {}) {
  const normalized = toPlainObject(templateSnapshot);
  const configured = pickFirstDefined(
    normalized.required_placeholders,
    normalized.requiredPlaceholders,
    normalized.placeholders,
  );
  const filtered = filterRequiredPlaceholders(configured);
  return filtered.length > 0 ? filtered : REPORT_PLACEHOLDER_KEYS;
}

function resolveAssessmentValues({
  payload = {},
  inputSnapshot = {},
  normalizedScores = {},
  allowDefaultValues = true,
} = {}) {
  const normalizedPayload = toPlainObject(payload);
  const assessment = resolveAssessmentSnapshot(inputSnapshot);
  const disc = toPlainObject(normalizedPayload.disc);
  const report = toPlainObject(normalizedPayload.report);
  const fallbackProfile = allowDefaultValues ? computeProfileLabel(normalizedScores) : '';

  return {
    name:
      toText(
        pickFirstDefined(
          normalizedPayload.nome,
          normalizedPayload.name,
          assessment.name,
          assessment.nome,
        ),
      ) || (allowDefaultValues ? 'João Silva' : ''),
    profile:
      toText(
        pickFirstDefined(
          disc.profile,
          disc.perfil,
          report.profile,
          normalizedPayload.profile,
          assessment.profile,
          assessment.profile_name,
          assessment.profileName,
        ),
      ) || fallbackProfile,
    cargo:
      toText(
        pickFirstDefined(
          normalizedPayload.cargo,
          normalizedPayload.role,
          assessment.cargo,
          assessment.role,
          assessment.job_title,
          assessment.jobTitle,
        ),
      ) || (allowDefaultValues ? 'Gerente Comercial' : ''),
    empresa:
      toText(
        pickFirstDefined(
          normalizedPayload.empresa,
          normalizedPayload.company,
          assessment.empresa,
          assessment.company,
          assessment.company_name,
          assessment.companyName,
        ),
      ) || (allowDefaultValues ? 'Empresa XYZ' : ''),
    data:
      toText(
        pickFirstDefined(
          normalizedPayload.data,
          normalizedPayload.date,
          assessment.data,
          assessment.date,
          assessment.assessment_date,
          assessment.assessmentDate,
        ),
      ) || (allowDefaultValues ? '15/03/2026' : ''),
  };
}

function resolveScoreInputs({
  scores = {},
  payload = {},
  scoringSnapshot = {},
  allowDefaultValues = true,
} = {}) {
  const normalizedScores = toPlainObject(scores);
  const normalizedPayload = toPlainObject(payload);
  const disc = toPlainObject(normalizedPayload.disc);
  const result = resolveScoringResultSnapshot(scoringSnapshot);

  const pickScore = (factor) => {
    const upper = factor.toUpperCase();
    const lower = factor.toLowerCase();

    return pickFirstDefined(
      normalizedScores[upper],
      normalizedScores[lower],
      normalizedScores[`DISC_${upper}`],
      normalizedScores[`disc_${lower}`],
      normalizedPayload[`disc_${lower}`],
      normalizedPayload[lower],
      normalizedPayload[`DISC_${upper}`],
      disc[`disc_${lower}`],
      disc[lower],
      disc[`DISC_${upper}`],
      result[`disc_${lower}`],
      result[lower],
      result[upper],
      result[`DISC_${upper}`],
      result[`disc_${upper}`],
    );
  };

  return normalizeScoresSnapshot(
    {
      D: pickScore('D'),
      I: pickScore('I'),
      S: pickScore('S'),
      C: pickScore('C'),
    },
    { allowDefaultValues },
  );
}

function buildRuntimeSnapshots({
  scores = {},
  payload = {},
  input_snapshot: inputSnapshot = {},
  scoring_snapshot: scoringSnapshot = {},
  allowDefaultValues = true,
} = {}) {
  const normalizedScores = resolveScoreInputs({
    scores,
    payload,
    scoringSnapshot,
    allowDefaultValues,
  });
  const assessment = resolveAssessmentValues({
    payload,
    inputSnapshot,
    normalizedScores,
    allowDefaultValues,
  });

  return {
    normalizedScores,
    assessment,
    input_snapshot: {
      assessment,
    },
    scoring_snapshot: {
      assessment_result: {
        result: {
          disc_d: normalizedScores.D,
          disc_i: normalizedScores.I,
          disc_s: normalizedScores.S,
          disc_c: normalizedScores.C,
        },
      },
    },
  };
}

function buildPlaceholderValues({ assessment = {}, normalizedScores = {} } = {}) {
  return {
    name: toText(assessment.name),
    profile: toText(assessment.profile),
    disc_d: toText(normalizedScores.D),
    disc_i: toText(normalizedScores.I),
    disc_s: toText(normalizedScores.S),
    disc_c: toText(normalizedScores.C),
  };
}

function assertRequiredPlaceholderValues(values = {}, requiredPlaceholders = REPORT_PLACEHOLDER_KEYS) {
  const missing = requiredPlaceholders.filter((key) => !toText(values[key]));

  if (missing.length > 0) {
    throw createReportGeneratorError(
      'MISSING_REQUIRED_PLACEHOLDER',
      'Missing required placeholder value.',
      { placeholders: missing },
    );
  }
}

async function loadReportHtmlEngine() {
  if (reportHtmlEnginePromise) {
    return reportHtmlEnginePromise;
  }

  reportHtmlEnginePromise = (async () => {
    const ts = await import('typescript');
    const runtimeRoot = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-report-lib-'));

    for (const relativePath of REPORT_LIB_TS_FILES) {
      const sourcePath = path.resolve(process.cwd(), relativePath);
      const outputPath = path.join(runtimeRoot, relativePath.replace(/\.ts$/i, '.js'));
      const source = readFileSync(sourcePath, 'utf8');
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: sourcePath,
      });

      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, rewriteTranspiledTsSpecifiers(transpiled.outputText), 'utf8');
    }

    const moduleUrl = pathToFileURL(
      path.join(runtimeRoot, 'lib/pdf/build-report-html.js'),
    ).href;
    const runtimeModule = await import(moduleUrl);

    if (typeof runtimeModule.buildReportHtml !== 'function') {
      throw new Error('REPORT_HTML_ENGINE_UNAVAILABLE');
    }

    return runtimeModule;
  })();

  return reportHtmlEnginePromise;
}

async function loadDiscTemplateRuntime() {
  if (discEngineRuntimePromise) {
    return discEngineRuntimePromise;
  }

  discEngineRuntimePromise = import(pathToFileURL(path.join(basePath, 'disc_engine.js')).href);
  return discEngineRuntimePromise;
}

async function loadTemplateSource({
  reportType = 'business',
  language = 'pt-BR',
  version = 'report.v1',
  templateHtml = '',
  templatePath = '',
} = {}) {
  const inlineTemplate = String(templateHtml || '');
  const resolvedTemplatePath = templatePath
    ? path.resolve(process.cwd(), templatePath)
    : MASTER_TEMPLATE_PATH;

  if (inlineTemplate) {
    return {
      html: inlineTemplate,
      templatePath: resolvedTemplatePath,
      cacheKey: `inline:${version}:${language}:${reportType}`,
      sizeBytes: Buffer.byteLength(inlineTemplate, 'utf8'),
      readDurationMs: 0,
      fromCache: false,
    };
  }

  const cacheKey = [version, language, reportType, resolvedTemplatePath].join(':');
  const cached = templateCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      readDurationMs: 0,
      fromCache: true,
    };
  }

  if (templateInflight.has(cacheKey)) {
    return templateInflight.get(cacheKey);
  }

  const pending = (async () => {
    const readStartedAt = Date.now();
    let rawTemplate = '';

    try {
      rawTemplate = readFileSync(resolvedTemplatePath, 'utf8');
    } catch (error) {
      throw createReportGeneratorError(
        'TEMPLATE_NOT_FOUND',
        'Report template not found.',
        {
          reportType,
          templatePath: resolvedTemplatePath,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }

    const html =
      resolvedTemplatePath === MASTER_TEMPLATE_PATH
        ? placeholderizeLegacyMasterTemplate(rawTemplate)
        : rawTemplate;
    const loaded = {
      html,
      templatePath: resolvedTemplatePath,
      cacheKey,
      sizeBytes: Buffer.byteLength(html, 'utf8'),
    };

    templateCache.set(cacheKey, loaded);

    return {
      ...loaded,
      readDurationMs: Date.now() - readStartedAt,
      fromCache: false,
    };
  })().finally(() => {
    templateInflight.delete(cacheKey);
  });

  templateInflight.set(cacheKey, pending);
  return pending;
}

function storagePath({ accountId, reportId, reportType } = {}) {
  const normalizedAccountId = toText(accountId);
  const normalizedReportId = toText(reportId);
  const normalizedReportType = toText(reportType);

  if (!normalizedAccountId || !normalizedReportId || !normalizedReportType) {
    return null;
  }

  return `reports/${normalizedAccountId}/${normalizedReportId}/${normalizedReportType}.pdf`;
}

function invalidateTemplateCache() {
  templateCache.clear();
  templateInflight.clear();
}

function resolveOfficialTemplatePath(reportType = 'business') {
  const normalizedReportType = normalizeMode(reportType);
  return OFFICIAL_TEMPLATE_PATHS[normalizedReportType] || OFFICIAL_TEMPLATE_PATHS.business;
}

async function buildReportHtmlPreview({
  reportType = 'business',
  scores,
  payload,
  input_snapshot,
  scoring_snapshot,
  template_snapshot,
  templateHtml,
  templatePath,
  language,
  allowDefaultValues = true,
} = {}) {
  const runtime = await loadReportHtmlEngine();
  const normalizedTemplateSnapshot = toPlainObject(template_snapshot);
  const normalizedLanguage =
    toText(
      pickFirstDefined(
        language,
        normalizedTemplateSnapshot.language,
        normalizedTemplateSnapshot.lang,
        'pt-BR',
      ),
    ) || 'pt-BR';
  const requiredPlaceholders = resolveRequiredPlaceholders(normalizedTemplateSnapshot);
  const templateSource = await loadTemplateSource({
    reportType,
    language: normalizedLanguage,
    version:
      toText(normalizedTemplateSnapshot.version) || 'report.v1',
    templateHtml:
      templateHtml ||
      pickFirstDefined(
        normalizedTemplateSnapshot.html,
        normalizedTemplateSnapshot.template_html,
        normalizedTemplateSnapshot.templateHtml,
      ) ||
      '',
    templatePath:
      templatePath ||
      pickFirstDefined(
        normalizedTemplateSnapshot.templatePath,
        normalizedTemplateSnapshot.path,
      ) ||
      '',
  });
  const snapshots = buildRuntimeSnapshots({
    scores,
    payload,
    input_snapshot,
    scoring_snapshot,
    allowDefaultValues,
  });
  const placeholderValues = buildPlaceholderValues({
    assessment: snapshots.assessment,
    normalizedScores: snapshots.normalizedScores,
  });

  assertRequiredPlaceholderValues(placeholderValues, requiredPlaceholders);

  console.info('[disc-report] template loaded', {
    reportType,
    templatePath: templateSource.templatePath,
    templateBytes: templateSource.sizeBytes,
    readMs: templateSource.readDurationMs,
    fromCache: templateSource.fromCache,
  });

  const renderStartedAt = Date.now();
  const built = runtime.buildReportHtml({
    reportType,
    language: normalizedLanguage,
    input_snapshot: snapshots.input_snapshot,
    scoring_snapshot: snapshots.scoring_snapshot,
    template_snapshot: {
      ...normalizedTemplateSnapshot,
      html: templateSource.html,
      required_placeholders: requiredPlaceholders,
      language: normalizedLanguage,
      version: toText(normalizedTemplateSnapshot.version) || 'report.v1',
    },
  });
  const renderDurationMs = Date.now() - renderStartedAt;

  console.info('[disc-report] html rendered', {
    reportType,
    renderMs: renderDurationMs,
    templateBytes: templateSource.sizeBytes,
  });

  return {
    ...built,
    input_snapshot: snapshots.input_snapshot,
    scoring_snapshot: snapshots.scoring_snapshot,
    placeholderValues,
    templateMetrics: {
      templateBytes: templateSource.sizeBytes,
      readMs: templateSource.readDurationMs,
      renderMs: renderDurationMs,
      fromCache: templateSource.fromCache,
    },
  };
}

async function buildTemplateSnapshotPayload({
  mode,
  scores,
  payload,
} = {}) {
  const built = await buildReportHtmlPreview({
    reportType: mode,
    scores,
    payload,
  });

  return {
    input_snapshot: built.input_snapshot,
    scoring_snapshot: built.scoring_snapshot,
    template_snapshot: {
      html: built.html,
      templatePath: built.templatePath,
      cacheKey: built.cacheKey,
      placeholders: built.template_snapshot?.placeholders || REPORT_PLACEHOLDER_KEYS,
      version: built.version,
      language: built.language,
    },
    cache: {
      templateCacheKey: built.cacheKey,
    },
    version: built.version,
    language: built.language,
  };
}

async function generateHtmlPreview({
  mode = 'business',
  scores = {},
  payload = {},
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const runtimePayload = await buildTemplateSnapshotPayload({
    mode: normalizedMode,
    scores,
    payload,
  });
  const discRuntime = await loadDiscTemplateRuntime();
  const assessment = toPlainObject(runtimePayload.input_snapshot?.assessment);
  const result = toPlainObject(runtimePayload.scoring_snapshot?.assessment_result?.result);
  const context = discRuntime.buildContext({
    mode: normalizedMode,
    nome: assessment.name,
    cargo: assessment.cargo,
    empresa: assessment.empresa,
    data: assessment.data,
    d: result.disc_d,
    i: result.disc_i,
    s: result.disc_s,
    c: result.disc_c,
    input_snapshot: assessment,
    scoring_snapshot: result,
    template_snapshot: runtimePayload.template_snapshot,
    cache: runtimePayload.cache,
    version: runtimePayload.version,
    language: runtimePayload.language,
  });

  return discRuntime.generateFinalHtml(context);
}

function resolveOfficialValidationProfile(reportModel = {}, assessment = {}) {
  const participant = toPlainObject(reportModel?.participant);
  const profile = toPlainObject(reportModel?.profile);
  const assessmentProfile = toPlainObject(assessment?.report?.discProfile?.profile);

  return (
    toText(
      pickFirstDefined(
        participant.profile,
        participant.profileName,
        reportModel?.profileLabel,
        profile.title,
        profile.label,
        assessmentProfile.label,
        assessmentProfile.title,
        profile.key && profile.archetype ? `${profile.key} (${profile.archetype})` : '',
        profile.key,
      ),
    ) || ''
  );
}

function resolveOfficialValidationScores(reportModel = {}, assessment = {}) {
  const reportScores = toPlainObject(reportModel?.scores);
  const assessmentScores = toPlainObject(assessment?.results);
  const discScores = toPlainObject(assessment?.disc_results);

  return resolveScoreInputs({
    scores: pickFirstDefined(
      reportScores.natural,
      reportScores.summary,
      assessmentScores.natural_profile,
      discScores.natural,
      assessment?.report?.discProfile?.scores?.natural,
      assessment?.report?.discProfile?.scores?.summary,
    ) || {},
    allowDefaultValues: false,
  });
}

function buildOfficialTemplateValidationInput({ reportModel = {}, assessment = {} } = {}) {
  const participant = toPlainObject(reportModel?.participant);
  const normalizedScores = resolveOfficialValidationScores(reportModel, assessment);

  return {
    reportType: normalizeMode(reportModel?.meta?.reportType || reportModel?.reportType),
    input_snapshot: {
      assessment: {
        name: toText(
          pickFirstDefined(
            participant.name,
            participant.candidateName,
            participant.respondent_name,
            assessment?.candidateName,
            assessment?.respondent_name,
            participant.email,
            assessment?.candidateEmail,
          ),
        ),
        profile: resolveOfficialValidationProfile(reportModel, assessment),
      },
    },
    scoring_snapshot: {
      assessment_result: {
        result: {
          disc_d: normalizedScores.D,
          disc_i: normalizedScores.I,
          disc_s: normalizedScores.S,
          disc_c: normalizedScores.C,
        },
      },
    },
  };
}

async function assertOfficialTemplateCompatibility(input = {}) {
  const validationInput = buildOfficialTemplateValidationInput(input);

  return buildReportHtmlPreview({
    reportType: validationInput.reportType,
    input_snapshot: validationInput.input_snapshot,
    scoring_snapshot: validationInput.scoring_snapshot,
    templateHtml: OFFICIAL_TEMPLATE_VALIDATION_HTML,
    templatePath: resolveOfficialTemplatePath(validationInput.reportType),
    template_snapshot: {
      required_placeholders: REPORT_PLACEHOLDER_KEYS,
      language: 'pt-BR',
      version: 'report.v1',
    },
    allowDefaultValues: false,
  });
}

function buildAiArtifactPayload(aiResult = {}) {
  const payload = {
    content: aiResult.content,
    rawContent: aiResult.rawContent,
  };

  const inputSnapshot = pickFirstDefined(
    aiResult.input_snapshot,
    aiResult.inputSnapshot,
    aiResult.rawContent?.input_snapshot,
    aiResult.rawContent?.inputSnapshot,
    aiResult.content?.input_snapshot,
    aiResult.content?.inputSnapshot,
  );
  const scoringSnapshot = pickFirstDefined(
    aiResult.scoring_snapshot,
    aiResult.scoringSnapshot,
    aiResult.rawContent?.scoring_snapshot,
    aiResult.rawContent?.scoringSnapshot,
    aiResult.content?.scoring_snapshot,
    aiResult.content?.scoringSnapshot,
  );
  const cache = pickFirstDefined(
    aiResult.cache,
    aiResult.rawContent?.cache,
    aiResult.content?.cache,
  );
  const version = pickFirstDefined(
    aiResult.version,
    aiResult.rawContent?.version,
    aiResult.content?.version,
  );
  const language = pickFirstDefined(
    aiResult.language,
    aiResult.lang,
    aiResult.locale,
    aiResult.rawContent?.language,
    aiResult.content?.language,
  );

  if (Object.keys(toPlainObject(inputSnapshot)).length > 0) {
    payload.input_snapshot = toPlainObject(inputSnapshot);
  }

  if (Object.keys(toPlainObject(scoringSnapshot)).length > 0) {
    payload.scoring_snapshot = toPlainObject(scoringSnapshot);
  }

  if (Object.keys(toPlainObject(cache)).length > 0) {
    payload.cache = toPlainObject(cache);
  }

  if (typeof version === 'string' && version.trim()) {
    payload.version = version.trim();
  }

  if (typeof language === 'string' && language.trim()) {
    payload.language = language.trim();
  }

  return payload;
}

function mergeArtifactPayload(basePayload = {}, aiPayload = {}) {
  const normalizedBase = toPlainObject(basePayload);
  const normalizedAi = toPlainObject(aiPayload);

  return {
    ...normalizedBase,
    ...normalizedAi,
    content: normalizedAi.content ?? normalizedBase.content ?? {},
    rawContent: normalizedAi.rawContent ?? normalizedBase.rawContent ?? {},
    input_snapshot: normalizedAi.input_snapshot ?? normalizedBase.input_snapshot ?? {},
    scoring_snapshot: normalizedAi.scoring_snapshot ?? normalizedBase.scoring_snapshot ?? {},
    template_snapshot: normalizedAi.template_snapshot ?? normalizedBase.template_snapshot ?? {},
    cache: {
      ...toPlainObject(normalizedBase.cache),
      ...toPlainObject(normalizedAi.cache),
    },
    version: normalizedAi.version || normalizedBase.version || '',
    language: normalizedAi.language || normalizedBase.language || '',
  };
}

function getModeLock(mode) {
  if (!modeLocks.has(mode)) {
    modeLocks.set(mode, {
      locked: false,
      queue: [],
    });
  }

  return modeLocks.get(mode);
}

async function withModeGenerationLock(mode, task) {
  const lock = getModeLock(mode);

  await new Promise((resolve) => {
    if (!lock.locked) {
      lock.locked = true;
      resolve();
      return;
    }

    lock.queue.push(resolve);
  });

  try {
    return await task();
  } finally {
    const next = lock.queue.shift();
    if (next) {
      next();
      return;
    }

    lock.locked = false;
    if (lock.queue.length === 0) {
      modeLocks.delete(mode);
    }
  }
}

function buildDiscCommand({
  basePath: workingPath,
  normalizedMode,
  scores,
  payload,
  useAi,
  aiInputPath,
  outputs,
}) {
  return [
    `cd ${shellEscape(workingPath)}`,
    `node disc_engine.js --mode=${shellEscape(normalizedMode)}`,
    `${buildArg('d', scores.D)}`,
    `${buildArg('i', scores.I)}`,
    `${buildArg('s', scores.S)}`,
    `${buildArg('c', scores.C)}`,
    `${buildArg('nome', payload.nome)}`,
    `${buildArg('cargo', payload.cargo)}`,
    `${buildArg('empresa', payload.empresa)}`,
    `${buildArg('data', payload.data)}`,
    `${useAi ? ' --useAi=true' : ''}`,
    `${aiInputPath ? ` --aiInput=${shellEscape(aiInputPath)}` : ''}`,
    `&& node gerar_pdf.mjs ${shellEscape(outputs.html)} ${shellEscape(outputs.pdf)}`,
  ]
    .join(' ')
    .trim();
}

function executeDiscCommand(command, outputs, normalizedMode) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(stderr?.trim() || stdout?.trim() || error.message || 'Falha ao gerar relatório DISC.'),
        );
        return;
      }

      resolve({
        mode: normalizedMode,
        html: outputs.html,
        pdf: outputs.pdf,
        htmlPath: path.join(basePath, outputs.html),
        pdfPath: path.join(basePath, outputs.pdf),
        stdout: stdout?.trim() || '',
      });
    });
  });
}

export function gerarRelatorio({
  mode = 'business',
  scores = {},
  payload = {},
  useAi = false,
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const outputs = REPORT_OUTPUTS[normalizedMode];
  const aiRequested = useAi === true;

  let tempDir = '';
  let artifactDir = '';
  let aiMeta = aiRequested
    ? {
        requested: true,
        enabled: false,
      }
    : {
        enabled: false,
      };

  return (async () => {
    return withModeGenerationLock(normalizedMode, async () => {
      let aiInputPath = '';
      let aiEnabled = false;
      let runtimePayload = await buildTemplateSnapshotPayload({
        mode: normalizedMode,
        scores,
        payload,
      });

      tempDir = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-runtime-'));
      aiInputPath = path.join(tempDir, 'disc-runtime-context.json');

      console.info('[disc-report] generating report', {
        mode: normalizedMode,
        useAi: aiRequested,
      });

      if (aiRequested) {
        console.info('[disc-report] AI enabled', {
          mode: normalizedMode,
        });

        try {
          const aiResult = await generateAiDiscContent({
            mode: normalizedMode,
            nome: payload.nome,
            cargo: payload.cargo,
            empresa: payload.empresa,
            scores,
          });

          const hasProviderText = aiResult?.source === 'ai' && hasMeaningfulAiSourceContent(aiResult?.rawContent);

          if (!hasProviderText) {
            console.warn('[disc-report] AI skipped due to invalid content', {
              mode: normalizedMode,
              reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'NO_PROVIDER_TEXT_FIELDS',
            });
            aiMeta = {
              ...aiMeta,
              skipped: true,
              reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'NO_PROVIDER_TEXT_FIELDS',
            };
          } else {
            runtimePayload = mergeArtifactPayload(
              runtimePayload,
              buildAiArtifactPayload(aiResult),
            );
            aiEnabled = true;
            aiMeta = {
              requested: true,
              enabled: true,
              provider: aiResult.provider,
              model: aiResult.model,
              source: aiResult.source,
              usedFallback: aiResult.usedFallback,
              attempts: aiResult.attempts,
            };
          }
        } catch (error) {
          console.warn('[disc-report] AI skipped due to invalid content', {
            mode: normalizedMode,
            error: sanitizeLogValue(error?.message || error),
          });
          aiMeta = {
            ...aiMeta,
            skipped: true,
            reason: 'AI_GENERATION_FAILED',
          };
          aiEnabled = false;
        }
      }

      writeFileSync(aiInputPath, JSON.stringify(runtimePayload, null, 2), 'utf8');

      let result;

      try {
        result = await executeDiscCommand(
          buildDiscCommand({
            basePath,
            normalizedMode,
            scores,
            payload,
            useAi: aiEnabled,
            aiInputPath,
            outputs,
          }),
          outputs,
          normalizedMode,
        );
      } catch (error) {
        if (!aiEnabled) {
          throw error;
        }

        console.warn('[disc-report] engine failed with AI, retrying without AI', {
          mode: normalizedMode,
          error: sanitizeLogValue(error?.message || error),
        });

        aiEnabled = false;
        aiMeta = {
          ...aiMeta,
          enabled: false,
          skipped: true,
          reason: 'ENGINE_RETRY_WITHOUT_AI',
        };

        result = await executeDiscCommand(
          buildDiscCommand({
            basePath,
            normalizedMode,
            scores,
            payload,
            useAi: false,
            aiInputPath: '',
            outputs,
          }),
          outputs,
          normalizedMode,
        );
      }

      console.info('[disc-report] report generated successfully', {
        mode: normalizedMode,
        pdf: outputs.pdf,
        aiEnabled,
      });

      artifactDir = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-report-'));
      const uniqueHtmlPath = path.join(artifactDir, outputs.html);
      const uniquePdfPath = path.join(artifactDir, outputs.pdf);
      copyFileSync(result.htmlPath, uniqueHtmlPath);
      copyFileSync(result.pdfPath, uniquePdfPath);

      const cleanup = () => {
        if (!artifactDir) return;
        rmSync(artifactDir, { recursive: true, force: true });
        artifactDir = '';
      };

      const cleanupTimer = setTimeout(cleanup, 10 * 60 * 1000);
      cleanupTimer.unref?.();

      return {
        ...result,
        htmlPath: uniqueHtmlPath,
        pdfPath: uniquePdfPath,
        cleanup,
        ai: aiRequested
          ? {
              ...aiMeta,
              enabled: aiEnabled,
            }
          : aiMeta,
      };
    }).finally(() => {
      if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  })();
}

export {
  REPORT_OUTPUTS,
  basePath as REPORT_BASE_PATH,
  assertOfficialTemplateCompatibility,
  buildReportHtmlPreview,
  generateHtmlPreview,
  invalidateTemplateCache,
  normalizeMode,
  storagePath,
  templateCache,
  templateInflight,
};
