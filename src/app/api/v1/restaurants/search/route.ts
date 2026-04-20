import { createRequestId, errorResponse, jsonResponse, readJsonBody } from '@/lib/api/http';
import { parseRestaurantSearchRequest } from '@/lib/api/request-parsers';
import { searchRestaurants } from '@/lib/api/restaurants';
import { createRestaurantsSearchPostHandler } from '@/lib/api/routes/v1/restaurants-search';
import { serializeRestaurantSearchResponse } from '@/lib/api/serializers';

export const POST = createRestaurantsSearchPostHandler({
  createRequestId,
  readJsonBody,
  parseRestaurantSearchRequest,
  searchRestaurants,
  serializeRestaurantSearchResponse,
  jsonResponse,
  errorResponse,
});
