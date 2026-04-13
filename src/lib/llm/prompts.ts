import { categories } from '@/data/categories';
import { getCondensedFoodCatalog, getCookCategoryGuide } from '@/lib/llm/food-catalog';
import { COOK_MEAL_TIMES, COOK_MOODS } from '@/lib/llm/types';

export const COOK_INTENT_SCHEMA = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  properties: {
    keyword: { type: 'string' },
    mood: { type: 'string', enum: COOK_MOODS },
    category: { type: 'string', enum: categories.map((category) => category.id) },
    maxSpicy: { type: 'integer', enum: [0, 1, 2, 3] },
    mealTime: { type: 'string', enum: COOK_MEAL_TIMES },
    cookableOnly: { type: 'boolean' },
    recommendedIds: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
  },
});

export const EAT_OUT_INTENT_SCHEMA = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  properties: {
    keyword: { type: 'string' },
    category: { type: 'string', enum: categories.map((category) => category.id) },
    openNow: { type: 'boolean' },
  },
});

export function buildCookPrompt(query: string): {
  system: string;
  user: string;
} {
  return {
    system:
      'You convert cooking-related food requests into strict JSON filters for a recommendation app. Return JSON only. Never invent enum values. Omit fields when uncertain. Keep keyword short and useful for fallback matching.',
    user: [
      `User query: ${query}`,
      'Return a JSON object that matches the schema exactly.',
      `Valid mood ids: ${COOK_MOODS.join(', ')}`,
      `Valid mealTime ids: ${COOK_MEAL_TIMES.join(', ')}`,
      'Valid category ids:',
      getCookCategoryGuide(),
      'Set cookableOnly=true for home-cooking suggestions.',
      'Only use recommendedIds when you are confident they exactly match the examples below.',
      'Condensed food catalog:',
      getCondensedFoodCatalog(),
    ].join('\n'),
  };
}

export function buildEatOutPrompt(query: string): {
  system: string;
  user: string;
} {
  const categoryGuide = categories
    .map(
      (category) =>
        `${category.id}: ${category.name.en} / ${category.name['zh-CN']} / ${category.name.ja}`,
    )
    .join('\n');

  return {
    system:
      'You convert restaurant search requests into strict JSON for a nearby-search app. Return JSON only. Omit fields when uncertain. Keep keyword short and useful for a location search API.',
    user: [
      `User query: ${query}`,
      'Return a JSON object that matches the schema exactly.',
      'Valid category ids:',
      categoryGuide,
      'Only set openNow=true when the request clearly asks for places that are open right now, late-night, or currently available.',
      'If the request is mostly about a cuisine or place type, put that into keyword and optionally category.',
    ].join('\n'),
  };
}
