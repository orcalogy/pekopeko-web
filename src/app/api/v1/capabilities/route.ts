import { CAPABILITIES_CACHE_CONTROL } from '@/lib/api/capabilities';
import { createRequestId, jsonResponse } from '@/lib/api/http';
import { serializeCapabilitiesResponse } from '@/lib/api/serializers';

export function GET() {
  const requestId = createRequestId();

  return jsonResponse(serializeCapabilitiesResponse(), {
    requestId,
    cacheControl: CAPABILITIES_CACHE_CONTROL,
  });
}
