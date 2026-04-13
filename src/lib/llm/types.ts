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
}

export interface SemanticSearchResult<TIntent> {
  mode: 'semantic' | 'fallback';
  intent: TIntent | null;
  error?: string;
}

export interface LlmSupportResult {
  supported: boolean;
  message: string;
}
