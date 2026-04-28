import type { AppConfig, ModelRecord } from '@mlc-ai/web-llm';
import { DEFAULT_LLM_MODEL } from '@/lib/llm/availability';

const WEB_LLM_MODEL_LIB_PREFIX =
  'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/';
const QWEN_35_MODEL_VERSION = 'v0_2_83/base';

const qwen35DefaultModel = {
  model: `https://huggingface.co/mlc-ai/${DEFAULT_LLM_MODEL}`,
  model_id: DEFAULT_LLM_MODEL,
  model_lib: `${WEB_LLM_MODEL_LIB_PREFIX}${QWEN_35_MODEL_VERSION}/Qwen3.5-0.8B-q0f16_cs1k-webgpu.wasm`,
  vram_required_MB: 2660.27,
  low_resource_required: true,
  overrides: {
    context_window_size: 4096,
    max_history_size: 1,
  },
} as ModelRecord;

const customModelRecords = [qwen35DefaultModel];

export function buildLlmAppConfig(prebuiltAppConfig: AppConfig): AppConfig {
  const customModelIds = new Set(customModelRecords.map((record) => record.model_id));

  return {
    ...prebuiltAppConfig,
    model_list: [
      ...customModelRecords,
      ...prebuiltAppConfig.model_list.filter((record) => !customModelIds.has(record.model_id)),
    ],
  };
}
