import { ApiRouteError, createRequestId, errorResponse, imageResponse } from '@/lib/api/http';
import {
  fetchExternalPhotoMedia,
  fetchGooglePhotoMedia,
  getPhotoCacheControl,
  normalizePhotoWidth,
} from '@/lib/api/photo';
import { parseRestaurantKey } from '@/lib/api/restaurant-key';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantKey: string }> },
) {
  const requestId = createRequestId();

  try {
    const { restaurantKey } = await params;
    const payload = parseRestaurantKey(restaurantKey);

    if (!payload?.photo) {
      throw new ApiRouteError({
        status: 404,
        code: 'not_found',
        message: 'Photo not found',
      });
    }

    const url = new URL(request.url);
    const maxWidth = normalizePhotoWidth(url.searchParams.get('max_width'));
    const upstreamResponse = payload.photo.ref
      ? await fetchGooglePhotoMedia(payload.photo.ref, maxWidth)
      : payload.photo.url
        ? await fetchExternalPhotoMedia(payload.photo.url)
        : null;

    if (!upstreamResponse) {
      throw new ApiRouteError({
        status: 404,
        code: 'not_found',
        message: 'Photo not found',
      });
    }

    return imageResponse(upstreamResponse.body, {
      requestId,
      cacheControl: getPhotoCacheControl(),
      contentType: upstreamResponse.headers.get('content-type') || 'image/jpeg',
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
