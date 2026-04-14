import type { InitProgressReport } from '@mlc-ai/web-llm';
import { create } from 'zustand';
import type { LlmActiveTask, LlmAvailabilityState, LlmRuntimeState } from '@/lib/llm/types';

interface LlmState {
  availability: LlmAvailabilityState;
  runtimeState: LlmRuntimeState;
  activeTask: LlmActiveTask;
  modelId: string | null;
  supportMessage: string | null;
  runtimeMessage: string | null;
  lastError: string | null;
  progress: number | null;
  isModelCached: boolean | null;
  sessionDisabled: boolean;
  setAvailability: (availability: LlmAvailabilityState, supportMessage?: string | null) => void;
  setIdle: (runtimeMessage?: string | null) => void;
  setRuntimeDisabled: () => void;
  setLoading: (modelId: string, report?: InitProgressReport | null, task?: LlmActiveTask) => void;
  setParsing: (task: Exclude<LlmActiveTask, null>) => void;
  setReady: (modelId: string, runtimeMessage?: string | null) => void;
  setRuntimeMessage: (runtimeMessage: string | null) => void;
  setModelCached: (isModelCached: boolean | null) => void;
  setError: (lastError: string, task?: LlmActiveTask) => void;
  disableSession: (lastError: string) => void;
  restoreSession: () => void;
}

export const useLlmStore = create<LlmState>()((set) => ({
  availability: 'idle',
  runtimeState: 'disabled',
  activeTask: null,
  modelId: null,
  supportMessage: null,
  runtimeMessage: null,
  lastError: null,
  progress: null,
  isModelCached: null,
  sessionDisabled: false,

  setAvailability: (availability, supportMessage = null) =>
    set((state) => ({
      availability,
      supportMessage,
      runtimeState:
        availability === 'flag-disabled' || availability === 'unsupported'
          ? 'disabled'
          : state.runtimeState,
    })),

  setIdle: (runtimeMessage = null) =>
    set({
      runtimeState: 'idle',
      activeTask: null,
      runtimeMessage,
      lastError: null,
      progress: null,
    }),

  setRuntimeDisabled: () =>
    set((state) => ({
      runtimeState: 'disabled',
      activeTask: null,
      runtimeMessage:
        state.availability === 'supported'
          ? 'Semantic search is turned off.'
          : state.runtimeMessage,
      progress: null,
      lastError: state.runtimeState === 'error' ? state.lastError : null,
    })),

  setLoading: (modelId, report = null, task = null) =>
    set({
      runtimeState: 'loading-model',
      activeTask: task,
      modelId,
      runtimeMessage: report?.text ?? 'Preparing the local model…',
      progress: report ? Math.round(report.progress * 100) : null,
      lastError: null,
    }),

  setParsing: (task) =>
    set({
      runtimeState: 'parsing',
      activeTask: task,
      runtimeMessage: 'Analyzing your request locally…',
      lastError: null,
    }),

  setReady: (modelId, runtimeMessage = null) =>
    set({
      runtimeState: 'ready',
      activeTask: null,
      modelId,
      runtimeMessage,
      progress: 100,
      lastError: null,
    }),

  setRuntimeMessage: (runtimeMessage) => set({ runtimeMessage }),
  setModelCached: (isModelCached) => set({ isModelCached }),

  setError: (lastError, task = null) =>
    set({
      runtimeState: 'error',
      activeTask: task,
      runtimeMessage: null,
      lastError,
      progress: null,
    }),

  disableSession: (lastError) =>
    set({
      runtimeState: 'error',
      activeTask: null,
      runtimeMessage: null,
      lastError,
      progress: null,
      sessionDisabled: true,
    }),

  restoreSession: () =>
    set((state) => ({
      sessionDisabled: false,
      lastError: null,
      runtimeState: state.availability === 'supported' ? 'idle' : state.runtimeState,
      runtimeMessage: state.availability === 'supported' ? null : state.runtimeMessage,
      activeTask: null,
      progress: null,
    })),
}));
