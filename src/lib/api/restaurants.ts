import { getCategoryById } from '@/data/categories';
import type { AppLocale } from '@/lib/app-locale';
import { combineKeywordTerms, normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import { getAmapPlaceDetails, searchAmapNearby } from '@/lib/map/amap';
import { getGooglePlaceDetails, searchGoogleNearby } from '@/lib/map/google';
import { getHotpepperDetails, searchHotpepperNearby } from '@/lib/map/hotpepper';
import { mergeResults } from '@/lib/map/merge';
import type { MapProviderType, Restaurant } from '@/types/restaurant';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_RADIUS_M,
  DETAILS_CACHE_CONTROL,
  MAX_PAGE_SIZE,
  MAX_RADIUS_M,
  MIN_RADIUS_M,
  STALE_DETAILS_CACHE_CONTROL,
} from './capabilities';
import {
  applyProviderOverride,
  assertValidCoordinates,
  resolveGeoPlan,
  resolveRequestLocale,
} from './geo';
import { ApiRouteError } from './http';
import {
  buildCanonicalRestaurantPhotoUrl,
  inferRestaurantPhotoPayload,
  restoreRestaurantFromSnapshot,
} from './restaurant-key';
import {
  assertStoredRestaurantRecordIsCurrent,
  getStoredRestaurantRecord,
  resolveRestaurantIdentity,
  type StoredRestaurantRecord,
} from './restaurant-registry';
import type {
  ApiProviderRef,
  ApiRestaurantRecord,
  ApiSource,
  AppliedRestaurantFilters,
  ProviderExecutionStatus,
  RestaurantDetailsResult,
  RestaurantFeature,
  RestaurantPhotoPayload,
  RestaurantSearchInput,
  RestaurantSearchResult,
  RestaurantSortBy,
  SortDirection,
} from './types';

const GOOGLE_LANGUAGE_CODE: Record<AppLocale, string> = {
  'zh-CN': 'zh-CN',
  ja: 'ja',
  en: 'en',
};

export async function searchRestaurants(params: {
  input: RestaurantSearchInput;
  acceptLanguage: string | null;
}): Promise<RestaurantSearchResult> {
  const locale = resolveRequestLocale(params.input.locale, params.acceptLanguage);
  const requestedProvider = normalizeRequestedProvider(params.input.provider);
  const location = params.input.location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  assertValidCoordinates(lat, lng);

  const radiusM = normalizeRadius(params.input.radiusM);
  const minRating = normalizeMinRating(params.input.filters?.minRating);
  const maxPriceLevel = normalizeMaxPriceLevel(params.input.filters?.maxPriceLevel);
  const partySize = normalizePartySize(params.input.filters?.partySize);
  const requiredFeatures = normalizeRequiredFeatures(params.input.filters?.requiredFeatures);
  const openNow = params.input.filters?.openNow === true;
  const sortBy = normalizeSortBy(params.input.sort?.by);
  const sortDirection = normalizeSortDirection(params.input.sort?.direction, sortBy);
  const pageSize = normalizePageSize(params.input.pagination?.pageSize);
  const offset = normalizeOffset(params.input.pagination?.offset);

  const baseResolution = await resolveGeoPlan({ lat, lng, locale });
  const resolved = applyProviderOverride(baseResolution, requestedProvider);

  const searchKeyword = buildSearchKeyword({
    categoryId: params.input.query?.categoryId ?? undefined,
    keyword: params.input.query?.keyword ?? undefined,
    locale,
    primaryProvider: resolved.provider,
  });

  const providerResults = await fetchProviderResults({
    locale,
    lat,
    lng,
    radiusM,
    keyword: searchKeyword,
    providerPlan: resolved.providerPlan,
  });

  let normalized = mergeProviderResults(resolved.providerPlan, providerResults.successes);
  normalized = applyRestaurantFilters(normalized, {
    openNow,
    minRating,
    maxPriceLevel,
    partySize,
    requiredFeatures,
  });
  normalized = sortRestaurants(normalized, sortBy, sortDirection);

  const pagedRestaurants = normalized.slice(offset, offset + pageSize);
  const pagedResults = await Promise.all(pagedRestaurants.map(enrichRestaurantForApi));
  const nextOffset = offset + pageSize < normalized.length ? offset + pageSize : null;

  const appliedFilters: AppliedRestaurantFilters = {
    openNow,
    ...(minRating != null && minRating > 0 ? { minRating } : {}),
    ...(maxPriceLevel != null && maxPriceLevel > 0 ? { maxPriceLevel } : {}),
    ...(partySize != null && partySize > 1 ? { partySize } : {}),
    requiredFeatures,
    sortBy,
    sortDirection,
  };

  return {
    locale,
    resolved,
    appliedFilters,
    partialResults:
      providerResults.providerStatuses.some((status) => status.status === 'failed') &&
      providerResults.providerStatuses.some((status) => status.status === 'success'),
    providerStatuses: providerResults.providerStatuses,
    results: pagedResults,
    pagination: {
      pageSize,
      offset,
      nextOffset,
      returned: pagedResults.length,
      total: normalized.length,
    },
  };
}

export function toCompatibilityRestaurant(record: ApiRestaurantRecord): Restaurant {
  const { restaurantKey, providerRefs, ...restaurant } = record;
  void providerRefs;
  return {
    ...restaurant,
    restaurantKey,
  };
}

export async function getRestaurantDetails(params: {
  restaurantKey: string;
  locale: string | null | undefined;
  acceptLanguage: string | null;
}): Promise<RestaurantDetailsResult> {
  const storedRecord = await getStoredRestaurantRecord(params.restaurantKey);
  if (!storedRecord) {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }
  assertStoredRestaurantRecordIsCurrent(storedRecord);

  const locale = resolveRequestLocale(params.locale, params.acceptLanguage);
  const snapshot = storedRecord.snapshot
    ? restoreRestaurantFromSnapshot(storedRecord.snapshot)
    : null;
  const refresh = await fetchRestaurantDetailsByRefs(
    storedRecord.providerRefs,
    locale,
    storedRecord.source,
  );

  if (!refresh.restaurant && !snapshot) {
    throw selectDetailRefreshError(refresh.errors);
  }

  const restaurant = coalesceRestaurantDetails({
    storedRecord,
    snapshot,
    fresh: refresh.restaurant,
  });

  const providerRefs = dedupeProviderRefs([
    ...(restaurant.providerRefs ?? []),
    ...storedRecord.providerRefs,
  ]);
  const photo = inferRestaurantPhotoPayload(restaurant, providerRefs) ?? storedRecord.photo;
  const freshnessState =
    refresh.providerStatuses.filter((status) => status.status === 'success').length === 0
      ? 'snapshot'
      : refresh.providerStatuses.some((status) => status.status === 'failed')
        ? 'partial_live'
        : 'live';

  return {
    restaurant: buildApiRestaurantRecord({
      restaurant,
      restaurantKey: storedRecord.restaurantKey,
      providerRefs,
      photo,
    }),
    freshness: {
      state: freshnessState,
    },
    providerStatuses: refresh.providerStatuses,
    cacheControl: freshnessState === 'live' ? DETAILS_CACHE_CONTROL : STALE_DETAILS_CACHE_CONTROL,
  };
}

async function fetchProviderResults(params: {
  providerPlan: MapProviderType[];
  locale: AppLocale;
  lat: number;
  lng: number;
  radiusM: number;
  keyword?: string;
}): Promise<{
  successes: Array<{ provider: MapProviderType; results: Restaurant[] }>;
  providerStatuses: ProviderExecutionStatus[];
}> {
  const searchOptions = {
    lat: params.lat,
    lng: params.lng,
    radius: params.radiusM,
    keyword: params.keyword,
  };

  const settled = await Promise.allSettled(
    params.providerPlan.map(async (provider) => ({
      provider,
      results: await searchSingleProvider(provider, searchOptions, params.locale),
    })),
  );

  const successes: Array<{ provider: MapProviderType; results: Restaurant[] }> = [];
  const errors: ApiRouteError[] = [];
  const providerStatuses: ProviderExecutionStatus[] = [];

  settled.forEach((result, index) => {
    const provider = params.providerPlan[index];
    if (result.status === 'fulfilled') {
      successes.push(result.value);
      providerStatuses.push({
        provider,
        status: 'success',
        rawResults: result.value.results.length,
      });
      return;
    }

    const normalizedError = normalizeProviderSearchError(provider, result.reason);
    errors.push(normalizedError);
    providerStatuses.push({
      provider,
      status: 'failed',
      errorCode: normalizedError.code,
      errorMessage: normalizedError.message,
    });
    console.error(`[api] ${provider} provider search failed:`, result.reason);
  });

  if (successes.length === 0) {
    throw selectSearchError(errors);
  }

  return { successes, providerStatuses };
}

async function searchSingleProvider(
  provider: MapProviderType,
  options: {
    lat: number;
    lng: number;
    radius: number;
    keyword?: string;
  },
  locale: AppLocale,
): Promise<Restaurant[]> {
  switch (provider) {
    case 'google': {
      const key = process.env.GOOGLE_MAPS_SERVER_KEY;
      if (!key) {
        throw new ApiRouteError({
          status: 503,
          code: 'provider_unavailable',
          message: 'Google Maps API key not configured',
        });
      }
      return searchGoogleNearby(options, key, GOOGLE_LANGUAGE_CODE[locale]);
    }
    case 'hotpepper': {
      const key = process.env.HOTPEPPER_API_KEY;
      if (!key) {
        throw new ApiRouteError({
          status: 503,
          code: 'provider_unavailable',
          message: 'HotPepper API key not configured',
        });
      }
      return searchHotpepperNearby(options, key);
    }
    case 'amap': {
      const key = process.env.AMAP_SERVER_KEY;
      if (!key) {
        throw new ApiRouteError({
          status: 503,
          code: 'provider_unavailable',
          message: 'Amap API key not configured',
        });
      }
      return searchAmapNearby(options, key);
    }
  }
}

function mergeProviderResults(
  providerPlan: MapProviderType[],
  successes: Array<{ provider: MapProviderType; results: Restaurant[] }>,
): Restaurant[] {
  const byProvider = new Map(successes.map((entry) => [entry.provider, entry.results]));

  if (providerPlan.includes('hotpepper') && providerPlan.includes('google')) {
    const googleResults = byProvider.get('google');
    const hotpepperResults = byProvider.get('hotpepper');

    if (googleResults && hotpepperResults) {
      return mergeResults(googleResults, hotpepperResults);
    }

    return googleResults ?? hotpepperResults ?? [];
  }

  return successes[0]?.results ?? [];
}

function buildSearchKeyword(params: {
  primaryProvider: MapProviderType;
  locale: AppLocale;
  keyword?: string;
  categoryId?: string;
}): string | undefined {
  const category = params.categoryId ? getCategoryById(params.categoryId) : undefined;
  const categoryKeyword = category
    ? params.primaryProvider === 'hotpepper'
      ? category.name.ja
      : category.name[params.locale]
    : undefined;

  return combineKeywordTerms(normalizeSearchQuery(params.keyword), categoryKeyword);
}

function applyRestaurantFilters(
  restaurants: Restaurant[],
  filters: {
    openNow: boolean;
    minRating?: number;
    maxPriceLevel?: number;
    partySize?: number;
    requiredFeatures: RestaurantFeature[];
  },
): Restaurant[] {
  let filtered = restaurants;

  if (filters.openNow) {
    filtered = filtered.filter((restaurant) => restaurant.isOpenNow !== false);
  }

  if (filters.minRating != null && filters.minRating > 0) {
    const minRating = filters.minRating;
    filtered = filtered.filter(
      (restaurant) => restaurant.rating == null || restaurant.rating >= minRating,
    );
  }

  if (filters.maxPriceLevel != null && filters.maxPriceLevel > 0) {
    const maxPriceLevel = filters.maxPriceLevel;
    filtered = filtered.filter(
      (restaurant) =>
        restaurant.priceLevel == null ||
        (restaurant.priceLevel > 0 && restaurant.priceLevel <= maxPriceLevel),
    );
  }

  if (filters.partySize != null && filters.partySize > 1) {
    const partySize = filters.partySize;
    filtered = filtered.filter(
      (restaurant) => restaurant.capacity == null || restaurant.capacity >= partySize,
    );
  }

  if (filters.requiredFeatures.length > 0) {
    filtered = filtered.filter((restaurant) =>
      filters.requiredFeatures.every((feature) => restaurant.features?.includes(feature)),
    );
  }

  return filtered;
}

function sortRestaurants(
  restaurants: Restaurant[],
  sortBy: RestaurantSortBy,
  direction: SortDirection,
): Restaurant[] {
  return [...restaurants].sort((left, right) => {
    if (sortBy === 'distance') {
      return direction === 'desc' ? right.distance - left.distance : left.distance - right.distance;
    }

    const leftRating = left.rating;
    const rightRating = right.rating;

    if (leftRating == null && rightRating == null) {
      return left.distance - right.distance;
    }

    if (leftRating == null) return 1;
    if (rightRating == null) return -1;

    const difference = direction === 'asc' ? leftRating - rightRating : rightRating - leftRating;
    return difference !== 0 ? difference : left.distance - right.distance;
  });
}

export async function enrichRestaurantForApi(restaurant: Restaurant): Promise<ApiRestaurantRecord> {
  const resolved = await resolveRestaurantIdentity(restaurant);

  return buildApiRestaurantRecord({
    restaurant,
    restaurantKey: resolved.restaurantKey,
    providerRefs: resolved.providerRefs,
    photo: resolved.photo,
  });
}

function buildApiRestaurantRecord(params: {
  restaurant: Restaurant;
  restaurantKey: string;
  providerRefs: ApiProviderRef[];
  photo?: RestaurantPhotoPayload;
}): ApiRestaurantRecord {
  return {
    ...params.restaurant,
    providerRefs: params.providerRefs,
    restaurantKey: params.restaurantKey,
    photoUrl: params.photo ? buildCanonicalRestaurantPhotoUrl(params.restaurantKey) : undefined,
  };
}

async function fetchRestaurantDetailsByRefs(
  providerRefs: ApiProviderRef[],
  locale: AppLocale,
  source: ApiSource,
): Promise<{
  restaurant: Restaurant | null;
  providerStatuses: ProviderExecutionStatus[];
  errors: ApiRouteError[];
}> {
  const detailResults = await Promise.allSettled(
    providerRefs.map(async (ref) => ({
      provider: ref.provider,
      restaurant: await fetchSingleRestaurantDetail(ref, locale),
    })),
  );

  const successes: Array<{ provider: MapProviderType; restaurant: Restaurant }> = [];
  const providerStatuses: ProviderExecutionStatus[] = [];
  const errors: ApiRouteError[] = [];

  detailResults.forEach((result, index) => {
    const provider = providerRefs[index]?.provider;
    if (!provider) return;

    if (result.status === 'fulfilled') {
      successes.push(result.value);
      providerStatuses.push({
        provider,
        status: 'success',
      });
      return;
    }

    const normalizedError = normalizeDetailRefreshError(result.reason);
    errors.push(normalizedError);
    providerStatuses.push({
      provider,
      status: 'failed',
      errorCode: normalizedError.code,
      errorMessage: normalizedError.message,
    });
  });

  if (successes.length === 0) {
    return { restaurant: null, providerStatuses, errors };
  }

  const googleRestaurant = successes.find((entry) => entry.provider === 'google')?.restaurant;
  const hotpepperRestaurant = successes.find((entry) => entry.provider === 'hotpepper')?.restaurant;

  if (googleRestaurant && hotpepperRestaurant) {
    return {
      restaurant: mergeResults([googleRestaurant], [hotpepperRestaurant])[0] ?? googleRestaurant,
      providerStatuses,
      errors,
    };
  }

  return {
    restaurant:
      successes.find((entry) => entry.provider === getPrimaryProviderForSource(source))
        ?.restaurant ??
      successes[0]?.restaurant ??
      null,
    providerStatuses,
    errors,
  };
}

async function fetchSingleRestaurantDetail(
  ref: ApiProviderRef,
  locale: AppLocale,
): Promise<Restaurant> {
  try {
    switch (ref.provider) {
      case 'google': {
        const key = process.env.GOOGLE_MAPS_SERVER_KEY;
        if (!key) {
          throw new ApiRouteError({
            status: 503,
            code: 'provider_unavailable',
            message: 'Google Maps API key not configured',
          });
        }

        return await getGooglePlaceDetails(ref.providerId, key, GOOGLE_LANGUAGE_CODE[locale]);
      }
      case 'hotpepper': {
        const key = process.env.HOTPEPPER_API_KEY;
        if (!key) {
          throw new ApiRouteError({
            status: 503,
            code: 'provider_unavailable',
            message: 'HotPepper API key not configured',
          });
        }

        return await getHotpepperDetails(ref.providerId, key);
      }
      case 'amap': {
        const key = process.env.AMAP_SERVER_KEY;
        if (!key) {
          throw new ApiRouteError({
            status: 503,
            code: 'provider_unavailable',
            message: 'Amap API key not configured',
          });
        }

        return await getAmapPlaceDetails(ref.providerId, key);
      }
    }
  } catch (error) {
    throw normalizeProviderDetailError(ref.provider, error);
  }
}

function coalesceRestaurantDetails(params: {
  storedRecord: StoredRestaurantRecord;
  snapshot: Restaurant | null;
  fresh: Restaurant | null;
}): Restaurant {
  const { storedRecord, snapshot, fresh } = params;
  const base = fresh ?? snapshot;

  if (!base) {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }

  return {
    ...(snapshot ?? {}),
    ...base,
    id: base.id || snapshot?.id || storedRecord.providerRefs[0]?.providerId || '',
    restaurantKey: storedRecord.restaurantKey,
    source:
      storedRecord.source === 'hybrid'
        ? 'hybrid'
        : (base.source ?? snapshot?.source ?? storedRecord.source),
    providerRefs: dedupeProviderRefs([
      ...(snapshot?.providerRefs ?? []),
      ...(base.providerRefs ?? []),
      ...storedRecord.providerRefs,
    ]),
    photoRef: base.photoRef ?? (storedRecord.photo?.ref ? storedRecord.photo.ref : undefined),
    photoUrl: base.photoUrl ?? (storedRecord.photo?.url ? storedRecord.photo.url : undefined),
  };
}

function normalizeRequestedProvider(
  value: RestaurantSearchInput['provider'],
): MapProviderType | 'auto' {
  if (value == null || value === 'auto') return 'auto';
  if (value === 'google' || value === 'hotpepper' || value === 'amap') return value;

  throw new ApiRouteError({
    status: 400,
    code: 'invalid_argument',
    message: 'provider must be one of auto, google, hotpepper, amap',
    details: { field: 'provider' },
  });
}

function normalizeRadius(value: number | undefined): number {
  const radius = value == null ? DEFAULT_RADIUS_M : Number(value);

  if (!Number.isFinite(radius) || radius < MIN_RADIUS_M || radius > MAX_RADIUS_M) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `radiusM must be between ${MIN_RADIUS_M} and ${MAX_RADIUS_M}`,
      details: { field: 'radiusM' },
    });
  }

  return Math.round(radius);
}

function normalizeMinRating(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const rating = Number(value);

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'filters.minRating must be between 0 and 5',
      details: { field: 'filters.minRating' },
    });
  }

  return rating;
}

function normalizeMaxPriceLevel(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const priceLevel = Number(value);

  if (!Number.isFinite(priceLevel) || priceLevel < 0 || priceLevel > 4) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'filters.maxPriceLevel must be between 0 and 4',
      details: { field: 'filters.maxPriceLevel' },
    });
  }

  return Math.round(priceLevel);
}

function normalizePartySize(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const partySize = Number(value);

  if (!Number.isFinite(partySize) || partySize < 1 || partySize > 50) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'filters.partySize must be between 1 and 50',
      details: { field: 'filters.partySize' },
    });
  }

  return Math.round(partySize);
}

function normalizeRequiredFeatures(
  value: RestaurantFeature[] | null | undefined,
): RestaurantFeature[] {
  if (!value) return [];
  return [...new Set(value)];
}

function normalizeSortBy(value: string | undefined): RestaurantSortBy {
  if (value == null || value === 'distance') return 'distance';
  if (value === 'rating') return 'rating';

  throw new ApiRouteError({
    status: 400,
    code: 'invalid_argument',
    message: 'sort.by must be one of distance or rating',
    details: { field: 'sort.by' },
  });
}

function normalizeSortDirection(
  value: string | undefined,
  sortBy: RestaurantSortBy,
): SortDirection {
  if (value == null) {
    return sortBy === 'rating' ? 'desc' : 'asc';
  }

  if (value === 'asc' || value === 'desc') {
    return value;
  }

  throw new ApiRouteError({
    status: 400,
    code: 'invalid_argument',
    message: 'sort.direction must be one of asc or desc',
    details: { field: 'sort.direction' },
  });
}

function normalizePageSize(value: number | undefined): number {
  const pageSize = value == null ? DEFAULT_PAGE_SIZE : Number(value);

  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: `pagination.pageSize must be between 1 and ${MAX_PAGE_SIZE}`,
      details: { field: 'pagination.pageSize' },
    });
  }

  return Math.round(pageSize);
}

function normalizeOffset(value: number | undefined): number {
  if (value == null) return 0;
  const offset = Number(value);

  if (!Number.isFinite(offset) || offset < 0) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'pagination.offset must be greater than or equal to 0',
      details: { field: 'pagination.offset' },
    });
  }

  return Math.round(offset);
}

function getPrimaryProviderForSource(source: ApiSource): MapProviderType {
  if (source === 'hotpepper' || source === 'amap') return source;
  return 'google';
}

function normalizeProviderSearchError(provider: MapProviderType, error: unknown): ApiRouteError {
  if (error instanceof ApiRouteError) {
    return error;
  }

  const capacityError = normalizeCapacityError({
    provider,
    action: 'search',
    error,
  });
  if (capacityError) {
    return capacityError;
  }

  return new ApiRouteError({
    status: 502,
    code: 'upstream_error',
    message: `${provider} search failed`,
    details: { provider },
  });
}

function normalizeProviderDetailError(provider: MapProviderType, error: unknown): ApiRouteError {
  if (error instanceof ApiRouteError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('not found') || normalizedMessage.includes('status 404')) {
    return new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
      details: { provider },
    });
  }

  const capacityError = normalizeCapacityError({
    provider,
    action: 'details',
    error,
  });
  if (capacityError) {
    return capacityError;
  }

  return new ApiRouteError({
    status: 502,
    code: 'upstream_error',
    message: `${provider} details fetch failed`,
    details: { provider },
  });
}

function normalizeDetailRefreshError(error: unknown): ApiRouteError {
  return error instanceof ApiRouteError
    ? error
    : new ApiRouteError({
        status: 502,
        code: 'upstream_error',
        message: 'Restaurant details refresh failed',
      });
}

function selectSearchError(errors: ApiRouteError[]): ApiRouteError {
  if (errors.length === 0) {
    return new ApiRouteError({
      status: 502,
      code: 'upstream_error',
      message: 'All provider searches failed',
    });
  }

  return (
    errors.find(
      (error) =>
        error.code === 'provider_unavailable' ||
        error.code === 'quota_exhausted' ||
        error.code === 'rate_limited',
    ) ??
    errors.find((error) => error.code === 'upstream_error') ??
    errors[0]
  );
}

function selectDetailRefreshError(errors: ApiRouteError[]): ApiRouteError {
  if (errors.length === 0) {
    return new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }

  if (errors.every((error) => error.code === 'not_found')) {
    return new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }

  return (
    errors.find(
      (error) =>
        error.code === 'provider_unavailable' ||
        error.code === 'quota_exhausted' ||
        error.code === 'rate_limited',
    ) ??
    errors.find((error) => error.code === 'upstream_error') ??
    errors[0]
  );
}

function dedupeProviderRefs(providerRefs: ApiProviderRef[]): ApiProviderRef[] {
  const seen = new Set<string>();

  return providerRefs.filter((ref) => {
    const key = `${ref.provider}:${ref.providerId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCapacityError(params: {
  provider: MapProviderType;
  action: 'search' | 'details';
  error: unknown;
}): ApiRouteError | null {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('over_query_limit') ||
    normalizedMessage.includes('resource_exhausted') ||
    normalizedMessage.includes('quota') ||
    normalizedMessage.includes('daily limit') ||
    normalizedMessage.includes('usage limit')
  ) {
    return new ApiRouteError({
      status: 429,
      code: 'quota_exhausted',
      message: `${params.provider} ${params.action} quota was exhausted`,
      details: { provider: params.provider },
    });
  }

  if (normalizedMessage.includes('status 429')) {
    return new ApiRouteError({
      status: 429,
      code: 'rate_limited',
      message: `${params.provider} ${params.action} request was rate limited`,
      details: { provider: params.provider },
    });
  }

  return null;
}
