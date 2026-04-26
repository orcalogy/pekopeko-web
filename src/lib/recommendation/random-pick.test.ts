import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mockFeedbackEvents,
  mockRestaurants,
  mockVisitRecords,
} from '../llm/restaurant-fixtures.test-data.ts';
import {
  pickRestaurantWithMode,
  type RandomPickMode,
  scoreRandomPickCandidates,
} from './random-pick.ts';
import type { RankedRestaurantResult } from './scoring.ts';

function ranked(mode: RandomPickMode): RankedRestaurantResult[] {
  void mode;
  return mockRestaurants.map((restaurant, index) => ({
    restaurant,
    identityKey: restaurant.restaurantKey ?? restaurant.id,
    score: 10 - index,
    suppressed: false,
    reasons: index === 0 ? ['query_match', 'popular_high_rating'] : [],
  }));
}

test('penalizes recently visited restaurants', () => {
  const scores = scoreRandomPickCandidates({
    restaurants: mockRestaurants,
    rankedResults: ranked('balanced'),
    visitRecords: mockVisitRecords,
    feedbackEvents: [],
    mode: 'balanced',
  });

  const ramen = scores.find((item) => item.restaurant.restaurantKey === 'rid-ramen-1');
  const cafe = scores.find((item) => item.restaurant.restaurantKey === 'rid-cafe-1');

  assert.ok((cafe?.score ?? 0) > (ramen?.score ?? 0));
});

test('adventure mode can pick less common cuisine with deterministic random', () => {
  const picked = pickRestaurantWithMode({
    restaurants: mockRestaurants,
    rankedResults: ranked('adventure'),
    visitRecords: mockVisitRecords,
    feedbackEvents: mockFeedbackEvents,
    mode: 'adventure',
    random: () => 0.99,
  });

  assert.ok(picked);
  assert.notEqual(picked?.restaurantKey, 'rid-ramen-1');
});
