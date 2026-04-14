import type { Restaurant, SearchOptions } from '@/types/restaurant';

const GOOGLE_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const GOOGLE_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACE_URL = 'https://places.googleapis.com/v1/places';

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  priceLevel?: string;
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  photos?: { name: string }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  primaryTypeDisplayName?: { text: string };
  websiteUri?: string;
  googleMapsUri?: string;
}

interface GoogleResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.priceLevel',
  'places.currentOpeningHours',
  'places.regularOpeningHours',
  'places.photos',
  'places.nationalPhoneNumber',
  'places.primaryTypeDisplayName',
  'places.websiteUri',
].join(',');

const TEXT_FIELD_MASK = `${FIELD_MASK},nextPageToken`;
const PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'priceLevel',
  'currentOpeningHours',
  'regularOpeningHours',
  'photos',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'primaryTypeDisplayName',
  'websiteUri',
  'googleMapsUri',
].join(',');

export async function searchGoogleNearby(
  options: SearchOptions,
  apiKey: string,
  languageCode = 'en',
): Promise<Restaurant[]> {
  const circle = {
    center: { latitude: options.lat, longitude: options.lng },
    radius: options.radius,
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
  };

  if (options.keyword) {
    // Use searchText for keyword queries — supports pagination
    return searchTextWithPagination(
      {
        textQuery: `${options.keyword} restaurant`,
        locationBias: { circle },
        maxResultCount: 20,
        languageCode,
      },
      headers,
      options,
    );
  }

  // Generic search: searchNearby (20 max) + supplementary searchText (20 more)
  const nearbyBody = {
    includedTypes: ['restaurant', 'meal_takeaway', 'cafe', 'bakery', 'bar'],
    locationRestriction: { circle },
    maxResultCount: 20,
    languageCode,
  };

  const textBody = {
    textQuery: 'restaurant',
    locationBias: { circle },
    maxResultCount: 20,
    languageCode,
  };

  const [nearbyRes, textRes] = await Promise.all([
    fetch(GOOGLE_NEARBY_URL, {
      method: 'POST',
      headers: { ...headers, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify(nearbyBody),
    }),
    fetch(GOOGLE_TEXT_URL, {
      method: 'POST',
      headers: { ...headers, 'X-Goog-FieldMask': TEXT_FIELD_MASK },
      body: JSON.stringify(textBody),
    }),
  ]);

  if (!nearbyRes.ok) {
    throw new Error(`Google nearby search failed with status ${nearbyRes.status}`);
  }

  if (!textRes.ok) {
    throw new Error(`Google text search failed with status ${textRes.status}`);
  }

  const [nearbyData, textData]: GoogleResponse[] = await Promise.all([
    nearbyRes.json(),
    textRes.json(),
  ]);

  const nearbyPlaces = mapPlaces(nearbyData.places ?? [], options);
  const textPlaces = mapPlaces(textData.places ?? [], options);

  // Deduplicate: keep nearby results, add unique text results
  const seenIds = new Set(nearbyPlaces.map((r) => r.id));
  const unique = textPlaces.filter((r) => !seenIds.has(r.id));

  return [...nearbyPlaces, ...unique];
}

/**
 * searchText with one pagination request for up to 40 results.
 */
async function searchTextWithPagination(
  body: Record<string, unknown>,
  headers: Record<string, string>,
  options: SearchOptions,
): Promise<Restaurant[]> {
  const res = await fetch(GOOGLE_TEXT_URL, {
    method: 'POST',
    headers: { ...headers, 'X-Goog-FieldMask': TEXT_FIELD_MASK },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Google text search failed with status ${res.status}`);
  }

  const data: GoogleResponse = await res.json();
  let places = mapPlaces(data.places ?? [], options);

  // Fetch second page if available
  if (data.nextPageToken) {
    const page2Res = await fetch(GOOGLE_TEXT_URL, {
      method: 'POST',
      headers: { ...headers, 'X-Goog-FieldMask': TEXT_FIELD_MASK },
      body: JSON.stringify({ ...body, pageToken: data.nextPageToken }),
    });

    if (!page2Res.ok) {
      throw new Error(`Google text pagination failed with status ${page2Res.status}`);
    }

    const page2Data: GoogleResponse = await page2Res.json();
    places = [...places, ...mapPlaces(page2Data.places ?? [], options)];
  }

  return places;
}

export async function getGooglePlaceDetails(
  placeId: string,
  apiKey: string,
  languageCode = 'en',
): Promise<Restaurant> {
  const response = await fetch(`${GOOGLE_PLACE_URL}/${encodeURIComponent(placeId)}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
      'Accept-Language': languageCode,
    },
  });

  if (!response.ok) {
    throw new Error(`Google place details failed with status ${response.status}`);
  }

  const place = (await response.json()) as GooglePlace;
  return mapPlace(place);
}

function mapPlaces(places: GooglePlace[], options: SearchOptions): Restaurant[] {
  return places.map((place) => mapPlace(place, { lat: options.lat, lng: options.lng }));
}

function mapPlace(place: GooglePlace, origin?: { lat: number; lng: number }): Restaurant {
  const lat = place.location?.latitude ?? 0;
  const lng = place.location?.longitude ?? 0;
  const distance = origin ? calculateDistance(origin.lat, origin.lng, lat, lng) : 0;
  const hours = place.currentOpeningHours ?? place.regularOpeningHours;
  const name = place.displayName?.text ?? '';
  const placeId = place.id ?? '';
  const photoRef = place.photos?.[0]?.name;

  return {
    id: placeId,
    name,
    address: place.formattedAddress ?? '',
    lat,
    lng,
    distance: Math.round(distance),
    rating: place.rating,
    priceLevel: place.priceLevel ? PRICE_MAP[place.priceLevel] : undefined,
    isOpenNow: hours?.openNow,
    openingHours: hours?.weekdayDescriptions,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
    cuisineType: place.primaryTypeDisplayName?.text,
    photoUrl: photoRef
      ? `/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxWidth=800`
      : undefined,
    photoRef,
    placeUrl:
      place.googleMapsUri ||
      (placeId
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}&destination_place_id=${placeId}`
        : undefined),
    websiteUrl: place.websiteUri,
    menuUrl: place.websiteUri,
    source: 'google',
    providerRefs: placeId ? [{ provider: 'google', providerId: placeId }] : undefined,
  } satisfies Restaurant;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
