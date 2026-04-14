import type { NextRequest } from 'next/server';
import { createRequestId, jsonResponse, legacyErrorResponse } from '@/lib/api/http';
import { searchRestaurants, toCompatibilityRestaurant } from '@/lib/api/restaurants';
import type { RestaurantSearchRequest } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const { searchParams } = request.nextUrl;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (latParam === null || lngParam === null) {
      return jsonResponse(
        { error: 'lat and lng are required' },
        { status: 400, requestId, cacheControl: 'no-store' },
      );
    }

    const input: RestaurantSearchRequest = {
      locale: searchParams.get('locale') ?? undefined,
      provider: (searchParams.get('provider') as RestaurantSearchRequest['provider']) ?? 'auto',
      location: {
        lat: Number(latParam),
        lng: Number(lngParam),
      },
      radius_m: Number(searchParams.get('radius') || '2000'),
      query: {
        keyword: searchParams.get('keyword') ?? undefined,
      },
      filters: {
        open_now: searchParams.get('openNow') === 'true',
      },
      sort: {
        by: 'distance',
        direction: 'asc',
      },
    };

    const result = await searchRestaurants({
      input,
      acceptLanguage: request.headers.get('accept-language'),
    });

    return jsonResponse(result.results.map(toCompatibilityRestaurant), {
      requestId,
      cacheControl: 'no-store',
    });
  } catch (error) {
    return legacyErrorResponse(error, requestId);
  }
}
