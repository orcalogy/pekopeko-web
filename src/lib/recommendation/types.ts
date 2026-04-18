import type { Restaurant } from '@/types/restaurant';

export type FeedbackKind = 'liked_after_visit' | 'disliked_after_visit' | 'not_interested';

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
