import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { DerivedTasteProfile } from './types';

const DAY_MS = 86_400_000;
export const NOT_INTERESTED_SUPPRESSION_MS = 21 * DAY_MS;

function getRecencyWeight(timestamp: number): number {
  const age = Date.now() - timestamp;

  if (age < 7 * DAY_MS) return 1.5;
  if (age < 30 * DAY_MS) return 1.2;
  if (age < 90 * DAY_MS) return 1;
  return 0.8;
}

function getPositiveFeedbackWeight(timestamp: number): number {
  return 2.4 * getRecencyWeight(timestamp);
}

function getNegativeFeedbackWeight(timestamp: number): number {
  return 2.8 * getRecencyWeight(timestamp);
}

function getDismissWeight(timestamp: number): number {
  return 1.3 * getRecencyWeight(timestamp);
}

function getTopKeys(counter: Map<string, number>, limit: number): string[] {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

export function getLatestFeedbackByRestaurant(events: FeedbackEvent[]): Map<string, FeedbackEvent> {
  const latestByRestaurant = new Map<string, FeedbackEvent>();

  for (const event of events) {
    const previous = latestByRestaurant.get(event.restaurantKey);
    if (!previous || event.createdAt > previous.createdAt) {
      latestByRestaurant.set(event.restaurantKey, event);
    }
  }

  return latestByRestaurant;
}

export function getSuppressedRestaurantKeys(
  events: FeedbackEvent[],
  now = Date.now(),
): Set<string> {
  return new Set(
    events
      .filter(
        (event) =>
          event.kind === 'not_interested' && now - event.createdAt < NOT_INTERESTED_SUPPRESSION_MS,
      )
      .map((event) => event.restaurantKey),
  );
}

export function deriveRecommendationProfile(
  visitRecords: VisitRecord[],
  feedbackEvents: FeedbackEvent[],
): DerivedTasteProfile | null {
  if (visitRecords.length === 0 && feedbackEvents.length === 0) {
    return null;
  }

  const cuisineCounts = new Map<string, number>();
  const avoidedCuisineCounts = new Map<string, number>();
  const featureCounts = new Map<string, number>();
  const avoidedFeatureCounts = new Map<string, number>();
  let totalVisits = 0;
  let weightedPrice = 0;
  let weightedPriceCount = 0;
  let weightedDistance = 0;
  let weightedDistanceCount = 0;

  for (const record of visitRecords) {
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

  for (const event of feedbackEvents) {
    const cuisine = event.snapshot?.cuisineType?.trim();
    const positiveWeight =
      event.kind === 'liked_after_visit' ? getPositiveFeedbackWeight(event.createdAt) : 0;
    const negativeWeight =
      event.kind === 'disliked_after_visit'
        ? getNegativeFeedbackWeight(event.createdAt)
        : event.kind === 'not_interested'
          ? getDismissWeight(event.createdAt)
          : 0;

    if (cuisine && positiveWeight > 0) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + positiveWeight);
    }
    if (cuisine && negativeWeight > 0) {
      avoidedCuisineCounts.set(cuisine, (avoidedCuisineCounts.get(cuisine) ?? 0) + negativeWeight);
    }

    for (const feature of event.snapshot?.features ?? []) {
      if (positiveWeight > 0) {
        featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + positiveWeight);
      }
      if (negativeWeight > 0) {
        avoidedFeatureCounts.set(
          feature,
          (avoidedFeatureCounts.get(feature) ?? 0) + negativeWeight,
        );
      }
    }

    if (
      positiveWeight > 0 &&
      event.snapshot?.priceLevel != null &&
      event.snapshot.priceLevel >= 1 &&
      event.snapshot.priceLevel <= 4
    ) {
      weightedPrice += event.snapshot.priceLevel * positiveWeight;
      weightedPriceCount += positiveWeight;
    }

    if (positiveWeight > 0 && event.snapshot?.distance != null && event.snapshot.distance >= 0) {
      weightedDistance += event.snapshot.distance * positiveWeight;
      weightedDistanceCount += positiveWeight;
    }
  }

  const totalDistinctRestaurants = new Set(visitRecords.map((record) => record.restaurantKey)).size;
  const noveltyRatio = totalVisits > 0 ? totalDistinctRestaurants / totalVisits : 0.5;

  return {
    totalVisits,
    totalFeedbackEvents: feedbackEvents.length,
    topCuisines: getTopKeys(cuisineCounts, 3),
    avoidedCuisines: getTopKeys(avoidedCuisineCounts, 3),
    topFeatures: getTopKeys(featureCounts, 4),
    avoidedFeatures: getTopKeys(avoidedFeatureCounts, 4),
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
    noveltyPreference: noveltyRatio >= 0.75 ? 'high' : noveltyRatio >= 0.45 ? 'medium' : 'low',
    suppression: {
      restaurantKeys: [...getSuppressedRestaurantKeys(feedbackEvents)],
    },
  };
}
