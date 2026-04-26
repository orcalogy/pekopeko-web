import { deriveRecommendationProfile } from '@/lib/recommendation/profile';
import type { AspectPreferenceOverrides, DerivedTasteProfile } from '@/lib/recommendation/types';
import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';

export type RestaurantTasteProfile = DerivedTasteProfile;

export function deriveRestaurantTasteProfile(
  records: VisitRecord[],
  feedbackEvents: FeedbackEvent[],
  overrides?: Partial<AspectPreferenceOverrides>,
): RestaurantTasteProfile | null {
  return deriveRecommendationProfile(records, feedbackEvents, overrides);
}

export function buildRestaurantTasteProfilePromptSummary(
  profile: RestaurantTasteProfile | null,
): string | null {
  if (!profile || (profile.totalVisits === 0 && profile.totalFeedbackEvents === 0)) {
    return null;
  }

  const parts = [
    profile.totalVisits > 0 ? `${profile.totalVisits} visits recorded` : null,
    profile.totalFeedbackEvents > 0
      ? `${profile.totalFeedbackEvents} explicit feedback events`
      : null,
    profile.topCuisines.length > 0 ? `often prefers ${profile.topCuisines.join(', ')}` : null,
    profile.avoidedCuisines.length > 0
      ? `often avoids ${profile.avoidedCuisines.join(', ')}`
      : null,
    profile.topFeatures.length > 0 ? `often values ${profile.topFeatures.join(', ')}` : null,
    profile.avoidedFeatures.length > 0 ? `often skips ${profile.avoidedFeatures.join(', ')}` : null,
    profile.preferredAspects.length > 0
      ? `often values aspects ${profile.preferredAspects.join(', ')}`
      : null,
    profile.avoidedAspects.length > 0
      ? `often avoids aspects ${profile.avoidedAspects.join(', ')}`
      : null,
    profile.alwaysConsiderAspects.length > 0
      ? `always consider ${profile.alwaysConsiderAspects.join(', ')}`
      : null,
    profile.preferredPriceLevel ? `usual budget ${'¥'.repeat(profile.preferredPriceLevel)}` : null,
    profile.typicalDistanceMeters != null
      ? `typically chooses places around ${profile.typicalDistanceMeters}m away`
      : null,
    `novelty preference ${profile.noveltyPreference}`,
  ].filter(Boolean);

  return parts.join('; ');
}
