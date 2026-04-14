import { CAPABILITIES_CACHE_CONTROL, getCapabilities } from '@/lib/api/capabilities';
import { createRequestId, jsonResponse } from '@/lib/api/http';

export function GET() {
  const requestId = createRequestId();

  return jsonResponse(getCapabilities(), {
    requestId,
    cacheControl: CAPABILITIES_CACHE_CONTROL,
  });
}
