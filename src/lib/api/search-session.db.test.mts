import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });
loadEnv({ quiet: true });

const { prisma } = await import('@/lib/db/prisma');
const { ApiRouteError } = await import('./http.ts');
const {
  SEARCH_SESSION_TOKEN_TTL_MS,
  createSearchSessionSnapshot,
  encodeSearchCursor,
  setSearchCursorSecretForTests,
} = await import('./search-cursor.ts');
const {
  SEARCH_SESSION_CLEANUP_BATCH_SIZE,
  createSearchSession,
  loadSearchSessionFromCursor,
  maybeCleanupExpiredSearchSessions,
} = await import('./search-session.ts');

setSearchCursorSecretForTests('search-session-db-test-secret');

function createSnapshot(overrides: Partial<ReturnType<typeof createSearchSessionSnapshot>> = {}) {
  return createSearchSessionSnapshot({
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
      {
        id: 'google:place-2',
        restaurantKey: 'rid_456',
        name: 'Good Fork',
        address: 'Tokyo',
        lat: 35.681,
        lng: 139.692,
        distance: 222.1,
        source: 'google',
        providerRefs: [{ provider: 'google', providerId: 'place-2' }],
      },
    ],
    pageSize: 1,
    ...overrides,
  });
}

async function resetSearchSessions() {
  await prisma.searchSession.deleteMany();
}

test('search sessions persist and replay pagination snapshots', async () => {
  await resetSearchSessions();

  const snapshot = createSnapshot();
  const sessionId = await createSearchSession(snapshot, new Date('2026-04-23T00:00:00.000Z'));

  const loaded = await loadSearchSessionFromCursor(
    encodeSearchCursor({ sessionId, startIndex: 1 }),
    new Date('2026-04-23T00:05:00.000Z'),
  );

  assert.equal(loaded.sessionId, sessionId);
  assert.equal(loaded.startIndex, 1);
  assert.equal(loaded.snapshot.pageSize, 1);
  assert.equal(loaded.snapshot.results[1]?.restaurantKey, 'rid_456');
});

test('expired search sessions are rejected and deleted', async () => {
  await resetSearchSessions();

  const createdAt = new Date('2026-04-23T00:00:00.000Z');
  const snapshot = createSnapshot();
  const sessionId = await createSearchSession(snapshot, createdAt);

  const expiredAt = new Date(createdAt.getTime() + SEARCH_SESSION_TOKEN_TTL_MS + 1);

  await assert.rejects(
    () => loadSearchSessionFromCursor(encodeSearchCursor({ sessionId, startIndex: 0 }), expiredAt),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      assert.equal(error.details?.field, 'pagination.cursor');
      return true;
    },
  );

  const persisted = await prisma.searchSession.findUnique({
    where: { id: sessionId },
  });
  assert.equal(persisted, null);
});

test('missing search sessions are rejected as invalid cursors', async () => {
  await resetSearchSessions();

  await assert.rejects(
    () =>
      loadSearchSessionFromCursor(
        encodeSearchCursor({ sessionId: 'missing_session', startIndex: 0 }),
        new Date('2026-04-23T00:05:00.000Z'),
      ),
    (error: unknown) => {
      assert.ok(error instanceof ApiRouteError);
      assert.equal(error.code, 'invalid_argument');
      assert.equal(error.details?.field, 'pagination.cursor');
      return true;
    },
  );
});

test('opportunistic cleanup removes expired sessions up to the batch limit', async () => {
  await resetSearchSessions();

  const expiresAt = new Date('2026-04-22T23:00:00.000Z');
  const snapshot = createSnapshot();
  const payload = {
    locale: snapshot.locale,
    pageSize: snapshot.pageSize,
    resolvedJson: snapshot.resolved as unknown as Prisma.InputJsonValue,
    appliedFiltersJson: snapshot.appliedFilters as unknown as Prisma.InputJsonValue,
    partialResults: snapshot.partialResults,
    providerStatusesJson: snapshot.providerStatuses as unknown as Prisma.InputJsonValue,
    resultsJson: snapshot.results as unknown as Prisma.InputJsonValue,
    expiresAt,
  };

  await prisma.searchSession.createMany({
    data: Array.from({ length: SEARCH_SESSION_CLEANUP_BATCH_SIZE + 1 }, () => payload),
  });

  const deletedCount = await maybeCleanupExpiredSearchSessions({
    now: new Date('2026-04-23T00:00:00.000Z'),
    random: () => 0,
  });

  assert.equal(deletedCount, SEARCH_SESSION_CLEANUP_BATCH_SIZE);

  const remaining = await prisma.searchSession.count();
  assert.equal(remaining, 1);
});

test('search session creation rejects oversized result snapshots', async () => {
  await resetSearchSessions();

  const snapshot = createSnapshot({
    results: [
      {
        id: 'google:place-oversized',
        restaurantKey: 'rid_oversized',
        name: 'Oversized Result',
        address: 'Tokyo',
        lat: 35.68,
        lng: 139.69,
        distance: 1,
        source: 'google',
        providerRefs: [{ provider: 'google', providerId: 'place-oversized' }],
        accessInfo: 'x'.repeat(600_000),
      },
    ],
  });

  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await assert.rejects(
      () => createSearchSession(snapshot),
      (error: unknown) => {
        assert.ok(error instanceof ApiRouteError);
        assert.equal(error.code, 'internal');
        return true;
      },
    );
  } finally {
    console.error = originalConsoleError;
  }

  const count = await prisma.searchSession.count();
  assert.equal(count, 0);
});
