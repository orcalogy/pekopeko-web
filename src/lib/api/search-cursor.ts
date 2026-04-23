import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppLocale } from '../app-locale.ts';
import { ApiRouteError } from './http.ts';
import type {
  ApiRestaurantRecord,
  AppliedRestaurantFilters,
  GeoResolution,
  ProviderExecutionStatus,
  RestaurantFeature,
} from './types.ts';

const SEARCH_CURSOR_VERSION = 'v1';
const SEARCH_CURSOR_TEST_SECRET = 'test-search-cursor-secret';
const SEARCH_CURSOR_PRODUCTION_ENV_NAME = 'SEARCH_CURSOR_SECRET';

export const SEARCH_SESSION_RESULTS_JSON_LIMIT_BYTES = 512 * 1024;
export const SEARCH_SESSION_TOKEN_TTL_MS = 30 * 60 * 1000;

const moduleSearchCursorSecret = validateSearchCursorSecretOnModuleLoad();

let searchCursorSecretOverride: string | undefined;

export interface SearchSessionSnapshot {
  locale: AppLocale;
  resolved: GeoResolution;
  appliedFilters: AppliedRestaurantFilters;
  partialResults: boolean;
  providerStatuses: ProviderExecutionStatus[];
  results: ApiRestaurantRecord[];
  pageSize: number;
}

export interface SearchCursorToken {
  version: typeof SEARCH_CURSOR_VERSION;
  sessionId: string;
  startIndex: number;
}

export function setSearchCursorSecretForTests(secret?: string) {
  searchCursorSecretOverride = secret;
}

export function encodeSearchCursor(token: Omit<SearchCursorToken, 'version'>): string {
  if (!token.sessionId || !Number.isSafeInteger(token.startIndex) || token.startIndex < 0) {
    throw invalidCursorError();
  }

  const payload = `${SEARCH_CURSOR_VERSION}:${token.sessionId}:${token.startIndex}`;
  const signature = createSignatureHex(payload);
  return Buffer.from(`${payload}:${signature}`, 'utf8').toString('base64url');
}

export function decodeSearchCursor(value: string): SearchCursorToken {
  let decoded: string;

  try {
    decoded = Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    throw invalidCursorError();
  }

  const parts = decoded.split(':');
  if (parts.length !== 4) {
    throw invalidCursorError();
  }

  const [version, sessionId, startIndexValue, signatureHex] = parts;
  if (version !== SEARCH_CURSOR_VERSION || !sessionId || !isLowercaseHex(signatureHex)) {
    throw invalidCursorError();
  }

  const startIndex = readIntegerFromString(startIndexValue);
  if (startIndex == null || startIndex < 0) {
    throw invalidCursorError();
  }

  const payload = `${version}:${sessionId}:${startIndex}`;
  const expectedSignatureHex = createSignatureHex(payload);

  if (!signaturesMatch(signatureHex, expectedSignatureHex)) {
    throw invalidCursorError();
  }

  return {
    version: SEARCH_CURSOR_VERSION,
    sessionId,
    startIndex,
  };
}

export function createSearchSessionSnapshot(params: SearchSessionSnapshot): SearchSessionSnapshot {
  return {
    locale: params.locale,
    resolved: params.resolved,
    appliedFilters: params.appliedFilters,
    partialResults: params.partialResults,
    providerStatuses: params.providerStatuses,
    results: params.results,
    pageSize: params.pageSize,
  };
}

export function parseStoredSearchSessionSnapshot(params: {
  locale: unknown;
  pageSize: unknown;
  resolvedJson: unknown;
  appliedFiltersJson: unknown;
  partialResults: unknown;
  providerStatusesJson: unknown;
  resultsJson: unknown;
}): SearchSessionSnapshot {
  const pageSize =
    typeof params.pageSize === 'number' && Number.isInteger(params.pageSize)
      ? params.pageSize
      : null;
  const partialResults = typeof params.partialResults === 'boolean' ? params.partialResults : null;
  const locale = readLocale(params.locale);
  const resolved = readGeoResolution(params.resolvedJson);
  const appliedFilters = readAppliedFilters(params.appliedFiltersJson);
  const providerStatuses = readProviderStatuses(params.providerStatusesJson);
  const results = readResults(params.resultsJson);

  if (
    pageSize == null ||
    pageSize < 1 ||
    partialResults == null ||
    !locale ||
    !resolved ||
    !appliedFilters
  ) {
    throw invalidCursorError();
  }

  return {
    locale,
    resolved,
    appliedFilters,
    partialResults,
    providerStatuses,
    results,
    pageSize,
  };
}

function validateSearchCursorSecretOnModuleLoad(): string | undefined {
  const secret = process.env[SEARCH_CURSOR_PRODUCTION_ENV_NAME]?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error(`${SEARCH_CURSOR_PRODUCTION_ENV_NAME} must be configured`);
  }

  return undefined;
}

function getSearchCursorSecret(): string {
  const runtimeSecret =
    searchCursorSecretOverride ??
    process.env[SEARCH_CURSOR_PRODUCTION_ENV_NAME]?.trim() ??
    moduleSearchCursorSecret ??
    SEARCH_CURSOR_TEST_SECRET;

  if (!runtimeSecret) {
    throw new Error(`${SEARCH_CURSOR_PRODUCTION_ENV_NAME} must be configured`);
  }

  return runtimeSecret;
}

function createSignatureHex(payload: string): string {
  return createHmac('sha256', getSearchCursorSecret()).update(payload).digest('hex');
}

function signaturesMatch(actualHex: string, expectedHex: string): boolean {
  try {
    const actual = Buffer.from(actualHex, 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    if (actual.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readIntegerFromString(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isLowercaseHex(value: string): boolean {
  return /^[0-9a-f]+$/.test(value);
}

function readLocale(value: unknown): AppLocale | null {
  return value === 'zh-CN' || value === 'ja' || value === 'en' ? value : null;
}

function readGeoResolution(value: unknown): GeoResolution | null {
  if (!isPlainObject(value)) return null;

  const country = typeof value.country === 'string' ? value.country : null;
  const provider =
    value.provider === 'google' || value.provider === 'hotpepper' || value.provider === 'amap'
      ? value.provider
      : null;
  const providerPlan =
    Array.isArray(value.providerPlan) &&
    value.providerPlan.every(
      (entry) => entry === 'google' || entry === 'hotpepper' || entry === 'amap',
    )
      ? value.providerPlan
      : null;
  const strategy =
    value.strategy === 'china_amap' ||
    value.strategy === 'hybrid_japan' ||
    value.strategy === 'google_global' ||
    value.strategy === 'fallback_heuristic' ||
    value.strategy === 'manual_override'
      ? value.strategy
      : null;
  const confidence =
    value.confidence === 'high' || value.confidence === 'medium' || value.confidence === 'low'
      ? value.confidence
      : null;

  if (!country || !provider || !providerPlan || !strategy || !confidence) {
    return null;
  }

  return {
    country,
    provider,
    providerPlan,
    strategy,
    confidence,
  };
}

function readAppliedFilters(value: unknown): AppliedRestaurantFilters | null {
  if (!isPlainObject(value)) return null;

  const openNow = typeof value.openNow === 'boolean' ? value.openNow : null;
  const sortBy = value.sortBy === 'distance' || value.sortBy === 'rating' ? value.sortBy : null;
  const sortDirection =
    value.sortDirection === 'asc' || value.sortDirection === 'desc' ? value.sortDirection : null;
  const requiredFeatures =
    Array.isArray(value.requiredFeatures) &&
    value.requiredFeatures.every(
      (feature): feature is RestaurantFeature => typeof feature === 'string',
    )
      ? (value.requiredFeatures as RestaurantFeature[])
      : null;

  if (openNow == null || !sortBy || !sortDirection || !requiredFeatures) {
    return null;
  }

  const minRating = typeof value.minRating === 'number' ? value.minRating : undefined;
  const maxPriceLevel = typeof value.maxPriceLevel === 'number' ? value.maxPriceLevel : undefined;
  const partySize = typeof value.partySize === 'number' ? value.partySize : undefined;

  return {
    openNow,
    ...(minRating == null ? {} : { minRating }),
    ...(maxPriceLevel == null ? {} : { maxPriceLevel }),
    ...(partySize == null ? {} : { partySize }),
    requiredFeatures,
    sortBy,
    sortDirection,
  };
}

function readProviderStatuses(value: unknown): ProviderExecutionStatus[] {
  if (!Array.isArray(value)) {
    throw invalidCursorError();
  }

  return value.map((entry) => {
    if (!isPlainObject(entry)) {
      throw invalidCursorError();
    }

    const provider =
      entry.provider === 'google' || entry.provider === 'hotpepper' || entry.provider === 'amap'
        ? entry.provider
        : null;
    const status = entry.status === 'success' || entry.status === 'failed' ? entry.status : null;
    if (!provider || !status) {
      throw invalidCursorError();
    }

    return {
      provider,
      status,
      ...(typeof entry.rawResults === 'number' ? { rawResults: entry.rawResults } : {}),
      ...(readApiErrorCode(entry.errorCode)
        ? { errorCode: readApiErrorCode(entry.errorCode) }
        : {}),
      ...(typeof entry.errorMessage === 'string' ? { errorMessage: entry.errorMessage } : {}),
    } satisfies ProviderExecutionStatus;
  });
}

function readResults(value: unknown): ApiRestaurantRecord[] {
  if (!Array.isArray(value)) {
    throw invalidCursorError();
  }

  return value.map((entry) => {
    if (!isPlainObject(entry)) {
      throw invalidCursorError();
    }

    const id = typeof entry.id === 'string' ? entry.id : null;
    const restaurantKey = typeof entry.restaurantKey === 'string' ? entry.restaurantKey : null;
    const name = typeof entry.name === 'string' ? entry.name : null;
    const address = typeof entry.address === 'string' ? entry.address : null;
    const lat = typeof entry.lat === 'number' ? entry.lat : null;
    const lng = typeof entry.lng === 'number' ? entry.lng : null;
    const distance = typeof entry.distance === 'number' ? entry.distance : null;
    const source =
      entry.source === 'google' ||
      entry.source === 'hotpepper' ||
      entry.source === 'amap' ||
      entry.source === 'hybrid'
        ? entry.source
        : null;
    const providerRefs =
      Array.isArray(entry.providerRefs) &&
      entry.providerRefs.every(
        (ref) =>
          isPlainObject(ref) &&
          (ref.provider === 'google' || ref.provider === 'hotpepper' || ref.provider === 'amap') &&
          typeof ref.providerId === 'string',
      )
        ? (
            entry.providerRefs as Array<{
              provider: 'google' | 'hotpepper' | 'amap';
              providerId: string;
            }>
          ).map((ref) => ({
            provider: ref.provider,
            providerId: ref.providerId,
          }))
        : null;

    if (
      !id ||
      !restaurantKey ||
      !name ||
      !address ||
      lat == null ||
      lng == null ||
      distance == null ||
      !source ||
      !providerRefs
    ) {
      throw invalidCursorError();
    }

    return {
      id,
      restaurantKey,
      name,
      address,
      lat,
      lng,
      distance,
      source,
      providerRefs,
      ...(typeof entry.rating === 'number' ? { rating: entry.rating } : {}),
      ...(typeof entry.priceLevel === 'number' ? { priceLevel: entry.priceLevel } : {}),
      ...(typeof entry.isOpenNow === 'boolean' ? { isOpenNow: entry.isOpenNow } : {}),
      ...(Array.isArray(entry.openingHours) &&
      entry.openingHours.every((hour) => typeof hour === 'string')
        ? { openingHours: entry.openingHours as string[] }
        : {}),
      ...(typeof entry.cuisineType === 'string' ? { cuisineType: entry.cuisineType } : {}),
      ...(typeof entry.photoUrl === 'string' ? { photoUrl: entry.photoUrl } : {}),
      ...(typeof entry.phone === 'string' ? { phone: entry.phone } : {}),
      ...(typeof entry.placeUrl === 'string' ? { placeUrl: entry.placeUrl } : {}),
      ...(typeof entry.detailUrl === 'string' ? { detailUrl: entry.detailUrl } : {}),
      ...(typeof entry.couponUrl === 'string' ? { couponUrl: entry.couponUrl } : {}),
      ...(typeof entry.accessInfo === 'string' ? { accessInfo: entry.accessInfo } : {}),
      ...(typeof entry.budgetText === 'string' ? { budgetText: entry.budgetText } : {}),
      ...(typeof entry.capacity === 'number' ? { capacity: entry.capacity } : {}),
      ...(Array.isArray(entry.features) &&
      entry.features.every((feature) => typeof feature === 'string')
        ? { features: entry.features as string[] }
        : {}),
      ...(typeof entry.menuUrl === 'string' ? { menuUrl: entry.menuUrl } : {}),
      ...(typeof entry.websiteUrl === 'string' ? { websiteUrl: entry.websiteUrl } : {}),
    } satisfies ApiRestaurantRecord;
  });
}

function readApiErrorCode(value: unknown): ProviderExecutionStatus['errorCode'] {
  return value === 'invalid_argument' ||
    value === 'not_found' ||
    value === 'rate_limited' ||
    value === 'provider_unavailable' ||
    value === 'quota_exhausted' ||
    value === 'upstream_error' ||
    value === 'internal'
    ? value
    : undefined;
}
