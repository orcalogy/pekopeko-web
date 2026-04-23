import assert from 'node:assert/strict';
import test from 'node:test';
import type { Restaurant } from '@/types/restaurant';
import { ApiRouteError } from './http.ts';
import { enrichRestaurantsForApi, persistSearchSessionBestEffort } from './restaurants.ts';
import type { SearchSessionSnapshot } from './search-cursor.ts';

const snapshot = {
  locale: 'en',
  resolved: {
    country: 'JP',
    provider: 'hotpepper',
    providerPlan: ['hotpepper', 'google'],
    strategy: 'hybrid_japan',
    confidence: 'high',
  },
  appliedFilters: {
    openNow: false,
    requiredFeatures: [],
    sortBy: 'distance',
    sortDirection: 'asc',
  },
  partialResults: false,
  providerStatuses: [
    {
      provider: 'hotpepper',
      status: 'success',
      rawResults: 42,
    },
  ],
  results: [
    {
      id: 'J001',
      restaurantKey: 'rid_test_1',
      name: 'Test Restaurant',
      address: 'Tokyo',
      lat: 35.68,
      lng: 139.76,
      distance: 120,
      source: 'hotpepper',
      providerRefs: [{ provider: 'hotpepper', providerId: 'J001' }],
    },
  ],
  pageSize: 20,
} satisfies SearchSessionSnapshot;

test('persistSearchSessionBestEffort returns the created session id', async () => {
  const sessionId = await persistSearchSessionBestEffort(snapshot, async () => 'session_123');

  assert.equal(sessionId, 'session_123');
});

test('persistSearchSessionBestEffort falls back to null when persistence fails', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const sessionId = await persistSearchSessionBestEffort(snapshot, async () => {
      throw new ApiRouteError({
        status: 500,
        code: 'internal',
        message: 'search_sessions table is missing',
      });
    });

    assert.equal(sessionId, null);
  } finally {
    console.error = originalConsoleError;
  }
});

test('enrichRestaurantsForApi limits concurrency and preserves result order', async () => {
  const restaurants = Array.from({ length: 5 }, (_, index) => makeRestaurant(index));
  let active = 0;
  let maxActive = 0;

  const enriched = await enrichRestaurantsForApi(
    restaurants,
    async (restaurant) => {
      active += 1;
      maxActive = Math.max(maxActive, active);

      await new Promise((resolve) => setTimeout(resolve, 5));

      active -= 1;
      return {
        ...restaurant,
        restaurantKey: `rid_${restaurant.id}`,
        providerRefs: restaurant.providerRefs ?? [],
      };
    },
    2,
  );

  assert.equal(maxActive, 2);
  assert.deepEqual(
    enriched.map((restaurant) => restaurant.id),
    restaurants.map((restaurant) => restaurant.id),
  );
  assert.deepEqual(
    enriched.map((restaurant) => restaurant.restaurantKey),
    restaurants.map((restaurant) => `rid_${restaurant.id}`),
  );
});

function makeRestaurant(index: number): Restaurant {
  return {
    id: `J00${index}`,
    name: `Test Restaurant ${index}`,
    address: 'Tokyo',
    lat: 35.68,
    lng: 139.76,
    distance: index * 10,
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: `J00${index}` }],
  };
}
