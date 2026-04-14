import type { Restaurant, SearchOptions } from '@/types/restaurant';

const HOTPEPPER_BASE = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/';

interface HotpepperPhoto {
  pc: { l: string; m: string; s: string };
  mobile: { l: string; s: string };
}

interface HotpepperShop {
  id: string;
  name: string;
  name_kana: string;
  address: string;
  lat: number;
  lng: number;
  catch: string;
  capacity: number;
  access: string;
  mobile_access: string;
  open: string;
  close: string;
  genre: { code: string; name: string; catch: string };
  sub_genre?: { code: string; name: string };
  budget?: { code: string; name: string; average: string };
  budget_memo?: string;
  urls: { pc: string };
  photo: HotpepperPhoto;
  logo_image: string;
  coupon_urls?: { pc: string; sp: string };
  course: string;
  free_drink: string;
  free_food: string;
  wifi: string;
  private_room: string;
  card: string;
  non_smoking: string;
  lunch: string;
  english: string;
  parking: string;
  barrier_free: string;
  pet: string;
  child: string;
}

interface HotpepperResponse {
  results: {
    api_version: string;
    results_available: number;
    results_returned: string;
    results_start: number;
    shop: HotpepperShop[];
    error?: { message: string; code: number }[];
  };
}

/**
 * Map a radius in meters to HotPepper's discrete range codes.
 * 1=300m, 2=500m, 3=1000m, 4=2000m, 5=3000m
 */
function toRange(radiusMeters: number): number {
  if (radiusMeters <= 300) return 1;
  if (radiusMeters <= 500) return 2;
  if (radiusMeters <= 1000) return 3;
  if (radiusMeters <= 2000) return 4;
  return 5;
}

/**
 * Parse budget name text (e.g. "2001～3000円") into a 1-4 price level.
 */
function parsePriceLevel(budget?: { name: string; average: string }): number | undefined {
  if (!budget) return undefined;
  // Try to extract a representative yen amount from the name or average
  const text = budget.average || budget.name;
  const match = text.match(/(\d[\d,]*)/);
  if (!match) return undefined;
  const yen = Number(match[1].replace(/,/g, ''));
  if (yen <= 2000) return 1;
  if (yen <= 4000) return 2;
  if (yen <= 8000) return 3;
  return 4;
}

/**
 * Best-effort check if the restaurant is closed today based on the `close` text.
 * Returns false if today is a closed day, undefined otherwise (unknown).
 */
function detectClosedToday(closeText: string): boolean | undefined {
  if (!closeText || closeText === 'なし') return undefined;
  const jpDays = ['日', '月', '火', '水', '木', '金', '土'];
  const today = new Date().getDay(); // 0=Sun
  const todayStr = jpDays[today];
  // Check patterns like "日曜日", "月曜", or bare day character in context
  if (closeText.includes(`${todayStr}曜`)) return false;
  return undefined;
}

/**
 * Extract notable feature codes from HotPepper shop data.
 * Only positive features are included.
 */
function extractFeatures(shop: HotpepperShop): string[] | undefined {
  const features: string[] = [];
  if (shop.course === 'あり') features.push('course');
  if (shop.free_drink === 'あり') features.push('free_drink');
  if (shop.free_food === 'あり') features.push('free_food');
  if (shop.wifi === 'あり') features.push('wifi');
  if (shop.lunch === 'あり') features.push('lunch');
  if (shop.private_room === 'あり') features.push('private_room');
  if (shop.english === 'あり') features.push('english');
  if (shop.non_smoking === '全面禁煙') features.push('non_smoking');
  if (shop.card === '利用可') features.push('card');
  if (shop.parking === 'あり') features.push('parking');
  if (shop.barrier_free === 'あり') features.push('barrier_free');
  return features.length > 0 ? features : undefined;
}

export async function searchHotpepperNearby(
  options: SearchOptions,
  apiKey: string,
): Promise<Restaurant[]> {
  const params = new URLSearchParams({
    key: apiKey,
    lat: String(options.lat),
    lng: String(options.lng),
    range: String(toRange(options.radius)),
    count: '100',
    order: '4', // recommendation order
    format: 'json',
  });

  if (options.keyword) {
    params.set('keyword', options.keyword);
  }

  const res = await fetch(`${HOTPEPPER_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`HotPepper search failed with status ${res.status}`);
  }

  const data: HotpepperResponse = await res.json();

  if (data.results?.error?.length) {
    throw new Error(data.results.error[0]?.message || 'HotPepper search failed');
  }

  if (!data.results?.shop) return [];

  return data.results.shop.map((shop) => mapShop(shop, { lat: options.lat, lng: options.lng }));
}

export async function getHotpepperDetails(shopId: string, apiKey: string): Promise<Restaurant> {
  const params = new URLSearchParams({
    key: apiKey,
    id: shopId,
    count: '1',
    format: 'json',
  });

  const res = await fetch(`${HOTPEPPER_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`HotPepper details failed with status ${res.status}`);
  }

  const data: HotpepperResponse = await res.json();

  if (data.results?.error?.length) {
    throw new Error(data.results.error[0]?.message || 'HotPepper details failed');
  }

  const shop = data.results?.shop?.[0];
  if (!shop) {
    throw new Error('HotPepper details not found');
  }

  return mapShop(shop);
}

function mapShop(shop: HotpepperShop, origin?: { lat: number; lng: number }): Restaurant {
  const shopLat = Number(shop.lat);
  const shopLng = Number(shop.lng);
  const distance = origin ? calculateDistance(origin.lat, origin.lng, shopLat, shopLng) : 0;

  const isOpenNow = detectClosedToday(shop.close);

  // Build opening hours lines
  const openingHours: string[] = [];
  if (shop.open) openingHours.push(shop.open);
  if (shop.close && shop.close !== 'なし') openingHours.push(`定休日: ${shop.close}`);

  // Coupon URL — prefer mobile (SP) version
  const couponUrl = shop.coupon_urls?.sp || shop.coupon_urls?.pc || undefined;

  return {
    id: shop.id,
    name: shop.name,
    address: shop.address,
    lat: shopLat,
    lng: shopLng,
    distance: Math.round(distance),
    rating: undefined, // HotPepper doesn't provide ratings
    priceLevel: parsePriceLevel(shop.budget),
    isOpenNow,
    openingHours: openingHours.length > 0 ? openingHours : undefined,
    cuisineType: shop.genre?.name,
    photoUrl: shop.photo?.pc?.l || shop.photo?.mobile?.l || undefined,
    phone: undefined, // Not in standard response
    placeUrl: `https://www.google.com/maps/dir/?api=1&destination=${shopLat},${shopLng}`,
    detailUrl: shop.urls?.pc || undefined,
    couponUrl: couponUrl || undefined,
    accessInfo: shop.access || shop.mobile_access || undefined,
    budgetText: shop.budget?.average || shop.budget?.name || undefined,
    capacity: shop.capacity > 0 ? shop.capacity : undefined,
    features: extractFeatures(shop),
    menuUrl: shop.urls?.pc ? `${shop.urls.pc.replace(/\/$/, '')}/food/` : undefined,
    source: 'hotpepper',
    providerRefs: shop.id ? [{ provider: 'hotpepper', providerId: shop.id }] : undefined,
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
