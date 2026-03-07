import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers/waitForApp';
import { expectPremiumBackground } from './helpers/styles';

test('CTA secundário da Home não fica branco sólido', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  const secondaryCta = page.getByTestId('home-cta-secondary');
  await expect(secondaryCta).toBeVisible();
  await expectPremiumBackground(secondaryCta);

  await page.screenshot({
    path: testInfo.outputPath('home-cta-secondary.png'),
    fullPage: true,
  });
});
