import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AppLocale, defaultLocale } from '@/lib/app-locale';

interface PreferencesState {
  locale: AppLocale;
  theme: 'light' | 'dark' | 'auto';
  excludedFoodIds: string[];
  maxSpicy: number;
  searchRadiusKm: number;
  minRating: number;
  maxBudgetLevel: number;
  partySize: number;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  excludeFood: (id: string) => void;
  unexcludeFood: (id: string) => void;
  setMaxSpicy: (level: number) => void;
  setSearchRadius: (km: number) => void;
  setMinRating: (rating: number) => void;
  setMaxBudgetLevel: (level: number) => void;
  setPartySize: (count: number) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      theme: 'auto',
      excludedFoodIds: [],
      maxSpicy: 3,
      searchRadiusKm: 2,
      minRating: 0,
      maxBudgetLevel: 0,
      partySize: 1,

      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),

      excludeFood: (id) =>
        set((state) => ({
          excludedFoodIds: [...new Set([...state.excludedFoodIds, id])],
        })),

      unexcludeFood: (id) =>
        set((state) => ({
          excludedFoodIds: state.excludedFoodIds.filter((fid) => fid !== id),
        })),

      setMaxSpicy: (level) => set({ maxSpicy: level }),
      setSearchRadius: (km) => set({ searchRadiusKm: km }),
      setMinRating: (rating) => set({ minRating: rating }),
      setMaxBudgetLevel: (level) => set({ maxBudgetLevel: level }),
      setPartySize: (count) => set({ partySize: count }),
    }),
    { name: 'pekopeko-preferences' },
  ),
);
