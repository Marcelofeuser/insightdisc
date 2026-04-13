const DEFAULT_PRODUCTION_CONNECTION_LIMIT = '5';
const DEFAULT_PRODUCTION_POOL_TIMEOUT = '20';
const RAILWAY_HOST_MARKERS = ['railway.app', 'rlwy.net'];
const RAILWAY_POOL_HOST_MARKERS = ['proxy.rlwy.net', 'pooler', 'pgbouncer', 'proxy'];

function normalizeNodeEnv(value = '') {
  return String(value || 'development').trim().toLowerCase();
}

function isProductionNodeEnv(value = '') {
  return normalizeNodeEnv(value) === 'production';
}

function safeParseDatabaseUrl(rawValue = '', label = 'DATABASE_URL') {
  const normalizedValue = String(rawValue || '').trim();
  if (!normalizedValue) {
    const error = new Error(`${label} não configurada.`);
    error.code = `${label}_MISSING`;
    throw error;
  }

  try {
    return new URL(normalizedValue);
  } catch {
    const error = new Error(`${label} inválida.`);
    error.code = `${label}_INVALID`;
    throw error;
  }
}

function hasMarker(value = '', markers = []) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return markers.some((marker) => normalized.includes(marker));
}

export function isRailwayDatabaseHost(hostname = '') {
  return hasMarker(hostname, RAILWAY_HOST_MARKERS);
}

export function looksLikeRailwayPoolHost(hostname = '') {
  return hasMarker(hostname, RAILWAY_POOL_HOST_MARKERS);
}

export function resolvePrismaConnectionConfig({
  databaseUrl = process.env.DATABASE_URL,
  directUrl = process.env.DIRECT_URL,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  const runtimeUrl = safeParseDatabaseUrl(databaseUrl, 'DATABASE_URL');
  const directConnectionUrl = String(directUrl || '').trim()
    ? safeParseDatabaseUrl(directUrl, 'DIRECT_URL')
    : null;

  if (isProductionNodeEnv(nodeEnv)) {
    if (!runtimeUrl.searchParams.get('connection_limit')) {
      runtimeUrl.searchParams.set('connection_limit', DEFAULT_PRODUCTION_CONNECTION_LIMIT);
    }
    if (!runtimeUrl.searchParams.get('pool_timeout')) {
      runtimeUrl.searchParams.set('pool_timeout', DEFAULT_PRODUCTION_POOL_TIMEOUT);
    }
  }

  const usesRailway =
    isRailwayDatabaseHost(runtimeUrl.hostname) ||
    isRailwayDatabaseHost(directConnectionUrl?.hostname || '');
  const usesPoolProxy = looksLikeRailwayPoolHost(runtimeUrl.hostname);
  const warnings = [];

  if (usesRailway && !usesPoolProxy) {
    warnings.push('DATABASE_URL não parece usar host pooled/proxy do Railway.');
  }
  if (usesRailway && !directConnectionUrl) {
    warnings.push('DIRECT_URL não configurada para migrations/conexão direta.');
  }

  return {
    runtimeUrl: runtimeUrl.toString(),
    directUrl: directConnectionUrl?.toString() || '',
    runtimeHost: runtimeUrl.hostname,
    runtimePort: runtimeUrl.port || '',
    runtimeDatabase: runtimeUrl.pathname.replace(/^\//, ''),
    usesRailway,
    usesPoolProxy,
    connectionLimit: runtimeUrl.searchParams.get('connection_limit') || '',
    poolTimeout: runtimeUrl.searchParams.get('pool_timeout') || '',
    sslMode: runtimeUrl.searchParams.get('sslmode') || '',
    directUrlConfigured: Boolean(directConnectionUrl),
    warnings,
  };
}

export function formatPrismaConnectionSummary(config = {}) {
  const parts = [
    `host=${config.runtimeHost || 'n/a'}`,
    `db=${config.runtimeDatabase || 'n/a'}`,
    `railway=${config.usesRailway ? 'yes' : 'no'}`,
    `pool_proxy=${config.usesPoolProxy ? 'yes' : 'no'}`,
    `connection_limit=${config.connectionLimit || 'default'}`,
    `pool_timeout=${config.poolTimeout || 'default'}`,
    `direct_url=${config.directUrlConfigured ? 'configured' : 'missing'}`,
  ];
  if (config.sslMode) {
    parts.push(`sslmode=${config.sslMode}`);
  }
  return parts.join(' ');
}
