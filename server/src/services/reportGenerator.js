import { exec } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateAiDiscContent } from '../modules/ai/ai-report.service.js';

const basePath = '/Users/marcelofeuser/Projects/insightdisc/public/relatorio_teste';

const REPORT_OUTPUTS = {
  personal: {
    html: 'relatorio_disc_personal.html',
    pdf: 'relatorio_disc_personal.pdf',
  },
  professional: {
    html: 'relatorio_disc_professional.html',
    pdf: 'relatorio_disc_professional.pdf',
  },
  business: {
    html: 'relatorio_disc_business.html',
    pdf: 'relatorio_disc_business.pdf',
  },
};
const modeLocks = new Map();

function normalizeMode(mode = 'business') {
  const normalized = String(mode || '').trim().toLowerCase();
  return REPORT_OUTPUTS[normalized] ? normalized : 'business';
}

function sanitizeLogValue(value, maximumLength = 400) {
  return String(value || '')
    .trim()
    .slice(0, maximumLength);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildArg(name, value) {
  if (value === undefined || value === null || value === '') return '';
  return ` --${name}=${shellEscape(value)}`;
}

function hasMeaningfulAiSourceContent(content) {
  return Boolean(
    content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      Object.entries(content).some(([field, value]) => {
        if (field === 'tone') return false;
        if (typeof value === 'string') return Boolean(value.trim());
        if (Array.isArray(value)) return value.some((item) => Boolean(String(item || '').trim()));
        return false;
      }),
  );
}

function getModeLock(mode) {
  if (!modeLocks.has(mode)) {
    modeLocks.set(mode, {
      locked: false,
      queue: [],
    });
  }

  return modeLocks.get(mode);
}

async function withModeGenerationLock(mode, task) {
  const lock = getModeLock(mode);

  await new Promise((resolve) => {
    if (!lock.locked) {
      lock.locked = true;
      resolve();
      return;
    }

    lock.queue.push(resolve);
  });

  try {
    return await task();
  } finally {
    const next = lock.queue.shift();
    if (next) {
      next();
      return;
    }

    lock.locked = false;
    if (lock.queue.length === 0) {
      modeLocks.delete(mode);
    }
  }
}

function buildDiscCommand({
  basePath: workingPath,
  normalizedMode,
  scores,
  payload,
  useAi,
  aiInputPath,
  outputs,
}) {
  return [
    `cd ${shellEscape(workingPath)}`,
    `node disc_engine.js --mode=${shellEscape(normalizedMode)}`,
    `${buildArg('d', scores.D)}`,
    `${buildArg('i', scores.I)}`,
    `${buildArg('s', scores.S)}`,
    `${buildArg('c', scores.C)}`,
    `${buildArg('nome', payload.nome)}`,
    `${buildArg('cargo', payload.cargo)}`,
    `${buildArg('empresa', payload.empresa)}`,
    `${buildArg('data', payload.data)}`,
    `${useAi ? ' --useAi=true' : ''}`,
    `${useAi && aiInputPath ? ` --aiInput=${shellEscape(aiInputPath)}` : ''}`,
    `&& node gerar_pdf.mjs ${shellEscape(outputs.html)} ${shellEscape(outputs.pdf)}`,
  ]
    .join(' ')
    .trim();
}

function executeDiscCommand(command, outputs, normalizedMode) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(stderr?.trim() || stdout?.trim() || error.message || 'Falha ao gerar relatório DISC.'),
        );
        return;
      }

      resolve({
        mode: normalizedMode,
        html: outputs.html,
        pdf: outputs.pdf,
        htmlPath: path.join(basePath, outputs.html),
        pdfPath: path.join(basePath, outputs.pdf),
        stdout: stdout?.trim() || '',
      });
    });
  });
}

export function gerarRelatorio({
  mode = 'business',
  scores = {},
  payload = {},
  useAi = false,
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const outputs = REPORT_OUTPUTS[normalizedMode];
  const aiRequested = useAi === true;

  let tempDir = '';
  let artifactDir = '';
  let aiMeta = aiRequested
    ? {
        requested: true,
        enabled: false,
      }
    : {
        enabled: false,
      };

  return (async () => {
    return withModeGenerationLock(normalizedMode, async () => {
      let aiInputPath = '';
      let aiEnabled = false;

      console.info('[disc-report] generating report', {
        mode: normalizedMode,
        useAi: aiRequested,
      });

      if (aiRequested) {
        console.info('[disc-report] AI enabled', {
          mode: normalizedMode,
        });

        try {
          const aiResult = await generateAiDiscContent({
            mode: normalizedMode,
            nome: payload.nome,
            cargo: payload.cargo,
            empresa: payload.empresa,
            scores,
          });

          const hasProviderText = aiResult?.source === 'ai' && hasMeaningfulAiSourceContent(aiResult?.rawContent);

          if (!hasProviderText) {
            console.warn('[disc-report] AI skipped due to invalid content', {
              mode: normalizedMode,
              reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'NO_PROVIDER_TEXT_FIELDS',
            });
            aiMeta = {
              ...aiMeta,
              skipped: true,
              reason: aiResult?.source === 'fallback' ? 'AI_FALLBACK_TRIGGERED' : 'NO_PROVIDER_TEXT_FIELDS',
            };
          } else {
            tempDir = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-ai-'));
            aiInputPath = path.join(tempDir, 'disc-ai-content.json');
            writeFileSync(
              aiInputPath,
              JSON.stringify(
                {
                  content: aiResult.content,
                  rawContent: aiResult.rawContent,
                },
                null,
                2,
              ),
              'utf8',
            );
            aiEnabled = true;
            aiMeta = {
              requested: true,
              enabled: true,
              provider: aiResult.provider,
              model: aiResult.model,
              source: aiResult.source,
              usedFallback: aiResult.usedFallback,
              attempts: aiResult.attempts,
            };
          }
        } catch (error) {
          console.warn('[disc-report] AI skipped due to invalid content', {
            mode: normalizedMode,
            error: sanitizeLogValue(error?.message || error),
          });
          aiMeta = {
            ...aiMeta,
            skipped: true,
            reason: 'AI_GENERATION_FAILED',
          };
          aiEnabled = false;
          aiInputPath = '';
        }
      }

      let result;

      try {
        result = await executeDiscCommand(
          buildDiscCommand({
            basePath,
            normalizedMode,
            scores,
            payload,
            useAi: aiEnabled,
            aiInputPath,
            outputs,
          }),
          outputs,
          normalizedMode,
        );
      } catch (error) {
        if (!aiEnabled) {
          throw error;
        }

        console.warn('[disc-report] engine failed with AI, retrying without AI', {
          mode: normalizedMode,
          error: sanitizeLogValue(error?.message || error),
        });

        aiEnabled = false;
        aiMeta = {
          ...aiMeta,
          enabled: false,
          skipped: true,
          reason: 'ENGINE_RETRY_WITHOUT_AI',
        };

        result = await executeDiscCommand(
          buildDiscCommand({
            basePath,
            normalizedMode,
            scores,
            payload,
            useAi: false,
            aiInputPath: '',
            outputs,
          }),
          outputs,
          normalizedMode,
        );
      }

      console.info('[disc-report] report generated successfully', {
        mode: normalizedMode,
        pdf: outputs.pdf,
        aiEnabled,
      });

      artifactDir = mkdtempSync(path.join(os.tmpdir(), 'insightdisc-report-'));
      const uniqueHtmlPath = path.join(artifactDir, outputs.html);
      const uniquePdfPath = path.join(artifactDir, outputs.pdf);
      copyFileSync(result.htmlPath, uniqueHtmlPath);
      copyFileSync(result.pdfPath, uniquePdfPath);

      const cleanup = () => {
        if (!artifactDir) return;
        rmSync(artifactDir, { recursive: true, force: true });
        artifactDir = '';
      };

      const cleanupTimer = setTimeout(cleanup, 10 * 60 * 1000);
      cleanupTimer.unref?.();

      return {
        ...result,
        htmlPath: uniqueHtmlPath,
        pdfPath: uniquePdfPath,
        cleanup,
        ai: aiRequested
          ? {
              ...aiMeta,
              enabled: aiEnabled,
            }
          : aiMeta,
      };
    }).finally(() => {
      if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  })();
}

export { REPORT_OUTPUTS, basePath as REPORT_BASE_PATH, normalizeMode };
