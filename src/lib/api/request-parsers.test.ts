import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRestaurantSearchRequest, parseReverseGeoRequest } from './request-parsers.ts';

test('parses camelCase restaurant search requests', () => {
  const parsed = parseRestaurantSearchRequest({
    locale: 'ja',
    provider: 'auto',
    location: { lat: 35.6895, lng: 139.6917 },
    radiusM: 500,
    query: {
      keyword: 'ramen',
      categoryId: 'noodles',
    },
    filters: {
      openNow: true,
      minRating: 4,
      requiredFeatures: ['wifi', 'card'],
    },
    sort: {
      by: 'distance',
      direction: 'asc',
    },
    pagination: {
      pageSize: 20,
      offset: 40,
    },
  });

  assert.deepEqual(parsed, {
    locale: 'ja',
    provider: 'auto',
    location: { lat: 35.6895, lng: 139.6917 },
    radiusM: 500,
    query: {
      keyword: 'ramen',
      categoryId: 'noodles',
    },
    filters: {
      openNow: true,
      minRating: 4,
      maxPriceLevel: undefined,
      partySize: undefined,
      requiredFeatures: ['wifi', 'card'],
    },
    sort: {
      by: 'distance',
      direction: 'asc',
    },
    pagination: {
      pageSize: 20,
      offset: 40,
    },
  });
});

test('rejects unsupported request fields', () => {
  assert.throws(
    () =>
      parseRestaurantSearchRequest({
        location: { lat: 35.6895, lng: 139.6917 },
        unsupported: true,
      }),
    /unsupported fields/,
  );
});

test('rejects unsupported feature filters', () => {
  assert.throws(
    () =>
      parseRestaurantSearchRequest({
        location: { lat: 35.6895, lng: 139.6917 },
        filters: {
          requiredFeatures: ['barrier_free'],
        },
      }),
    /unsupported feature/,
  );
});

test('parses reverse geo requests with explicit locale', () => {
  const parsed = parseReverseGeoRequest({
    lat: 35.6895,
    lng: 139.6917,
    locale: 'en',
  });

  assert.deepEqual(parsed, {
    lat: 35.6895,
    lng: 139.6917,
    locale: 'en',
  });
});
