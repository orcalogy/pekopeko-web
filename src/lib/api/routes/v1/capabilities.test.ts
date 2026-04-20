import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPABILITIES_CACHE_CONTROL } from '../../capabilities.ts';
import { jsonResponse } from '../../http.ts';
import { serializeCapabilitiesResponse } from '../../serializers.ts';
import { createCapabilitiesGetHandler } from './capabilities.ts';

test('capabilities route exposes the search contract metadata', async () => {
  const handler = createCapabilitiesGetHandler({
    createRequestId: () => 'req-capabilities-route',
    serializeCapabilitiesResponse,
    jsonResponse,
  });

  const response = handler();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'req-capabilities-route');
  assert.equal(response.headers.get('cache-control'), CAPABILITIES_CACHE_CONTROL);

  const payload = (await response.json()) as {
    search: {
      paginationMode: string;
      requiredFeatures: string[];
      sortBy: string[];
      sortDirections: string[];
    };
    categories: Array<{ name: Record<string, string> }>;
  };

  assert.equal(payload.search.paginationMode, 'offset');
  assert.deepEqual(payload.search.sortBy, ['distance', 'rating']);
  assert.deepEqual(payload.search.sortDirections, ['asc', 'desc']);
  assert.equal(payload.search.requiredFeatures.includes('wifi'), true);
  assert.equal(typeof payload.categories[0]?.name['zh-CN'], 'string');
});
