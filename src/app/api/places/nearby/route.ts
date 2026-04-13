import { type NextRequest, NextResponse } from 'next/server';
import { searchAmapNearby } from '@/lib/map/amap';
import { searchGoogleNearby } from '@/lib/map/google';
import { searchHotpepperNearby } from '@/lib/map/hotpepper';
import { mergeResults } from '@/lib/map/merge';
import type { MapProviderType } from '@/types/restaurant';

/** Map app locale to BCP-47 language codes used by map APIs */
const GOOGLE_LANG: Record<string, string> = {
  'zh-CN': 'zh-CN',
  ja: 'ja',
  en: 'en',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const provider = searchParams.get('provider') as MapProviderType;
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radius = Number(searchParams.get('radius') || '2000');
  const keyword = searchParams.get('keyword') || undefined;
  const openNow = searchParams.get('openNow') === 'true';
  const locale = searchParams.get('locale') || 'zh-CN';

  if (latParam === null || lngParam === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng must be valid numbers' }, { status: 400 });
  }

  const options = { lat, lng, radius, keyword, openNow };

  try {
    if (provider === 'amap') {
      const key = process.env.AMAP_SERVER_KEY;
      if (!key) {
        return NextResponse.json({ error: 'Amap API key not configured' }, { status: 500 });
      }
      const results = await searchAmapNearby(options, key);
      return NextResponse.json(results);
    }

    if (provider === 'hotpepper') {
      const hpKey = process.env.HOTPEPPER_API_KEY;
      const googleKey = process.env.GOOGLE_MAPS_SERVER_KEY;

      if (!hpKey && !googleKey) {
        return NextResponse.json({ error: 'No API keys configured for Japan' }, { status: 500 });
      }

      // Query both providers in parallel, merge results
      const lang = GOOGLE_LANG[locale] || 'ja';
      const [hpResults, googleResults] = await Promise.all([
        hpKey ? searchHotpepperNearby(options, hpKey) : Promise.resolve([]),
        googleKey ? searchGoogleNearby(options, googleKey, lang) : Promise.resolve([]),
      ]);

      console.log(`[places] hotpepper: ${hpResults.length}, google: ${googleResults.length}`);

      const results =
        hpResults.length > 0 && googleResults.length > 0
          ? mergeResults(googleResults, hpResults)
          : googleResults.length > 0
            ? googleResults
            : hpResults;

      console.log(`[places] merged: ${results.length}`);
      return NextResponse.json(results);
    }

    // Default to Google
    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }
    const lang = GOOGLE_LANG[locale] || 'en';
    const results = await searchGoogleNearby(options, key, lang);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Places search error:', error);
    return NextResponse.json({ error: 'Failed to search places' }, { status: 500 });
  }
}
