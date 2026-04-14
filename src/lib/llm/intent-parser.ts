import { categories } from '@/data/categories';
import { foods } from '@/data/foods';
import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import {
  COOK_MEAL_TIMES,
  COOK_MOODS,
  type CookSemanticIntent,
  EAT_OUT_FEATURES,
  EAT_OUT_SORT_OPTIONS,
  type EatOutRerankEntry,
  type EatOutSemanticIntent,
} from '@/lib/llm/types';

const categoryIds = new Set(categories.map((category) => category.id));
const foodIds = new Set(foods.map((food) => food.id));
const moodIds = new Set<string>(COOK_MOODS);
const mealTimeIds = new Set<string>(COOK_MEAL_TIMES);
const eatOutFeatureIds = new Set<string>(EAT_OUT_FEATURES);
const eatOutSortOptions = new Set<string>(EAT_OUT_SORT_OPTIONS);

function parseIntentObject(raw: string): Record<string, unknown> | null {
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return parsed as Record<string, unknown>;
}

function isAllowedEatOutRating(value: unknown): value is 3 | 3.5 | 4 | 4.5 {
  return typeof value === 'number' && [3, 3.5, 4, 4.5].includes(value);
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

  if (isAllowedEatOutRating(parsed.minRating)) {
    intent.minRating = parsed.minRating;
  }

  if (
    typeof parsed.maxBudgetLevel === 'number' &&
    Number.isInteger(parsed.maxBudgetLevel) &&
    parsed.maxBudgetLevel >= 1 &&
    parsed.maxBudgetLevel <= 4
  ) {
    intent.maxBudgetLevel = parsed.maxBudgetLevel as 1 | 2 | 3 | 4;
  }

  if (
    typeof parsed.partySize === 'number' &&
    Number.isInteger(parsed.partySize) &&
    parsed.partySize >= 1 &&
    parsed.partySize <= 12
  ) {
    intent.partySize = parsed.partySize;
  }

  if (Array.isArray(parsed.features)) {
    const features = parsed.features
      .filter(
        (value): value is NonNullable<EatOutSemanticIntent['features']>[number] =>
          typeof value === 'string' && eatOutFeatureIds.has(value),
      )
      .slice(0, 4);

    if (features.length > 0) {
      intent.features = features;
    }
  }

  if (typeof parsed.sortBy === 'string' && eatOutSortOptions.has(parsed.sortBy)) {
    intent.sortBy = parsed.sortBy as EatOutSemanticIntent['sortBy'];
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

export function parseEatOutRerank(
  raw: string,
  validIds: readonly string[],
): EatOutRerankEntry[] | null {
  const parsed = parseIntentObject(raw);
  if (!parsed) return null;

  if (!Array.isArray(parsed.recommendations)) {
    return null;
  }

  const validIdSet = new Set(validIds);
  const seen = new Set<string>();
  const recommendations: EatOutRerankEntry[] = [];

  for (const item of parsed.recommendations) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const id = typeof item.id === 'string' ? item.id : null;
    const reason = typeof item.reason === 'string' ? normalizeSearchQuery(item.reason) : null;
    if (!id || !reason || !validIdSet.has(id) || seen.has(id)) {
      continue;
    }

    seen.add(id);
    recommendations.push({ id, reason });

    if (recommendations.length >= 8) {
      break;
    }
  }

  return recommendations.length > 0 ? recommendations : null;
}
