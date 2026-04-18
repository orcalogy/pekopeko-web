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

export function formatRestaurantsForRerank(params: {
  restaurants: Restaurant[];
  visitRecords: VisitRecord[];
  feedbackEvents: FeedbackEvent[];
  deterministicReasonsById?: Map<string, RecommendationReasonCode[]>;
}): string {
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
