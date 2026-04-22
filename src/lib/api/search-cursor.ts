import type { AppLocale } from '../app-locale.ts';
import { ApiRouteError } from './http.ts';
import type {
  ApiRestaurantRecord,
  AppliedRestaurantFilters,
  GeoResolution,
  ProviderExecutionStatus,
  RestaurantFeature,
} from './types.ts';

interface SearchCursorPayload {
  version: 1;
  locale: AppLocale;
  resolved: GeoResolution;
  appliedFilters: AppliedRestaurantFilters;
  partialResults: boolean;
  providerStatuses: ProviderExecutionStatus[];
  results: ApiRestaurantRecord[];
  pageSize: number;
  startIndex: number;
}

export function encodeSearchCursor(payload: SearchCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeSearchCursor(value: string): SearchCursorPayload {
  let decoded: unknown;

  try {
    decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursorError();
  }

  if (!isPlainObject(decoded)) {
    throw invalidCursorError();
  }

  const version = readInteger(decoded.version);
  const pageSize = readInteger(decoded.pageSize);
  const startIndex = readInteger(decoded.startIndex);
  const partialResults =
    typeof decoded.partialResults === 'boolean' ? decoded.partialResults : null;
  const locale = readLocale(decoded.locale);
  const resolved = readGeoResolution(decoded.resolved);
  const appliedFilters = readAppliedFilters(decoded.appliedFilters);
  const providerStatuses = readProviderStatuses(decoded.providerStatuses);
  const results = readResults(decoded.results);

  if (
    version !== 1 ||
    pageSize == null ||
    pageSize < 1 ||
    startIndex == null ||
    startIndex < 0 ||
    startIndex > results.length ||
    partialResults == null ||
    !locale ||
    !resolved ||
    !appliedFilters
  ) {
    throw invalidCursorError();
  }

  return {
    version,
    locale,
    resolved,
    appliedFilters,
    partialResults,
    providerStatuses,
    results,
    pageSize,
    startIndex,
  };
}

export function createSearchCursorPayload(params: {
  locale: AppLocale;
  resolved: GeoResolution;
  appliedFilters: AppliedRestaurantFilters;
  partialResults: boolean;
  providerStatuses: ProviderExecutionStatus[];
  results: ApiRestaurantRecord[];
  pageSize: number;
  startIndex: number;
}): SearchCursorPayload {
  return {
    version: 1,
    locale: params.locale,
    resolved: params.resolved,
    appliedFilters: params.appliedFilters,
    partialResults: params.partialResults,
    providerStatuses: params.providerStatuses,
    results: params.results,
    pageSize: params.pageSize,
    startIndex: params.startIndex,
  };
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

function readInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
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
      distance == null
    ) {
      throw invalidCursorError();
    }

    if (!source || !providerRefs) {
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
