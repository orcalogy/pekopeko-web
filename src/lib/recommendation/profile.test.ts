import assert from 'node:assert/strict';
import test from 'node:test';
import { mockFeedbackEvents, mockVisitRecords } from '../llm/restaurant-fixtures.test-data.ts';
import { deriveRecommendationProfile } from './profile.ts';

test('derives aspect-level preferences from feedback', () => {
  const profile = deriveRecommendationProfile(mockVisitRecords, mockFeedbackEvents);

  assert.equal(profile?.preferredAspects.includes('taste'), true);
  assert.equal(profile?.avoidedAspects.includes('not_my_mood'), true);
  assert.equal(profile?.recentlyRejectedAspects.includes('distance'), true);
});

test('applies local aspect overrides', () => {
  const profile = deriveRecommendationProfile(mockVisitRecords, mockFeedbackEvents, {
    pinnedPreferredAspects: ['access'],
    hiddenAspects: ['taste'],
    alwaysConsiderAspects: ['opening_hours'],
  });

  assert.equal(profile?.preferredAspects.includes('access'), true);
  assert.equal(profile?.preferredAspects.includes('taste'), false);
  assert.deepEqual(profile?.alwaysConsiderAspects, ['opening_hours']);
});

test('keeps pinned aspect preferences without feedback history', () => {
  const profile = deriveRecommendationProfile([], [], {
    pinnedPreferredAspects: ['access'],
    hiddenAspects: [],
    alwaysConsiderAspects: ['opening_hours'],
  });

  assert.equal(profile?.preferredAspects.includes('access'), true);
  assert.deepEqual(profile?.alwaysConsiderAspects, ['opening_hours']);
});
