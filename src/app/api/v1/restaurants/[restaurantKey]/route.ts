import { createRequestId, errorResponse, jsonResponse } from '@/lib/api/http';
import { getRestaurantDetails } from '@/lib/api/restaurants';
import { createRestaurantDetailsGetHandler } from '@/lib/api/routes/v1/restaurant-details';
import { serializeRestaurantDetailsResponse } from '@/lib/api/serializers';

export const GET = createRestaurantDetailsGetHandler({
  createRequestId,
  getRestaurantDetails,
  serializeRestaurantDetailsResponse,
  jsonResponse,
  errorResponse,
});
