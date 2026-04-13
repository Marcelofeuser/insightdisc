export const SYNAPSYS_API_URL = String(
  import.meta.env.VITE_SYNAPSYS_API_URL || 'https://api.synapsys.insightdisc.com',
)
  .trim()
  .replace(/\/$/, '');

function toText(value) {
  return String(value || '').trim();
}

function extractJsonMessage(payload = null) {
  if (!payload || typeof payload !== 'object') return '';

  const candidates = [
    payload.message,
    payload.error,
    payload.response,
    payload.answer,
    payload.details,
  ];

  return candidates.map((value) => toText(value)).find(Boolean) || '';
}

function extractResponseText(payload = null, fallbackText = '') {
  if (payload && typeof payload === 'object') {
    const candidates = [
      payload.response,
      payload.answer,
      payload.output,
      payload.result,
      payload.content,
      payload.data?.response,
      payload.data?.answer,
      payload.data?.output,
      payload.data?.result,
    ];

    const resolved = candidates.map((value) => toText(value)).find(Boolean);
    if (resolved) return resolved;
  }

  return toText(fallbackText);
}

export async function analyzeWithSynapsys(payload = {}) {
  const input = toText(payload?.input);
  const mode = toText(payload?.mode || 'builder') || 'builder';

  if (!input) {
    throw new Error('Synapsys exige um texto de entrada para análise.');
  }

  const response = await fetch(`${SYNAPSYS_API_URL}/synapsys/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      mode,
    }),
  });

  const responseText = await response.text();
  let parsed = null;

  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      extractJsonMessage(parsed)
      || toText(responseText)
      || `Synapsys indisponível (${response.status}).`;
    throw new Error(message);
  }

  if (parsed && parsed.success === false) {
    throw new Error(extractJsonMessage(parsed) || 'Synapsys retornou uma falha na análise.');
  }

  const resultText = extractResponseText(parsed, responseText);
  if (!resultText) {
    throw new Error('Synapsys não retornou conteúdo utilizável.');
  }

  return {
    ok: true,
    provider: toText(parsed?.provider || 'synapsys'),
    source: toText(parsed?.source || 'synapsys'),
    mode: toText(parsed?.mode || mode) || mode,
    model: toText(parsed?.model),
    response: resultText,
    raw: parsed || responseText,
  };
}
