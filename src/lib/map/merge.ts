import type { Restaurant } from '@/types/restaurant';

/**
 * Merge restaurants from Google Places and HotPepper, combining complementary data.
 *
 * Strategy:
 * - Match restaurants across providers by coordinate proximity (< 80m).
 * - For matched pairs, keep Google as base (rating, realtime open status, phone, photos)
 *   and enrich with HotPepper data (coupons, detail page, access info, budget, features).
 * - Unmatched restaurants from both providers are included as-is.
 * - Final list is deduplicated and sorted by distance.
 */
export function mergeResults(google: Restaurant[], hotpepper: Restaurant[]): Restaurant[] {
  const merged: Restaurant[] = [];
  const matchedHpIds = new Set<string>();

  for (const g of google) {
    const hpMatch = findClosestMatch(g, hotpepper, matchedHpIds);

    if (hpMatch) {
      matchedHpIds.add(hpMatch.id);
      merged.push({
        // Base: Google (has rating, real-time open, phone, better place URL)
        ...g,
        // Enrich with HotPepper data
        couponUrl: hpMatch.couponUrl,
        detailUrl: hpMatch.detailUrl,
        accessInfo: hpMatch.accessInfo,
        budgetText: hpMatch.budgetText,
        capacity: hpMatch.capacity,
        features: hpMatch.features,
        // Prefer Google's data, fall back to HotPepper
        photoUrl: g.photoUrl || hpMatch.photoUrl,
        openingHours: g.openingHours || hpMatch.openingHours,
        cuisineType: g.cuisineType || hpMatch.cuisineType,
        priceLevel: g.priceLevel ?? hpMatch.priceLevel,
        // Menu: prefer HotPepper's food page, keep Google's website as fallback
        menuUrl: hpMatch.menuUrl || g.menuUrl,
        websiteUrl: g.websiteUrl,
        source: 'hybrid',
      });
    } else {
      merged.push(g);
    }
  }

  // Add unmatched HotPepper restaurants
  for (const hp of hotpepper) {
    if (!matchedHpIds.has(hp.id)) {
      merged.push(hp);
    }
  }

  // Sort by distance
  merged.sort((a, b) => a.distance - b.distance);

  return merged;
}

/**
 * Find the closest HotPepper restaurant within 80m of a Google result.
 * Skips already-matched HotPepper entries.
 */
function findClosestMatch(
  target: Restaurant,
  candidates: Restaurant[],
  excluded: Set<string>,
): Restaurant | undefined {
  let best: Restaurant | undefined;
  let bestDist = 80; // max match distance in meters

  for (const c of candidates) {
    if (excluded.has(c.id)) continue;
    const d = haversine(target.lat, target.lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  return best;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
