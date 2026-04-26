import type { RestaurantFactCard } from '@/lib/llm/types';
import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';

export const multilingualRestaurantQueries = [
  'quiet cafe where I can work',
  '新宿駅の近くで安くて一人で入りやすい店',
  '今日は友達4人で行ける居酒屋',
  '不要拉面，离车站近一点',
  'surprise me but not expensive',
  'something healthy and open now',
];

export const mockRestaurants: Restaurant[] = [
  {
    id: 'google-cafe-1',
    restaurantKey: 'rid-cafe-1',
    name: 'Desk Cafe',
    address: '1 Cafe St',
    lat: 35,
    lng: 139,
    distance: 240,
    rating: 4.4,
    priceLevel: 2,
    isOpenNow: true,
    cuisineType: 'Cafe',
    features: ['wifi', 'non_smoking'],
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-cafe-1' }],
  },
  {
    id: 'google-ramen-1',
    restaurantKey: 'rid-ramen-1',
    name: 'Late Ramen',
    address: '2 Noodle St',
    lat: 35,
    lng: 139,
    distance: 800,
    rating: 3.8,
    priceLevel: 1,
    isOpenNow: false,
    cuisineType: 'Ramen',
    features: [],
    source: 'google',
    providerRefs: [{ provider: 'google', providerId: 'google-ramen-1' }],
  },
  {
    id: 'hotpepper-izakaya-1',
    restaurantKey: 'rid-izakaya-1',
    name: 'Group Izakaya',
    address: '3 Party St',
    lat: 35,
    lng: 139,
    distance: 620,
    priceLevel: 3,
    isOpenNow: true,
    cuisineType: 'Izakaya',
    capacity: 40,
    features: ['private_room', 'free_drink'],
    source: 'hotpepper',
    providerRefs: [{ provider: 'hotpepper', providerId: 'hotpepper-izakaya-1' }],
  },
];

export const mockFactCards: RestaurantFactCard[] = [
  {
    id: 'rid-cafe-1',
    name: 'Desk Cafe',
    distanceM: 240,
    rating: 4.4,
    priceLevel: 2,
    openNow: true,
    cuisine: 'Cafe',
    features: ['wifi', 'non_smoking'],
    ambienceHints: ['non-smoking'],
    occasionHints: [],
    providerConfidence: 'medium',
    missingFacts: ['noise', 'dietary'],
    deterministicReasons: ['query_match', 'popular_high_rating'],
  },
  {
    id: 'rid-ramen-1',
    name: 'Late Ramen',
    distanceM: 800,
    rating: 3.8,
    priceLevel: 1,
    openNow: false,
    cuisine: 'Ramen',
    features: [],
    ambienceHints: [],
    occasionHints: [],
    providerConfidence: 'medium',
    missingFacts: ['wifi', 'noise', 'dietary'],
    deterministicReasons: [],
  },
];

export const mockVisitRecords: VisitRecord[] = [
  {
    restaurantKey: 'rid-ramen-1',
    providerId: 'google-ramen-1',
    name: 'Late Ramen',
    visits: [Date.now() - 2 * 86_400_000],
    snapshot: {
      cuisineType: 'Ramen',
      features: [],
      priceLevel: 1,
      distance: 800,
      source: 'google',
    },
  },
];

export const mockFeedbackEvents: FeedbackEvent[] = [
  {
    id: 'fb-1',
    restaurantKey: 'rid-cafe-1',
    providerId: 'google-cafe-1',
    name: 'Desk Cafe',
    kind: 'liked_after_visit',
    createdAt: Date.now(),
    aspects: ['taste', 'ambience', 'solo'],
    snapshot: {
      cuisineType: 'Cafe',
      features: ['wifi'],
      priceLevel: 2,
      distance: 240,
      source: 'google',
    },
  },
  {
    id: 'fb-2',
    restaurantKey: 'rid-ramen-1',
    providerId: 'google-ramen-1',
    name: 'Late Ramen',
    kind: 'not_interested',
    createdAt: Date.now(),
    aspects: ['not_my_mood', 'distance'],
    snapshot: {
      cuisineType: 'Ramen',
      features: [],
      priceLevel: 1,
      distance: 800,
      source: 'google',
    },
  },
];
