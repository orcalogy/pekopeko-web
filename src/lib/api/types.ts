import type { MapProviderType, Restaurant } from '../../types/restaurant.ts';
import type { AppLocale } from '../app-locale.ts';
import type { ApiErrorCode } from './http.ts';

export type ApiSource = 'google' | 'hotpepper' | 'amap' | 'hybrid';
export type ProviderOverride = MapProviderType | 'auto';
export type GeoResolutionStrategy =
  | 'china_amap'
  | 'hybrid_japan'
  | 'google_global'
  | 'fallback_heuristic'
  | 'manual_override';
export type GeoResolutionConfidence = 'high' | 'medium' | 'low';
export type RestaurantSortBy = 'distance' | 'rating';
export type SortDirection = 'asc' | 'desc';
export type DetailFreshnessState = 'live' | 'partial_live' | 'snapshot';
export type ProviderOperationStatus = 'success' | 'failed';

export const PROVIDER_MODES = ['auto', 'google', 'hotpepper', 'amap'] as const satisfies readonly [
  ProviderOverride,
  ...ProviderOverride[],
];
export const GEO_RESOLUTION_STRATEGIES = [
  'china_amap',
  'hybrid_japan',
  'google_global',
  'fallback_heuristic',
  'manual_override',
] as const satisfies readonly [GeoResolutionStrategy, ...GeoResolutionStrategy[]];
export const GEO_RESOLUTION_CONFIDENCES = ['high', 'medium', 'low'] as const satisfies readonly [
  GeoResolutionConfidence,
  ...GeoResolutionConfidence[],
];
export const DETAIL_FRESHNESS_STATES = [
  'live',
  'partial_live',
  'snapshot',
] as const satisfies readonly [DetailFreshnessState, ...DetailFreshnessState[]];
export const RESTAURANT_SORT_OPTIONS = ['distance', 'rating'] as const satisfies readonly [
  RestaurantSortBy,
  ...RestaurantSortBy[],
];
export const SORT_DIRECTIONS = ['asc', 'desc'] as const satisfies readonly [
  SortDirection,
  ...SortDirection[],
];
export const RESTAURANT_FEATURES = [
  'wifi',
  'lunch',
  'private_room',
  'english',
  'non_smoking',
  'card',
  'parking',
] as const;

export type RestaurantFeature = (typeof RESTAURANT_FEATURES)[number];

export interface ApiProviderRef {
  provider: MapProviderType;
  providerId: string;
}

export interface RestaurantPhotoPayload {
  provider: MapProviderType;
  ref?: string;
  url?: string;
}

export type RestaurantKeySnapshot = Omit<
  Restaurant,
  'restaurantKey' | 'photoRef' | 'photoUrl' | 'providerRefs'
>;

export interface ApiRestaurantRecord extends Restaurant {
  restaurantKey: string;
  providerRefs: ApiProviderRef[];
}

export interface GeoResolution {
  country: string;
  provider: MapProviderType;
  providerPlan: MapProviderType[];
  strategy: GeoResolutionStrategy;
  confidence: GeoResolutionConfidence;
}

export interface RestaurantSearchInput {
  locale?: string;
  provider?: ProviderOverride;
  location?: {
    lat?: number;
    lng?: number;
  };
  radiusM?: number;
  query?: {
    keyword?: string | null;
    categoryId?: string | null;
    providerKeywords?: Partial<Record<MapProviderType, string[]>> | null;
  };
  filters?: {
    openNow?: boolean;
    minRating?: number | null;
    maxPriceLevel?: number | null;
    partySize?: number | null;
    requiredFeatures?: RestaurantFeature[] | null;
  };
  sort?: {
    by?: RestaurantSortBy;
    direction?: SortDirection;
  };
  pagination?: {
    pageSize?: number;
    cursor?: string | null;
  };
}

export interface AppliedRestaurantFilters {
  openNow: boolean;
  minRating?: number;
  maxPriceLevel?: number;
  partySize?: number;
  requiredFeatures: RestaurantFeature[];
  sortBy: RestaurantSortBy;
  sortDirection: SortDirection;
}

export interface ProviderExecutionStatus {
  provider: MapProviderType;
  status: ProviderOperationStatus;
  rawResults?: number;
  errorCode?: ApiErrorCode;
  errorMessage?: string;
}

export interface RestaurantSearchResult {
  locale: AppLocale;
  resolved: GeoResolution;
  appliedFilters: AppliedRestaurantFilters;
  partialResults: boolean;
  providerStatuses: ProviderExecutionStatus[];
  results: ApiRestaurantRecord[];
  pagination: {
    mode: 'cursor';
    pageSize: number;
    nextCursor: string | null;
    returned: number;
    total: number;
  };
}

export interface RestaurantDetailsResult {
  restaurant: ApiRestaurantRecord;
  freshness: {
    state: DetailFreshnessState;
  };
  providerStatuses: ProviderExecutionStatus[];
  cacheControl: string;
}
