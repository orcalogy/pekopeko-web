import { type NextRequest, NextResponse } from 'next/server';
import type { MapProviderType } from '@/types/restaurant';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  if (latParam === null || lngParam === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng must be valid numbers' }, { status: 400 });
  }

  try {
    // Quick heuristic: if longitude is between 73-135 and latitude 3-54, likely China
    const likelyChina = lng >= 73 && lng <= 135 && lat >= 3 && lat <= 54;

    if (likelyChina) {
      // Verify with Amap reverse geocode
      const amapKey = process.env.AMAP_SERVER_KEY;
      if (amapKey) {
        const res = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${lng},${lat}&extensions=base`,
        );
        const data = await res.json();
        if (data.status === '1' && data.regeocode?.addressComponent?.country === '中国') {
          return NextResponse.json({ country: 'CN', provider: 'amap' as MapProviderType });
        }
      }
    }

    // Try Google reverse geocode for non-China regions
    const googleKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (googleKey) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}&result_type=country`,
      );
      const data = await res.json();
      const country = data.results?.[0]?.address_components?.find((c: { types: string[] }) =>
        c.types.includes('country'),
      )?.short_name;

      let provider: MapProviderType = 'google';
      if (country === 'CN') provider = 'amap';
      else if (country === 'JP') provider = 'hotpepper';
      return NextResponse.json({ country: country || 'UNKNOWN', provider });
    }

    // Fallback: use coordinate heuristic
    const provider: MapProviderType = likelyChina ? 'amap' : 'google';
    return NextResponse.json({ country: likelyChina ? 'CN' : 'UNKNOWN', provider });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return NextResponse.json({ country: 'UNKNOWN', provider: 'google' as MapProviderType });
  }
}
