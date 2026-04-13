import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppLocale } from '@/i18n/request';

interface PreferencesState {
  locale: AppLocale;
  theme: 'light' | 'dark' | 'auto';
  excludedFoodIds: string[];
  maxSpicy: number;
  searchRadiusKm: number;
  minRating: number;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  excludeFood: (id: string) => void;
  unexcludeFood: (id: string) => void;
  setMaxSpicy: (level: number) => void;
  setSearchRadius: (km: number) => void;
  setMinRating: (rating: number) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      theme: 'auto',
      excludedFoodIds: [],
      maxSpicy: 3,
      searchRadiusKm: 2,
      minRating: 0,

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
    }),
    { name: 'pekopeko-preferences' },
  ),
);
