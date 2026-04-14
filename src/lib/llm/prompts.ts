import { categories } from '@/data/categories';
import { getCondensedFoodCatalog, getCookCategoryGuide } from '@/lib/llm/food-catalog';
import {
  COOK_MEAL_TIMES,
  COOK_MOODS,
  EAT_OUT_FEATURES,
  EAT_OUT_SORT_OPTIONS,
} from '@/lib/llm/types';
import type { Locale } from '@/types/food';

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
    minRating: { type: 'number', enum: [3, 3.5, 4, 4.5] },
    maxBudgetLevel: { type: 'integer', enum: [1, 2, 3, 4] },
    partySize: { type: 'integer', minimum: 1, maximum: 12 },
    features: {
      type: 'array',
      items: { type: 'string', enum: EAT_OUT_FEATURES },
      maxItems: 4,
      uniqueItems: true,
    },
    sortBy: { type: 'string', enum: EAT_OUT_SORT_OPTIONS },
  },
});

export const EAT_OUT_RERANK_SCHEMA = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['id', 'reason'],
      },
    },
  },
  required: ['recommendations'],
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
  const featureGuide = [
    'wifi: WiFi or internet',
    'lunch: lunch set or lunch service',
    'private_room: private room',
    'english: English menu or English support',
    'non_smoking: non-smoking',
    'card: credit card accepted',
    'parking: parking available',
    'barrier_free: accessible or barrier-free',
    'course: set course',
    'free_drink: all-you-can-drink',
    'free_food: buffet or all-you-can-eat',
  ].join('\n');

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
      'Only set minRating when the user clearly asks for highly rated places.',
      'Only set maxBudgetLevel when the user clearly wants budget-friendly places, and use 1-4 where more yen signs mean more expensive.',
      'Only set partySize when the request clearly mentions group size or seats.',
      'Valid feature ids:',
      featureGuide,
      `Valid sortBy values: ${EAT_OUT_SORT_OPTIONS.join(', ')}`,
    ].join('\n'),
  };
}

function getReasonLanguage(locale: Locale): string {
  switch (locale) {
    case 'zh-CN':
      return 'Simplified Chinese';
    case 'ja':
      return 'Japanese';
    case 'en':
      return 'English';
  }
}

export function buildEatOutRerankPrompt({
  locale,
  goalSummary,
  tasteProfileSummary,
  candidateCatalog,
}: {
  locale: Locale;
  goalSummary: string;
  tasteProfileSummary?: string | null;
  candidateCatalog: string;
}): {
  system: string;
  user: string;
} {
  return {
    system:
      'You rerank nearby restaurant candidates for a meal recommendation app. Return JSON only. Use only the listed candidate ids. Prefer places that match the request well, are currently open when requested, and are less recently visited when otherwise similar.',
    user: [
      `Write reason text in ${getReasonLanguage(locale)}.`,
      `Ranking goal: ${goalSummary}`,
      tasteProfileSummary ? `User taste profile: ${tasteProfileSummary}` : null,
      'Return at most 8 recommendations in best-first order.',
      'Each reason must be short, concrete, and based only on the listed candidate data.',
      'Candidate restaurants:',
      candidateCatalog,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
