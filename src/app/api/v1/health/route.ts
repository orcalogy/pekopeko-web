import { API_VERSION } from '@/lib/api/capabilities';
import { createRequestId, jsonResponse } from '@/lib/api/http';

export function GET() {
  const requestId = createRequestId();

  return jsonResponse(
    {
      status: 'ok',
      time: new Date().toISOString(),
      version: API_VERSION,
    },
    {
      requestId,
      cacheControl: 'no-store',
    },
  );
}
