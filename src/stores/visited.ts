import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  buildRestaurantPreferenceSnapshot,
  getRestaurantIdentityKey,
} from '@/lib/recommendation/identity';
import type { RestaurantPreferenceSnapshot } from '@/lib/recommendation/types';
import type { Restaurant } from '@/types/restaurant';

export interface VisitRecord {
  restaurantKey: string;
  providerId?: string;
  name: string;
  /** Timestamps (ms) of each visit */
  visits: number[];
  snapshot?: RestaurantPreferenceSnapshot;
}

export type VisitRestaurantInput = Pick<
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

interface VisitedState {
  records: VisitRecord[];
  markVisited: (restaurant: VisitRestaurantInput) => void;
  removeRecord: (restaurantKey: string) => void;
  clearAll: () => void;
  getRecord: (restaurantKey: string) => VisitRecord | undefined;
}

export const useVisited = create<VisitedState>()(
  persist(
    (set, get) => ({
      records: [],

      markVisited: (restaurant) =>
        set((state) => {
          const restaurantKey = getRestaurantIdentityKey(restaurant);
          if (!restaurantKey) {
            return state;
          }

          const existing = state.records.find((record) => record.restaurantKey === restaurantKey);
          const snapshot = buildRestaurantPreferenceSnapshot(restaurant);

          if (existing) {
            return {
              records: state.records.map((r) =>
                r.restaurantKey === restaurantKey
                  ? {
                      ...r,
                      providerId: restaurant.id,
                      name: restaurant.name,
                      visits: [...r.visits, Date.now()],
                      snapshot: {
                        ...r.snapshot,
                        ...snapshot,
                        features: snapshot.features ?? r.snapshot?.features,
                      },
                    }
                  : r,
              ),
            };
          }
          return {
            records: [
              ...state.records,
              {
                restaurantKey,
                providerId: restaurant.id,
                name: restaurant.name,
                visits: [Date.now()],
                snapshot,
              },
            ],
          };
        }),

      removeRecord: (restaurantKey) =>
        set((state) => ({
          records: state.records.filter((record) => record.restaurantKey !== restaurantKey),
        })),

      clearAll: () => set({ records: [] }),

      getRecord: (restaurantKey) =>
        get().records.find((record) => record.restaurantKey === restaurantKey),
    }),
    {
      name: 'pekopeko-visited',
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<VisitedState> | undefined;

        return {
          records:
            state?.records?.map((record) => ({
              providerId:
                typeof record.providerId === 'string'
                  ? record.providerId
                  : typeof (record as { id?: unknown }).id === 'string'
                    ? (record as { id?: string }).id
                    : undefined,
              restaurantKey: getRestaurantIdentityKey({
                id:
                  typeof record.providerId === 'string'
                    ? record.providerId
                    : typeof (record as { id?: unknown }).id === 'string'
                      ? (record as { id?: string }).id
                      : undefined,
                restaurantKey:
                  typeof record.restaurantKey === 'string' ? record.restaurantKey : undefined,
                source:
                  record.snapshot?.source === 'google' ||
                  record.snapshot?.source === 'hotpepper' ||
                  record.snapshot?.source === 'amap' ||
                  record.snapshot?.source === 'hybrid'
                    ? record.snapshot.source
                    : undefined,
              }),
              name: record.name ?? '',
              visits: Array.isArray(record.visits)
                ? record.visits.filter((value): value is number => typeof value === 'number')
                : [],
              snapshot:
                record.snapshot && typeof record.snapshot === 'object'
                  ? {
                      cuisineType:
                        typeof record.snapshot.cuisineType === 'string'
                          ? record.snapshot.cuisineType
                          : undefined,
                      features: Array.isArray(record.snapshot.features)
                        ? record.snapshot.features.filter(
                            (value): value is string => typeof value === 'string',
                          )
                        : undefined,
                      priceLevel:
                        typeof record.snapshot.priceLevel === 'number'
                          ? record.snapshot.priceLevel
                          : undefined,
                      distance:
                        typeof record.snapshot.distance === 'number'
                          ? record.snapshot.distance
                          : undefined,
                      source:
                        record.snapshot.source === 'google' ||
                        record.snapshot.source === 'hotpepper' ||
                        record.snapshot.source === 'amap' ||
                        record.snapshot.source === 'hybrid'
                          ? record.snapshot.source
                          : undefined,
                    }
                  : undefined,
            })) ?? [],
        } satisfies Pick<VisitedState, 'records'>;
      },
    },
  ),
);

const DAY = 86400_000;

/**
 * Compute a selection weight for a restaurant based on visit history.
 * - Never visited → 1.0
 * - Last visit < 3 days → 0.15
 * - Last visit < 7 days → 0.3
 * - Last visit < 30 days → 0.55
 * - Last visit > 30 days → 0.8
 */
export function visitWeight(record: VisitRecord | undefined): number {
  if (!record || record.visits.length === 0) return 1;
  const lastVisit = Math.max(...record.visits);
  const age = Date.now() - lastVisit;

  if (age < 3 * DAY) return 0.15;
  if (age < 7 * DAY) return 0.3;
  if (age < 30 * DAY) return 0.55;
  return 0.8;
}

/**
 * Weighted random pick from a list.
 * Items with visit history have reduced weight.
 */
export function weightedRandomPick<T extends { id: string }>(
  items: T[],
  records: VisitRecord[],
): T {
  const recordMap = new Map(records.map((record) => [record.restaurantKey, record]));
  const weights = items.map((item) =>
    visitWeight(
      recordMap.get(
        getRestaurantIdentityKey(
          item as T & {
            restaurantKey?: string | null;
            source?: Restaurant['source'] | null;
            providerRefs?: Restaurant['providerRefs'] | null;
          },
        ),
      ),
    ),
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}
