import { type AppLocale, detectPreferredLocale, isAppLocale } from '@/lib/app-locale';
import { getConfiguredProviders } from './capabilities';
import { ApiRouteError } from './http';
import type { GeoResolution, ProviderOverride } from './types';

const GOOGLE_LANGUAGE_CODE: Record<AppLocale, string> = {
  'zh-CN': 'zh-CN',
  ja: 'ja',
  en: 'en',
};

interface GoogleGeocodeResponse {
  results?: Array<{
    address_components?: Array<{
      short_name?: string;
      types?: string[];
    }>;
  }>;
}

interface AmapReverseGeocodeResponse {
  status?: string;
  regeocode?: {
    addressComponent?: {
      country?: string;
    };
  };
}

export function resolveRequestLocale(
  requestedLocale: string | null | undefined,
  acceptLanguage: string | null,
): AppLocale {
  if (requestedLocale && isAppLocale(requestedLocale)) {
    return requestedLocale;
  }

  const candidates = [requestedLocale, acceptLanguage].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  return detectPreferredLocale(candidates);
}

export function assertValidCoordinates(lat: number, lng: number) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'lat must be between -90 and 90',
      details: { field: 'lat' },
    });
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'lng must be between -180 and 180',
      details: { field: 'lng' },
    });
  }
}

export async function resolveGeoPlan(params: {
  lat: number;
  lng: number;
  locale: AppLocale;
}): Promise<GeoResolution> {
  const { lat, lng, locale } = params;
  assertValidCoordinates(lat, lng);

  const configured = getConfiguredProviders();
  if (!configured.google && !configured.hotpepper && !configured.amap) {
    throw new ApiRouteError({
      status: 503,
      code: 'provider_unavailable',
      message: 'No map providers are configured',
    });
  }

  const likelyChina = isWithinChinaBounds(lat, lng);
  const likelyJapan = isWithinJapanBounds(lat, lng);

  if (likelyChina && configured.amap) {
    const country = await lookupCountryFromAmap(lat, lng);
    if (country === 'CN') {
      return buildCountryResolution(country, 'high');
    }
  }

  if (configured.google) {
    const country = await lookupCountryFromGoogle(lat, lng, locale);
    if (country) {
      return buildCountryResolution(country, 'high');
    }
  }

  if (likelyChina) {
    return buildFallbackResolution('CN');
  }

  if (likelyJapan) {
    return buildFallbackResolution('JP');
  }

  return buildFallbackResolution('UNKNOWN');
}

export function applyProviderOverride(
  resolution: GeoResolution,
  requestedProvider: ProviderOverride | undefined,
): GeoResolution {
  if (!requestedProvider || requestedProvider === 'auto') {
    return resolution;
  }

  const configured = getConfiguredProviders();
  if (!configured[requestedProvider]) {
    throw new ApiRouteError({
      status: 503,
      code: 'provider_unavailable',
      message: `${requestedProvider} provider is not configured`,
      details: { provider: requestedProvider },
    });
  }

  const providerPlan =
    requestedProvider === 'hotpepper' && resolution.country === 'JP' && configured.google
      ? (['hotpepper', 'google'] as const)
      : ([requestedProvider] as const);

  return {
    ...resolution,
    provider: providerPlan[0],
    providerPlan: [...providerPlan],
    strategy: 'manual_override',
  };
}

export function serializeGeoResolution(resolution: GeoResolution) {
  return {
    country: resolution.country,
    provider: resolution.provider,
    provider_plan: resolution.providerPlan,
    strategy: resolution.strategy,
    confidence: resolution.confidence,
  };
}

function buildCountryResolution(
  country: string,
  confidence: GeoResolution['confidence'],
): GeoResolution {
  const configured = getConfiguredProviders();

  if (country === 'CN') {
    if (configured.amap) {
      return {
        country,
        provider: 'amap',
        providerPlan: ['amap'],
        strategy: 'china_amap',
        confidence,
      };
    }

    if (configured.google) {
      return {
        country,
        provider: 'google',
        providerPlan: ['google'],
        strategy: 'google_global',
        confidence: confidence === 'high' ? 'medium' : confidence,
      };
    }
  }

  if (country === 'JP') {
    if (configured.hotpepper && configured.google) {
      return {
        country,
        provider: 'hotpepper',
        providerPlan: ['hotpepper', 'google'],
        strategy: 'hybrid_japan',
        confidence,
      };
    }

    if (configured.hotpepper) {
      return {
        country,
        provider: 'hotpepper',
        providerPlan: ['hotpepper'],
        strategy: 'hybrid_japan',
        confidence,
      };
    }

    if (configured.google) {
      return {
        country,
        provider: 'google',
        providerPlan: ['google'],
        strategy: 'google_global',
        confidence,
      };
    }
  }

  if (configured.google) {
    return {
      country,
      provider: 'google',
      providerPlan: ['google'],
      strategy: 'google_global',
      confidence,
    };
  }

  throw new ApiRouteError({
    status: 503,
    code: 'provider_unavailable',
    message: 'No provider is configured for this region',
  });
}

function buildFallbackResolution(country: string): GeoResolution {
  const base = buildCountryResolution(country, country === 'UNKNOWN' ? 'low' : 'medium');
  return { ...base, strategy: 'fallback_heuristic' };
}

async function lookupCountryFromAmap(lat: number, lng: number): Promise<string | null> {
  const key = process.env.AMAP_SERVER_KEY;
  if (!key) return null;

  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${lng},${lat}&extensions=base`,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as AmapReverseGeocodeResponse;
    return data.status === '1' && data.regeocode?.addressComponent?.country === '中国'
      ? 'CN'
      : null;
  } catch {
    return null;
  }
}

async function lookupCountryFromGoogle(
  lat: number,
  lng: number,
  locale: AppLocale,
): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('result_type', 'country');
    url.searchParams.set('language', GOOGLE_LANGUAGE_CODE[locale]);
    url.searchParams.set('key', key);

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GoogleGeocodeResponse;
    const country = data.results?.[0]?.address_components?.find((component) =>
      component.types?.includes('country'),
    )?.short_name;

    return country ?? null;
  } catch {
    return null;
  }
}

function isWithinChinaBounds(lat: number, lng: number): boolean {
  return lng >= 73 && lng <= 135 && lat >= 3 && lat <= 54;
}

function isWithinJapanBounds(lat: number, lng: number): boolean {
  return lng >= 122 && lng <= 154 && lat >= 20 && lat <= 46;
}
