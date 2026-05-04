import { formatRestaurantFactCardsForRerank } from '@/lib/llm/restaurant-shortlist';
import type {
  CookSemanticIntent,
  EatOutRefinementPatch,
  EatOutSemanticIntent,
} from '@/lib/llm/types';
import type { Locale } from '@/types/food';
import { mockFactCards } from './restaurant-fixtures.test-data.ts';

export type GoldenKind = 'cook' | 'eat-out-intent' | 'eat-out-refinement' | 'eat-out-rerank';

export interface BaseGoldenCase {
  id: string;
  kind: GoldenKind;
  locale: Locale;
}

export interface CookGoldenCase extends BaseGoldenCase {
  kind: 'cook';
  query: string;
  expected: Partial<CookSemanticIntent>;
}

export interface EatOutIntentGoldenCase extends BaseGoldenCase {
  kind: 'eat-out-intent';
  query: string;
  expected: Partial<EatOutSemanticIntent>;
  minConfidence?: number;
  forbiddenHardFilters?: Array<keyof EatOutSemanticIntent>;
}

export interface EatOutRefinementGoldenCase extends BaseGoldenCase {
  kind: 'eat-out-refinement';
  query: string;
  currentGoalSummary: string;
  expected: Partial<EatOutRefinementPatch>;
}

export interface EatOutRerankGoldenCase extends BaseGoldenCase {
  kind: 'eat-out-rerank';
  goalSummary: string;
  candidateCatalog: string;
  validIds: string[];
  expected: {
    topIds: string[];
    matchedIncludes?: string[];
    minConfidence?: number;
  };
}

export type LlmGoldenCase =
  | CookGoldenCase
  | EatOutIntentGoldenCase
  | EatOutRefinementGoldenCase
  | EatOutRerankGoldenCase;

export const cookGoldenCases = [
  {
    id: 'cook-en-spicy-noodles',
    kind: 'cook',
    locale: 'en',
    query: 'warm spicy noodles for dinner',
    expected: { keyword: 'noodles', category: 'noodles', mealTime: 'dinner', maxSpicy: 2 },
  },
  {
    id: 'cook-en-comfort-soup',
    kind: 'cook',
    locale: 'en',
    query: 'comforting soup when I am tired',
    expected: { mood: 'comfort', mealTime: 'dinner', cookableOnly: true },
  },
  {
    id: 'cook-ja-breakfast-rice',
    kind: 'cook',
    locale: 'ja',
    query: '朝ごはんに軽いご飯もの',
    expected: { keyword: 'rice', mealTime: 'breakfast', cookableOnly: true },
  },
  {
    id: 'cook-ja-adventure',
    kind: 'cook',
    locale: 'ja',
    query: '今日はちょっと冒険したい',
    expected: { mood: 'adventurous' },
  },
  {
    id: 'cook-zh-quick',
    kind: 'cook',
    locale: 'zh-CN',
    query: '想吃快手一点的家常饭',
    expected: { cookableOnly: true },
  },
  {
    id: 'cook-zh-not-spicy',
    kind: 'cook',
    locale: 'zh-CN',
    query: '不要太辣的面',
    expected: { category: 'noodles', maxSpicy: 1 },
  },
  {
    id: 'cook-en-dessert',
    kind: 'cook',
    locale: 'en',
    query: 'something sweet after lunch',
    expected: { category: 'dessert', mealTime: 'afternoon' },
  },
  {
    id: 'cook-zh-comfort',
    kind: 'cook',
    locale: 'zh-CN',
    query: '今天有点累，想吃治愈的',
    expected: { mood: 'comfort' },
  },
  {
    id: 'cook-ja-low-appetite',
    kind: 'cook',
    locale: 'ja',
    query: '食欲ない',
    expected: {
      mood: 'tired',
      maxSpicy: 0,
      occasion: 'low_appetite',
      softPreferences: ['gentle', 'soup'],
      avoidPreferences: ['heavy'],
    },
  },
] satisfies CookGoldenCase[];

export const eatOutIntentGoldenCases = [
  {
    id: 'eat-en-work-cafe',
    kind: 'eat-out-intent',
    locale: 'en',
    query: 'quiet cafe where I can work',
    expected: {
      keyword: 'cafe',
      category: 'cafe',
      features: ['wifi'],
      softPreferences: ['quiet'],
    },
    minConfidence: 0.45,
    forbiddenHardFilters: ['openNow'],
  },
  {
    id: 'eat-en-open-healthy',
    kind: 'eat-out-intent',
    locale: 'en',
    query: 'something healthy and open now',
    expected: { openNow: true },
    minConfidence: 0.45,
  },
  {
    id: 'eat-ja-cheap-solo',
    kind: 'eat-out-intent',
    locale: 'ja',
    query: '新宿駅の近くで安くて一人で入りやすい店',
    expected: {
      maxBudgetLevel: 2,
      partySize: 1,
      spatialIntent: { type: 'near_station', importance: 'soft' },
    },
    minConfidence: 0.45,
  },
  {
    id: 'eat-ja-group-izakaya',
    kind: 'eat-out-intent',
    locale: 'ja',
    query: '今日は友達4人で行ける居酒屋',
    expected: { keyword: '居酒屋', partySize: 4 },
    minConfidence: 0.45,
  },
  {
    id: 'eat-zh-no-ramen-near-station',
    kind: 'eat-out-intent',
    locale: 'zh-CN',
    query: '不要拉面，离车站近一点',
    expected: { spatialIntent: { type: 'near_station', importance: 'soft' } },
    minConfidence: 0.35,
  },
  {
    id: 'eat-zh-cheap-friends',
    kind: 'eat-out-intent',
    locale: 'zh-CN',
    query: '四个人吃便宜一点的中餐',
    expected: { category: 'chinese', partySize: 4, maxBudgetLevel: 2 },
    minConfidence: 0.45,
  },
  {
    id: 'eat-en-high-rating',
    kind: 'eat-out-intent',
    locale: 'en',
    query: 'best rated sushi nearby',
    expected: { category: 'japanese', minRating: 4 },
    minConfidence: 0.45,
  },
  {
    id: 'eat-zh-late-night',
    kind: 'eat-out-intent',
    locale: 'zh-CN',
    query: '现在还开着的夜宵',
    expected: { openNow: true },
    minConfidence: 0.45,
  },
  {
    id: 'eat-ja-low-appetite',
    kind: 'eat-out-intent',
    locale: 'ja',
    query: '食欲ない',
    expected: {
      occasion: 'low_appetite',
      softPreferences: ['gentle', 'soup'],
      avoidPreferences: ['heavy', 'spicy'],
    },
    minConfidence: 0.45,
    forbiddenHardFilters: ['keyword', 'category'],
  },
] satisfies EatOutIntentGoldenCase[];

export const eatOutRefinementGoldenCases = [
  {
    id: 'refine-en-cheaper',
    kind: 'eat-out-refinement',
    locale: 'en',
    currentGoalSummary: 'keyword: cafe; search radius 2 km',
    query: 'make it cheaper',
    expected: { operation: 'refine', maxBudgetLevel: 2 },
  },
  {
    id: 'refine-en-wifi',
    kind: 'eat-out-refinement',
    locale: 'en',
    currentGoalSummary: 'keyword: cafe; search radius 2 km',
    query: 'with wifi and quieter',
    expected: { operation: 'refine', addSoftPreferences: ['wifi', 'quiet'], rerankOnly: true },
  },
  {
    id: 'refine-ja-party',
    kind: 'eat-out-refinement',
    locale: 'ja',
    currentGoalSummary: 'keyword: izakaya; search radius 2 km',
    query: '4人で入れるところ',
    expected: { operation: 'refine', partySize: 4 },
  },
  {
    id: 'refine-zh-distance',
    kind: 'eat-out-refinement',
    locale: 'zh-CN',
    currentGoalSummary: 'keyword: cafe; search radius 2 km',
    query: '500米以内',
    expected: {
      operation: 'refine',
      spatialIntent: { type: 'near_current_location', radiusM: 500, importance: 'hard' },
    },
  },
] satisfies EatOutRefinementGoldenCase[];

export const eatOutRerankGoldenCases = [
  {
    id: 'rerank-en-work-cafe',
    kind: 'eat-out-rerank',
    locale: 'en',
    goalSummary: 'keyword: cafe; soft preferences: quiet, wifi; search radius 500 m',
    candidateCatalog: formatRestaurantFactCardsForRerank(mockFactCards),
    validIds: mockFactCards.map((card) => card.id),
    expected: {
      topIds: ['rid-cafe-1'],
      matchedIncludes: ['wifi'],
      minConfidence: 0.45,
    },
  },
  {
    id: 'rerank-ja-open-rating',
    kind: 'eat-out-rerank',
    locale: 'ja',
    goalSummary: 'open now only; minimum rating 4; search radius 1 km',
    candidateCatalog: formatRestaurantFactCardsForRerank(mockFactCards),
    validIds: mockFactCards.map((card) => card.id),
    expected: {
      topIds: ['rid-cafe-1'],
      minConfidence: 0.45,
    },
  },
  {
    id: 'rerank-zh-avoid-ramen',
    kind: 'eat-out-rerank',
    locale: 'zh-CN',
    goalSummary: 'rejected: ramen; soft preferences: near station; search radius 1 km',
    candidateCatalog: formatRestaurantFactCardsForRerank(mockFactCards),
    validIds: mockFactCards.map((card) => card.id),
    expected: {
      topIds: ['rid-cafe-1'],
      minConfidence: 0.35,
    },
  },
  {
    id: 'rerank-en-budget',
    kind: 'eat-out-rerank',
    locale: 'en',
    goalSummary: 'budget at most ¥¥; prefer strong taste-profile matches when otherwise similar',
    candidateCatalog: formatRestaurantFactCardsForRerank(mockFactCards),
    validIds: mockFactCards.map((card) => card.id),
    expected: {
      topIds: ['rid-cafe-1'],
      minConfidence: 0.35,
    },
  },
] satisfies EatOutRerankGoldenCase[];

export const llmGoldenCases = [
  ...cookGoldenCases,
  ...eatOutIntentGoldenCases,
  ...eatOutRefinementGoldenCases,
  ...eatOutRerankGoldenCases,
] satisfies LlmGoldenCase[];

export const LLM_GOLDEN_CASE_COUNT = 26;
