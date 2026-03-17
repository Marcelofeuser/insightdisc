import { sendJson } from './http.js';

const CANONICAL_BACKEND_URL = 'https://insightdisc-production.up.railway.app';
const LEGACY_BACKEND_URL = 'https://insightdisc-api.vercel.app';

function normalizeBaseUrl(value = '') {
  const raw = String(value || '').trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

function getHostname(value = '') {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isFrontendHost(hostname = '') {
  const normalized = String(hostname || '').toLowerCase();
  if (!normalized || normalized === 'insightdisc-production.up.railway.app') return false;
  return (
    normalized === 'app.insightdisc.com' ||
    normalized === 'insightdisc.com' ||
    normalized.endsWith('.insightdisc.com')
  );
}

function addBackendCandidate(candidates, seen, value, source) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized || normalized.startsWith('/')) return;

  const hostname = getHostname(normalized);
  if (!hostname || isFrontendHost(hostname)) return;
  if (seen.has(normalized)) return;

  seen.add(normalized);
  candidates.push({ url: normalized, source });
}

export function resolveBackendCandidates(env = process.env) {
  const candidates = [];
  const seen = new Set();

  addBackendCandidate(candidates, seen, env.BACKEND_API_URL, 'BACKEND_API_URL');
  addBackendCandidate(candidates, seen, env.VITE_API_URL, 'VITE_API_URL');
  addBackendCandidate(candidates, seen, env.API_BASE_URL, 'API_BASE_URL');

  if (!seen.has(CANONICAL_BACKEND_URL)) {
    addBackendCandidate(candidates, seen, CANONICAL_BACKEND_URL, 'default:canonical');
  }
  if (!seen.has(LEGACY_BACKEND_URL)) {
    addBackendCandidate(candidates, seen, LEGACY_BACKEND_URL, 'fallback:legacy');
  }

  return candidates;
}

function readQueryValue(value) {
  if (Array.isArray(value)) return value[0] || '';
  return String(value || '').trim();
}

function normalizeForwardPath(rawPath = '') {
  return String(rawPath || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '');
}

function getForwardPath(req) {
  const queryPath = normalizeForwardPath(readQueryValue(req?.query?.path));
  if (queryPath) return queryPath;

  const host = req.headers.host || 'localhost';
  const incoming = new URL(req.url || '/api/proxy', `https://${host}`);
  return normalizeForwardPath(incoming.pathname.replace(/^\/api\/proxy\/?/, ''));
}

function getForwardSearch(req) {
  const host = req.headers.host || 'localhost';
  const incoming = new URL(req.url || '/api/proxy', `https://${host}`);
  incoming.searchParams.delete('path');
  const serialized = incoming.searchParams.toString();
  return serialized ? `?${serialized}` : '';
}

export function classifyProxyError(error) {
  const code = String(error?.code || error?.cause?.code || '').trim().toUpperCase();
  const message = String(error?.message || '').trim();
  const causeMessage = String(error?.cause?.message || '').trim();

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return {
      code: 'BACKEND_DNS_ERROR',
      message: 'Falha ao resolver DNS do backend configurado.',
      networkCode: code,
    };
  }

  if (code === 'ECONNREFUSED') {
    return {
      code: 'BACKEND_CONNECTION_REFUSED',
      message: 'Conexão com o backend recusada.',
      networkCode: code,
    };
  }

  if (code === 'ECONNRESET') {
    return {
      code: 'BACKEND_CONNECTION_RESET',
      message: 'Conexão com o backend foi encerrada durante o proxy.',
      networkCode: code,
    };
  }

  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'ABORT_ERR') {
    return {
      code: 'BACKEND_TIMEOUT',
      message: 'Tempo limite excedido ao conectar no backend.',
      networkCode: code,
    };
  }

  if (message.toLowerCase().includes('certificate') || causeMessage.toLowerCase().includes('certificate')) {
    return {
      code: 'BACKEND_SSL_ERROR',
      message: 'Falha de SSL/TLS ao conectar no backend.',
      networkCode: code || 'SSL',
    };
  }

  return {
    code: 'BACKEND_PROXY_ERROR',
    message: message || causeMessage || 'Falha no proxy para backend.',
    networkCode: code || 'UNKNOWN',
  };
}

async function readRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return undefined;
  return Buffer.concat(chunks);
}

function buildForwardHeaders(req, body) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  delete headers['x-forwarded-host'];
  delete headers['x-vercel-id'];
  if (body) {
    headers['content-length'] = String(body.length);
  }
  return headers;
}

function summarizeHtmlResponse(html = '') {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export default async function proxyBackendRequest(req, res) {
  const backendCandidates = resolveBackendCandidates();
  if (!backendCandidates.length) {
    return sendJson(res, 500, {
      ok: false,
      error: 'BACKEND_API_URL_NOT_CONFIGURED',
      message: 'Configure BACKEND_API_URL para habilitar proxy de autenticação e API.',
    });
  }

  try {
    const path = getForwardPath(req);
    if (!path) {
      return sendJson(res, 400, {
        ok: false,
        error: 'BACKEND_PROXY_PATH_REQUIRED',
        message: 'Informe um path válido para o proxy.',
      });
    }

    const body = await readRequestBody(req);
    const requestMethod = req.method || 'GET';
    const requestHeaders = buildForwardHeaders(req, body);
    const forwardSearch = getForwardSearch(req);
    const attemptErrors = [];

    for (const candidate of backendCandidates) {
      const target = `${candidate.url}/${path}${forwardSearch}`;

      try {
        const response = await fetch(target, {
          method: requestMethod,
          headers: requestHeaders,
          body,
          redirect: 'manual',
        });

        const responseContentType = String(response.headers.get('content-type') || '').toLowerCase();
        if (!response.ok && responseContentType.includes('text/html')) {
          const upstreamHtml = await response.text();
          return sendJson(res, response.status, {
            ok: false,
            error: response.status === 404 ? 'BACKEND_ROUTE_NOT_FOUND' : `BACKEND_HTTP_${response.status}`,
            message:
              response.status === 404
                ? `O backend ${candidate.url} respondeu 404 para ${path}.`
                : `O backend ${candidate.url} respondeu HTTP ${response.status} para ${path}.`,
            details: {
              source: candidate.source,
              target,
              contentType: responseContentType,
              upstreamStatus: response.status,
              upstreamBody: summarizeHtmlResponse(upstreamHtml),
            },
          });
        }

        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'transfer-encoding') return;
          res.setHeader(key, value);
        });
        res.setHeader('x-insight-backend-target', candidate.url);
        res.setHeader('x-insight-backend-source', candidate.source);

        const responseBuffer = Buffer.from(await response.arrayBuffer());
        res.end(responseBuffer);
        return;
      } catch (error) {
        const classified = classifyProxyError(error);
        attemptErrors.push({
          source: candidate.source,
          target,
          error: classified.code,
          message: classified.message,
          networkCode: classified.networkCode,
        });
      }
    }

    const primaryError = attemptErrors[0] || {
      error: 'BACKEND_PROXY_ERROR',
      message: 'Falha no proxy para backend.',
      networkCode: 'UNKNOWN',
    };

    return sendJson(res, 502, {
      ok: false,
      error: primaryError.error,
      message: primaryError.message,
      details: {
        path,
        method: requestMethod,
        attempts: attemptErrors,
      },
    });
  } catch (error) {
    const classified = classifyProxyError(error);
    return sendJson(res, 502, {
      ok: false,
      error: classified.code,
      message: classified.message,
    });
  }
}
