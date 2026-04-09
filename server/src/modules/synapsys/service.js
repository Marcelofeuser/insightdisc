import OpenAI from 'openai';
import { loadAllPrompts, loadModePrompt } from './loadPrompts.js';

let openaiClient = null;

function getOpenAiClient() {
  if (openaiClient) return openaiClient;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI não configurada: OPENAI_API_KEY ausente');
  }

  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

async function openaiProvider(systemPrompt, userInput) {
  const client = getOpenAiClient();

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
  });

  return response.choices?.[0]?.message?.content || '';
}

export async function generateSynapsysInsight(input, mode = 'builder') {
  const basePrompt = loadAllPrompts();
  const modePrompt = loadModePrompt(mode);
  const systemPrompt = [basePrompt, modePrompt].filter(Boolean).join('\n\n');

  const text = await openaiProvider(systemPrompt, input);

  return {
    source: 'openai',
    mode,
    response: text,
  };
}
