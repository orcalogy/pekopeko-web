import { randomBytes } from 'node:crypto';
import type { MapProviderType, Restaurant } from '@/types/restaurant';
import type { ApiProviderRef, RestaurantKeySnapshot, RestaurantPhotoPayload } from './types';

const RESTAURANT_KEY_PREFIX = 'rid_';
const ALLOWED_PHOTO_HOST_SUFFIXES = ['amap.com', 'autonavi.com', 'hotpepper.jp', 'recruit.co.jp'];

export function getRestaurantProviderRefs(restaurant: Restaurant): ApiProviderRef[] {
  const refs =
    restaurant.providerRefs
      ?.filter((ref) => ref.providerId.trim().length > 0)
      .map((ref) => ({
        provider: ref.provider,
        providerId: ref.providerId,
      })) ?? [];

  if (refs.length > 0) {
    return dedupeProviderRefs(refs);
  }

  const fallbackProvider = getPrimaryProvider(restaurant.source);
  return restaurant.id ? [{ provider: fallbackProvider, providerId: restaurant.id }] : [];
}

export function inferRestaurantPhotoPayload(
  restaurant: Restaurant,
  providerRefs: ApiProviderRef[],
): RestaurantPhotoPayload | undefined {
  if (restaurant.photoRef) {
    return { provider: 'google', ref: restaurant.photoRef };
  }

  if (!restaurant.photoUrl || !/^https?:\/\//i.test(restaurant.photoUrl)) {
    return undefined;
  }

  const provider =
    providerRefs.find((ref) => ref.provider !== 'google')?.provider ??
    providerRefs[0]?.provider ??
    'google';

  return { provider, url: restaurant.photoUrl };
}

export function generateRestaurantKey(): string {
  return `${RESTAURANT_KEY_PREFIX}${randomBytes(12).toString('base64url')}`;
}

export function buildRestaurantSnapshot(restaurant: Restaurant): RestaurantKeySnapshot {
  const { providerRefs, photoRef, photoUrl, restaurantKey, ...snapshot } = restaurant;
  void providerRefs;
  void photoRef;
  void photoUrl;
  void restaurantKey;
  return snapshot;
}

export function restoreRestaurantFromSnapshot(snapshot: RestaurantKeySnapshot): Restaurant {
  return { ...snapshot };
}

export function buildCanonicalRestaurantPhotoUrl(restaurantKey: string): string {
  return `/api/v1/restaurants/${encodeURIComponent(restaurantKey)}/photo?max_width=800`;
}

export function isAllowedPhotoProxyUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }

    return ALLOWED_PHOTO_HOST_SUFFIXES.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
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

function getPrimaryProvider(source: Restaurant['source']): MapProviderType {
  if (source === 'hotpepper' || source === 'amap') return source;
  return 'google';
}
