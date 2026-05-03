import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { DEFAULT_LLM_MODEL, LEGACY_DEFAULT_LLM_MODELS } from '@/lib/llm/availability';
import { buildLlmAppConfig, WEB_LLM_QWEN35_MODEL_LIB_VERSION } from '@/lib/llm/model-config';

test('default LLM model is injected into the WebLLM app config', () => {
  const appConfig = buildLlmAppConfig({
    model_list: [
      {
        model: 'https://example.com/other',
        model_id: 'Other-Model-MLC',
        model_lib: 'https://example.com/other.wasm',
        vram_required_MB: 1,
        low_resource_required: true,
      },
    ],
  } as never);

  assert.equal(appConfig.model_list[0]?.model_id, DEFAULT_LLM_MODEL);
  assert.match(appConfig.model_list[0]?.model_lib ?? '', /Qwen3\.5-0\.8B-q0f16_cs1k-webgpu\.wasm$/);
});

test('Qwen3.5 runtime package and model lib pins stay aligned', () => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'node_modules/@mlc-ai/web-llm/package.json'), 'utf8'),
  ) as { version?: string };

  assert.equal(packageJson.version, '0.2.83');
  assert.equal(WEB_LLM_QWEN35_MODEL_LIB_VERSION, 'v0_2_83/base');
});

test('temporary smaller defaults migrate back to Qwen3.5', () => {
  assert.ok(LEGACY_DEFAULT_LLM_MODELS.includes('Qwen3-0.6B-q4f16_1-MLC'));
  assert.ok(!LEGACY_DEFAULT_LLM_MODELS.includes(DEFAULT_LLM_MODEL));
});
