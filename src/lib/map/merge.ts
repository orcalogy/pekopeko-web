import type { Restaurant } from '@/types/restaurant';

const EXACT_NAME_DISTANCE_M = 80;
const CONTAINED_NAME_DISTANCE_M = 35;
const FUZZY_NAME_DISTANCE_M = 20;
const STRONG_FUZZY_NAME_SIMILARITY = 0.88;
const CLOSE_FUZZY_NAME_SIMILARITY = 0.8;

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
 * Skips already-matched HotPepper entries and requires a strong enough name match.
 */
function findBestMatch(
  target: Restaurant,
  candidates: Restaurant[],
  excluded: Set<string>,
): Restaurant | undefined {
  let best: Restaurant | undefined;
  let bestScore = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const c of candidates) {
    if (excluded.has(c.id)) continue;

    const d = haversine(target.lat, target.lng, c.lat, c.lng);

    const score = scorePotentialMatch(target, c, d);
    if (score <= 0) continue;

    if (score > bestScore || (score === bestScore && d < bestDistance)) {
      bestScore = score;
      bestDistance = d;
      best = c;
    }
  }

  return best;
}

function scorePotentialMatch(google: Restaurant, hotpepper: Restaurant, distanceM: number): number {
  if (hasAddressConflict(google.address, hotpepper.address)) {
    return 0;
  }

  const googleName = normalizeNameForComparison(google.name);
  const hotpepperName = normalizeNameForComparison(hotpepper.name);

  if (!googleName || !hotpepperName) {
    return 0;
  }

  if (googleName === hotpepperName) {
    return distanceM <= EXACT_NAME_DISTANCE_M ? 1 - distanceM / 1000 : 0;
  }

  const shortestLength = Math.min(googleName.length, hotpepperName.length);
  const oneContainsTheOther =
    shortestLength >= 6 &&
    (googleName.includes(hotpepperName) || hotpepperName.includes(googleName));

  if (oneContainsTheOther) {
    return distanceM <= CONTAINED_NAME_DISTANCE_M ? 0.92 - distanceM / 1000 : 0;
  }

  if (shortestLength < 5) {
    return 0;
  }

  const nameSimilarity = sorensenDiceSimilarity(googleName, hotpepperName);

  if (nameSimilarity >= STRONG_FUZZY_NAME_SIMILARITY && distanceM <= CONTAINED_NAME_DISTANCE_M) {
    return 0.78 + nameSimilarity * 0.1 - distanceM / 1000;
  }

  if (nameSimilarity >= CLOSE_FUZZY_NAME_SIMILARITY && distanceM <= FUZZY_NAME_DISTANCE_M) {
    return 0.65 + nameSimilarity * 0.1 - distanceM / 1000;
  }

  return 0;
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

function normalizeNameForComparison(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeAddressForComparison(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function hasAddressConflict(left: string, right: string): boolean {
  const leftAddress = normalizeAddressForComparison(left);
  const rightAddress = normalizeAddressForComparison(right);

  if (!leftAddress || !rightAddress) {
    return false;
  }

  const leftFloors = extractFloorMarkers(leftAddress);
  const rightFloors = extractFloorMarkers(rightAddress);

  if (leftFloors.length > 0 && rightFloors.length > 0 && !hasSharedToken(leftFloors, rightFloors)) {
    return true;
  }

  const leftNumbers = extractAddressNumbers(leftAddress);
  const rightNumbers = extractAddressNumbers(rightAddress);

  return (
    leftNumbers.length >= 2 &&
    rightNumbers.length >= 2 &&
    !hasSharedToken(leftNumbers, rightNumbers)
  );
}

function extractFloorMarkers(address: string): string[] {
  const matches = address.matchAll(/(\d{1,2})(?:\s*)(f|階)/gu);
  return [...new Set(Array.from(matches, (match) => match[1]))];
}

function extractAddressNumbers(address: string): string[] {
  return [...new Set(address.match(/\d+/g) ?? [])];
}

function hasSharedToken(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((token) => rightSet.has(token));
}

function sorensenDiceSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (left.length < 2 || right.length < 2) {
    return 0;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  const rightCounts = new Map<string, number>();

  for (const bigram of rightBigrams) {
    rightCounts.set(bigram, (rightCounts.get(bigram) ?? 0) + 1);
  }

  let overlap = 0;

  for (const bigram of leftBigrams) {
    const count = rightCounts.get(bigram) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(bigram, count - 1);
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function buildBigrams(value: string): string[] {
  const bigrams: string[] = [];

  for (let index = 0; index < value.length - 1; index += 1) {
    bigrams.push(value.slice(index, index + 2));
  }

  return bigrams;
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
