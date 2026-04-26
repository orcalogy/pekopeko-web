import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';
import { getRestaurantIdentityKey } from './identity';
import { deriveRecommendationProfile, getLatestFeedbackByRestaurant } from './profile';
import type { RankedRestaurantResult } from './scoring';

const DAY_MS = 86_400_000;

export type RandomPickMode = 'safe' | 'balanced' | 'adventure';

interface ScoredRandomCandidate {
  restaurant: Restaurant;
  score: number;
}

function getLastVisitPenalty(record: VisitRecord | undefined): number {
  if (!record || record.visits.length === 0) return 0;

  const age = Date.now() - Math.max(...record.visits);
  if (age < 3 * DAY_MS) return 3;
  if (age < 7 * DAY_MS) return 2;
  if (age < 30 * DAY_MS) return 1.2;
  if (age < 90 * DAY_MS) return 0.4;
  return 0;
}

function normalizeRankScores(rankedResults: RankedRestaurantResult[]): Map<string, number> {
  if (rankedResults.length === 0) return new Map();

  const scores = rankedResults.map((result) => result.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  return new Map(
    rankedResults.map((result) => [result.identityKey, (result.score - min) / range] as const),
  );
}

function chooseWeighted<T>(
  items: T[],
  getWeight: (item: T) => number,
  random: () => number,
): T | null {
  if (items.length === 0) return null;

  const weights = items.map((item) => Math.max(0.01, getWeight(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * total;

  for (let index = 0; index < items.length; index++) {
    cursor -= weights[index];
    if (cursor <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

export function scoreRandomPickCandidates(params: {
  restaurants: Restaurant[];
  rankedResults: RankedRestaurantResult[];
  visitRecords: VisitRecord[];
  feedbackEvents: FeedbackEvent[];
  mode: RandomPickMode;
}): ScoredRandomCandidate[] {
  const profile = deriveRecommendationProfile(params.visitRecords, params.feedbackEvents);
  const rankScores = normalizeRankScores(params.rankedResults);
  const visitMap = new Map(
    params.visitRecords.map((record) => [record.restaurantKey, record] as const),
  );
  const feedbackMap = getLatestFeedbackByRestaurant(params.feedbackEvents);
  const seenCuisines = new Set(
    params.visitRecords
      .map((record) => record.snapshot?.cuisineType)
      .filter((value): value is string => Boolean(value)),
  );
  const modeWeights = {
    safe: { relevance: 3, taste: 1.4, novelty: 0.2, diversity: 0.2, negative: 3 },
    balanced: { relevance: 2, taste: 1.1, novelty: 0.8, diversity: 0.6, negative: 2.4 },
    adventure: { relevance: 1.2, taste: 0.5, novelty: 1.8, diversity: 1.4, negative: 2.8 },
  }[params.mode];

  return params.restaurants.map((restaurant) => {
    const identityKey = getRestaurantIdentityKey(restaurant);
    const visitRecord = visitMap.get(identityKey);
    const feedback = feedbackMap.get(identityKey);
    const relevanceScore = rankScores.get(identityKey) ?? 0.5;
    let tasteScore = 0;
    let noveltyScore = visitRecord ? 0 : 1;
    let diversityBonus = 0;

    if (profile) {
      if (restaurant.cuisineType && profile.topCuisines.includes(restaurant.cuisineType)) {
        tasteScore += 1;
      }
      if (restaurant.cuisineType && profile.avoidedCuisines.includes(restaurant.cuisineType)) {
        tasteScore -= 1;
      }
      for (const feature of restaurant.features ?? []) {
        if (profile.topFeatures.includes(feature)) tasteScore += 0.25;
        if (profile.avoidedFeatures.includes(feature)) tasteScore -= 0.35;
      }
      if (
        restaurant.priceLevel != null &&
        profile.preferredPriceLevel != null &&
        restaurant.priceLevel <= profile.preferredPriceLevel
      ) {
        tasteScore += 0.3;
      }
    }

    if (restaurant.cuisineType && !seenCuisines.has(restaurant.cuisineType)) {
      diversityBonus += 0.8;
    }
    if (!restaurant.cuisineType) {
      noveltyScore *= 0.5;
    }

    const recentVisitPenalty = getLastVisitPenalty(visitRecord);
    const negativeFeedbackPenalty =
      feedback?.kind === 'not_interested'
        ? 3.2
        : feedback?.kind === 'disliked_after_visit'
          ? 2.3
          : 0;
    const likedBoost = feedback?.kind === 'liked_after_visit' ? 0.8 : 0;

    const score =
      relevanceScore * modeWeights.relevance +
      tasteScore * modeWeights.taste +
      noveltyScore * modeWeights.novelty +
      diversityBonus * modeWeights.diversity +
      likedBoost -
      recentVisitPenalty -
      negativeFeedbackPenalty * modeWeights.negative;

    return {
      restaurant,
      score,
    };
  });
}

export function pickRestaurantWithMode(params: {
  restaurants: Restaurant[];
  rankedResults: RankedRestaurantResult[];
  visitRecords: VisitRecord[];
  feedbackEvents: FeedbackEvent[];
  mode: RandomPickMode;
  excludeId?: string | null;
  random?: () => number;
}): Restaurant | null {
  const random = params.random ?? Math.random;
  const candidates = scoreRandomPickCandidates(params)
    .filter((candidate) => !params.excludeId || candidate.restaurant.id !== params.excludeId)
    .sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    return params.restaurants[0] ?? null;
  }

  const relaxedPool = candidates.length <= 4;
  const pool = relaxedPool
    ? candidates
    : candidates.filter((candidate) => candidate.score >= candidates[0].score - 4);
  const picked = chooseWeighted(pool, (candidate) => Math.exp(candidate.score / 2), random);

  return picked?.restaurant ?? candidates[0].restaurant;
}
