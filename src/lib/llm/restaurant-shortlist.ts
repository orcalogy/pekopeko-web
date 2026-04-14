import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';

const DAY_MS = 86_400_000;

export function formatRestaurantsForRerank(
  restaurants: Restaurant[],
  visitRecords: VisitRecord[],
): string {
  const visitMap = new Map(visitRecords.map((record) => [record.id, record]));

  return restaurants
    .map((restaurant) => {
      const visitRecord = visitMap.get(restaurant.id);
      const lastVisit = visitRecord?.visits.length ? Math.max(...visitRecord.visits) : null;
      const lastVisitDaysAgo =
        lastVisit != null ? Math.max(0, Math.round((Date.now() - lastVisit) / DAY_MS)) : null;

      return [
        `id=${restaurant.id}`,
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
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');
}
