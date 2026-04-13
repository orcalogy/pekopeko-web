import type { MapProviderType, Restaurant, SearchOptions } from '@/types/restaurant';

export async function searchNearby(
  provider: MapProviderType,
  options: SearchOptions,
): Promise<Restaurant[]> {
  const params = new URLSearchParams({
    provider,
    lat: String(options.lat),
    lng: String(options.lng),
    radius: String(options.radius),
  });

  if (options.keyword) params.set('keyword', options.keyword);
  if (options.openNow) params.set('openNow', 'true');
  if (options.type) params.set('type', options.type);

  const res = await fetch(`/api/places/nearby?${params}`);
  if (!res.ok) throw new Error('Failed to search nearby restaurants');
  return res.json();
}

export async function detectRegion(
  lat: number,
  lng: number,
): Promise<{ country: string; provider: MapProviderType }> {
  const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error('Failed to detect region');
  return res.json();
}
