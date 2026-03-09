import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : 2,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/live-auth-results.json' }],
    ['html', { open: 'never', outputFolder: 'playwright-report-live' }],
  ],
  outputDir: 'test-results/live-auth-artifacts',
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: process.env.LIVE_BASE_URL || 'https://insightdisc.vercel.app',
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-live',
      use: { browserName: 'chromium' },
    },
  ],
});

