import type { RestaurantSearchInput, RestaurantSearchResult } from '../../types.ts';

interface RouteResponseOptions {
  requestId: string;
  cacheControl: string;
  status?: number;
  vary?: string[];
}

interface RestaurantsSearchRouteDependencies {
  createRequestId: () => string;
  readJsonBody: (request: Request) => Promise<unknown>;
  parseRestaurantSearchRequest: (body: unknown) => RestaurantSearchInput;
  searchRestaurants: (params: {
    input: RestaurantSearchInput;
    acceptLanguage: string | null;
  }) => Promise<RestaurantSearchResult>;
  serializeRestaurantSearchResponse: (result: RestaurantSearchResult, requestId: string) => unknown;
  jsonResponse: (body: unknown, options: RouteResponseOptions) => Response;
  errorResponse: (error: unknown, requestId: string) => Response;
}

export function createRestaurantsSearchPostHandler(
  dependencies: RestaurantsSearchRouteDependencies,
) {
  return async function POST(request: Request) {
    const requestId = dependencies.createRequestId();

    try {
      const body = dependencies.parseRestaurantSearchRequest(
        await dependencies.readJsonBody(request),
      );
      const result = await dependencies.searchRestaurants({
        input: body,
        acceptLanguage: request.headers.get('accept-language'),
      });

      return dependencies.jsonResponse(
        dependencies.serializeRestaurantSearchResponse(result, requestId),
        {
          requestId,
          cacheControl: 'no-store',
        },
      );
    } catch (error) {
      return dependencies.errorResponse(error, requestId);
    }
  };
}
