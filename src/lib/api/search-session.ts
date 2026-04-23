import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { ApiRouteError } from './http.ts';
import {
  decodeSearchCursor,
  parseStoredSearchSessionSnapshot,
  SEARCH_SESSION_RESULTS_JSON_LIMIT_BYTES,
  SEARCH_SESSION_TOKEN_TTL_MS,
  type SearchSessionSnapshot,
} from './search-cursor.ts';

export const SEARCH_SESSION_CLEANUP_BATCH_SIZE = 100;
export const SEARCH_SESSION_CLEANUP_PROBABILITY = 0.1;

export async function createSearchSession(
  snapshot: SearchSessionSnapshot,
  now: Date = new Date(),
): Promise<string> {
  const resultsJson = serializeSearchSessionResults(snapshot.results);
  const expiresAt = new Date(now.getTime() + SEARCH_SESSION_TOKEN_TTL_MS);
  const created = await prisma.searchSession.create({
    data: {
      locale: snapshot.locale,
      pageSize: snapshot.pageSize,
      resolvedJson: snapshot.resolved as unknown as Prisma.InputJsonValue,
      appliedFiltersJson: snapshot.appliedFilters as unknown as Prisma.InputJsonValue,
      partialResults: snapshot.partialResults,
      providerStatusesJson: snapshot.providerStatuses as unknown as Prisma.InputJsonValue,
      resultsJson,
      expiresAt,
    },
    select: {
      id: true,
    },
  });

  return created.id;
}

export async function loadSearchSessionFromCursor(
  cursor: string,
  now: Date = new Date(),
): Promise<{
  sessionId: string;
  snapshot: SearchSessionSnapshot;
  startIndex: number;
}> {
  const decoded = decodeSearchCursor(cursor);
  const session = await prisma.searchSession.findUnique({
    where: { id: decoded.sessionId },
    select: {
      id: true,
      locale: true,
      pageSize: true,
      resolvedJson: true,
      appliedFiltersJson: true,
      partialResults: true,
      providerStatusesJson: true,
      resultsJson: true,
      expiresAt: true,
    },
  });

  if (!session) {
    throw invalidCursorError();
  }

  if (session.expiresAt.getTime() <= now.getTime()) {
    await deleteSearchSessionBestEffort(session.id);
    throw invalidCursorError();
  }

  return {
    sessionId: session.id,
    startIndex: decoded.startIndex,
    snapshot: parseStoredSearchSessionSnapshot({
      locale: session.locale,
      pageSize: session.pageSize,
      resolvedJson: session.resolvedJson,
      appliedFiltersJson: session.appliedFiltersJson,
      partialResults: session.partialResults,
      providerStatusesJson: session.providerStatusesJson,
      resultsJson: session.resultsJson,
    }),
  };
}

export async function maybeCleanupExpiredSearchSessions(params?: {
  now?: Date;
  random?: () => number;
}): Promise<number> {
  const now = params?.now ?? new Date();
  const random = params?.random ?? Math.random;
  if (random() >= SEARCH_SESSION_CLEANUP_PROBABILITY) {
    return 0;
  }

  try {
    const expired = await prisma.searchSession.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        expiresAt: 'asc',
      },
      take: SEARCH_SESSION_CLEANUP_BATCH_SIZE,
    });

    if (expired.length === 0) {
      return 0;
    }

    const deleted = await prisma.searchSession.deleteMany({
      where: {
        id: {
          in: expired.map((session) => session.id),
        },
      },
    });

    return deleted.count;
  } catch (error) {
    console.error('[api] search session cleanup failed:', error);
    return 0;
  }
}

function serializeSearchSessionResults(snapshotResults: SearchSessionSnapshot['results']) {
  const serialized = JSON.stringify(snapshotResults);
  const sizeBytes = Buffer.byteLength(serialized, 'utf8');

  if (sizeBytes > SEARCH_SESSION_RESULTS_JSON_LIMIT_BYTES) {
    console.error(
      `[api] search session snapshot exceeded ${SEARCH_SESSION_RESULTS_JSON_LIMIT_BYTES} bytes`,
      { sizeBytes },
    );
    throw new ApiRouteError({
      status: 500,
      code: 'internal',
      message: 'Search session snapshot exceeded the maximum supported size',
    });
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

async function deleteSearchSessionBestEffort(sessionId: string) {
  try {
    await prisma.searchSession.delete({
      where: { id: sessionId },
    });
  } catch (error) {
    console.error('[api] failed to delete expired search session:', error);
  }
}

function invalidCursorError(): ApiRouteError {
  return new ApiRouteError({
    status: 400,
    code: 'invalid_argument',
    message: 'pagination.cursor is invalid',
    details: { field: 'pagination.cursor' },
  });
}
