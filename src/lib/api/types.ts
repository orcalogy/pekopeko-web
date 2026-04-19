import type { AppLocale } from '@/lib/app-locale';
import type { MapProviderType, Restaurant } from '@/types/restaurant';

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

export interface RestaurantSearchRequest {
  locale?: string;
  provider?: ProviderOverride;
  location?: {
    lat?: number;
    lng?: number;
  };
  radius_m?: number;
  query?: {
    keyword?: string | null;
    category_id?: string | null;
  };
  filters?: {
    open_now?: boolean;
    min_rating?: number | null;
    max_price_level?: number | null;
    party_size?: number | null;
    required_features?: string[] | null;
  };
  sort?: {
    by?: RestaurantSortBy;
    direction?: SortDirection;
  };
  pagination?: {
    page_size?: number;
    page_token?: string | null;
  };
}

export interface AppliedRestaurantFilters {
  openNow: boolean;
  minRating?: number;
  maxPriceLevel?: number;
  partySize?: number;
  requiredFeatures: string[];
  sortBy: RestaurantSortBy;
  sortDirection: SortDirection;
}

export interface ProviderSearchStats {
  provider: MapProviderType;
  rawResults: number;
  normalizedResults: number;
}

export interface RestaurantSearchResult {
  locale: AppLocale;
  resolved: GeoResolution;
  appliedFilters: AppliedRestaurantFilters;
  partialResults: boolean;
  warnings: string[];
  results: ApiRestaurantRecord[];
  pagination: {
    pageSize: number;
    nextPageToken: string | null;
    returned: number;
  };
  providerStats: ProviderSearchStats[];
}
