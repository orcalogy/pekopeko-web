import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Restaurant } from '@/types/restaurant';

export interface VisitSnapshot {
  cuisineType?: string;
  features?: string[];
  priceLevel?: number;
  distance?: number;
}

export interface VisitRecord {
  /** Place ID from Google/Amap */
  id: string;
  name: string;
  /** Timestamps (ms) of each visit */
  visits: number[];
  snapshot?: VisitSnapshot;
}

export type VisitRestaurantInput = Pick<
  Restaurant,
  'id' | 'name' | 'cuisineType' | 'features' | 'priceLevel' | 'distance'
>;

interface VisitedState {
  records: VisitRecord[];
  markVisited: (restaurant: VisitRestaurantInput) => void;
  removeRecord: (id: string) => void;
  clearAll: () => void;
  getRecord: (id: string) => VisitRecord | undefined;
}

export const useVisited = create<VisitedState>()(
  persist(
    (set, get) => ({
      records: [],

      markVisited: (restaurant) =>
        set((state) => {
          const existing = state.records.find((r) => r.id === restaurant.id);
          const snapshot: VisitSnapshot = {
            cuisineType: restaurant.cuisineType ?? undefined,
            features: restaurant.features?.slice(0, 8) ?? undefined,
            priceLevel: restaurant.priceLevel ?? undefined,
            distance: restaurant.distance ?? undefined,
          };

          if (existing) {
            return {
              records: state.records.map((r) =>
                r.id === restaurant.id
                  ? {
                      ...r,
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
              { id: restaurant.id, name: restaurant.name, visits: [Date.now()], snapshot },
            ],
          };
        }),

      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),

      clearAll: () => set({ records: [] }),

      getRecord: (id) => get().records.find((r) => r.id === id),
    }),
    {
      name: 'pekopeko-visited',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<VisitedState> | undefined;

        return {
          records:
            state?.records?.map((record) => ({
              id: record.id ?? '',
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
  const recordMap = new Map(records.map((r) => [r.id, r]));
  const weights = items.map((item) => visitWeight(recordMap.get(item.id)));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}
