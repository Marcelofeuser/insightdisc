import { expect } from '@playwright/test';

function isSolidWhite(value = '') {
  const normalized = String(value).replace(/\s+/g, '').toLowerCase();
  return (
    normalized === 'rgb(255,255,255)' ||
    normalized === 'rgba(255,255,255,1)' ||
    normalized === '#fff' ||
    normalized === '#ffffff'
  );
}

export async function expectPremiumBackground(locator) {
  const styles = await locator.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      color: computed.color,
      borderColor: computed.borderColor,
    };
  });

  const hasGradient =
    styles.backgroundImage && styles.backgroundImage !== 'none' && styles.backgroundImage.includes('gradient');
  const whiteSolid = isSolidWhite(styles.backgroundColor);

  expect(
    hasGradient || !whiteSolid,
    `CTA com fundo inválido. backgroundColor=${styles.backgroundColor}, backgroundImage=${styles.backgroundImage}`
  ).toBeTruthy();
}
