import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRouteError, errorResponse } from './http.ts';

test('error responses expose Retry-After for rate-limited requests', async () => {
  const response = errorResponse(
    new ApiRouteError({
      status: 429,
      code: 'rate_limited',
      message: 'Try again later',
      retryAfterSeconds: 45,
    }),
    'req-rate-limit',
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '45');

  const payload = (await response.json()) as {
    error: { code: string; message: string; requestId: string };
  };
  assert.deepEqual(payload.error, {
    code: 'rate_limited',
    message: 'Try again later',
    requestId: 'req-rate-limit',
  });
});
