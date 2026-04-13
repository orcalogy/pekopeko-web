import { categories } from '@/data/categories';
import { foods } from '@/data/foods';
import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import {
  COOK_MEAL_TIMES,
  COOK_MOODS,
  type CookSemanticIntent,
  type EatOutSemanticIntent,
} from '@/lib/llm/types';

const categoryIds = new Set(categories.map((category) => category.id));
const foodIds = new Set(foods.map((food) => food.id));
const moodIds = new Set<string>(COOK_MOODS);
const mealTimeIds = new Set<string>(COOK_MEAL_TIMES);

function parseIntentObject(raw: string): Record<string, unknown> | null {
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return parsed as Record<string, unknown>;
}

export function parseCookIntent(raw: string): CookSemanticIntent | null {
  const parsed = parseIntentObject(raw);
  if (!parsed) return null;

  const intent: CookSemanticIntent = {};
  const keyword =
    typeof parsed.keyword === 'string' ? normalizeSearchQuery(parsed.keyword) : undefined;
  if (keyword) {
    intent.keyword = keyword;
  }

  if (typeof parsed.mood === 'string' && moodIds.has(parsed.mood)) {
    intent.mood = parsed.mood as CookSemanticIntent['mood'];
  }

  if (typeof parsed.category === 'string' && categoryIds.has(parsed.category)) {
    intent.category = parsed.category;
  }

  if (
    typeof parsed.maxSpicy === 'number' &&
    Number.isInteger(parsed.maxSpicy) &&
    parsed.maxSpicy >= 0 &&
    parsed.maxSpicy <= 3
  ) {
    intent.maxSpicy = parsed.maxSpicy as 0 | 1 | 2 | 3;
  }

  if (typeof parsed.mealTime === 'string' && mealTimeIds.has(parsed.mealTime)) {
    intent.mealTime = parsed.mealTime as CookSemanticIntent['mealTime'];
  }

  if (parsed.cookableOnly !== false) {
    intent.cookableOnly = true;
  }

  if (Array.isArray(parsed.recommendedIds)) {
    const ids = parsed.recommendedIds
      .filter((value): value is string => typeof value === 'string' && foodIds.has(value))
      .slice(0, 5);

    if (ids.length > 0) {
      intent.recommendedIds = ids;
    }
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

export function parseEatOutIntent(raw: string): EatOutSemanticIntent | null {
  const parsed = parseIntentObject(raw);
  if (!parsed) return null;

  const intent: EatOutSemanticIntent = {};
  const keyword =
    typeof parsed.keyword === 'string' ? normalizeSearchQuery(parsed.keyword) : undefined;
  if (keyword) {
    intent.keyword = keyword;
  }

  if (typeof parsed.category === 'string' && categoryIds.has(parsed.category)) {
    intent.category = parsed.category;
  }

  if (typeof parsed.openNow === 'boolean') {
    intent.openNow = parsed.openNow;
  }

  return Object.keys(intent).length > 0 ? intent : null;
}
