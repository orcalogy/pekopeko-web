import { serializeGeoResolution } from '@/lib/api/geo';
import { createRequestId, errorResponse, jsonResponse, readJsonBody } from '@/lib/api/http';
import { searchRestaurants, serializeApiRestaurant } from '@/lib/api/restaurants';
import type { RestaurantSearchRequest } from '@/lib/api/types';

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = await readJsonBody<RestaurantSearchRequest>(request);
    const result = await searchRestaurants({
      input: body,
      acceptLanguage: request.headers.get('accept-language'),
    });

    return jsonResponse(
      {
        request_id: requestId,
        resolved: serializeGeoResolution(result.resolved),
        applied_filters: {
          open_now: result.appliedFilters.openNow,
          ...(result.appliedFilters.minRating != null
            ? { min_rating: result.appliedFilters.minRating }
            : {}),
          ...(result.appliedFilters.maxPriceLevel != null
            ? { max_price_level: result.appliedFilters.maxPriceLevel }
            : {}),
          ...(result.appliedFilters.partySize != null
            ? { party_size: result.appliedFilters.partySize }
            : {}),
          required_features: result.appliedFilters.requiredFeatures,
          sort_by: result.appliedFilters.sortBy,
          sort_direction: result.appliedFilters.sortDirection,
        },
        partial_results: result.partialResults,
        warnings: result.warnings,
        results: result.results.map(serializeApiRestaurant),
        pagination: {
          page_size: result.pagination.pageSize,
          next_page_token: result.pagination.nextPageToken,
          returned: result.pagination.returned,
        },
        provider_stats: result.providerStats.map((stats) => ({
          provider: stats.provider,
          raw_results: stats.rawResults,
          normalized_results: stats.normalizedResults,
        })),
      },
      {
        requestId,
        cacheControl: 'no-store',
      },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
