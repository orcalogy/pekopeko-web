import { createRequestId, errorResponse, jsonResponse, readJsonBody } from '@/lib/api/http';
import { parseRestaurantSearchRequest } from '@/lib/api/request-parsers';
import { searchRestaurants } from '@/lib/api/restaurants';
import { serializeRestaurantSearchResponse } from '@/lib/api/serializers';

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = parseRestaurantSearchRequest(await readJsonBody(request));
    const result = await searchRestaurants({
      input: body,
      acceptLanguage: request.headers.get('accept-language'),
    });

    return jsonResponse(serializeRestaurantSearchResponse(result, requestId), {
      requestId,
      cacheControl: 'no-store',
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
