import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { ApiRouteError } from './http.ts';
import {
  createSearchSessionSnapshot,
  decodeSearchCursor,
  encodeSearchCursor,
  parseStoredSearchSessionSnapshot,
  setSearchCursorSecretForTests,
} from './search-cursor.ts';

setSearchCursorSecretForTests('search-cursor-test-secret');

function encodeRawCursorPayload(payload: string): string {
  return Buffer.from(payload, 'utf8').toString('base64url');
}

function signCursorPayload(payload: string): string {
  return createHmac('sha256', 'search-cursor-test-secret').update(payload).digest('hex');
}

test('search cursor round-trips signed session tokens', () => {
  const cursor = encodeSearchCursor({
    sessionId: 'sess_123',
    startIndex: 20,
  });

  const decoded = decodeSearchCursor(cursor);

  assert.equal(decoded.sessionId, 'sess_123');
  assert.equal(decoded.startIndex, 20);
  assert.equal(decoded.version, 'v1');
});

test('stored search-session snapshots round-trip typed pagination state', () => {
  const snapshot = createSearchSessionSnapshot({
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
  });

  const decoded = parseStoredSearchSessionSnapshot({
    locale: snapshot.locale,
    pageSize: snapshot.pageSize,
    resolvedJson: snapshot.resolved,
    appliedFiltersJson: snapshot.appliedFilters,
    partialResults: snapshot.partialResults,
    providerStatusesJson: snapshot.providerStatuses,
    resultsJson: snapshot.results,
  });

  assert.equal(decoded.pageSize, 20);
  assert.equal(decoded.results[0]?.restaurantKey, 'rid_123');
  assert.equal(decoded.providerStatuses[0]?.provider, 'hotpepper');
});

test('stored search-session snapshots preserve raw provider results before identity enrichment', () => {
  const snapshot = createSearchSessionSnapshot({
    locale: 'en',
    resolved: {
      country: 'JP',
      provider: 'google',
      providerPlan: ['google'],
      strategy: 'google_global',
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
        provider: 'google',
        status: 'success',
        rawResults: 1,
      },
    ],
    results: [
      {
        id: 'place-raw-1',
        name: 'Raw Spoon',
        address: 'Tokyo',
        lat: 35.68,
        lng: 139.69,
        distance: 123,
        source: 'google',
        providerRefs: [{ provider: 'google', providerId: 'place-raw-1' }],
        photoRef: 'places/place-raw-1/photos/photo-1',
      },
    ],
    pageSize: 20,
  });

  const decoded = parseStoredSearchSessionSnapshot({
    locale: snapshot.locale,
    pageSize: snapshot.pageSize,
    resolvedJson: snapshot.resolved,
    appliedFiltersJson: snapshot.appliedFilters,
    partialResults: snapshot.partialResults,
    providerStatusesJson: snapshot.providerStatuses,
    resultsJson: snapshot.results,
  });

  assert.equal(decoded.results[0]?.restaurantKey, undefined);
  assert.equal(decoded.results[0]?.photoRef, 'places/place-raw-1/photos/photo-1');
  assert.deepEqual(decoded.results[0]?.providerRefs, [
    { provider: 'google', providerId: 'place-raw-1' },
  ]);
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

test('search cursor rejects tampered signatures', () => {
  const cursor = encodeSearchCursor({
    sessionId: 'sess_123',
    startIndex: 20,
  });
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const tampered = Buffer.from(decoded.replace(':20:', ':40:'), 'utf8').toString('base64url');

  assert.throws(
    () => decodeSearchCursor(tampered),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      assert.equal(error.details?.field, 'pagination.cursor');
      return true;
    },
  );
});

test('search cursor rejects unsupported versions', () => {
  const payload = 'v2:sess_123:20';
  const invalidVersion = encodeRawCursorPayload(`${payload}:${signCursorPayload(payload)}`);

  assert.throws(
    () => decodeSearchCursor(invalidVersion),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      return true;
    },
  );
});

test('search cursor rejects negative start indexes', () => {
  const payload = 'v1:sess_123:-1';
  const encoded = encodeRawCursorPayload(`${payload}:${signCursorPayload(payload)}`);

  assert.throws(
    () => decodeSearchCursor(encoded),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      return true;
    },
  );
});

test('search cursor rejects non-integer start indexes', () => {
  const payload = 'v1:sess_123:20.5';
  const encoded = encodeRawCursorPayload(`${payload}:${signCursorPayload(payload)}`);

  assert.throws(
    () => decodeSearchCursor(encoded),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      return true;
    },
  );
});
