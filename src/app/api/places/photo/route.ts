import { type NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Google Places photo media.
 * GET /api/places/photo?ref=places/xxx/photos/yyy&maxWidth=400
 *
 * Fetches the photo from Google using the server key, follows the redirect,
 * and streams the image back to the client.
 */
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const maxWidth = request.nextUrl.searchParams.get('maxWidth') || '400';

  if (!ref) {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxWidth}&key=${key}`;
    const res = await fetch(url, { redirect: 'follow' });

    if (!res.ok) {
      return NextResponse.json({ error: 'Photo fetch failed' }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const body = res.body;

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Photo fetch failed' }, { status: 500 });
  }
}
