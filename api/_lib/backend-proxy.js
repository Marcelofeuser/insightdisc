import { sendJson } from './http.js';

function getBackendBaseUrl() {
  const raw = String(
    process.env.BACKEND_API_URL ||
      process.env.VITE_API_URL ||
      process.env.API_BASE_URL ||
      ''
  ).trim();
  return raw ? raw.replace(/\/$/, '') : '';
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

export default async function proxyBackendRequest(req, res) {
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return sendJson(res, 500, {
      ok: false,
      error: 'BACKEND_API_URL_NOT_CONFIGURED',
      message: 'Configure BACKEND_API_URL para habilitar proxy de autenticação e API.',
    });
  }

  try {
    const host = req.headers.host || 'localhost';
    const incoming = new URL(req.url || '/api/proxy', `https://${host}`);
    const path = getForwardPath(req);
    if (!path) {
      return sendJson(res, 400, {
        ok: false,
        error: 'BACKEND_PROXY_PATH_REQUIRED',
        message: 'Informe um path válido para o proxy.',
      });
    }

    const target = `${backendBaseUrl}/${path}${getForwardSearch(req)}`;
    const body = await readRequestBody(req);

    const response = await fetch(target, {
      method: req.method || 'GET',
      headers: buildForwardHeaders(req, body),
      body,
      redirect: 'manual',
    });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const responseBuffer = Buffer.from(await response.arrayBuffer());
    res.end(responseBuffer);
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: 'BACKEND_PROXY_ERROR',
      message: error?.message || 'Falha no proxy para backend.',
    });
  }
}
