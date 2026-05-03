import { expect, test, type Page } from './llm-playwright';
import { DEFAULT_LLM_MODEL } from '../src/lib/llm/availability';
import { cookGoldenCases, eatOutIntentGoldenCases } from '../src/lib/llm/golden-cases';
import { mockRestaurants } from '../src/lib/llm/restaurant-fixtures.test-data';

const MODEL_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_LLM_MODEL_TIMEOUT_MS ?? 35 * 60 * 1000);
const FLOW_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_LLM_FLOW_TIMEOUT_MS ?? 120 * 1000);
const fixtureSearchBodies: unknown[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  fixtureSearchBodies.length = 0;
  await routeFixtureRestaurants(page);
});

test('fixture-backed Qwen3.5 local LLM flow covers settings, cook, search, refine, and rerank', async ({
  page,
}) => {
  await seedLocalState(page);
  await page.goto('/settings');
  await assertWebGpuAvailable(page);
  await page.evaluate(() => window.localStorage.setItem('pekopeko-llm-debug', '1'));

  await expect(page.getByText(`Default model: ${DEFAULT_LLM_MODEL}`)).toBeVisible();
  await expect(page.getByText('Support status: Supported')).toBeVisible();
  await expect(page.getByTestId('llm-prepare-model')).toBeEnabled();
  await prepareModel(page);
  console.log('[llm-e2e] model ready');

  const cookCase = cookGoldenCases.find((item) => item.id === 'cook-en-spicy-noodles');
  if (!cookCase) throw new Error('Missing cook golden case cook-en-spicy-noodles.');

  await page.goto('/');
  await page.getByText('🍳 Cook').click();
  await page.getByTestId('cook-query-input').fill(cookCase.query);
  await page.getByTestId('cook-apply-ai').click();
  await expect(page.getByTestId('cook-ai-note')).not.toBeVisible({ timeout: FLOW_TIMEOUT_MS });
  await expect(page.getByText('AI added extra filters')).toBeVisible({ timeout: FLOW_TIMEOUT_MS });
  await expect(page.getByText('Hot & Sour Glass Noodles')).toBeVisible();
  console.log('[llm-e2e] cook semantic search applied');

  const eatOutCase = eatOutIntentGoldenCases.find((item) => item.id === 'eat-en-work-cafe');
  if (!eatOutCase) throw new Error('Missing eat-out golden case eat-en-work-cafe.');

  await page.getByText('🍽️ Eat Out').click();
  await page.getByTestId('eat-out-query-input').fill(eatOutCase.query);
  await page.getByTestId('eat-out-search-ai').click();
  await expect(page).toHaveURL(/\/eat-out\?/u, { timeout: FLOW_TIMEOUT_MS });
  await expect(page).toHaveURL(/localIntent=/u);
  await expect(page).not.toHaveURL(/keyword=/u);
  await expect(page).not.toHaveURL(/category=/u);
  await expect(page.getByText('Desk Cafe', { exact: true }).last()).toBeVisible();
  const semanticSearchBody = fixtureSearchBodies.at(-1) as
    | { query?: { keyword?: string; categoryId?: string; providerKeywords?: unknown } }
    | undefined;
  expect(semanticSearchBody?.query?.keyword).toBeUndefined();
  expect(semanticSearchBody?.query?.categoryId).toBeUndefined();
  expect(semanticSearchBody?.query?.providerKeywords).toBeUndefined();
  console.log('[llm-e2e] eat-out semantic search applied');

  await expect(page.getByTestId('eat-out-rerank-ai')).toBeEnabled();
  await page.getByTestId('eat-out-rerank-ai').click();
  try {
    await expect(page.getByText('AI #1')).toBeVisible({ timeout: FLOW_TIMEOUT_MS });
  } catch (error) {
    throw new Error(
      `Rerank did not produce visible AI badges. Last rerank completion: ${await readLlmDebugCompletion(
        page,
        'eat-out-rerank',
      )}. ${formatError(error)}`,
    );
  }
  await expect(page.getByTestId('rerank-ai-note')).not.toBeVisible();
  console.log('[llm-e2e] rerank applied');

  await page.getByTestId('eat-out-refine-input').fill('within 500 meters');
  await page.getByTestId('eat-out-refine-ai').click();
  await expect(page.getByText(/search distance:\s*500 m/iu)).toBeVisible({
    timeout: FLOW_TIMEOUT_MS,
  });
  console.log('[llm-e2e] refinement applied');
});

test('AI disabled keeps keyword-only cook search usable', async ({ page }) => {
  await seedLocalState(page, { llmEnabled: false });

  await page.goto('/');
  await page.getByText('🍳 Cook').click();
  await page.getByTestId('cook-query-input').fill('ramen');
  await expect(page.getByText(/dishes match "ramen"/u)).toBeVisible();
  await expect(page.getByTestId('cook-apply-ai')).toHaveCount(0);
});

async function assertWebGpuAvailable(page: Page) {
  const support = await page.evaluate(() => ({
    hasWorker: 'Worker' in window,
    hasWebGpu: 'gpu' in navigator,
  }));

  expect(
    support.hasWorker && support.hasWebGpu,
    'LLM browser E2E requires Web Workers and WebGPU. Use a Chromium build with WebGPU enabled, or run the manual in-app-browser smoke after enabling AI Search.',
  ).toBe(true);
}

async function readLlmDebugCompletion(
  page: Page,
  action: 'cook-intent' | 'eat-out-intent' | 'eat-out-refinement' | 'eat-out-rerank',
): Promise<string> {
  return page.evaluate((debugAction) => {
    return window.localStorage.getItem(`pekopeko-llm-debug-${debugAction}`) ?? 'not recorded';
  }, action);
}

async function prepareModel(page: Page) {
  await page.getByTestId('llm-prepare-model').click();

  try {
    await expect(page.getByTestId('llm-runtime-status')).toContainText('Ready', {
      timeout: MODEL_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(
      `Qwen3.5 did not become ready within ${Math.round(
        MODEL_TIMEOUT_MS / 1000,
      )}s. Last LLM state: ${await readLlmState(page)}. ${formatError(error)}`,
    );
  }
}

async function readLlmState(page: Page): Promise<string> {
  const parts = await Promise.all(
    [
      'llm-runtime-status',
      'llm-cache-status',
      'llm-support-message',
      'llm-runtime-message',
      'llm-last-error',
    ].map(async (testId) => {
      const text = await page
        .getByTestId(testId)
        .textContent({ timeout: 500 })
        .catch(() => null);
      return text?.trim();
    }),
  );

  return parts.filter(Boolean).join(' | ') || 'no visible LLM status';
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function seedLocalState(page: Page, options?: { llmEnabled?: boolean }) {
  await page.addInitScript(({ llmEnabled, modelId }) => {
    const now = Date.now();

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
          llmEnabled,
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
          locatedAt: now,
        },
        version: 0,
      }),
    );
  }, { llmEnabled: options?.llmEnabled ?? true, modelId: DEFAULT_LLM_MODEL });
}

async function routeFixtureRestaurants(page: Page) {
  await page.route('**/api/geocode/reverse**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ country: 'JP' }),
    });
  });

  await page.route('**/api/v1/restaurants/search', async (route) => {
    fixtureSearchBodies.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: mockRestaurants,
        providerStatuses: [{ provider: 'google', status: 'ok' }],
        pagination: { mode: 'page', hasMore: false },
      }),
    });
  });
}
