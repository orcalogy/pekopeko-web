import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectGoldenExpectationFailures } from '@/lib/llm/golden-assertions';
import {
  cookGoldenCases,
  eatOutIntentGoldenCases,
  eatOutRefinementGoldenCases,
  eatOutRerankGoldenCases,
  LLM_GOLDEN_CASE_COUNT,
  llmGoldenCases,
} from '@/lib/llm/golden-cases';
import { parseEatOutRerank } from '@/lib/llm/intent-parser';

test('LLM golden set has the expected coverage shape', () => {
  assert.equal(llmGoldenCases.length, LLM_GOLDEN_CASE_COUNT);
  assert.equal(cookGoldenCases.length, 8);
  assert.equal(eatOutIntentGoldenCases.length, 8);
  assert.equal(eatOutRefinementGoldenCases.length, 4);
  assert.equal(eatOutRerankGoldenCases.length, 4);

  for (const locale of ['zh-CN', 'ja', 'en']) {
    assert.ok(llmGoldenCases.some((item) => item.locale === locale));
  }
});

test('hybrid golden assertion helper reports missing critical fields', () => {
  const failures = collectGoldenExpectationFailures(
    { keyword: 'cafe', features: ['wifi'] },
    { keyword: 'cafe', features: ['wifi', 'private_room'] },
  );

  assert.deepEqual(failures, ['result.features must include "private_room".']);
});

test('rerank golden cases only reference valid fixture candidate ids', () => {
  for (const goldenCase of eatOutRerankGoldenCases) {
    const output = JSON.stringify({
      recommendations: goldenCase.expected.topIds.map((id) => ({
        id,
        score: 0.9,
        matched: goldenCase.expected.matchedIncludes ?? ['rating 4.4'],
        tradeoffs: [],
        reason: 'Has WiFi and a 4.4 rating.',
        confidence: goldenCase.expected.minConfidence ?? 0.8,
      })),
    });

    assert.ok(parseEatOutRerank(output, goldenCase.validIds, goldenCase.locale));
  }
});
