import assert from 'node:assert/strict';
import test from 'node:test';
import type { EatOutSemanticIntent } from '@/lib/llm/types';
import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';
import { rankRestaurants } from './scoring.ts';

function restaurant(overrides: Partial<Restaurant> & Pick<Restaurant, 'id' | 'name'>): Restaurant {
  return {
    address: 'Tokyo',
    lat: 35,
    lng: 139,
    distance: 500,
    ...overrides,
  };
}

function topName(params: {
  restaurants: Restaurant[];
  currentIntent?: EatOutSemanticIntent;
  visitRecords?: VisitRecord[];
  feedbackEvents?: FeedbackEvent[];
}): string | undefined {
  return rankRestaurants({
    restaurants: params.restaurants,
    visitRecords: params.visitRecords ?? [],
    feedbackEvents: params.feedbackEvents ?? [],
    preferredSort: 'distance',
    currentIntent: params.currentIntent,
  })[0]?.restaurant.name;
}

test('current low-appetite intent beats long-term ramen preference', () => {
  const ramen = restaurant({
    id: 'ramen-1',
    restaurantKey: 'rid-ramen',
    name: 'Favorite Ramen',
    cuisineType: 'Ramen',
    rating: 4.8,
    distance: 120,
  });
  const udon = restaurant({
    id: 'udon-1',
    restaurantKey: 'rid-udon',
    name: 'Gentle Udon',
    cuisineType: 'Udon',
    rating: 4.1,
    distance: 500,
    features: ['non_smoking'],
  });
  const visits: VisitRecord[] = [
    {
      restaurantKey: 'rid-ramen',
      providerId: 'ramen-1',
      name: ramen.name,
      visits: [Date.now() - 45 * 86_400_000],
      snapshot: { cuisineType: 'Ramen', distance: 120, priceLevel: 1 },
    },
  ];
  const feedback: FeedbackEvent[] = [
    {
      id: 'fb-ramen',
      restaurantKey: 'rid-ramen',
      providerId: 'ramen-1',
      name: ramen.name,
      kind: 'liked_after_visit',
      aspects: ['taste'],
      createdAt: Date.now(),
      snapshot: { cuisineType: 'Ramen', distance: 120, priceLevel: 1 },
    },
  ];

  assert.equal(
    topName({
      restaurants: [ramen, udon],
      visitRecords: visits,
      feedbackEvents: feedback,
      currentIntent: {
        confidence: 0.8,
        occasion: 'low_appetite',
        softPreferences: ['light', 'gentle', 'warm', 'soup', 'small_portion'],
        avoidPreferences: ['heavy', 'rich', 'spicy', 'fried', 'large_portion'],
      },
    }),
    'Gentle Udon',
  );
});

test('current cheap intent beats usual expensive preference', () => {
  const expensive = restaurant({
    id: 'sushi-1',
    restaurantKey: 'rid-sushi',
    name: 'Fancy Sushi',
    cuisineType: 'Sushi',
    priceLevel: 4,
    rating: 4.8,
    distance: 200,
  });
  const cheap = restaurant({
    id: 'cafe-1',
    restaurantKey: 'rid-cafe',
    name: 'Budget Cafe',
    cuisineType: 'Cafe',
    priceLevel: 1,
    rating: 4,
    distance: 550,
  });

  assert.equal(
    topName({
      restaurants: [expensive, cheap],
      feedbackEvents: [
        {
          id: 'fb-sushi',
          restaurantKey: 'rid-sushi',
          providerId: 'sushi-1',
          name: expensive.name,
          kind: 'liked_after_visit',
          aspects: ['taste'],
          createdAt: Date.now(),
          snapshot: { cuisineType: 'Sushi', priceLevel: 4, distance: 200 },
        },
      ],
      currentIntent: {
        confidence: 0.8,
        maxBudgetLevel: 2,
        softPreferences: ['budget_friendly'],
        avoidPreferences: ['expensive'],
      },
    }),
    'Budget Cafe',
  );
});

test('explore intent demotes recently visited favorites', () => {
  const visited = restaurant({
    id: 'cafe-1',
    restaurantKey: 'rid-cafe',
    name: 'Usual Cafe',
    cuisineType: 'Cafe',
    rating: 4.6,
    distance: 120,
  });
  const novel = restaurant({
    id: 'udon-1',
    restaurantKey: 'rid-udon',
    name: 'New Udon',
    cuisineType: 'Udon',
    rating: 4.1,
    distance: 700,
  });

  assert.equal(
    topName({
      restaurants: [visited, novel],
      visitRecords: [
        {
          restaurantKey: 'rid-cafe',
          providerId: 'cafe-1',
          name: visited.name,
          visits: [Date.now() - 2 * 86_400_000],
          snapshot: { cuisineType: 'Cafe', distance: 120 },
        },
      ],
      currentIntent: {
        confidence: 0.8,
        personalPreferenceMode: 'explore',
        softPreferences: ['novel'],
        avoidPreferences: ['recently_visited'],
      },
    }),
    'New Udon',
  );
});

test('quiet intent demotes noisy or crowded evidence', () => {
  const quiet = restaurant({
    id: 'quiet-1',
    restaurantKey: 'rid-quiet',
    name: 'Quiet Cafe',
    cuisineType: 'Cafe',
    features: ['private_room', 'non_smoking'],
    distance: 500,
  });
  const noisy = restaurant({
    id: 'party-1',
    restaurantKey: 'rid-party',
    name: 'Party Izakaya',
    cuisineType: 'Izakaya',
    features: ['free_drink'],
    capacity: 90,
    distance: 120,
  });

  assert.equal(
    topName({
      restaurants: [noisy, quiet],
      currentIntent: {
        confidence: 0.8,
        softPreferences: ['quiet'],
        avoidPreferences: ['noisy', 'crowded'],
      },
    }),
    'Quiet Cafe',
  );
});
