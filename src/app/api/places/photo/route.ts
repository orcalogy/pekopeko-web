import type { NextRequest } from 'next/server';
import { ApiRouteError, createRequestId, imageResponse, legacyErrorResponse } from '@/lib/api/http';
import { fetchGooglePhotoMedia, getPhotoCacheControl, normalizePhotoWidth } from '@/lib/api/photo';

/**
 * Proxy for Google Places photo media.
 * GET /api/places/photo?ref=places/xxx/photos/yyy&maxWidth=400
 *
 * Fetches the photo from Google using the server key, follows the redirect,
 * and streams the image back to the client.
 */
export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const ref = request.nextUrl.searchParams.get('ref');
  const maxWidth = normalizePhotoWidth(request.nextUrl.searchParams.get('maxWidth'));

  if (!ref) {
    return legacyErrorResponse(
      new ApiRouteError({
        status: 400,
        code: 'invalid_argument',
        message: 'ref is required',
      }),
      requestId,
    );
  }

  try {
    const response = await fetchGooglePhotoMedia(ref, maxWidth);
    return imageResponse(response.body, {
      requestId,
      cacheControl: getPhotoCacheControl(),
      contentType: response.headers.get('content-type') || 'image/jpeg',
    });
  } catch (error) {
    return legacyErrorResponse(error, requestId);
  }
}
