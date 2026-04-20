import type { Restaurant } from '@/types/restaurant';
import { selectBestRestaurantMatch } from '../restaurant-matching.ts';

/**
 * Merge restaurants from Google Places and HotPepper, combining complementary data.
 *
 * Strategy:
 * - Match restaurants across providers conservatively: names must also line up,
 *   because coordinate-only matching is too aggressive in dense restaurant areas.
 * - For matched pairs, keep Google as base (rating, realtime open status, phone, photos)
 *   and enrich with HotPepper data (coupons, detail page, access info, budget, features).
 * - Unmatched restaurants from both providers are included as-is.
 * - Final list is deduplicated and sorted by distance.
 */
export function mergeResults(google: Restaurant[], hotpepper: Restaurant[]): Restaurant[] {
  const merged: Restaurant[] = [];
  const matchedHpIds = new Set<string>();

  for (const g of google) {
    const hpMatch = findBestMatch(g, hotpepper, matchedHpIds);

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
        providerRefs: dedupeProviderRefs([
          ...(g.providerRefs ?? []),
          ...(hpMatch.providerRefs ?? []),
        ]),
        // Prefer Google's data, fall back to HotPepper
        photoUrl: g.photoUrl || hpMatch.photoUrl,
        photoRef: g.photoRef,
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
 * Find the strongest HotPepper match for a Google result.
 * Skips already-matched HotPepper entries and delegates acceptance to the shared matcher.
 */
function findBestMatch(
  target: Restaurant,
  candidates: Restaurant[],
  excluded: Set<string>,
): Restaurant | undefined {
  const bestMatch = selectBestRestaurantMatch(
    {
      name: target.name,
      address: target.address,
      lat: target.lat,
      lng: target.lng,
    },
    candidates
      .filter((candidate) => !excluded.has(candidate.id))
      .map((candidate) => ({
        value: candidate,
        name: candidate.name,
        address: candidate.address,
        lat: candidate.lat,
        lng: candidate.lng,
      })),
  );

  return bestMatch?.value;
}

function dedupeProviderRefs(providerRefs: NonNullable<Restaurant['providerRefs']>) {
  const seen = new Set<string>();

  return providerRefs.filter((ref) => {
    const key = `${ref.provider}:${ref.providerId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
