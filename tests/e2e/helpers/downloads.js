import fs from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';

export async function capturePdfDownload(page, trigger, options = {}) {
  const downloadDir = options.downloadDir || 'test-results/downloads';
  await fs.mkdir(downloadDir, { recursive: true });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: options.timeout ?? 25_000 }),
    trigger(),
  ]);

  const suggestedFilename = download.suggestedFilename() || `report-${Date.now()}.pdf`;
  const finalName = suggestedFilename.toLowerCase().endsWith('.pdf')
    ? suggestedFilename
    : `${suggestedFilename}.pdf`;

  const savePath = path.resolve(downloadDir, `${Date.now()}-${finalName}`);
  await download.saveAs(savePath);

  const stats = await fs.stat(savePath);
  expect(finalName.toLowerCase()).toMatch(/\.pdf$/);
  expect(stats.size).toBeGreaterThan(options.minBytes ?? 1_000);

  return {
    suggestedFilename,
    savePath,
    size: stats.size,
  };
}
