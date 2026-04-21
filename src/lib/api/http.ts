import { NextResponse } from 'next/server.js';

export type ApiErrorCode =
  | 'invalid_argument'
  | 'not_found'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'quota_exhausted'
  | 'upstream_error'
  | 'internal';

interface ApiRouteErrorOptions {
  status: number;
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

interface ResponseOptions {
  requestId: string;
  cacheControl: string;
  status?: number;
  vary?: string[];
  headers?: Record<string, string>;
}

export class ApiRouteError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;
  readonly retryAfterSeconds?: number;

  constructor({ status, code, message, details, retryAfterSeconds }: ApiRouteErrorOptions) {
    super(message);
    this.name = 'ApiRouteError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiRouteError({
      status: 400,
      code: 'invalid_argument',
      message: 'Request body must be valid JSON',
    });
  }
}

export function jsonResponse(body: unknown, options: ResponseOptions): NextResponse {
  const response = NextResponse.json(body, { status: options.status ?? 200 });
  applyResponseHeaders(response, options);
  return response;
}

export function imageResponse(
  body: BodyInit | null,
  options: ResponseOptions & { contentType: string },
): NextResponse {
  const response = new NextResponse(body, { status: options.status ?? 200 });
  response.headers.set('Content-Type', options.contentType);
  applyResponseHeaders(response, options);
  return response;
}

export function errorResponse(error: unknown, requestId: string): NextResponse {
  const handled =
    error instanceof ApiRouteError
      ? error
      : new ApiRouteError({
          status: 500,
          code: 'internal',
          message: 'Internal server error',
        });

  if (!(error instanceof ApiRouteError)) {
    console.error('Unhandled API error:', error);
  }

  return jsonResponse(
    {
      error: {
        code: handled.code,
        message: handled.message,
        requestId,
        ...(handled.details ? { details: handled.details } : {}),
      },
    },
    {
      status: handled.status,
      requestId,
      cacheControl: 'no-store',
      headers:
        handled.retryAfterSeconds == null
          ? undefined
          : { 'Retry-After': String(handled.retryAfterSeconds) },
    },
  );
}

export function legacyErrorResponse(error: unknown, requestId: string): NextResponse {
  const handled =
    error instanceof ApiRouteError
      ? error
      : new ApiRouteError({
          status: 500,
          code: 'internal',
          message: 'Internal server error',
        });

  if (!(error instanceof ApiRouteError)) {
    console.error('Unhandled legacy API error:', error);
  }

  return jsonResponse(
    { error: handled.message },
    {
      status: handled.status,
      requestId,
      cacheControl: 'no-store',
    },
  );
}

function applyResponseHeaders(response: NextResponse, options: ResponseOptions) {
  response.headers.set('X-Request-Id', options.requestId);
  response.headers.set('Cache-Control', options.cacheControl);

  if (options.vary && options.vary.length > 0) {
    response.headers.set('Vary', [...new Set(options.vary)].join(', '));
  }

  if (options.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      response.headers.set(name, value);
    }
  }
}
