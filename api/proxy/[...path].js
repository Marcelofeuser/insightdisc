import { sendJson } from '../_lib/http.js';

function getBackendBaseUrl() {
  const raw = String(
    process.env.BACKEND_API_URL ||
      process.env.VITE_API_URL ||
      process.env.API_BASE_URL ||
      ''
  ).trim();
  return raw ? raw.replace(/\/$/, '') : '';
}

function getForwardPath(req) {
  const host = req.headers.host || 'localhost';
  const incoming = new URL(req.url || '/api/proxy', `https://${host}`);
  return incoming.pathname.replace(/^\/api\/proxy\/?/, '');
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

export default async function handler(req, res) {
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
    const target = `${backendBaseUrl}/${path}${incoming.search || ''}`;
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
