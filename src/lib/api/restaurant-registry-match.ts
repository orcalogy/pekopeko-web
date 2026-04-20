import {
  type RestaurantMatchCandidate,
  selectBestRestaurantMatch,
} from '../restaurant-matching.ts';

export interface RegistryMatchObservation {
  canonicalName: string;
  canonicalAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface RegistryMatchCandidate<T> extends RegistryMatchObservation {
  value: T;
}

export interface RegistryWebsiteCandidate<T> {
  value: T;
  websiteUrl?: string | null;
}

export function selectRestaurantRegistryCandidate<T>(params: {
  observation: RegistryMatchObservation;
  phoneMatch?: T | null;
  websiteMatch?: T | null;
  candidates: RegistryMatchCandidate<T>[];
}): T | null {
  if (params.phoneMatch) {
    return params.phoneMatch;
  }

  if (params.websiteMatch) {
    return params.websiteMatch;
  }

  if (
    params.observation.canonicalName.trim().length === 0 ||
    !Number.isFinite(params.observation.lat) ||
    !Number.isFinite(params.observation.lng)
  ) {
    return null;
  }

  const bestMatch = selectBestRestaurantMatch(
    {
      name: params.observation.canonicalName,
      address: params.observation.canonicalAddress,
      lat: params.observation.lat,
      lng: params.observation.lng,
    },
    params.candidates.map(
      (candidate): RestaurantMatchCandidate<T> => ({
        value: candidate.value,
        name: candidate.canonicalName,
        address: candidate.canonicalAddress,
        lat: candidate.lat,
        lng: candidate.lng,
      }),
    ),
  );

  return bestMatch?.value ?? null;
}

export function selectExactWebsiteMatch<T>(params: {
  normalizedWebsiteIdentity?: string | null;
  candidates: RegistryWebsiteCandidate<T>[];
}): T | null {
  if (!params.normalizedWebsiteIdentity) {
    return null;
  }

  for (const candidate of params.candidates) {
    if (normalizeWebsiteIdentity(candidate.websiteUrl) === params.normalizedWebsiteIdentity) {
      return candidate.value;
    }
  }

  return null;
}

export function normalizeWebsiteIdentity(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.trim().toLowerCase();
    const normalizedHost = host.startsWith('www.') ? host.slice(4) : host;
    const normalizedPath = normalizeWebsitePath(url.pathname);
    const normalizedSearch = normalizeWebsiteSearch(url);

    return `${normalizedHost}${normalizedPath}${normalizedSearch}`;
  } catch {
    return undefined;
  }
}

function normalizeWebsitePath(pathname: string): string {
  const collapsed = pathname.replace(/\/+/g, '/');
  const trimmed =
    collapsed.endsWith('/') && collapsed.length > 1 ? collapsed.slice(0, -1) : collapsed;
  return trimmed || '/';
}

function normalizeWebsiteSearch(url: URL): string {
  const entries = [...url.searchParams.entries()]
    .filter(([key]) => !isTrackingSearchParam(key))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });

  if (entries.length === 0) {
    return '';
  }

  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

function isTrackingSearchParam(key: string): boolean {
  return key.startsWith('utm_') || key === 'gclid' || key === 'fbclid';
}
