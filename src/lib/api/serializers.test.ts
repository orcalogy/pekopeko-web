import assert from 'node:assert/strict';
import test from 'node:test';
import {
  serializeCapabilitiesResponse,
  serializeRestaurantDetailsResponse,
  serializeRestaurantSearchResponse,
} from './serializers.ts';
import type { RestaurantDetailsResult, RestaurantSearchResult } from './types.ts';

test('capabilities serializer keeps zh-CN on the wire shape', () => {
  const payload = serializeCapabilitiesResponse() as {
    categories: Array<{ name: Record<string, string> }>;
  };

  assert.equal(typeof payload.categories[0]?.name['zh-CN'], 'string');
  assert.equal('zh_CN' in (payload.categories[0]?.name ?? {}), false);
});

test('search serializer emits providerStatuses and offset pagination', () => {
  const payload = serializeRestaurantSearchResponse(
    {
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
          rawResults: 12,
        },
        {
          provider: 'google',
          status: 'failed',
          errorCode: 'upstream_error',
          errorMessage: 'google search failed',
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
      pagination: {
        pageSize: 20,
        offset: 0,
        nextOffset: 20,
        returned: 1,
        total: 42,
      },
    } satisfies RestaurantSearchResult,
    'req-123',
  ) as {
    requestId: string;
    partialResults: boolean;
    providerStatuses: Array<Record<string, unknown>>;
    pagination: Record<string, unknown>;
    results: Array<Record<string, unknown>>;
  };

  assert.equal(payload.requestId, 'req-123');
  assert.equal(payload.partialResults, true);
  assert.deepEqual(payload.pagination, {
    pageSize: 20,
    offset: 0,
    nextOffset: 20,
    returned: 1,
    total: 42,
  });
  assert.equal(payload.results[0]?.id, undefined);
  assert.equal(payload.results[0]?.distance, 123);
  assert.deepEqual(payload.providerStatuses, [
    {
      provider: 'hotpepper',
      status: 'success',
      rawResults: 12,
    },
    {
      provider: 'google',
      status: 'failed',
      error: {
        code: 'upstream_error',
        message: 'google search failed',
      },
    },
  ]);
});

test('details serializer omits search-only distance and internal ids', () => {
  const payload = serializeRestaurantDetailsResponse(
    {
      restaurant: {
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
      freshness: {
        state: 'live',
      },
      providerStatuses: [],
      cacheControl: 'public, max-age=300',
    } satisfies RestaurantDetailsResult,
    'req-456',
  ) as {
    requestId: string;
    restaurant: Record<string, unknown>;
  };

  assert.equal(payload.requestId, 'req-456');
  assert.equal(payload.restaurant.id, undefined);
  assert.equal(payload.restaurant.distance, undefined);
  assert.equal(payload.restaurant.restaurantKey, 'rid_123');
});
