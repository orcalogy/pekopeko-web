import { createRequestId, jsonResponse } from '@/lib/api/http';
import { createCapabilitiesGetHandler } from '@/lib/api/routes/v1/capabilities';
import { serializeCapabilitiesResponse } from '@/lib/api/serializers';

export const GET = createCapabilitiesGetHandler({
  createRequestId,
  serializeCapabilitiesResponse,
  jsonResponse,
});
