import { DETAILS_CACHE_CONTROL } from '../../capabilities.ts';
import type { RestaurantDetailsResult } from '../../types.ts';

interface RouteResponseOptions {
  requestId: string;
  cacheControl: string;
  status?: number;
  vary?: string[];
}

interface RestaurantDetailsRouteDependencies {
  createRequestId: () => string;
  getRestaurantDetails: (params: {
    restaurantKey: string;
    locale: string | null;
    acceptLanguage: string | null;
  }) => Promise<RestaurantDetailsResult>;
  serializeRestaurantDetailsResponse: (
    result: RestaurantDetailsResult,
    requestId: string,
  ) => unknown;
  jsonResponse: (body: unknown, options: RouteResponseOptions) => Response;
  errorResponse: (error: unknown, requestId: string) => Response;
}

export function createRestaurantDetailsGetHandler(
  dependencies: RestaurantDetailsRouteDependencies,
) {
  return async function GET(
    request: Request,
    { params }: { params: Promise<{ restaurantKey: string }> },
  ) {
    const requestId = dependencies.createRequestId();

    try {
      const { restaurantKey } = await params;
      const restaurant = await dependencies.getRestaurantDetails({
        restaurantKey,
        locale: new URL(request.url).searchParams.get('locale'),
        acceptLanguage: request.headers.get('accept-language'),
      });

      return dependencies.jsonResponse(
        dependencies.serializeRestaurantDetailsResponse(restaurant, requestId),
        {
          requestId,
          cacheControl: restaurant.cacheControl ?? DETAILS_CACHE_CONTROL,
          vary: ['Accept-Language'],
        },
      );
    } catch (error) {
      return dependencies.errorResponse(error, requestId);
    }
  };
}
