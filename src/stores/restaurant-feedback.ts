import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  buildRestaurantPreferenceSnapshot,
  getRestaurantIdentityKey,
} from '@/lib/recommendation/identity';
import type { FeedbackKind, RestaurantPreferenceSnapshot } from '@/lib/recommendation/types';
import type { Restaurant } from '@/types/restaurant';

export interface FeedbackContext {
  queryKeyword?: string;
  categoryId?: string;
  openNow?: boolean;
  partySize?: number;
}

export interface FeedbackEvent {
  id: string;
  restaurantKey: string;
  providerId?: string;
  name: string;
  kind: FeedbackKind;
  createdAt: number;
  snapshot?: RestaurantPreferenceSnapshot;
  context?: FeedbackContext;
}

export type FeedbackRestaurantInput = Pick<
  Restaurant,
  | 'id'
  | 'restaurantKey'
  | 'name'
  | 'cuisineType'
  | 'features'
  | 'priceLevel'
  | 'distance'
  | 'source'
>;

interface RestaurantFeedbackState {
  events: FeedbackEvent[];
  addFeedback: (input: {
    restaurant: FeedbackRestaurantInput;
    kind: FeedbackKind;
    context?: FeedbackContext;
  }) => void;
  removeEvent: (eventId: string) => void;
  clearAll: () => void;
}

function sanitizeFeedbackKind(value: unknown): FeedbackKind | null {
  return value === 'liked_after_visit' ||
    value === 'disliked_after_visit' ||
    value === 'not_interested'
    ? value
    : null;
}

function buildFeedbackEventId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const useRestaurantFeedback = create<RestaurantFeedbackState>()(
  persist(
    (set) => ({
      events: [],

      addFeedback: ({ restaurant, kind, context }) =>
        set((state) => {
          const restaurantKey = getRestaurantIdentityKey(restaurant);
          if (!restaurantKey) {
            return state;
          }

          return {
            events: [
              ...state.events,
              {
                id: buildFeedbackEventId(),
                restaurantKey,
                providerId: restaurant.id,
                name: restaurant.name,
                kind,
                createdAt: Date.now(),
                snapshot: buildRestaurantPreferenceSnapshot(restaurant),
                context,
              },
            ],
          };
        }),

      removeEvent: (eventId) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== eventId),
        })),

      clearAll: () => set({ events: [] }),
    }),
    {
      name: 'pekopeko-restaurant-feedback',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<RestaurantFeedbackState> | undefined;

        return {
          events:
            state?.events?.flatMap((event) => {
              const kind = sanitizeFeedbackKind(event.kind);
              const snapshotSource =
                event.snapshot?.source === 'google' ||
                event.snapshot?.source === 'hotpepper' ||
                event.snapshot?.source === 'amap' ||
                event.snapshot?.source === 'hybrid'
                  ? event.snapshot.source
                  : undefined;
              const providerId =
                typeof event.providerId === 'string' ? event.providerId : undefined;
              const restaurantKey = getRestaurantIdentityKey({
                id: providerId,
                restaurantKey:
                  typeof event.restaurantKey === 'string' ? event.restaurantKey : undefined,
                source: snapshotSource,
              });

              if (!kind || !restaurantKey) {
                return [];
              }

              return [
                {
                  id:
                    typeof event.id === 'string' && event.id.trim()
                      ? event.id
                      : buildFeedbackEventId(),
                  restaurantKey,
                  providerId,
                  name: typeof event.name === 'string' ? event.name : '',
                  kind,
                  createdAt:
                    typeof event.createdAt === 'number' && Number.isFinite(event.createdAt)
                      ? event.createdAt
                      : Date.now(),
                  snapshot:
                    event.snapshot && typeof event.snapshot === 'object'
                      ? {
                          cuisineType:
                            typeof event.snapshot.cuisineType === 'string'
                              ? event.snapshot.cuisineType
                              : undefined,
                          features: Array.isArray(event.snapshot.features)
                            ? event.snapshot.features.filter(
                                (value): value is string => typeof value === 'string',
                              )
                            : undefined,
                          priceLevel:
                            typeof event.snapshot.priceLevel === 'number'
                              ? event.snapshot.priceLevel
                              : undefined,
                          distance:
                            typeof event.snapshot.distance === 'number'
                              ? event.snapshot.distance
                              : undefined,
                          source: snapshotSource,
                        }
                      : undefined,
                  context:
                    event.context && typeof event.context === 'object'
                      ? {
                          queryKeyword:
                            typeof event.context.queryKeyword === 'string'
                              ? event.context.queryKeyword
                              : undefined,
                          categoryId:
                            typeof event.context.categoryId === 'string'
                              ? event.context.categoryId
                              : undefined,
                          openNow:
                            typeof event.context.openNow === 'boolean'
                              ? event.context.openNow
                              : undefined,
                          partySize:
                            typeof event.context.partySize === 'number'
                              ? event.context.partySize
                              : undefined,
                        }
                      : undefined,
                } satisfies FeedbackEvent,
              ];
            }) ?? [],
        } satisfies Pick<RestaurantFeedbackState, 'events'>;
      },
    },
  ),
);
