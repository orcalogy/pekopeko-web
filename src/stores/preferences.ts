import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AppLocale, defaultLocale } from '@/lib/app-locale';
import {
  DEFAULT_LLM_MODEL,
  LEGACY_DEFAULT_LLM_MODELS,
  normalizeConfiguredLlmModel,
} from '@/lib/llm/availability';

interface PreferencesState {
  locale: AppLocale;
  theme: 'light' | 'dark' | 'auto';
  excludedFoodIds: string[];
  maxSpicy: number;
  searchRadiusKm: number;
  minRating: number;
  maxBudgetLevel: number;
  partySize: number;
  llmEnabled: boolean;
  llmModel: string;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  excludeFood: (id: string) => void;
  unexcludeFood: (id: string) => void;
  setMaxSpicy: (level: number) => void;
  setSearchRadius: (km: number) => void;
  setMinRating: (rating: number) => void;
  setMaxBudgetLevel: (level: number) => void;
  setPartySize: (count: number) => void;
  setLlmEnabled: (enabled: boolean) => void;
  setLlmModel: (model: string) => void;
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
      llmEnabled: false,
      llmModel: DEFAULT_LLM_MODEL,

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
      setLlmEnabled: (enabled) => set({ llmEnabled: enabled }),
      setLlmModel: (model) => set({ llmModel: model }),
    }),
    {
      name: 'pekopeko-preferences',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PreferencesState> | undefined;
        const normalizedPersistedModel = normalizeConfiguredLlmModel(state?.llmModel);
        const shouldUseNewDefault =
          !state?.llmModel || LEGACY_DEFAULT_LLM_MODELS.includes(normalizedPersistedModel);

        return {
          locale: state?.locale ?? defaultLocale,
          theme: state?.theme ?? 'auto',
          excludedFoodIds: state?.excludedFoodIds ?? [],
          maxSpicy: state?.maxSpicy ?? 3,
          searchRadiusKm: state?.searchRadiusKm ?? 2,
          minRating: state?.minRating ?? 0,
          maxBudgetLevel: state?.maxBudgetLevel ?? 0,
          partySize: state?.partySize ?? 1,
          llmEnabled: state?.llmEnabled ?? false,
          llmModel: shouldUseNewDefault ? DEFAULT_LLM_MODEL : normalizedPersistedModel,
        } satisfies Omit<
          PreferencesState,
          | 'setLocale'
          | 'setTheme'
          | 'excludeFood'
          | 'unexcludeFood'
          | 'setMaxSpicy'
          | 'setSearchRadius'
          | 'setMinRating'
          | 'setMaxBudgetLevel'
          | 'setPartySize'
          | 'setLlmEnabled'
          | 'setLlmModel'
        >;
      },
    },
  ),
);
