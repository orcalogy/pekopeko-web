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
      cursor: undefined,
    },
  });
});

test('parses cursor-only restaurant search requests', () => {
  const parsed = parseRestaurantSearchRequest({
    pagination: {
      cursor: 'cursor-token',
    },
  });

  assert.deepEqual(parsed, {
    locale: undefined,
    provider: undefined,
    location: undefined,
    radiusM: undefined,
    query: undefined,
    filters: undefined,
    sort: undefined,
    pagination: {
      pageSize: undefined,
      cursor: 'cursor-token',
    },
  });
});

test('rejects search-definition fields when pagination.cursor is present', () => {
  assert.throws(
    () =>
      parseRestaurantSearchRequest({
        locale: 'ja',
        location: { lat: 35.6895, lng: 139.6917 },
        filters: {
          openNow: true,
        },
        pagination: {
          cursor: 'cursor-token',
          pageSize: 20,
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /unsupported fields/);
      return true;
    },
  );
});

test('rejects even null search-definition fields when pagination.cursor is present', () => {
  assert.throws(
    () =>
      parseRestaurantSearchRequest({
        location: null,
        sort: null,
        pagination: {
          cursor: 'cursor-token',
          pageSize: null,
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /unsupported fields/);
      return true;
    },
  );
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
