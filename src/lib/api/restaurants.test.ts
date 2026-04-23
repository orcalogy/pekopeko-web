import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRouteError } from './http.ts';
import { persistSearchSessionBestEffort } from './restaurants.ts';
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
