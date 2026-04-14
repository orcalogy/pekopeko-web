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
  MAX_PAGE_SIZE,
  MAX_RADIUS_M,
  MIN_RADIUS_M,
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
  buildRestaurantKey,
  buildRestaurantSnapshot,
  getRestaurantProviderRefs,
  inferRestaurantPhotoPayload,
  parseRestaurantKey,
  restoreRestaurantFromSnapshot,
} from './restaurant-key';
import type {
  ApiProviderRef,
  ApiRestaurantRecord,
  ApiSource,
  AppliedRestaurantFilters,
  ProviderSearchStats,
  RestaurantKeyPayload,
  RestaurantSearchRequest,
  RestaurantSearchResult,
  RestaurantSortBy,
  SortDirection,
} from './types';

const GOOGLE_LANGUAGE_CODE: Record<AppLocale, string> = {
  'zh-CN': 'zh-CN',
  ja: 'ja',
  en: 'en',
};

const PAGE_TOKEN_PREFIX = 'page_v1_';

export async function searchRestaurants(params: {
  input: RestaurantSearchRequest;
  acceptLanguage: string | null;
}): Promise<RestaurantSearchResult> {
  const locale = resolveRequestLocale(params.input.locale, params.acceptLanguage);
  const requestedProvider = normalizeRequestedProvider(params.input.provider);
  const location = params.input.location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  assertValidCoordinates(lat, lng);

  const radiusM = normalizeRadius(params.input.radius_m);
  const minRating = normalizeMinRating(params.input.filters?.min_rating);
  const maxPriceLevel = normalizeMaxPriceLevel(params.input.filters?.max_price_level);
  const partySize = normalizePartySize(params.input.filters?.party_size);
  const requiredFeatures = normalizeRequiredFeatures(params.input.filters?.required_features);
  const openNow = params.input.filters?.open_now === true;
  const sortBy = normalizeSortBy(params.input.sort?.by);
  const sortDirection = normalizeSortDirection(params.input.sort?.direction, sortBy);
  const pageSize = normalizePageSize(params.input.pagination?.page_size);
  const pageOffset = decodePageToken(params.input.pagination?.page_token);

  const baseResolution = await resolveGeoPlan({ lat, lng, locale });
  const resolved = applyProviderOverride(baseResolution, requestedProvider);

  const searchKeyword = buildSearchKeyword({
    categoryId: params.input.query?.category_id ?? undefined,
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

  const results = normalized.map(enrichRestaurantForApi);
  const pagedResults = results.slice(pageOffset, pageOffset + pageSize);
  const nextPageToken =
    pageOffset + pageSize < results.length ? encodePageToken(pageOffset + pageSize) : null;

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
    partialResults: providerResults.failures.length > 0 && providerResults.successes.length > 0,
    warnings: buildWarnings(providerResults.successes, providerResults.failures),
    results: pagedResults,
    pagination: {
      pageSize,
      nextPageToken,
      returned: pagedResults.length,
    },
    providerStats: providerResults.stats,
  };
}

export function serializeApiRestaurant(record: ApiRestaurantRecord) {
  const { restaurantKey, providerRefs, ...restaurant } = record;

  return {
    restaurant_key: restaurantKey,
    ...restaurant,
    provider_refs: providerRefs.map((ref) => ({
      provider: ref.provider,
      provider_id: ref.providerId,
    })),
  };
}

export function toCompatibilityRestaurant(record: ApiRestaurantRecord): Restaurant {
  const { restaurantKey, providerRefs, ...restaurant } = record;
  void restaurantKey;
  void providerRefs;
  return restaurant;
}

export async function getRestaurantDetails(params: {
  restaurantKey: string;
  locale: string | null | undefined;
  acceptLanguage: string | null;
}): Promise<ApiRestaurantRecord> {
  const payload = parseRestaurantKey(params.restaurantKey);
  if (!payload) {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }

  const locale = resolveRequestLocale(params.locale, params.acceptLanguage);
  const snapshot = payload.snapshot ? restoreRestaurantFromSnapshot(payload.snapshot) : null;
  const fresh = await fetchRestaurantDetailsByRefs(payload, locale);

  if (!fresh && !snapshot) {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }

  const restaurant = coalesceRestaurantDetails({
    payload,
    snapshot,
    fresh,
  });

  return enrichRestaurantForApi(restaurant);
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
  failures: Array<{ provider: MapProviderType; error: unknown }>;
  stats: ProviderSearchStats[];
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
  const failures: Array<{ provider: MapProviderType; error: unknown }> = [];
  const stats: ProviderSearchStats[] = [];

  settled.forEach((result, index) => {
    const provider = params.providerPlan[index];
    if (result.status === 'fulfilled') {
      successes.push(result.value);
      stats.push({
        provider,
        rawResults: result.value.results.length,
        normalizedResults: result.value.results.length,
      });
    } else {
      failures.push({ provider, error: result.reason });
      console.error(`[api] ${provider} provider search failed:`, result.reason);
    }
  });

  if (successes.length === 0) {
    throw new ApiRouteError({
      status: 502,
      code: 'upstream_error',
      message: 'All provider searches failed',
    });
  }

  return { successes, failures, stats };
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
    requiredFeatures: string[];
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

export function enrichRestaurantForApi(restaurant: Restaurant): ApiRestaurantRecord {
  const providerRefs = getRestaurantProviderRefs(restaurant);
  const source = restaurant.source ?? providerRefs[0]?.provider ?? 'google';
  const photo = inferRestaurantPhotoPayload(restaurant, providerRefs);
  const restaurantKey = buildRestaurantKey({
    v: 1,
    source,
    primaryId: restaurant.id,
    providerRefs,
    ...(photo ? { photo } : {}),
    snapshot: buildRestaurantSnapshot(restaurant),
  });

  return {
    ...restaurant,
    providerRefs,
    restaurantKey,
    photoUrl: photo ? buildCanonicalRestaurantPhotoUrl(restaurantKey) : undefined,
  };
}

function buildWarnings(
  successes: Array<{ provider: MapProviderType; results: Restaurant[] }>,
  failures: Array<{ provider: MapProviderType; error: unknown }>,
): string[] {
  if (successes.length === 0 || failures.length === 0) {
    return [];
  }

  const successfulProviders = successes.map((entry) => entry.provider).join('+');
  return failures.map(
    ({ provider }) => `${provider} provider failed; returning ${successfulProviders}-only results`,
  );
}

async function fetchRestaurantDetailsByRefs(
  payload: RestaurantKeyPayload,
  locale: AppLocale,
): Promise<Restaurant | null> {
  const detailResults = await Promise.allSettled(
    payload.providerRefs.map(async (ref) => ({
      provider: ref.provider,
      restaurant: await fetchSingleRestaurantDetail(ref, locale),
    })),
  );

  const successes = detailResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{ provider: MapProviderType; restaurant: Restaurant }> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value);

  if (successes.length === 0) {
    return null;
  }

  const googleRestaurant = successes.find((entry) => entry.provider === 'google')?.restaurant;
  const hotpepperRestaurant = successes.find((entry) => entry.provider === 'hotpepper')?.restaurant;

  if (googleRestaurant && hotpepperRestaurant) {
    return mergeResults([googleRestaurant], [hotpepperRestaurant])[0] ?? googleRestaurant;
  }

  return (
    successes.find((entry) => entry.provider === getPrimaryProviderForSource(payload.source))
      ?.restaurant ??
    successes[0]?.restaurant ??
    null
  );
}

async function fetchSingleRestaurantDetail(
  ref: ApiProviderRef,
  locale: AppLocale,
): Promise<Restaurant> {
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

      return getGooglePlaceDetails(ref.providerId, key, GOOGLE_LANGUAGE_CODE[locale]);
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

      return getHotpepperDetails(ref.providerId, key);
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

      return getAmapPlaceDetails(ref.providerId, key);
    }
  }
}

function coalesceRestaurantDetails(params: {
  payload: RestaurantKeyPayload;
  snapshot: Restaurant | null;
  fresh: Restaurant | null;
}): Restaurant {
  const { payload, snapshot, fresh } = params;
  const base = fresh ?? snapshot;

  if (!base) {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Restaurant not found',
    });
  }

  const merged: Restaurant = {
    ...(snapshot ?? {}),
    ...base,
    id: base.id || snapshot?.id || payload.primaryId,
    source: payload.source === 'hybrid' ? 'hybrid' : (base.source ?? snapshot?.source),
    providerRefs: dedupeProviderRefs([
      ...(snapshot?.providerRefs ?? []),
      ...(base.providerRefs ?? []),
      ...payload.providerRefs,
    ]),
    photoRef: base.photoRef ?? (payload.photo?.ref ? payload.photo.ref : undefined),
  };

  return merged;
}

function normalizeRequestedProvider(
  value: RestaurantSearchRequest['provider'],
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
      message: `radius_m must be between ${MIN_RADIUS_M} and ${MAX_RADIUS_M}`,
      details: { field: 'radius_m' },
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
      message: 'min_rating must be between 0 and 5',
      details: { field: 'filters.min_rating' },
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
      message: 'max_price_level must be between 0 and 4',
      details: { field: 'filters.max_price_level' },
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
      message: 'party_size must be between 1 and 50',
      details: { field: 'filters.party_size' },
    });
  }

  return Math.round(partySize);
}

function normalizeRequiredFeatures(value: string[] | null | undefined): string[] {
  if (!value) return [];
  if (!Array.isArray(value) || value.some((feature) => typeof feature !== 'string')) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'required_features must be an array of strings',
      details: { field: 'filters.required_features' },
    });
  }

  return [...new Set(value.map((feature) => feature.trim()).filter(Boolean))];
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
      message: `pagination.page_size must be between 1 and ${MAX_PAGE_SIZE}`,
      details: { field: 'pagination.page_size' },
    });
  }

  return Math.round(pageSize);
}

function encodePageToken(offset: number): string {
  return `${PAGE_TOKEN_PREFIX}${Buffer.from(JSON.stringify({ v: 1, offset }), 'utf8').toString('base64url')}`;
}

function decodePageToken(value: string | null | undefined): number {
  if (!value) return 0;
  if (!value.startsWith(PAGE_TOKEN_PREFIX)) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'pagination.page_token is invalid',
      details: { field: 'pagination.page_token' },
    });
  }

  try {
    const encoded = value.slice(PAGE_TOKEN_PREFIX.length);
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      v?: number;
      offset?: number;
    };

    const offset = parsed.offset;

    if (parsed.v !== 1 || !Number.isInteger(offset) || offset == null || offset < 0) {
      throw new Error('invalid token');
    }

    return offset;
  } catch {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'pagination.page_token is invalid',
      details: { field: 'pagination.page_token' },
    });
  }
}

function getPrimaryProviderForSource(source: ApiSource): MapProviderType {
  if (source === 'hotpepper' || source === 'amap') return source;
  return 'google';
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
