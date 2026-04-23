import type { ApiVersion } from '../../generated/api/models/apiVersion.ts';
import type { AppLocale as ContractAppLocale } from '../../generated/api/models/appLocale.ts';
import type { CapabilitiesResponse } from '../../generated/api/models/capabilitiesResponse.ts';
import type { CapabilitiesResponseDetails } from '../../generated/api/models/capabilitiesResponseDetails.ts';
import type { CapabilitiesResponseGeo } from '../../generated/api/models/capabilitiesResponseGeo.ts';
import type { CapabilitiesResponseSearch } from '../../generated/api/models/capabilitiesResponseSearch.ts';
import type { CategoryCapability } from '../../generated/api/models/categoryCapability.ts';
import type { DetailFreshnessState } from '../../generated/api/models/detailFreshnessState.ts';
import type { GeoResolution as ContractGeoResolution } from '../../generated/api/models/geoResolution.ts';
import type { GeoResolutionConfidence } from '../../generated/api/models/geoResolutionConfidence.ts';
import type { GeoResolutionStrategy } from '../../generated/api/models/geoResolutionStrategy.ts';
import type { LocalizedCategoryName } from '../../generated/api/models/localizedCategoryName.ts';
import type { PaginationMode } from '../../generated/api/models/paginationMode.ts';
import type { ProviderKind } from '../../generated/api/models/providerKind.ts';
import type { ProviderMode } from '../../generated/api/models/providerMode.ts';
import type { ProviderOperationStatus } from '../../generated/api/models/providerOperationStatus.ts';
import type { ProviderOperationStatusState } from '../../generated/api/models/providerOperationStatusState.ts';
import type { ProviderSource } from '../../generated/api/models/providerSource.ts';
import type { RestaurantDetailsResource } from '../../generated/api/models/restaurantDetailsResource.ts';
import type { RestaurantDetailsResponse } from '../../generated/api/models/restaurantDetailsResponse.ts';
import type { RestaurantFeature as ContractRestaurantFeature } from '../../generated/api/models/restaurantFeature.ts';
import type { RestaurantSearchItem } from '../../generated/api/models/restaurantSearchItem.ts';
import type { RestaurantSearchResponse } from '../../generated/api/models/restaurantSearchResponse.ts';
import type { RestaurantSortBy } from '../../generated/api/models/restaurantSortBy.ts';
import type { SortDirection } from '../../generated/api/models/sortDirection.ts';
import type { UpstreamErrorInfo } from '../../generated/api/models/upstreamErrorInfo.ts';
import { getCapabilities } from './capabilities.ts';
import type {
  ApiRestaurantRecord,
  GeoResolution,
  ProviderExecutionStatus,
  RestaurantDetailsResult,
  RestaurantSearchResult,
} from './types.ts';

export function serializeCapabilitiesResponse(): unknown {
  const capabilities = getCapabilities();
  const categories: Array<CategoryCapability> = capabilities.categories.map((category) => ({
    id: category.id,
    name: {
      zh_CN: category.name['zh-CN'],
      ja: category.name.ja,
      en: category.name.en,
    } satisfies LocalizedCategoryName,
    color: category.color,
  }));

  const payload: CapabilitiesResponse = {
    version: capabilities.version as unknown as ApiVersion,
    locales: capabilities.locales as unknown as ContractAppLocale[],
    providers: capabilities.providers,
    geo: {
      strategies: capabilities.geo.strategies as unknown as GeoResolutionStrategy[],
      confidences: capabilities.geo.confidences as unknown as GeoResolutionConfidence[],
    } satisfies CapabilitiesResponseGeo,
    details: {
      freshnessStates: capabilities.details.freshnessStates as unknown as DetailFreshnessState[],
    } satisfies CapabilitiesResponseDetails,
    search: {
      defaultRadiusM: capabilities.search.defaultRadiusM,
      minRadiusM: capabilities.search.minRadiusM,
      maxRadiusM: capabilities.search.maxRadiusM,
      radiusPresetsM: capabilities.search.radiusPresetsM,
      defaultPageSize: capabilities.search.defaultPageSize,
      maxPageSize: capabilities.search.maxPageSize,
      paginationMode: capabilities.search.paginationMode as unknown as PaginationMode,
      providerModes: capabilities.search.providerModes as unknown as ProviderMode[],
      sortBy: capabilities.search.sortBy as unknown as RestaurantSortBy[],
      sortDirections: capabilities.search.sortDirections as unknown as SortDirection[],
      requiredFeatures: capabilities.search
        .requiredFeatures as unknown as ContractRestaurantFeature[],
    } satisfies CapabilitiesResponseSearch,
    categories,
  };

  return {
    ...payload,
    categories: payload.categories.map((category) => ({
      ...category,
      name: serializeLocalizedCategoryName(category.name),
    })),
  };
}

export function serializeGeoResolution(resolution: GeoResolution): unknown {
  const payload: ContractGeoResolution = {
    country: resolution.country,
    provider: resolution.provider as unknown as ProviderKind,
    providerPlan: resolution.providerPlan as unknown as ProviderKind[],
    strategy: resolution.strategy as unknown as GeoResolutionStrategy,
    confidence: resolution.confidence as unknown as GeoResolutionConfidence,
  };

  return payload;
}

export function serializeRestaurantSearchResponse(
  result: RestaurantSearchResult,
  requestId: string,
): unknown {
  const payload: RestaurantSearchResponse = {
    requestId,
    resolved: {
      country: result.resolved.country,
      provider: result.resolved.provider as unknown as ProviderKind,
      providerPlan: result.resolved.providerPlan as unknown as ProviderKind[],
      strategy: result.resolved.strategy as unknown as GeoResolutionStrategy,
      confidence: result.resolved.confidence as unknown as GeoResolutionConfidence,
    },
    appliedFilters: {
      openNow: result.appliedFilters.openNow,
      minRating: result.appliedFilters.minRating,
      maxPriceLevel: result.appliedFilters.maxPriceLevel,
      partySize: result.appliedFilters.partySize,
      requiredFeatures: result.appliedFilters
        .requiredFeatures as unknown as ContractRestaurantFeature[],
      sortBy: result.appliedFilters.sortBy as unknown as RestaurantSortBy,
      sortDirection: result.appliedFilters.sortDirection as unknown as SortDirection,
    },
    partialResults: result.partialResults,
    providerStatuses: result.providerStatuses.map(serializeProviderExecutionStatus),
    results: result.results.map(serializeRestaurantSearchItem),
    pagination: {
      mode: result.pagination.mode as unknown as PaginationMode,
      pageSize: result.pagination.pageSize,
      nextCursor: result.pagination.nextCursor,
      returned: result.pagination.returned,
      total: result.pagination.total,
    },
  };

  return payload;
}

export function serializeRestaurantDetailsResponse(
  result: RestaurantDetailsResult,
  requestId: string,
): unknown {
  const payload: RestaurantDetailsResponse = {
    requestId,
    restaurant: serializeRestaurantDetailsResource(result.restaurant),
    freshness: {
      state: result.freshness.state as unknown as DetailFreshnessState,
    },
    providerStatuses: result.providerStatuses.map(serializeProviderExecutionStatus),
  };

  return payload;
}

function serializeRestaurantSearchItem(record: ApiRestaurantRecord): RestaurantSearchItem {
  return {
    ...serializeRestaurantCore(record),
    distance: Math.round(record.distance),
  };
}

function serializeRestaurantDetailsResource(
  record: ApiRestaurantRecord,
): RestaurantDetailsResource {
  return serializeRestaurantCore(record);
}

function serializeRestaurantCore(record: ApiRestaurantRecord): RestaurantDetailsResource {
  return {
    restaurantKey: record.restaurantKey,
    name: record.name,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    rating: record.rating,
    priceLevel: record.priceLevel,
    isOpenNow: record.isOpenNow,
    openingHours: record.openingHours,
    cuisineType: record.cuisineType,
    photoUrl: record.photoUrl,
    phone: record.phone,
    placeUrl: record.placeUrl,
    detailUrl: record.detailUrl,
    couponUrl: record.couponUrl,
    accessInfo: record.accessInfo,
    budgetText: record.budgetText,
    capacity: record.capacity,
    features: record.features as unknown as ContractRestaurantFeature[] | undefined,
    menuUrl: record.menuUrl,
    websiteUrl: record.websiteUrl,
    source: (record.source ?? 'google') as unknown as ProviderSource,
    providerRefs: record.providerRefs.map((ref) => ({
      provider: ref.provider as unknown as ProviderKind,
      providerId: ref.providerId,
    })),
  };
}

function serializeProviderExecutionStatus(
  status: ProviderExecutionStatus,
): ProviderOperationStatus {
  return {
    provider: status.provider as unknown as ProviderKind,
    status: status.status as unknown as ProviderOperationStatusState,
    ...(status.rawResults == null ? {} : { rawResults: status.rawResults }),
    ...(status.errorCode && status.errorMessage
      ? {
          error: {
            code: status.errorCode as unknown as UpstreamErrorInfo['code'],
            message: status.errorMessage,
          } satisfies UpstreamErrorInfo,
        }
      : {}),
  };
}

function serializeLocalizedCategoryName(name: LocalizedCategoryName) {
  return {
    'zh-CN': name.zh_CN,
    ja: name.ja,
    en: name.en,
  };
}
