import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMPTS_DIR = path.resolve(__dirname, 'prompts');

function readPrompt(filename) {
  return fs.readFileSync(path.join(PROMPTS_DIR, filename), 'utf-8').trim();
}

export function loadAllPrompts() {
  const systemPrompt = readPrompt('system-prompt.md');
  const expertRules = readPrompt('expert-rules.md');
  const saasContext = readPrompt('saas-context.md');
  const specialization = readPrompt('specialization-context.md');

  return [systemPrompt, expertRules, saasContext, specialization].filter(Boolean).join('\n\n');
}

export function loadModePrompt(mode = 'builder') {
  const normalizedMode = String(mode || 'builder').toLowerCase();

  const modePrompts = {
    builder: [
      'Modo ativo: Builder.',
      'Foque em implementar funcionalidades completas com código de produção.',
      'Explique de forma prática, orientando estrutura, arquivos, lógica e testes.',
    ].join(' '),
    debugger: [
      'Modo ativo: Debugger.',
      'Foque em diagnóstico, causa raiz, correção segura e prevenção de regressão.',
      'Priorize análise antes de propor código.',
    ].join(' '),
    architect: [
      'Modo ativo: Architect.',
      'Foque em arquitetura SaaS, multi-tenancy, autenticação, permissões, billing, escalabilidade e organização sistêmica.',
      'Priorize desenho técnico e impacto estrutural.',
    ].join(' '),
  };

  return modePrompts[normalizedMode] || modePrompts.builder;
}
