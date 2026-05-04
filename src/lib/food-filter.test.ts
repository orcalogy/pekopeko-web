import assert from 'node:assert/strict';
import test from 'node:test';
import { foods } from '@/data/foods';
import { buildFoodCandidateWeights, rankFoodsForIntent } from './food-filter.ts';

test('low-appetite cook intent ranks gentle zero-spice foods above heavy foods', () => {
  const selected = foods.filter((food) =>
    ['congee', 'udon-kake', 'miso-soup', 'ochazuke', 'mapo-tofu', 'curry-udon'].includes(food.id),
  );
  const ranked = rankFoodsForIntent(selected, {
    occasion: 'low_appetite',
    maxSpicy: 0,
    softPreferences: ['light', 'gentle', 'warm', 'soup', 'low_spice'],
    avoidPreferences: ['spicy', 'fried', 'heavy', 'rich', 'large_portion'],
  });
  const topIds = ranked.slice(0, 3).map((item) => item.food.id);

  assert.ok(topIds.includes('congee'));
  assert.ok(topIds.includes('udon-kake') || topIds.includes('miso-soup'));
  assert.ok(
    ranked.findIndex((item) => item.food.id === 'congee') <
      ranked.findIndex((item) => item.food.id === 'mapo-tofu'),
  );
});

test('ranked cook candidates produce stronger picker weights for better matches', () => {
  const selected = foods.filter((food) => ['congee', 'mapo-tofu'].includes(food.id));
  const ranked = rankFoodsForIntent(selected, {
    occasion: 'low_appetite',
    softPreferences: ['gentle', 'soup'],
    avoidPreferences: ['spicy', 'heavy'],
  });
  const weights = buildFoodCandidateWeights(ranked);

  assert.ok((weights.congee ?? 0) > (weights['mapo-tofu'] ?? 0));
});
