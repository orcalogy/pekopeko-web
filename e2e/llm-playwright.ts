import path from 'node:path';
import { chromium, devices, expect, test as base, type BrowserContext } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const BROWSER_CHANNEL = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? 'chrome';
const PROFILE_DIR =
  process.env.PLAYWRIGHT_LLM_PROFILE_DIR ??
  path.join(process.cwd(), '.playwright', `llm-profile-${BROWSER_CHANNEL}`);

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
      ...devices['Desktop Chrome'],
      baseURL: BASE_URL,
      channel: BROWSER_CHANNEL,
      headless: process.env.PLAYWRIGHT_HEADLESS === '0' ? false : true,
      args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'],
    });

    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

export { expect };
export type { Page } from '@playwright/test';
