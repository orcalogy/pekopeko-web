import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { MapProviderType, Restaurant } from '@/types/restaurant';
import { ApiRouteError } from './http';
import type {
  ApiProviderRef,
  ApiSource,
  RestaurantKeyPayload,
  RestaurantKeySnapshot,
  RestaurantPhotoPayload,
} from './types';

const RESTAURANT_KEY_PREFIX = 'rest_v1_';
const ALLOWED_PHOTO_HOST_SUFFIXES = ['amap.com', 'autonavi.com', 'hotpepper.jp', 'recruit.co.jp'];
const RESTAURANT_KEY_IV_BYTES = 12;
const RESTAURANT_KEY_TAG_BYTES = 16;

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
  const key = getRestaurantKeyKeyMaterial(true);
  const iv = randomBytes(RESTAURANT_KEY_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${RESTAURANT_KEY_PREFIX}${Buffer.concat([iv, authTag, ciphertext]).toString('base64url')}`;
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
    const key = getRestaurantKeyKeyMaterial(false);
    if (!key) {
      return null;
    }

    const encoded = value.slice(RESTAURANT_KEY_PREFIX.length);
    const sealed = Buffer.from(encoded, 'base64url');

    if (sealed.length <= RESTAURANT_KEY_IV_BYTES + RESTAURANT_KEY_TAG_BYTES) {
      return null;
    }

    const iv = sealed.subarray(0, RESTAURANT_KEY_IV_BYTES);
    const authTag = sealed.subarray(
      RESTAURANT_KEY_IV_BYTES,
      RESTAURANT_KEY_IV_BYTES + RESTAURANT_KEY_TAG_BYTES,
    );
    const ciphertext = sealed.subarray(RESTAURANT_KEY_IV_BYTES + RESTAURANT_KEY_TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const parsed = JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'),
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

function getRestaurantKeyKeyMaterial(required: true): Buffer;
function getRestaurantKeyKeyMaterial(required: false): Buffer | null;
function getRestaurantKeyKeyMaterial(required: boolean): Buffer | null {
  const explicitSecret = process.env.RESTAURANT_KEY_SECRET?.trim();
  const fallbackSecret = [
    process.env.GOOGLE_MAPS_SERVER_KEY,
    process.env.HOTPEPPER_API_KEY,
    process.env.AMAP_SERVER_KEY,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join('\0');

  const secret = explicitSecret || fallbackSecret;
  if (!secret) {
    if (!required) {
      return null;
    }

    throw new ApiRouteError({
      status: 500,
      code: 'internal',
      message: 'Restaurant key secret is not configured',
    });
  }

  return createHash('sha256').update(`restaurant-key:${secret}`).digest();
}
