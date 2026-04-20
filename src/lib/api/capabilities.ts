import { categories } from '../../data/categories.ts';
import type { MapProviderType } from '../../types/restaurant.ts';
import { locales } from '../app-locale.ts';
import {
  GEO_RESOLUTION_CONFIDENCES,
  GEO_RESOLUTION_STRATEGIES,
  PROVIDER_MODES,
  RESTAURANT_FEATURES,
  RESTAURANT_SORT_OPTIONS,
  SORT_DIRECTIONS,
} from './types.ts';

export const API_VERSION = 'v1';
export const SEARCH_RADIUS_PRESETS_M = [
  300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000,
] as const;
export const DEFAULT_RADIUS_M = 2000;
export const MIN_RADIUS_M = 100;
export const MAX_RADIUS_M = 10000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 40;
export const DETAILS_CACHE_CONTROL = 'public, max-age=300, s-maxage=300';
export const PHOTO_CACHE_CONTROL = 'public, max-age=86400, s-maxage=86400';
export const CAPABILITIES_CACHE_CONTROL = 'public, max-age=300, s-maxage=300';
export const GEO_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';
export const STALE_DETAILS_CACHE_CONTROL = 'no-store';
export const SEARCH_PAGINATION_MODE = 'offset' as const;

export interface ConfiguredProviders {
  google: boolean;
  hotpepper: boolean;
  amap: boolean;
}

export function getConfiguredProviders(): ConfiguredProviders {
  return {
    google: Boolean(process.env.GOOGLE_MAPS_SERVER_KEY),
    hotpepper: Boolean(process.env.HOTPEPPER_API_KEY),
    amap: Boolean(process.env.AMAP_SERVER_KEY),
  };
}

export function isProviderConfigured(provider: MapProviderType): boolean {
  return getConfiguredProviders()[provider];
}

export function getCapabilities() {
  const providers = getConfiguredProviders();

  return {
    version: API_VERSION,
    locales: [...locales],
    providers: {
      google: { configured: providers.google },
      hotpepper: { configured: providers.hotpepper },
      amap: { configured: providers.amap },
    },
    geo: {
      strategies: [...GEO_RESOLUTION_STRATEGIES],
      confidences: [...GEO_RESOLUTION_CONFIDENCES],
    },
    search: {
      defaultRadiusM: DEFAULT_RADIUS_M,
      minRadiusM: MIN_RADIUS_M,
      maxRadiusM: MAX_RADIUS_M,
      radiusPresetsM: [...SEARCH_RADIUS_PRESETS_M],
      defaultPageSize: DEFAULT_PAGE_SIZE,
      maxPageSize: MAX_PAGE_SIZE,
      paginationMode: SEARCH_PAGINATION_MODE,
      providerModes: [...PROVIDER_MODES],
      sortBy: [...RESTAURANT_SORT_OPTIONS],
      sortDirections: [...SORT_DIRECTIONS],
      requiredFeatures: [...RESTAURANT_FEATURES],
    },
    categories: categories.map((category) => ({
      id: category.id,
      name: { ...category.name },
      color: category.color,
    })),
  };
}
