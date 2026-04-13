import { getCategoryById } from '@/data/categories';
import type { Food } from '@/types/food';

export function normalizeSearchQuery(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getFoodSearchText(food: Food): string {
  const category = getCategoryById(food.category);

  return normalizeForMatch(
    [
      food.id,
      food.category,
      food.subcategory,
      ...Object.values(food.name),
      ...food.tags,
      ...food.region,
      ...Object.values(food.description ?? {}),
      ...Object.values(food.funFact ?? {}),
      ...(category ? Object.values(category.name) : []),
    ].join(' '),
  );
}

export function filterFoodsByKeyword(foods: Food[], query: string): Food[] {
  const normalizedQuery = normalizeForMatch(normalizeSearchQuery(query));

  if (!normalizedQuery) {
    return foods;
  }

  const tokens = normalizedQuery.split(' ');

  return foods.filter((food) => {
    const haystack = getFoodSearchText(food);

    return tokens.every((token) => haystack.includes(token));
  });
}

export function combineKeywordTerms(
  ...values: Array<string | null | undefined>
): string | undefined {
  const combined: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = normalizeSearchQuery(value);
    if (!trimmed) continue;

    const normalized = normalizeForMatch(trimmed);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    combined.push(trimmed);
  }

  return combined.length > 0 ? combined.join(' ') : undefined;
}
