import type { Restaurant } from '@/types/restaurant';

export type FeedbackKind = 'liked_after_visit' | 'disliked_after_visit' | 'not_interested';
export const FEEDBACK_ASPECTS = [
  'taste',
  'price',
  'distance',
  'ambience',
  'noise',
  'crowd',
  'service',
  'solo',
  'group',
  'dietary',
  'access',
  'opening_hours',
  'not_my_mood',
] as const;

export type FeedbackAspect = (typeof FEEDBACK_ASPECTS)[number];

export interface AspectPreferenceOverrides {
  pinnedPreferredAspects: FeedbackAspect[];
  hiddenAspects: FeedbackAspect[];
  alwaysConsiderAspects: FeedbackAspect[];
}

export interface RestaurantPreferenceSnapshot {
  cuisineType?: string;
  features?: string[];
  priceLevel?: number;
  distance?: number;
  source?: Restaurant['source'];
}

export interface DerivedTasteProfile {
  totalVisits: number;
  totalFeedbackEvents: number;
  topCuisines: string[];
  avoidedCuisines: string[];
  topFeatures: string[];
  avoidedFeatures: string[];
  preferredPriceLevel?: 1 | 2 | 3 | 4;
  typicalDistanceMeters?: number;
  noveltyPreference: 'low' | 'medium' | 'high';
  aspectScores: Array<{ aspect: FeedbackAspect; score: number }>;
  preferredAspects: FeedbackAspect[];
  avoidedAspects: FeedbackAspect[];
  recentlyRejectedAspects: FeedbackAspect[];
  alwaysConsiderAspects: FeedbackAspect[];
  suppression: {
    restaurantKeys: string[];
  };
}

export type RecommendationReasonCode =
  | 'query_match'
  | 'preferred_cuisine'
  | 'preferred_feature'
  | 'budget_fit'
  | 'distance_fit'
  | 'novel_pick'
  | 'not_recently_visited'
  | 'popular_high_rating'
  | 'suppressed_due_to_feedback';
