import type { InitProgressReport, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { normalizeConfiguredLlmModel } from '@/lib/llm/availability';
import type { LlmSupportResult } from '@/lib/llm/types';
import { useLlmStore } from '@/stores/llm';

type WebLlmModule = typeof import('@mlc-ai/web-llm');

let workerInstance: Worker | null = null;
let enginePromise: Promise<WebWorkerMLCEngine> | null = null;
let loadedModelId: string | null = null;
let lifecycleToken = 0;

type NavigatorWithGpu = Navigator & {
  gpu?: {
    requestAdapter: () => Promise<unknown | null>;
  };
};

function getRuntimeStore() {
  return useLlmStore.getState();
}

async function loadWebLlmModule(): Promise<WebLlmModule> {
  return import('@mlc-ai/web-llm');
}

function createLlmWorker(): Worker {
  return new Worker(new URL('../../workers/llm.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown LLM error';
}

function handleInitProgress(modelId: string, report: InitProgressReport, task: 'cook' | 'eat-out') {
  getRuntimeStore().setLoading(modelId, report, task);
}

export async function detectLlmSupport(): Promise<LlmSupportResult> {
  if (typeof window === 'undefined') {
    return { supported: false, message: 'LLM support can only be checked in the browser.' };
  }

  const navigatorWithGpu = navigator as NavigatorWithGpu;

  if (!('Worker' in window)) {
    return { supported: false, message: 'Web Workers are not available in this browser.' };
  }

  if (!navigatorWithGpu.gpu) {
    return { supported: false, message: 'WebGPU is not available in this browser.' };
  }

  try {
    const adapter = await navigatorWithGpu.gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, message: 'No WebGPU adapter is available on this device.' };
    }

    return { supported: true, message: 'WebGPU support detected.' };
  } catch (error) {
    return {
      supported: false,
      message: `WebGPU check failed: ${extractErrorMessage(error)}`,
    };
  }
}

export async function ensureLlmEngine(
  modelInput: string,
  task: 'cook' | 'eat-out',
): Promise<WebWorkerMLCEngine> {
  const modelId = normalizeConfiguredLlmModel(modelInput);

  if (enginePromise && loadedModelId === modelId) {
    return enginePromise;
  }

  await shutdownLlmEngine();

  const token = ++lifecycleToken;
  const worker = createLlmWorker();
  workerInstance = worker;
  getRuntimeStore().setLoading(modelId, null, task);

  const nextEnginePromise = (async () => {
    const webllm = await loadWebLlmModule();
    return webllm.CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (report) => {
        if (token !== lifecycleToken) return;
        handleInitProgress(modelId, report, task);
      },
    });
  })();

  enginePromise = nextEnginePromise;

  try {
    const engine = await nextEnginePromise;
    if (token !== lifecycleToken || workerInstance !== worker) {
      try {
        await engine.unload();
      } catch {
        // Ignore unload failures for superseded workers.
      }
      throw new Error('LLM initialization was superseded.');
    }

    loadedModelId = modelId;
    getRuntimeStore().setReady(modelId, 'Local model is ready.');
    return engine;
  } catch (error) {
    if (workerInstance === worker) {
      workerInstance = null;
      enginePromise = null;
      loadedModelId = null;
    }
    worker.terminate();
    throw error;
  }
}

export async function interruptLlmGeneration() {
  try {
    if (!enginePromise) return;
    const engine = await enginePromise;
    engine.interruptGenerate();
  } catch {
    // Nothing to interrupt if the engine failed or is not ready.
  }
}

export async function shutdownLlmEngine() {
  lifecycleToken += 1;

  const worker = workerInstance;
  const pendingEngine = enginePromise;

  workerInstance = null;
  enginePromise = null;
  loadedModelId = null;

  if (pendingEngine) {
    try {
      const engine = await pendingEngine;
      engine.interruptGenerate();
      await engine.unload();
    } catch {
      // Ignore teardown errors; we still terminate the worker below.
    }
  }

  worker?.terminate();
}

export async function refreshLlmModelCacheStatus(modelInput: string): Promise<boolean> {
  const modelId = normalizeConfiguredLlmModel(modelInput);
  const webllm = await loadWebLlmModule();
  const isCached = await webllm.hasModelInCache(modelId);
  getRuntimeStore().setModelCached(isCached);
  return isCached;
}

export async function clearLlmModelCache(modelInput: string) {
  const modelId = normalizeConfiguredLlmModel(modelInput);
  await shutdownLlmEngine();
  const webllm = await loadWebLlmModule();
  await webllm.deleteModelAllInfoInCache(modelId);
  getRuntimeStore().setModelCached(false);
  getRuntimeStore().setIdle('Local model cache cleared.');
}

export function markLlmRuntimeError(error: unknown) {
  const message = extractErrorMessage(error);
  getRuntimeStore().disableSession(message);
  return message;
}
