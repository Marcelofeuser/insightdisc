import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

test('ai-http-client chama AI_API_URL e retorna JSON', async () => {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/ai/disc-insights') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          provider: 'stub',
          model: 'stub-model',
          echo: JSON.parse(body || '{}'),
        }),
      );
    });
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert.ok(port, 'porta do servidor stub não resolvida');

  const previousAiApiUrl = process.env.AI_API_URL;
  process.env.AI_API_URL = `http://127.0.0.1:${port}`;

  try {
    const { requestDiscInsights } = await import('../../server/src/modules/ai/ai-http-client.js');
    const response = await requestDiscInsights({ ping: true }, { timeoutMs: 5_000 });
    assert.equal(response.ok, true);
    assert.equal(response.provider, 'stub');
    assert.equal(response.model, 'stub-model');
    assert.deepEqual(response.echo, { ping: true });
  } finally {
    if (previousAiApiUrl === undefined) {
      delete process.env.AI_API_URL;
    } else {
      process.env.AI_API_URL = previousAiApiUrl;
    }

    await new Promise((resolve) => server.close(resolve));
  }
});

