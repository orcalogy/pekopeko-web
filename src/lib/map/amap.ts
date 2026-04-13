import type { Restaurant, SearchOptions } from '@/types/restaurant';

const AMAP_BASE = 'https://restapi.amap.com/v5/place/around';

interface AmapPOI {
  id: string;
  name: string;
  address: string;
  location: string;
  distance: string;
  type?: string;
  biz_ext?: {
    rating?: string;
    cost?: string;
    open_time?: string;
  };
  photos?: { url: string }[];
  tel?: string;
}

export async function searchAmapNearby(
  options: SearchOptions,
  apiKey: string,
): Promise<Restaurant[]> {
  const params = new URLSearchParams({
    key: apiKey,
    location: `${options.lng},${options.lat}`,
    radius: String(options.radius),
    types: '050000', // Catering POI category in Amap
    show_fields: 'business,photos',
    page_size: '25',
  });

  if (options.keyword) params.set('keywords', options.keyword);

  const res = await fetch(`${AMAP_BASE}?${params}`);
  const data = await res.json();

  if (data.status !== '1' || !data.pois) return [];

  return data.pois.map((poi: AmapPOI) => {
    const [lng, lat] = poi.location.split(',').map(Number);
    return {
      id: poi.id,
      name: poi.name,
      address: poi.address,
      lat,
      lng,
      distance: Number(poi.distance),
      rating: poi.biz_ext?.rating ? Number(poi.biz_ext.rating) : undefined,
      priceLevel: poi.biz_ext?.cost ? Math.ceil(Number(poi.biz_ext.cost) / 30) : undefined,
      isOpenNow: undefined, // Amap doesn't reliably provide this
      openingHours: poi.biz_ext?.open_time ? [poi.biz_ext.open_time] : undefined,
      photoUrl: poi.photos?.[0]?.url,
      phone: poi.tel,
      cuisineType: poi.type?.split(';').pop(),
      placeUrl: `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(poi.name)}&callnative=1`,
      source: 'amap',
    } satisfies Restaurant;
  });
}
