import assert from 'node:assert/strict';
import test from 'node:test';
import { errorResponse, jsonResponse, readJsonBody } from '../../http.ts';
import { parseRestaurantSearchRequest } from '../../request-parsers.ts';
import { serializeRestaurantSearchResponse } from '../../serializers.ts';
import type { RestaurantSearchResult } from '../../types.ts';
import { createRestaurantsSearchPostHandler } from './restaurants-search.ts';

const baseSearchResult = {
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
    {
      provider: 'google',
      status: 'failed',
      errorCode: 'upstream_error',
      errorMessage: 'google timeout',
    },
  ],
  results: [
    {
      id: 'google:place-1',
      restaurantKey: 'rest_live_1',
      name: 'Good Spoon',
      address: 'Tokyo',
      lat: 35.6895,
      lng: 139.6917,
      distance: 120,
      rating: 4.2,
      source: 'hybrid',
      providerRefs: [
        { provider: 'google', providerId: 'place-1' },
        { provider: 'hotpepper', providerId: 'J001' },
      ],
      features: ['wifi'],
    },
  ],
  pagination: {
    pageSize: 20,
    offset: 0,
    nextOffset: 20,
    returned: 1,
    total: 42,
  },
} satisfies RestaurantSearchResult;

test('search route returns structured provider statuses and offset pagination', async () => {
  let capturedInput: unknown;
  let capturedAcceptLanguage: string | null | undefined;

  const handler = createRestaurantsSearchPostHandler({
    createRequestId: () => 'req-search-route',
    readJsonBody,
    parseRestaurantSearchRequest,
    searchRestaurants: async ({ input, acceptLanguage }) => {
      capturedInput = input;
      capturedAcceptLanguage = acceptLanguage;
      return baseSearchResult;
    },
    serializeRestaurantSearchResponse,
    jsonResponse,
    errorResponse,
  });

  const response = await handler(
    new Request('http://localhost/api/v1/restaurants/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept-language': 'ja-JP,ja;q=0.9',
      },
      body: JSON.stringify({
        locale: 'ja',
        location: { lat: 35.6895, lng: 139.6917 },
        radiusM: 500,
        filters: { openNow: true, requiredFeatures: ['wifi'] },
        sort: { by: 'distance', direction: 'asc' },
        pagination: { pageSize: 20, offset: 0 },
      }),
    }),
  );

  assert.equal(capturedAcceptLanguage, 'ja-JP,ja;q=0.9');
  assert.deepEqual(capturedInput, {
    locale: 'ja',
    provider: undefined,
    location: { lat: 35.6895, lng: 139.6917 },
    radiusM: 500,
    query: undefined,
    filters: {
      openNow: true,
      minRating: undefined,
      maxPriceLevel: undefined,
      partySize: undefined,
      requiredFeatures: ['wifi'],
    },
    sort: { by: 'distance', direction: 'asc' },
    pagination: { pageSize: 20, offset: 0 },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'req-search-route');
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.requestId, 'req-search-route');
  assert.equal(payload.partialResults, true);
  assert.deepEqual(payload.pagination, {
    pageSize: 20,
    offset: 0,
    nextOffset: 20,
    returned: 1,
    total: 42,
  });
  assert.deepEqual(payload.providerStatuses, [
    {
      provider: 'hotpepper',
      status: 'success',
      rawResults: 8,
    },
    {
      provider: 'google',
      status: 'failed',
      error: {
        code: 'upstream_error',
        message: 'google timeout',
      },
    },
  ]);
});

test('search route returns a 400 error envelope for invalid request bodies', async () => {
  const handler = createRestaurantsSearchPostHandler({
    createRequestId: () => 'req-search-error',
    readJsonBody,
    parseRestaurantSearchRequest,
    searchRestaurants: async () => {
      throw new Error('searchRestaurants should not be called for invalid input');
    },
    serializeRestaurantSearchResponse,
    jsonResponse,
    errorResponse,
  });

  const response = await handler(
    new Request('http://localhost/api/v1/restaurants/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        location: { lat: 35.6895, lng: 139.6917 },
        unsupported: true,
      }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('x-request-id'), 'req-search-error');
  assert.equal(response.headers.get('cache-control'), 'no-store');

  const payload = (await response.json()) as {
    error: { code: string; message: string; requestId: string };
  };
  assert.equal(payload.error.code, 'invalid_argument');
  assert.equal(payload.error.requestId, 'req-search-error');
  assert.match(payload.error.message, /unsupported fields/);
});
