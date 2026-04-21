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

  if (response.status === 429) {
    throw new ApiRouteError({
      status: 429,
      code: 'rate_limited',
      message: 'Photo fetch was rate limited',
      retryAfterSeconds: parseRetryAfterSeconds(response),
    });
  }

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

  if (response.status === 429) {
    throw new ApiRouteError({
      status: 429,
      code: 'rate_limited',
      message: 'Photo fetch was rate limited',
      retryAfterSeconds: parseRetryAfterSeconds(response),
    });
  }

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

function parseRetryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get('retry-after');
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds);
  }

  const retryAt = Date.parse(header);
  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}
