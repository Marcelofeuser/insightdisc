import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiscInsightsPrompt } from '../../server/src/modules/ai/prompt-builder.js';

const basePayload = {
  nome: 'João Silva',
  cargo: 'Gerente Comercial',
  empresa: 'Empresa XYZ',
  profileCode: 'DI',
  profileName: 'Dominante Influente',
  scores: {
    D: 34,
    I: 32,
    S: 23,
    C: 11,
  },
};

test('buildDiscInsightsPrompt diferencia instruções por modo', () => {
  const personal = buildDiscInsightsPrompt({ ...basePayload, mode: 'personal' });
  const professional = buildDiscInsightsPrompt({ ...basePayload, mode: 'professional' });
  const business = buildDiscInsightsPrompt({ ...basePayload, mode: 'business' });

  assert.match(personal.userPrompt, /autoconhecimento/i);
  assert.match(professional.userPrompt, /trabalho|carreira|liderança/i);
  assert.match(business.userPrompt, /executivo|estratégico|organizacional/i);

  assert.notEqual(personal.userPrompt, professional.userPrompt);
  assert.notEqual(professional.userPrompt, business.userPrompt);
  assert.notEqual(personal.userPrompt, business.userPrompt);
});

test('buildDiscInsightsPrompt reforça linguagem direta e campos estratégicos no modo business', () => {
  const business = buildDiscInsightsPrompt({ ...basePayload, mode: 'business' });

  assert.match(business.userPrompt, /linguagem profissional, direta e de valor prático/i);
  assert.match(business.userPrompt, /decisionMaking/i);
  assert.match(business.userPrompt, /riskProfile/i);
  assert.match(business.userPrompt, /strategicProfile/i);
  assert.match(business.userPrompt, /sem clichês/i);
});

test('buildDiscInsightsPrompt força modo válido ao montar o prompt', () => {
  const prompt = buildDiscInsightsPrompt({ ...basePayload, mode: 'unsupported-mode' });

  assert.equal(prompt.mode, 'business');
  assert.match(prompt.userPrompt, /- modo: business/i);
  assert.match(prompt.systemInstruction, /retorne apenas json válido/i);
});

test('buildDiscInsightsPrompt gera modo estrito para retry de JSON inválido', () => {
  const prompt = buildDiscInsightsPrompt(
    { ...basePayload, mode: 'professional' },
    { strictJsonRetry: true },
  );

  assert.equal(prompt.strictJsonRetry, true);
  assert.match(prompt.systemInstruction, /resposta anterior foi inválida/i);
  assert.match(prompt.userPrompt, /json minificado/i);
  assert.match(prompt.userPrompt, /não envolva o json em ```json/i);
});
