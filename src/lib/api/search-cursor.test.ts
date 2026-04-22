import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRouteError } from './http.ts';
import {
  createSearchCursorPayload,
  decodeSearchCursor,
  encodeSearchCursor,
} from './search-cursor.ts';

test('search cursor round-trips ordered results and pagination state', () => {
  const cursor = createSearchCursorPayload({
    locale: 'ja',
    resolved: {
      country: 'JP',
      provider: 'hotpepper',
      providerPlan: ['hotpepper', 'google'],
      strategy: 'hybrid_japan',
      confidence: 'high',
    },
    appliedFilters: {
      openNow: true,
      requiredFeatures: ['wifi'],
      sortBy: 'distance',
      sortDirection: 'asc',
    },
    partialResults: true,
    providerStatuses: [
      {
        provider: 'hotpepper',
        status: 'success',
        rawResults: 8,
      },
    ],
    results: [
      {
        id: 'google:place-1',
        restaurantKey: 'rid_123',
        name: 'Good Spoon',
        address: 'Tokyo',
        lat: 35.68,
        lng: 139.69,
        distance: 123.4,
        source: 'hybrid',
        providerRefs: [
          { provider: 'google', providerId: 'place-1' },
          { provider: 'hotpepper', providerId: 'J001' },
        ],
      },
    ],
    pageSize: 20,
    startIndex: 0,
  });

  const decoded = decodeSearchCursor(encodeSearchCursor(cursor));

  assert.equal(decoded.pageSize, 20);
  assert.equal(decoded.startIndex, 0);
  assert.equal(decoded.results[0]?.restaurantKey, 'rid_123');
  assert.equal(decoded.providerStatuses[0]?.provider, 'hotpepper');
});

test('search cursor rejects malformed payloads', () => {
  assert.throws(
    () => decodeSearchCursor('not-a-cursor'),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      assert.equal(error.details?.field, 'pagination.cursor');
      return true;
    },
  );
});
