import type { NextRequest } from 'next/server';
import { GEO_CACHE_CONTROL } from '@/lib/api/capabilities';
import { resolveGeoPlan, resolveRequestLocale } from '@/lib/api/geo';
import { createRequestId, jsonResponse, legacyErrorResponse } from '@/lib/api/http';
import type { MapProviderType } from '@/types/restaurant';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const latParam = request.nextUrl.searchParams.get('lat');
    const lngParam = request.nextUrl.searchParams.get('lng');

    if (latParam === null || lngParam === null) {
      return jsonResponse(
        { error: 'lat and lng are required' },
        { status: 400, requestId, cacheControl: 'no-store' },
      );
    }

    const locale = resolveRequestLocale(
      request.nextUrl.searchParams.get('locale'),
      request.headers.get('accept-language'),
    );
    const resolution = await resolveGeoPlan({
      lat: Number(latParam),
      lng: Number(lngParam),
      locale,
    });
    const provider = resolution.provider as MapProviderType;

    return jsonResponse(
      { country: resolution.country, provider },
      { requestId, cacheControl: GEO_CACHE_CONTROL },
    );
  } catch (error) {
    return legacyErrorResponse(error, requestId);
  }
}
