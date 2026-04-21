import assert from 'node:assert/strict';
import test from 'node:test';
import { errorResponse, jsonResponse } from '../../http.ts';
import { serializeRestaurantDetailsResponse } from '../../serializers.ts';
import type { RestaurantDetailsResult } from '../../types.ts';
import { createRestaurantDetailsGetHandler } from './restaurant-details.ts';

const snapshotDetailsResult = {
  restaurant: {
    id: 'google:place-1',
    restaurantKey: 'rest_snapshot_1',
    name: 'Jibundoki',
    address: 'Tokyo',
    lat: 35.6895,
    lng: 139.6917,
    distance: 80,
    source: 'hybrid',
    providerRefs: [
      { provider: 'google', providerId: 'place-1' },
      { provider: 'hotpepper', providerId: 'J002' },
    ],
  },
  freshness: {
    state: 'snapshot',
  },
  providerStatuses: [
    {
      provider: 'google',
      status: 'failed',
      errorCode: 'upstream_error',
      errorMessage: 'provider refresh failed',
    },
  ],
  cacheControl: 'no-store',
} satisfies RestaurantDetailsResult;

test('details route returns stale freshness metadata with no-store cache headers', async () => {
  let capturedInput: unknown;

  const handler = createRestaurantDetailsGetHandler({
    createRequestId: () => 'req-details-route',
    getRestaurantDetails: async (input) => {
      capturedInput = input;
      return snapshotDetailsResult;
    },
    serializeRestaurantDetailsResponse,
    jsonResponse,
    errorResponse,
  });

  const response = await handler(
    new Request('http://localhost/api/v1/restaurants/rest_snapshot_1?locale=ja', {
      headers: {
        'accept-language': 'ja-JP',
      },
    }),
    {
      params: Promise.resolve({ restaurantKey: 'rest_snapshot_1' }),
    },
  );

  assert.deepEqual(capturedInput, {
    restaurantKey: 'rest_snapshot_1',
    locale: 'ja',
    acceptLanguage: 'ja-JP',
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'req-details-route');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('vary'), 'Accept-Language');

  const payload = (await response.json()) as Record<string, unknown>;
  assert.equal(payload.requestId, 'req-details-route');
  assert.deepEqual(payload.freshness, { state: 'snapshot' });
  assert.deepEqual(payload.providerStatuses, [
    {
      provider: 'google',
      status: 'failed',
      error: {
        code: 'upstream_error',
        message: 'provider refresh failed',
      },
    },
  ]);

  const restaurant = payload.restaurant as Record<string, unknown>;
  assert.equal(restaurant.id, undefined);
  assert.equal(restaurant.distance, undefined);
  assert.equal(restaurant.restaurantKey, 'rest_snapshot_1');
});
