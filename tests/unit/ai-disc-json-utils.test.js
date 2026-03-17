import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJsonFromText,
  parseProviderJsonSafely,
  tryRepairCommonJsonIssues,
} from '../../server/src/modules/ai/json-utils.js';

test('extractJsonFromText remove prose e isola o bloco JSON', () => {
  const raw = 'Segue a análise:\n\n{"summary":"abc"}\n\nObrigado.';
  assert.equal(extractJsonFromText(raw), '{"summary":"abc"}');
});

test('parseProviderJsonSafely recupera JSON em code fence com trailing comma', () => {
  const raw = `Aqui está o resultado:

\`\`\`json
{
  "summary": "Texto suficientemente longo para o teste de parsing.",
  "tone": "professional",
}
\`\`\``;

  const parsed = parseProviderJsonSafely(raw, {
    provider: 'gemini',
    model: 'gemini-test',
  });

  assert.equal(parsed.summary, 'Texto suficientemente longo para o teste de parsing.');
  assert.equal(parsed.tone, 'professional');
});

test('parseProviderJsonSafely recupera JSON entre o primeiro e o último bloco de chaves', () => {
  const raw = 'Analisei o perfil.\n{"summary":"Texto suficientemente longo para teste.","tone":"personal"}\nObservação final.';

  const parsed = parseProviderJsonSafely(raw, {
    provider: 'gemini',
    model: 'gemini-test',
  });

  assert.equal(parsed.summary, 'Texto suficientemente longo para teste.');
  assert.equal(parsed.tone, 'personal');
});

test('tryRepairCommonJsonIssues corrige smart quotes, newline cru e fechamento externo', () => {
  const repaired = tryRepairCommonJsonIssues(`{
  “summary”: “Linha 1
Linha 2”,
  “tone”: “business”,
`);

  const parsed = JSON.parse(repaired);
  assert.equal(parsed.summary, 'Linha 1\nLinha 2');
  assert.equal(parsed.tone, 'business');
});
