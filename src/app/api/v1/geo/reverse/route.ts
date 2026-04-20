import { GEO_CACHE_CONTROL } from '@/lib/api/capabilities';
import { resolveGeoPlan, resolveRequestLocale } from '@/lib/api/geo';
import { createRequestId, errorResponse, jsonResponse, readJsonBody } from '@/lib/api/http';
import { parseReverseGeoRequest } from '@/lib/api/request-parsers';
import { serializeGeoResolution } from '@/lib/api/serializers';

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = parseReverseGeoRequest(await readJsonBody(request));
    const locale = resolveRequestLocale(body.locale, request.headers.get('accept-language'));
    const resolution = await resolveGeoPlan({
      lat: body.lat,
      lng: body.lng,
      locale,
    });

    return jsonResponse(serializeGeoResolution(resolution), {
      requestId,
      cacheControl: GEO_CACHE_CONTROL,
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
