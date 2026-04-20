import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeCapabilitiesResponse, serializeRestaurantSearchResponse } from './serializers.ts';
import type { RestaurantSearchResult } from './types.ts';

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
      results: [],
      pagination: {
        pageSize: 20,
        offset: 0,
        nextOffset: 20,
        returned: 0,
        total: 42,
      },
    } satisfies RestaurantSearchResult,
    'req-123',
  ) as {
    requestId: string;
    partialResults: boolean;
    providerStatuses: Array<Record<string, unknown>>;
    pagination: Record<string, unknown>;
  };

  assert.equal(payload.requestId, 'req-123');
  assert.equal(payload.partialResults, true);
  assert.deepEqual(payload.pagination, {
    pageSize: 20,
    offset: 0,
    nextOffset: 20,
    returned: 0,
    total: 42,
  });
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
