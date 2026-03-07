import { expect } from '@playwright/test';

const FATAL_ERROR_PATTERN =
  /Unhandled Runtime Error|Minified React error|Cannot read properties of undefined|Something went wrong/i;

export async function waitForApp(page, options = {}) {
  const timeout = options.timeout ?? 15_000;

  await page.waitForLoadState('domcontentloaded', { timeout });
  await expect(page.locator('body')).toBeVisible({ timeout });

  await page.waitForFunction(
    () => {
      if (!document?.body) return false;
      const text = (document.body.innerText || '').replace(/\s+/g, '');
      const nodes = document.body.querySelectorAll('*').length;
      return text.length > 10 || nodes > 10;
    },
    { timeout }
  );

  const bodyText = (await page.locator('body').innerText()).trim();
  expect(bodyText).not.toMatch(FATAL_ERROR_PATTERN);
}
