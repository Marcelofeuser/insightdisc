import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';
import { expectPremiumBackground } from './helpers/styles';

test('CTA secundário de /avaliacoes não fica branco sólido', async ({ page }, testInfo) => {
  await page.goto('/avaliacoes', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  const secondaryCta = page.getByTestId('avaliacoes-cta-secondary');
  await expect(secondaryCta).toBeVisible();
  await expectPremiumBackground(secondaryCta);

  await page.screenshot({
    path: testInfo.outputPath('avaliacoes-cta-secondary.png'),
    fullPage: true,
  });
});
