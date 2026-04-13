import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Food, Mood } from '@/types/food';

type AppMode = 'cook' | 'eatOut';

interface AppState {
  mode: AppMode;
  selectedMood: Mood | null;
  currentResult: Food | null;
  history: Food[];
  isSpinning: boolean;

  setMode: (mode: AppMode) => void;
  setMood: (mood: Mood | null) => void;
  setResult: (food: Food | null) => void;
  addToHistory: (food: Food) => void;
  clearHistory: () => void;
  setSpinning: (spinning: boolean) => void;
}

export const useAppState = create<AppState>()(
  persist(
    (set) => ({
      mode: 'cook',
      selectedMood: null,
      currentResult: null,
      history: [],
      isSpinning: false,

      setMode: (mode) => set({ mode, currentResult: null }),
      setMood: (mood) => set({ selectedMood: mood }),
      setResult: (food) => set({ currentResult: food }),

      addToHistory: (food) =>
        set((state) => ({
          history: [food, ...state.history.filter((f) => f.id !== food.id)].slice(0, 20),
        })),

      clearHistory: () => set({ history: [] }),
      setSpinning: (spinning) => set({ isSpinning: spinning }),
    }),
    {
      name: 'pekopeko-state',
      partialize: (state) => ({ mode: state.mode, history: state.history }),
    },
  ),
);
