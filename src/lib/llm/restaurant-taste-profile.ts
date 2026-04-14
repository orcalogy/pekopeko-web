import type { VisitRecord } from '@/stores/visited';

const DAY_MS = 86_400_000;

export interface RestaurantTasteProfile {
  totalVisits: number;
  distinctRestaurants: number;
  topCuisines: string[];
  topFeatures: string[];
  preferredPriceLevel?: 1 | 2 | 3 | 4;
  typicalDistanceMeters?: number;
}

function getRecencyWeight(lastVisit: number): number {
  const age = Date.now() - lastVisit;

  if (age < 7 * DAY_MS) return 1.5;
  if (age < 30 * DAY_MS) return 1.2;
  if (age < 90 * DAY_MS) return 1;
  return 0.8;
}

function getTopKeys(counter: Map<string, number>, limit: number): string[] {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

export function deriveRestaurantTasteProfile(
  records: VisitRecord[],
): RestaurantTasteProfile | null {
  if (records.length === 0) return null;

  const cuisineCounts = new Map<string, number>();
  const featureCounts = new Map<string, number>();
  let totalVisits = 0;
  let weightedPrice = 0;
  let weightedPriceCount = 0;
  let weightedDistance = 0;
  let weightedDistanceCount = 0;

  for (const record of records) {
    if (record.visits.length === 0) continue;

    const lastVisit = Math.max(...record.visits);
    const weight = record.visits.length * getRecencyWeight(lastVisit);
    totalVisits += record.visits.length;

    const cuisine = record.snapshot?.cuisineType?.trim();
    if (cuisine) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + weight);
    }

    for (const feature of record.snapshot?.features ?? []) {
      featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + weight);
    }

    if (
      record.snapshot?.priceLevel != null &&
      Number.isInteger(record.snapshot.priceLevel) &&
      record.snapshot.priceLevel >= 1 &&
      record.snapshot.priceLevel <= 4
    ) {
      weightedPrice += record.snapshot.priceLevel * weight;
      weightedPriceCount += weight;
    }

    if (record.snapshot?.distance != null && record.snapshot.distance >= 0) {
      weightedDistance += record.snapshot.distance * weight;
      weightedDistanceCount += weight;
    }
  }

  return {
    totalVisits,
    distinctRestaurants: records.length,
    topCuisines: getTopKeys(cuisineCounts, 3),
    topFeatures: getTopKeys(featureCounts, 3),
    preferredPriceLevel:
      weightedPriceCount > 0
        ? (Math.max(1, Math.min(4, Math.round(weightedPrice / weightedPriceCount))) as
            | 1
            | 2
            | 3
            | 4)
        : undefined,
    typicalDistanceMeters:
      weightedDistanceCount > 0 ? Math.round(weightedDistance / weightedDistanceCount) : undefined,
  };
}

export function buildRestaurantTasteProfilePromptSummary(
  profile: RestaurantTasteProfile | null,
): string | null {
  if (!profile || profile.totalVisits === 0) {
    return null;
  }

  const parts = [
    `${profile.totalVisits} visits across ${profile.distinctRestaurants} restaurants`,
    profile.topCuisines.length > 0 ? `often chooses ${profile.topCuisines.join(', ')}` : null,
    profile.topFeatures.length > 0 ? `often values ${profile.topFeatures.join(', ')}` : null,
    profile.preferredPriceLevel ? `usual budget ${'¥'.repeat(profile.preferredPriceLevel)}` : null,
    profile.typicalDistanceMeters != null
      ? `commonly visits places around ${profile.typicalDistanceMeters}m away`
      : null,
  ].filter(Boolean);

  return parts.join('; ');
}
