export const DEFAULT_LLM_MODEL = 'Qwen3.5-0.8B-q0f16-MLC';
export const LEGACY_DEFAULT_LLM_MODELS = [
  'Qwen3-0.6B-q4f16_1-MLC',
  'SmolLM2-135M-Instruct-q0f16-MLC',
];

function isExplicitlyDisabled(value: string | undefined): boolean {
  if (!value) return false;

  return ['0', 'false', 'off', 'no'].includes(value.toLowerCase());
}

export function isLlmFeatureAvailable(): boolean {
  return !isExplicitlyDisabled(process.env.NEXT_PUBLIC_ENABLE_LLM);
}

export function isSemanticSearchEnabled(llmEnabled: boolean): boolean {
  return isLlmFeatureAvailable() && llmEnabled;
}

export function normalizeConfiguredLlmModel(model: string | null | undefined): string {
  const trimmed = model?.trim();

  if (!trimmed) {
    return DEFAULT_LLM_MODEL;
  }

  return trimmed.endsWith('-MLC') ? trimmed : `${trimmed}-MLC`;
}
