import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const isApiMode = String(process.env.PW_ENABLE_API_MODE || '')
  .trim()
  .toLowerCase() === 'true';
const e2eApiBaseUrl =
  process.env.E2E_API_URL ||
  process.env.VITE_API_URL ||
  'http://127.0.0.1:4000';

function resolveApiPort(rawUrl = '') {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.port) return Number(parsed.port);
    return parsed.protocol === 'https:' ? 443 : 80;
  } catch {
    return 4000;
  }
}

const e2eApiPort = resolveApiPort(e2eApiBaseUrl);
const baseTestIgnore = ['**/auth-access-live.spec.js'];
const defaultModeIgnore = [
  '**/audit-api-authorization.spec.js',
  '**/audit-auth-routes.spec.js',
];

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: isApiMode ? baseTestIgnore : [...baseTestIgnore, ...defaultModeIgnore],
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results/artifacts',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: isApiMode
    ? [
        {
          command: `SERVER_PORT=${e2eApiPort} npm --prefix server run start`,
          timeout: 120_000,
          reuseExistingServer: !isCI,
          url: `${e2eApiBaseUrl.replace(/\/+$/, '')}/health`,
        },
        {
          command: `VITE_API_URL=${e2eApiBaseUrl} VITE_API_BASE_URL=${e2eApiBaseUrl} VITE_BASE44_APP_ID= VITE_ENABLE_DEV_LOGIN_SHORTCUTS=true npm run dev -- --host 127.0.0.1 --port 5173`,
          timeout: 120_000,
          reuseExistingServer: !isCI,
          url: 'http://127.0.0.1:5173',
        },
      ]
    : {
        command: 'VITE_API_URL= VITE_API_BASE_URL= VITE_BASE44_APP_ID= VITE_ENABLE_DEV_LOGIN_SHORTCUTS=true npm run dev -- --host 127.0.0.1 --port 5173',
        timeout: 120_000,
        reuseExistingServer: !isCI,
        url: 'http://127.0.0.1:5173',
      },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
