import { ApiRouteError, createRequestId, errorResponse, imageResponse } from '@/lib/api/http';
import {
  fetchExternalPhotoMedia,
  fetchGooglePhotoMedia,
  getPhotoCacheControl,
  normalizePhotoWidth,
} from '@/lib/api/photo';
import { getStoredRestaurantRecord } from '@/lib/api/restaurant-registry';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantKey: string }> },
) {
  const requestId = createRequestId();

  try {
    const { restaurantKey } = await params;
    const record = await getStoredRestaurantRecord(restaurantKey);

    if (!record?.photo) {
      throw new ApiRouteError({
        status: 404,
        code: 'not_found',
        message: 'Photo not found',
      });
    }

    const url = new URL(request.url);
    const maxWidth = normalizePhotoWidth(
      url.searchParams.get('maxWidth') ?? url.searchParams.get('max_width'),
    );
    const upstreamResponse = record.photo.ref
      ? await fetchGooglePhotoMedia(record.photo.ref, maxWidth)
      : record.photo.url
        ? await fetchExternalPhotoMedia(record.photo.url)
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
