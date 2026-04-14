import type { MealTime, Mood } from '@/types/food';

export const COOK_MOODS = [
  'happy',
  'sad',
  'tired',
  'stressed',
  'adventurous',
  'comfort',
] as const satisfies readonly Mood[];

export const COOK_MEAL_TIMES = [
  'breakfast',
  'lunch',
  'afternoon',
  'dinner',
  'latenight',
] as const satisfies readonly MealTime[];

export const EAT_OUT_FEATURES = [
  'wifi',
  'lunch',
  'private_room',
  'english',
  'non_smoking',
  'card',
  'parking',
  'barrier_free',
  'course',
  'free_drink',
  'free_food',
] as const;

export const EAT_OUT_SORT_OPTIONS = ['distance', 'rating'] as const;

export type EatOutFeature = (typeof EAT_OUT_FEATURES)[number];
export type EatOutSortOption = (typeof EAT_OUT_SORT_OPTIONS)[number];

export type LlmAvailabilityState =
  | 'flag-disabled'
  | 'idle'
  | 'checking-support'
  | 'supported'
  | 'unsupported';

export type LlmRuntimeState = 'idle' | 'disabled' | 'loading-model' | 'ready' | 'parsing' | 'error';

export type LlmActiveTask = 'cook' | 'eat-out' | 'settings' | null;

export interface CookSemanticIntent {
  keyword?: string;
  mood?: Mood;
  category?: string;
  maxSpicy?: 0 | 1 | 2 | 3;
  mealTime?: MealTime;
  cookableOnly?: boolean;
  recommendedIds?: string[];
}

export interface EatOutSemanticIntent {
  keyword?: string;
  category?: string;
  openNow?: boolean;
  minRating?: 3 | 3.5 | 4 | 4.5;
  maxBudgetLevel?: 1 | 2 | 3 | 4;
  partySize?: number;
  features?: EatOutFeature[];
  sortBy?: EatOutSortOption;
}

export interface EatOutRerankEntry {
  id: string;
  reason: string;
}

export interface SemanticSearchResult<TIntent> {
  mode: 'semantic' | 'fallback';
  intent: TIntent | null;
  error?: string;
}

export interface SemanticRerankResult<TItem> {
  mode: 'semantic' | 'fallback';
  items: TItem[];
  error?: string;
}

export interface LlmSupportResult {
  supported: boolean;
  message: string;
}
