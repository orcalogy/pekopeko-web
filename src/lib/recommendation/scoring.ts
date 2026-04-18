import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';
import { getRestaurantIdentityKey } from './identity';
import {
  deriveRecommendationProfile,
  getLatestFeedbackByRestaurant,
  getSuppressedRestaurantKeys,
} from './profile';
import type { RecommendationReasonCode } from './types';

const DAY_MS = 86_400_000;
const MAX_DISTANCE_M = 5_000;

export interface RankedRestaurantResult {
  restaurant: Restaurant;
  identityKey: string;
  score: number;
  suppressed: boolean;
  reasons: RecommendationReasonCode[];
}

function normalizeKeyword(keyword: string | null | undefined): string[] {
  return (keyword ?? '')
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function restaurantMatchesKeyword(restaurant: Restaurant, keywordTerms: string[]): boolean {
  if (keywordTerms.length === 0) return false;

  const haystack = [
    restaurant.name,
    restaurant.cuisineType,
    restaurant.address,
    restaurant.accessInfo,
    restaurant.budgetText,
    ...(restaurant.features ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywordTerms.every((term) => haystack.includes(term));
}

function getVisitAgeScore(record: VisitRecord | undefined): {
  score: number;
  reason?: RecommendationReasonCode;
} {
  if (!record || record.visits.length === 0) {
    return { score: 0 };
  }

  const lastVisit = Math.max(...record.visits);
  const age = Date.now() - lastVisit;

  if (age < 3 * DAY_MS) return { score: -3 };
  if (age < 7 * DAY_MS) return { score: -2 };
  if (age < 30 * DAY_MS) return { score: -1 };
  if (age < 90 * DAY_MS) return { score: -0.25 };

  return { score: 0.45, reason: 'not_recently_visited' };
}

function toSortedUniqueReasonCodes(
  reasons: Set<RecommendationReasonCode>,
): RecommendationReasonCode[] {
  const order: RecommendationReasonCode[] = [
    'query_match',
    'preferred_cuisine',
    'preferred_feature',
    'budget_fit',
    'distance_fit',
    'novel_pick',
    'not_recently_visited',
    'popular_high_rating',
    'suppressed_due_to_feedback',
  ];

  return order.filter((reason) => reasons.has(reason)).slice(0, 3);
}

export function rankRestaurants(params: {
  restaurants: Restaurant[];
  visitRecords: VisitRecord[];
  feedbackEvents: FeedbackEvent[];
  preferredSort: 'distance' | 'rating';
  keyword?: string | null;
}): RankedRestaurantResult[] {
  const profile = deriveRecommendationProfile(params.visitRecords, params.feedbackEvents);
  const visitMap = new Map(
    params.visitRecords.map(
      (record) => [record.restaurantKey, record] satisfies [string, VisitRecord],
    ),
  );
  const latestFeedbackMap = getLatestFeedbackByRestaurant(params.feedbackEvents);
  const suppressedRestaurantKeys = getSuppressedRestaurantKeys(params.feedbackEvents);
  const keywordTerms = normalizeKeyword(params.keyword);

  return params.restaurants
    .map((restaurant) => {
      const identityKey = getRestaurantIdentityKey(restaurant);
      const reasons = new Set<RecommendationReasonCode>();
      const visitRecord = visitMap.get(identityKey);
      const latestFeedback = latestFeedbackMap.get(identityKey);
      const suppressed = suppressedRestaurantKeys.has(identityKey);
      let score = 0;

      const distanceScore = Math.max(
        0,
        1 - Math.min(restaurant.distance, MAX_DISTANCE_M) / MAX_DISTANCE_M,
      );
      score += distanceScore * (params.preferredSort === 'distance' ? 1.8 : 1);

      if (restaurant.rating != null) {
        score += (restaurant.rating / 5) * (params.preferredSort === 'rating' ? 1.9 : 1.15);
        if (restaurant.rating >= 4.2) {
          reasons.add('popular_high_rating');
        }
      }

      if (restaurantMatchesKeyword(restaurant, keywordTerms)) {
        score += 1.25;
        reasons.add('query_match');
      }

      if (profile) {
        if (restaurant.cuisineType) {
          if (profile.topCuisines.includes(restaurant.cuisineType)) {
            score += 1.5;
            reasons.add('preferred_cuisine');
          }
          if (profile.avoidedCuisines.includes(restaurant.cuisineType)) {
            score -= 1.8;
          }
        }

        const featureMatches = (restaurant.features ?? []).filter((feature) =>
          profile.topFeatures.includes(feature),
        );
        if (featureMatches.length > 0) {
          score += Math.min(1.1, featureMatches.length * 0.4);
          reasons.add('preferred_feature');
        }

        const avoidedFeatureMatches = (restaurant.features ?? []).filter((feature) =>
          profile.avoidedFeatures.includes(feature),
        );
        if (avoidedFeatureMatches.length > 0) {
          score -= Math.min(1.25, avoidedFeatureMatches.length * 0.45);
        }

        if (
          profile.preferredPriceLevel != null &&
          restaurant.priceLevel != null &&
          restaurant.priceLevel >= 1 &&
          restaurant.priceLevel <= 4
        ) {
          const delta = Math.abs(profile.preferredPriceLevel - restaurant.priceLevel);
          if (delta === 0) {
            score += 0.8;
            reasons.add('budget_fit');
          } else if (delta === 1) {
            score += 0.25;
            reasons.add('budget_fit');
          } else {
            score -= 0.55;
          }
        }

        if (profile.typicalDistanceMeters != null) {
          const preferredRange = Math.max(profile.typicalDistanceMeters * 1.25, 1_200);
          if (restaurant.distance <= preferredRange) {
            score += 0.85;
            reasons.add('distance_fit');
          } else if (restaurant.distance > preferredRange * 2.2) {
            score -= 0.45;
          }
        }

        if (!visitRecord && profile.noveltyPreference === 'high') {
          score += 0.55;
          reasons.add('novel_pick');
        } else if (!visitRecord && profile.noveltyPreference === 'medium') {
          score += 0.2;
        }
      }

      const visitAgeScore = getVisitAgeScore(visitRecord);
      score += visitAgeScore.score;
      if (visitAgeScore.reason) {
        reasons.add(visitAgeScore.reason);
      }

      if (latestFeedback?.kind === 'liked_after_visit') {
        score += 1.2;
      } else if (latestFeedback?.kind === 'disliked_after_visit') {
        score -= 2;
      } else if (latestFeedback?.kind === 'not_interested') {
        score -= 2.6;
      }

      if (suppressed) {
        reasons.add('suppressed_due_to_feedback');
      }

      return {
        restaurant,
        identityKey,
        score,
        suppressed,
        reasons: toSortedUniqueReasonCodes(reasons),
      } satisfies RankedRestaurantResult;
    })
    .sort((a, b) => {
      if (a.suppressed !== b.suppressed) {
        return a.suppressed ? 1 : -1;
      }

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (params.preferredSort === 'rating') {
        return (b.restaurant.rating ?? 0) - (a.restaurant.rating ?? 0);
      }

      return a.restaurant.distance - b.restaurant.distance;
    });
}
