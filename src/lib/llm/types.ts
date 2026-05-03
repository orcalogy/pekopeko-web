import type { MealTime, Mood } from '@/types/food';
import type { MapProviderType } from '@/types/restaurant';

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
export const EAT_OUT_MISSING_INFO = [
  'budget',
  'occasion',
  'distance',
  'cuisine',
  'partySize',
  'ambience',
  'openingHours',
  'dietary',
] as const;
export const EAT_OUT_SOFT_PREFERENCES = [
  'light',
  'gentle',
  'warm',
  'soup',
  'small_portion',
  'quick',
  'healthy',
  'quiet',
  'wifi',
  'solo_friendly',
  'non_smoking',
  'budget_friendly',
  'high_rating',
  'nearby',
  'familiar',
  'novel',
] as const;
export const EAT_OUT_AVOID_PREFERENCES = [
  'spicy',
  'fried',
  'heavy',
  'rich',
  'large_portion',
  'alcohol_focused',
  'bbq',
  'hotpot',
  'fastfood',
  'noisy',
  'crowded',
  'expensive',
  'recently_visited',
  'previously_rejected',
] as const;
export const EAT_OUT_OCCASIONS = [
  'solo',
  'date',
  'friends',
  'family',
  'work',
  'quick_meal',
  'comfort',
  'low_appetite',
] as const;
export const EAT_OUT_HARD_CONSTRAINTS = [
  'open_now',
  'budget',
  'party_size',
  'required_feature',
  'avoid_cuisine',
  'dietary',
] as const;
export const PERSONAL_PREFERENCE_MODES = ['auto', 'prefer', 'ignore', 'explore'] as const;
export const EAT_OUT_DIETARY_INTENTS = [
  'vegetarian',
  'vegan',
  'halal',
  'gluten_free',
  'seafood_free',
  'meat_free',
] as const;
export const COOK_SOFT_PREFERENCES = [
  'light',
  'gentle',
  'warm',
  'soup',
  'quick',
  'easy',
  'healthy',
  'low_spice',
  'comfort',
  'simple_ingredients',
] as const;
export const COOK_AVOID_PREFERENCES = [
  'spicy',
  'fried',
  'heavy',
  'rich',
  'large_portion',
  'bbq',
  'hotpot',
  'fastfood',
] as const;
export const SPATIAL_INTENT_TYPES = [
  'near_current_location',
  'near_landmark',
  'near_station',
  'along_route',
  'between_people',
] as const;
export const SPATIAL_IMPORTANCE = ['hard', 'soft'] as const;

export type EatOutFeature = (typeof EAT_OUT_FEATURES)[number];
export type EatOutSortOption = (typeof EAT_OUT_SORT_OPTIONS)[number];
export type EatOutMissingInfo = (typeof EAT_OUT_MISSING_INFO)[number];
export type EatOutSoftPreference = (typeof EAT_OUT_SOFT_PREFERENCES)[number];
export type EatOutAvoidPreference = (typeof EAT_OUT_AVOID_PREFERENCES)[number];
export type EatOutOccasion = (typeof EAT_OUT_OCCASIONS)[number];
export type EatOutHardConstraint = (typeof EAT_OUT_HARD_CONSTRAINTS)[number];
export type PersonalPreferenceMode = (typeof PERSONAL_PREFERENCE_MODES)[number];
export type EatOutDietaryIntent = (typeof EAT_OUT_DIETARY_INTENTS)[number];
export type CookSoftPreference = (typeof COOK_SOFT_PREFERENCES)[number];
export type CookAvoidPreference = (typeof COOK_AVOID_PREFERENCES)[number];
export type SpatialIntentType = (typeof SPATIAL_INTENT_TYPES)[number];
export type SpatialIntentImportance = (typeof SPATIAL_IMPORTANCE)[number];

export interface EatOutClarifyingQuestion {
  question: string;
  options: string[];
}

export interface SpatialIntent {
  type: SpatialIntentType;
  anchorText?: string;
  maxWalkMinutes?: number;
  radiusM?: number;
  importance: SpatialIntentImportance;
}

export interface EatOutQueryExpansion {
  primaryKeyword?: string;
  providerQueries?: Partial<Record<MapProviderType, string[]>>;
  hardFilters?: Array<'openNow'>;
  softPreferences?: EatOutSoftPreference[];
}

export interface EatOutRefinementPatch {
  operation: 'refine';
  addSoftPreferences?: EatOutSoftPreference[];
  removeCuisines?: string[];
  maxBudgetLevel?: 1 | 2 | 3 | 4;
  partySize?: number;
  openNow?: boolean;
  spatialIntent?: SpatialIntent;
  rerankOnly?: boolean;
}

export interface RestaurantFactCard {
  id: string;
  name: string;
  distanceM?: number;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  openNow?: boolean;
  cuisine?: string;
  features: string[];
  ambienceHints?: string[];
  occasionHints?: string[];
  providerConfidence: 'high' | 'medium' | 'low';
  missingFacts: string[];
  deterministicReasons: string[];
  preferenceEvidence?: string[];
  riskEvidence?: string[];
  profileEvidence?: string[];
  sessionEvidence?: string[];
}

export interface SearchSessionGoal {
  originalQuery?: string;
  currentConstraints: Record<string, unknown>;
  softPreferences: string[];
  rejectedAspects: string[];
  acceptedRefinements: string[];
}

export type LlmAvailabilityState =
  | 'flag-disabled'
  | 'idle'
  | 'checking-support'
  | 'supported'
  | 'unsupported';

export type LlmRuntimeState =
  | 'idle'
  | 'disabled'
  | 'loading-model'
  | 'ready'
  | 'parsing'
  | 'generating'
  | 'error';

export type LlmActiveTask = 'cook' | 'eat-out' | 'settings' | null;

export interface CookSemanticIntent {
  keyword?: string;
  mood?: Mood;
  category?: string;
  maxSpicy?: 0 | 1 | 2 | 3;
  mealTime?: MealTime;
  cookableOnly?: boolean;
  recommendedIds?: string[];
  softPreferences?: CookSoftPreference[];
  avoidPreferences?: CookAvoidPreference[];
  occasion?: 'comfort' | 'low_appetite' | 'quick_meal';
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
  confidence: number;
  missingInfo?: EatOutMissingInfo[];
  clarifyingQuestion?: EatOutClarifyingQuestion;
  spatialIntent?: SpatialIntent;
  queryExpansion?: EatOutQueryExpansion;
  hardConstraints?: EatOutHardConstraint[];
  softPreferences?: EatOutSoftPreference[];
  avoidPreferences?: EatOutAvoidPreference[];
  avoidCuisines?: string[];
  personalPreferenceMode?: PersonalPreferenceMode;
  occasion?: EatOutOccasion;
  dietaryIntent?: EatOutDietaryIntent[];
}

export interface EatOutRerankEntry {
  id: string;
  reason: string;
  score: number;
  matched: string[];
  tradeoffs: string[];
  confidence: number;
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
