import { expect, test, type Page } from './llm-playwright';
import { DEFAULT_LLM_MODEL } from '../src/lib/llm/availability';

const MODEL_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_LLM_MODEL_TIMEOUT_MS ?? 35 * 60 * 1000);

test.skip(process.env.LLM_E2E_LIVE !== '1', 'Live LLM smoke requires LLM_E2E_LIVE=1.');

test('live Qwen3.5 smoke search and rerank does not fatally fall back', async ({ page }) => {
  await seedLiveState(page);
  await page.goto('/settings');
  await assertWebGpuAvailable(page);

  await expect(page.getByText(`Default model: ${DEFAULT_LLM_MODEL}`)).toBeVisible();
  await page.getByTestId('llm-prepare-model').click();
  await expect(page.getByTestId('llm-runtime-status')).toContainText('Ready', {
    timeout: MODEL_TIMEOUT_MS,
  });

  await page.goto('/');
  await page.getByText('🍽️ Eat Out').click();
  await page.getByTestId('eat-out-query-input').fill('quiet cafe where I can work');
  await page.getByTestId('eat-out-search-ai').click();
  await expect(page).toHaveURL(/\/eat-out\?/u, { timeout: MODEL_TIMEOUT_MS });
  await expect(page.getByText('This session has fallen back to keyword-only search')).toHaveCount(0);

  const rerankButton = page.getByTestId('eat-out-rerank-ai');
  await expect(rerankButton).toBeEnabled({ timeout: 120 * 1000 });
  await rerankButton.click();
  await expect(page.getByText('AI #1')).toBeVisible({ timeout: MODEL_TIMEOUT_MS });
});

async function assertWebGpuAvailable(page: Page) {
  const support = await page.evaluate(() => ({
    hasWorker: 'Worker' in window,
    hasWebGpu: 'gpu' in navigator,
  }));

  expect(
    support.hasWorker && support.hasWebGpu,
    'Live LLM smoke requires Web Workers and WebGPU. Use a Chromium build with WebGPU enabled.',
  ).toBe(true);
}

async function seedLiveState(page: Page) {
  await page.addInitScript((modelId) => {
    window.localStorage.setItem(
      'pekopeko-preferences',
      JSON.stringify({
        state: {
          locale: 'en',
          theme: 'auto',
          excludedFoodIds: [],
          maxSpicy: 3,
          searchRadiusKm: 2,
          minRating: 0,
          maxBudgetLevel: 0,
          partySize: 1,
          llmEnabled: true,
          llmModel: modelId,
        },
        version: 5,
      }),
    );
    window.localStorage.setItem(
      'pekopeko-location',
      JSON.stringify({
        state: {
          lat: 35.681236,
          lng: 139.767125,
          country: 'JP',
          provider: 'google',
          locatedAt: Date.now(),
        },
        version: 0,
      }),
    );
  }, DEFAULT_LLM_MODEL);
}
