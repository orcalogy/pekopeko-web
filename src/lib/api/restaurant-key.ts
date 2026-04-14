import type { MapProviderType, Restaurant } from '@/types/restaurant';
import type {
  ApiProviderRef,
  ApiSource,
  RestaurantKeyPayload,
  RestaurantKeySnapshot,
  RestaurantPhotoPayload,
} from './types';

const RESTAURANT_KEY_PREFIX = 'rest_v1_';
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

export function buildRestaurantKey(payload: RestaurantKeyPayload): string {
  return `${RESTAURANT_KEY_PREFIX}${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

export function buildRestaurantSnapshot(restaurant: Restaurant): RestaurantKeySnapshot {
  const { providerRefs, photoRef, photoUrl, ...snapshot } = restaurant;
  void providerRefs;
  void photoRef;
  void photoUrl;
  return snapshot;
}

export function restoreRestaurantFromSnapshot(snapshot: RestaurantKeySnapshot): Restaurant {
  return { ...snapshot };
}

export function parseRestaurantKey(value: string): RestaurantKeyPayload | null {
  if (!value.startsWith(RESTAURANT_KEY_PREFIX)) {
    return null;
  }

  try {
    const encoded = value.slice(RESTAURANT_KEY_PREFIX.length);
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as Partial<RestaurantKeyPayload>;

    if (
      parsed.v !== 1 ||
      typeof parsed.primaryId !== 'string' ||
      !Array.isArray(parsed.providerRefs)
    ) {
      return null;
    }

    const source = parsed.source;
    if (!source || !['google', 'hotpepper', 'amap', 'hybrid'].includes(source)) {
      return null;
    }

    const providerRefs = parsed.providerRefs
      .filter(
        (ref): ref is ApiProviderRef =>
          typeof ref?.provider === 'string' &&
          typeof ref?.providerId === 'string' &&
          ['google', 'hotpepper', 'amap'].includes(ref.provider),
      )
      .map((ref) => ({ provider: ref.provider as MapProviderType, providerId: ref.providerId }));

    if (providerRefs.length === 0) {
      return null;
    }

    const photo =
      parsed.photo &&
      typeof parsed.photo === 'object' &&
      typeof parsed.photo.provider === 'string' &&
      ['google', 'hotpepper', 'amap'].includes(parsed.photo.provider)
        ? {
            provider: parsed.photo.provider as MapProviderType,
            ...(typeof parsed.photo.ref === 'string' ? { ref: parsed.photo.ref } : {}),
            ...(typeof parsed.photo.url === 'string' ? { url: parsed.photo.url } : {}),
          }
        : undefined;

    const snapshot =
      parsed.snapshot && typeof parsed.snapshot === 'object'
        ? (parsed.snapshot as RestaurantKeySnapshot)
        : undefined;

    return {
      v: 1,
      source: source as ApiSource,
      primaryId: parsed.primaryId,
      providerRefs,
      ...(photo ? { photo } : {}),
      ...(snapshot ? { snapshot } : {}),
    };
  } catch {
    return null;
  }
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
