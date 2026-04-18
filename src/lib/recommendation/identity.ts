import type { Restaurant, RestaurantProviderRef } from '@/types/restaurant';
import type { RestaurantPreferenceSnapshot } from './types';

export function getRestaurantIdentityKey(restaurant: {
  id?: string | null;
  restaurantKey?: string | null;
  source?: Restaurant['source'] | null;
  providerRefs?: RestaurantProviderRef[] | null;
}): string {
  const preferredProviderRef = getPreferredProviderRef(restaurant.providerRefs);
  if (preferredProviderRef) {
    return preferredProviderRef.providerId;
  }

  const providerId = restaurant.id?.trim();
  if (providerId) {
    return providerId;
  }

  return restaurant.restaurantKey?.trim() ?? '';
}

export function buildRestaurantPreferenceSnapshot(
  restaurant: Pick<Restaurant, 'cuisineType' | 'features' | 'priceLevel' | 'distance' | 'source'>,
): RestaurantPreferenceSnapshot {
  return {
    cuisineType: restaurant.cuisineType ?? undefined,
    features: restaurant.features?.slice(0, 8) ?? undefined,
    priceLevel: restaurant.priceLevel ?? undefined,
    distance: restaurant.distance ?? undefined,
    source: restaurant.source ?? undefined,
  };
}

function getPreferredProviderRef(
  providerRefs: RestaurantProviderRef[] | null | undefined,
): RestaurantProviderRef | null {
  if (!providerRefs || providerRefs.length === 0) {
    return null;
  }

  for (const provider of ['google', 'hotpepper', 'amap'] as const) {
    const match = providerRefs.find(
      (ref) => ref.provider === provider && ref.providerId.trim().length > 0,
    );

    if (match) {
      return match;
    }
  }

  return null;
}
