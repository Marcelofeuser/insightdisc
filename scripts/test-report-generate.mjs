#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BASE_URL = 'http://localhost:4000';
const ROOT_DIR = process.cwd();
const LOCAL_ENV_PATH = path.resolve(ROOT_DIR, 'server/.env');

function printHelp() {
  console.log(`
Uso:
  node scripts/test-report-generate.mjs [opcoes]

Opcoes:
  --base-url <url>           API base URL. Padrao: ${DEFAULT_BASE_URL}
  --assessment-id <id>       Assessment especifico. Se omitido, tenta descobrir um acessivel.
  --plan <personal|professional|business>
                             Atalho de plano para tipo interno do relatorio.
  --report-type <standard|premium|professional|personal|business>
                             Tipo direto ou alias conveniente para teste local.
  --output <arquivo>         Salva o PDF baixado no caminho informado.
  --email <email>            Faz login via /auth/login ou /auth/super-admin-login.
  --password <senha>         Senha do usuario.
  --master-key <chave>       Usa /auth/super-admin-login.
  --super-admin              Forca fluxo de login super admin.
  --dev-email <email>        Usa header x-insight-user-email em vez de bearer token.
  --help                     Mostra esta ajuda.

Mapeamento de plano:
  personal -> standard
  professional -> premium
  business -> professional
`.trim());
}

function parseArgs(argv = []) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    assessmentId: '',
    plan: '',
    reportType: '',
    output: '',
    email: '',
    password: '',
    masterKey: '',
    superAdmin: false,
    devEmail: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = String(argv[index] || '').trim();
    const next = String(argv[index + 1] || '').trim();

    if (current === '--help' || current === '-h') {
      args.help = true;
      continue;
    }
    if (current === '--super-admin') {
      args.superAdmin = true;
      continue;
    }
    if (current === '--base-url') {
      args.baseUrl = next || args.baseUrl;
      index += 1;
      continue;
    }
    if (current === '--assessment-id') {
      args.assessmentId = next;
      index += 1;
      continue;
    }
    if (current === '--plan') {
      args.plan = next;
      index += 1;
      continue;
    }
    if (current === '--report-type') {
      args.reportType = next;
      index += 1;
      continue;
    }
    if (current === '--output') {
      args.output = next;
      index += 1;
      continue;
    }
    if (current === '--email') {
      args.email = next;
      index += 1;
      continue;
    }
    if (current === '--password') {
      args.password = next;
      index += 1;
      continue;
    }
    if (current === '--master-key') {
      args.masterKey = next;
      index += 1;
      continue;
    }
    if (current === '--dev-email') {
      args.devEmail = next;
      index += 1;
      continue;
    }

    throw new Error(`Opcao desconhecida: ${current}`);
  }

  return args;
}

function normalizeEnvValue(value = '') {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(trimmed.slice(separatorIndex + 1));
    env[key] = value;
  }

  return env;
}

function normalizeInput(value = '') {
  return String(value || '').trim().toLowerCase();
}

function resolveRequestedReportType({ plan = '', reportType = '' } = {}) {
  const normalizedPlan = normalizeInput(plan);
  if (normalizedPlan) {
    if (normalizedPlan === 'personal') {
      return { requested: normalizedPlan, internal: 'standard', source: 'plan' };
    }
    if (normalizedPlan === 'professional') {
      return { requested: normalizedPlan, internal: 'premium', source: 'plan' };
    }
    if (normalizedPlan === 'business') {
      return { requested: normalizedPlan, internal: 'professional', source: 'plan' };
    }
    throw new Error(`Plano invalido: ${plan}. Use personal, professional ou business.`);
  }

  const normalizedType = normalizeInput(reportType);
  if (!normalizedType) {
    return { requested: 'standard', internal: 'standard', source: 'default' };
  }
  if (normalizedType === 'personal') {
    return { requested: normalizedType, internal: 'standard', source: 'report-type' };
  }
  if (normalizedType === 'business') {
    return { requested: normalizedType, internal: 'professional', source: 'report-type' };
  }
  if (['standard', 'premium', 'professional'].includes(normalizedType)) {
    return { requested: normalizedType, internal: normalizedType, source: 'report-type' };
  }

  throw new Error(
    `Tipo de relatorio invalido: ${reportType}. Use standard, premium, professional, personal ou business.`,
  );
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function apiRequestJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    const errorMessage =
      payload?.message ||
      payload?.error ||
      payload?.reason ||
      `HTTP_${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function resolveAuthHeaders({ baseUrl, email, password, masterKey, superAdmin, devEmail }) {
  const normalizedDevEmail = String(devEmail || '').trim().toLowerCase();
  if (normalizedDevEmail) {
    return {
      headers: { 'x-insight-user-email': normalizedDevEmail },
      authMode: 'dev-email-header',
    };
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();
  const normalizedMasterKey = String(masterKey || '').trim();
  const shouldUseSuperAdmin = Boolean(superAdmin || normalizedMasterKey);

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error(
      'Credenciais ausentes. Informe --email/--password ou use --dev-email com ALLOW_DEV_EMAIL_AUTH=true.',
    );
  }

  const loginPath = shouldUseSuperAdmin ? '/auth/super-admin-login' : '/auth/login';
  const payload = await apiRequestJson(`${baseUrl}${loginPath}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: shouldUseSuperAdmin
      ? {
          email: normalizedEmail,
          password: normalizedPassword,
          masterKey: normalizedMasterKey,
        }
      : {
          email: normalizedEmail,
          password: normalizedPassword,
        },
  });

  const token = String(payload?.token || '').trim();
  if (!token) {
    throw new Error('Token de autenticacao ausente na resposta de login.');
  }

  return {
    headers: { Authorization: `Bearer ${token}` },
    authMode: shouldUseSuperAdmin ? 'super-admin-login' : 'user-login',
  };
}

async function resolveAssessmentId({ baseUrl, assessmentId, headers }) {
  const explicitAssessmentId = String(assessmentId || '').trim();
  if (explicitAssessmentId) return explicitAssessmentId;

  try {
    const overview = await apiRequestJson(`${baseUrl}/super-admin/overview`, {
      headers,
    });
    const overviewAssessmentId =
      overview?.latestReports?.[0]?.assessmentId || overview?.latestAssessments?.[0]?.id || '';
    if (overviewAssessmentId) return String(overviewAssessmentId);
  } catch {
    // Ignore and fall back to other authenticated discovery routes.
  }

  try {
    const history = await apiRequestJson(`${baseUrl}/assessment/history`, {
      headers,
    });
    const historyAssessmentId = history?.history?.[0]?.assessmentId || '';
    if (historyAssessmentId) return String(historyAssessmentId);
  } catch {
    // Ignore and surface the final error below.
  }

  throw new Error(
    'Nao foi possivel descobrir um assessment acessivel. Informe --assessment-id explicitamente.',
  );
}

function resolveAbsoluteUrl(baseUrl, maybeRelativeUrl = '') {
  const normalized = String(maybeRelativeUrl || '').trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${baseUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

function maybeWriteOutput(filePath, buffer) {
  const normalizedPath = String(filePath || '').trim();
  if (!normalizedPath) return '';

  const absolutePath = path.resolve(ROOT_DIR, normalizedPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);
  return absolutePath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const localEnv = readLocalEnv(LOCAL_ENV_PATH);
  const baseUrl = String(args.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/$/, '');
  const requestedType = resolveRequestedReportType(args);

  const email =
    args.email ||
    localEnv.SUPER_ADMIN_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    process.env.REPORT_TEST_EMAIL ||
    '';
  const password =
    args.password ||
    localEnv.SUPER_ADMIN_PASSWORD ||
    process.env.SUPER_ADMIN_PASSWORD ||
    process.env.REPORT_TEST_PASSWORD ||
    '';
  const masterKey =
    args.masterKey ||
    localEnv.SUPER_ADMIN_MASTER_KEY ||
    process.env.SUPER_ADMIN_MASTER_KEY ||
    process.env.REPORT_TEST_MASTER_KEY ||
    '';

  const { headers, authMode } = await resolveAuthHeaders({
    baseUrl,
    email,
    password,
    masterKey,
    superAdmin: args.superAdmin || Boolean(masterKey),
    devEmail: args.devEmail,
  });

  const assessmentId = await resolveAssessmentId({
    baseUrl,
    assessmentId: args.assessmentId,
    headers,
  });

  const generated = await apiRequestJson(`${baseUrl}/report/generate`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
    body: {
      assessmentId,
      reportType: requestedType.internal,
    },
  });

  const pdfUrl = String(generated?.pdfUrl || generated?.report?.pdfUrl || '').trim();
  if (!pdfUrl) {
    throw new Error('A resposta de /report/generate nao retornou pdfUrl.');
  }

  const absolutePdfUrl = resolveAbsoluteUrl(baseUrl, pdfUrl);
  const pdfResponse = await fetch(absolutePdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Falha ao baixar o PDF gerado: HTTP_${pdfResponse.status}`);
  }

  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const outputPath = maybeWriteOutput(args.output, pdfBuffer);

  console.log(
    JSON.stringify(
      {
        ok: true,
        authMode,
        assessmentId,
        requested: requestedType.requested,
        reportType: requestedType.internal,
        source: requestedType.source,
        reportId: generated?.report?.id || '',
        pdfUrl,
        pdfStatus: pdfResponse.status,
        contentType: pdfResponse.headers.get('content-type') || '',
        bytes: pdfBuffer.length,
        outputPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error?.message || 'Falha ao testar /report/generate.',
        status: error?.status || 500,
        detail: error?.payload || null,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
