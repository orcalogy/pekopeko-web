import { DETAILS_CACHE_CONTROL } from '@/lib/api/capabilities';
import { createRequestId, errorResponse, jsonResponse } from '@/lib/api/http';
import { getRestaurantDetails } from '@/lib/api/restaurants';
import { serializeRestaurantDetailsResponse } from '@/lib/api/serializers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantKey: string }> },
) {
  const requestId = createRequestId();

  try {
    const { restaurantKey } = await params;
    const restaurant = await getRestaurantDetails({
      restaurantKey,
      locale: new URL(request.url).searchParams.get('locale'),
      acceptLanguage: request.headers.get('accept-language'),
    });

    return jsonResponse(serializeRestaurantDetailsResponse(restaurant, requestId), {
      requestId,
      cacheControl: restaurant.cacheControl ?? DETAILS_CACHE_CONTROL,
      vary: ['Accept-Language'],
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
