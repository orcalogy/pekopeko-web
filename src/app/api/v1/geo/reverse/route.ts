import { GEO_CACHE_CONTROL } from '@/lib/api/capabilities';
import { resolveGeoPlan, resolveRequestLocale, serializeGeoResolution } from '@/lib/api/geo';
import { createRequestId, errorResponse, jsonResponse, readJsonBody } from '@/lib/api/http';

interface ReverseGeoRequest {
  lat?: number;
  lng?: number;
  locale?: string;
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  try {
    const body = await readJsonBody<ReverseGeoRequest>(request);
    const locale = resolveRequestLocale(body.locale, request.headers.get('accept-language'));
    const resolution = await resolveGeoPlan({
      lat: Number(body.lat),
      lng: Number(body.lng),
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
