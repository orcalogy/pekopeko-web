import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const TEST_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_LLM_TEST_TIMEOUT_MS ?? 45 * 60 * 1000);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: TEST_TIMEOUT_MS,
  expect: {
    timeout: 30 * 1000,
  },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--enable-unsafe-webgpu'],
    },
  },
  webServer: {
    command: `pnpm exec next dev --turbopack --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
