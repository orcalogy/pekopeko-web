import { PHOTO_CACHE_CONTROL } from './capabilities';
import { ApiRouteError } from './http';
import { isAllowedPhotoProxyUrl } from './restaurant-key';

const DEFAULT_MAX_WIDTH = 800;
const MIN_MAX_WIDTH = 100;
const MAX_MAX_WIDTH = 1600;

export function normalizePhotoWidth(value: string | null | undefined): number {
  const parsed = Number(value ?? DEFAULT_MAX_WIDTH);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_MAX_WIDTH;
  }

  return Math.max(MIN_MAX_WIDTH, Math.min(MAX_MAX_WIDTH, Math.round(parsed)));
}

export async function fetchGooglePhotoMedia(ref: string, maxWidth: number): Promise<Response> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    throw new ApiRouteError({
      status: 503,
      code: 'provider_unavailable',
      message: 'Google Maps API key not configured',
    });
  }

  const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxWidth}&key=${key}`;
  const response = await fetch(url, { redirect: 'follow' });

  if (!response.ok) {
    throw new ApiRouteError({
      status: response.status === 404 ? 404 : 502,
      code: response.status === 404 ? 'not_found' : 'upstream_error',
      message: 'Photo fetch failed',
    });
  }

  return response;
}

export async function fetchExternalPhotoMedia(url: string): Promise<Response> {
  if (!isAllowedPhotoProxyUrl(url)) {
    throw new ApiRouteError({
      status: 404,
      code: 'not_found',
      message: 'Photo not found',
    });
  }

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new ApiRouteError({
      status: response.status === 404 ? 404 : 502,
      code: response.status === 404 ? 'not_found' : 'upstream_error',
      message: 'Photo fetch failed',
    });
  }

  return response;
}

export function getPhotoCacheControl(): string {
  return PHOTO_CACHE_CONTROL;
}
