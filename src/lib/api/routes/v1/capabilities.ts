import { CAPABILITIES_CACHE_CONTROL } from '../../capabilities.ts';

interface RouteResponseOptions {
  requestId: string;
  cacheControl: string;
  status?: number;
  vary?: string[];
}

interface CapabilitiesRouteDependencies {
  createRequestId: () => string;
  serializeCapabilitiesResponse: () => unknown;
  jsonResponse: (body: unknown, options: RouteResponseOptions) => Response;
}

export function createCapabilitiesGetHandler(dependencies: CapabilitiesRouteDependencies) {
  return function GET() {
    const requestId = dependencies.createRequestId();

    return dependencies.jsonResponse(dependencies.serializeCapabilitiesResponse(), {
      requestId,
      cacheControl: CAPABILITIES_CACHE_CONTROL,
    });
  };
}
