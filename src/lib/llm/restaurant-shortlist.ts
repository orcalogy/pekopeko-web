import type { RestaurantFactCard } from '@/lib/llm/types';
import { getRestaurantIdentityKey } from '@/lib/recommendation/identity';
import {
  getLatestFeedbackByRestaurant,
  getSuppressedRestaurantKeys,
} from '@/lib/recommendation/profile';
import type { RecommendationReasonCode } from '@/lib/recommendation/types';
import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';

const DAY_MS = 86_400_000;

function normalizePriceLevel(value: number | undefined): RestaurantFactCard['priceLevel'] {
  return value != null && Number.isInteger(value) && value >= 1 && value <= 4
    ? (value as RestaurantFactCard['priceLevel'])
    : undefined;
}

function deriveAmbienceHints(restaurant: Restaurant): string[] {
  const hints: string[] = [];
  const features = restaurant.features ?? [];

  if (features.includes('private_room')) hints.push('private room');
  if (features.includes('non_smoking')) hints.push('non-smoking');
  if (restaurant.accessInfo) hints.push(`access: ${restaurant.accessInfo}`);

  return hints;
}

function deriveOccasionHints(restaurant: Restaurant): string[] {
  const hints: string[] = [];
  const features = restaurant.features ?? [];

  if (features.includes('course')) hints.push('course menu');
  if (features.includes('free_drink')) hints.push('drinks plan');
  if (features.includes('free_food')) hints.push('buffet or all-you-can-eat');
  if (restaurant.capacity != null) hints.push(`capacity ${restaurant.capacity}`);

  return hints;
}

function getProviderConfidence(restaurant: Restaurant): RestaurantFactCard['providerConfidence'] {
  if (restaurant.source === 'hybrid') return 'high';
  if (restaurant.providerRefs && restaurant.providerRefs.length > 1) return 'high';
  if (restaurant.rating != null || restaurant.features?.length || restaurant.openingHours?.length) {
    return 'medium';
  }

  return 'low';
}

function getMissingFacts(restaurant: Restaurant): string[] {
  const missing: string[] = [];

  if (restaurant.rating == null) missing.push('rating');
  if (restaurant.priceLevel == null && !restaurant.budgetText) missing.push('price');
  if (restaurant.isOpenNow == null) missing.push('openNow');
  if (!restaurant.features?.includes('wifi')) missing.push('wifi');
  missing.push('noise');
  missing.push('dietary');

  return [...new Set(missing)];
}

export function buildRestaurantFactCards(params: {
  restaurants: Restaurant[];
  deterministicReasonsById?: Map<string, RecommendationReasonCode[]>;
}): RestaurantFactCard[] {
  return params.restaurants
    .map<RestaurantFactCard | null>((restaurant) => {
      const id = getRestaurantIdentityKey(restaurant);
      if (!id) return null;

      return {
        id,
        name: restaurant.name,
        distanceM:
          Number.isFinite(restaurant.distance) && restaurant.distance >= 0
            ? Math.round(restaurant.distance)
            : undefined,
        rating: restaurant.rating,
        priceLevel: normalizePriceLevel(restaurant.priceLevel),
        openNow: restaurant.isOpenNow,
        cuisine: restaurant.cuisineType,
        features: restaurant.features?.slice(0, 12) ?? [],
        ambienceHints: deriveAmbienceHints(restaurant),
        occasionHints: deriveOccasionHints(restaurant),
        providerConfidence: getProviderConfidence(restaurant),
        missingFacts: getMissingFacts(restaurant),
        deterministicReasons: params.deterministicReasonsById?.get(id) ?? [],
      } satisfies RestaurantFactCard;
    })
    .filter((card): card is RestaurantFactCard => card != null);
}

export function formatRestaurantFactCardsForRerank(factCards: RestaurantFactCard[]): string {
  return JSON.stringify(
    factCards.map((card) => ({
      id: card.id,
      name: card.name,
      distanceM: card.distanceM,
      rating: card.rating,
      priceLevel: card.priceLevel,
      openNow: card.openNow,
      cuisine: card.cuisine,
      features: card.features,
      ambienceHints: card.ambienceHints,
      occasionHints: card.occasionHints,
      providerConfidence: card.providerConfidence,
      missingFacts: card.missingFacts,
      deterministicReasons: card.deterministicReasons,
    })),
  );
}

export function formatRestaurantsForRerank(params: {
  restaurants: Restaurant[];
  visitRecords: VisitRecord[];
  feedbackEvents: FeedbackEvent[];
  deterministicReasonsById?: Map<string, RecommendationReasonCode[]>;
}): string {
  const factCards = buildRestaurantFactCards({
    restaurants: params.restaurants,
    deterministicReasonsById: params.deterministicReasonsById,
  });

  if (factCards.length > 0) {
    return formatRestaurantFactCardsForRerank(factCards);
  }

  const visitMap = new Map(
    params.visitRecords.map(
      (record) => [record.restaurantKey, record] satisfies [string, VisitRecord],
    ),
  );
  const latestFeedbackMap = getLatestFeedbackByRestaurant(params.feedbackEvents);
  const suppressedRestaurantKeys = getSuppressedRestaurantKeys(params.feedbackEvents);

  return params.restaurants
    .map((restaurant) => {
      const identityKey = getRestaurantIdentityKey(restaurant);
      const visitRecord = visitMap.get(identityKey);
      const latestFeedback = latestFeedbackMap.get(identityKey);
      const lastVisit = visitRecord?.visits.length ? Math.max(...visitRecord.visits) : null;
      const lastVisitDaysAgo =
        lastVisit != null ? Math.max(0, Math.round((Date.now() - lastVisit) / DAY_MS)) : null;
      const deterministicReasons = params.deterministicReasonsById?.get(identityKey) ?? [];

      return [
        `id=${identityKey}`,
        `provider_id=${restaurant.id}`,
        `name=${restaurant.name}`,
        `distance_m=${Math.round(restaurant.distance)}`,
        restaurant.rating != null ? `rating=${restaurant.rating.toFixed(1)}` : null,
        restaurant.priceLevel != null ? `price=${'¥'.repeat(restaurant.priceLevel)}` : null,
        restaurant.isOpenNow != null ? `open_now=${restaurant.isOpenNow ? 'yes' : 'no'}` : null,
        restaurant.cuisineType ? `cuisine=${restaurant.cuisineType}` : null,
        restaurant.features?.length ? `features=${restaurant.features.join(',')}` : null,
        restaurant.capacity != null ? `capacity=${restaurant.capacity}` : null,
        restaurant.accessInfo ? `access=${restaurant.accessInfo}` : null,
        visitRecord ? `visits=${visitRecord.visits.length}` : 'visits=0',
        lastVisitDaysAgo != null ? `last_visit_days_ago=${lastVisitDaysAgo}` : null,
        latestFeedback ? `latest_feedback=${latestFeedback.kind}` : null,
        suppressedRestaurantKeys.has(identityKey) ? 'suppressed=yes' : null,
        deterministicReasons.length > 0
          ? `deterministic_reasons=${deterministicReasons.join(',')}`
          : null,
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');
}
