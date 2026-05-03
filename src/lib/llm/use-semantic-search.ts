'use client';

import { notifications } from '@mantine/notifications';
import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { useCallback, useMemo, useState } from 'react';
import { isSemanticSearchEnabled, normalizeConfiguredLlmModel } from '@/lib/llm/availability';
import {
  ensureLlmEngine,
  isTransientLlmRuntimeError,
  markLlmRuntimeError,
  refreshLlmModelCacheStatus,
} from '@/lib/llm/engine';
import {
  deriveEatOutIntentFromQuery,
  deriveEatOutRefinementPatchFromQuery,
  parseCookIntent,
  parseEatOutIntent,
  parseEatOutRefinementPatch,
  parseEatOutRerank,
} from '@/lib/llm/intent-parser';
import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import {
  buildCookPrompt,
  buildEatOutPrompt,
  buildEatOutRefinementPatchPrompt,
  buildEatOutRerankPrompt,
  COOK_INTENT_SCHEMA,
  EAT_OUT_INTENT_SCHEMA,
  EAT_OUT_REFINEMENT_PATCH_SCHEMA,
  EAT_OUT_RERANK_SCHEMA,
} from '@/lib/llm/prompts';
import type {
  CookSemanticIntent,
  EatOutRefinementPatch,
  EatOutRerankEntry,
  EatOutSemanticIntent,
  RestaurantFactCard,
  SemanticRerankResult,
  SemanticSearchResult,
} from '@/lib/llm/types';
import { useLlmStore } from '@/stores/llm';
import { usePreferences } from '@/stores/preferences';

function getMessageContent(message: unknown): string {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'object' && part && 'text' in part && typeof part.text === 'string'
          ? part.text
          : '',
      )
      .join('');
  }

  return '';
}

function recordLlmDebugCompletion(
  action: 'cook-intent' | 'eat-out-intent' | 'eat-out-refinement' | 'eat-out-rerank',
  raw: string,
) {
  if (typeof window === 'undefined') return;

  try {
    if (window.localStorage.getItem('pekopeko-llm-debug') !== '1') return;
    window.localStorage.setItem(
      `pekopeko-llm-debug-${action}`,
      JSON.stringify({ action, raw, recordedAt: new Date().toISOString() }),
    );
  } catch {
    // Debug recording is best-effort only.
  }
}

export function useSemanticSearch() {
  const locale = usePreferences((state) => state.locale);
  const llmEnabled = usePreferences((state) => state.llmEnabled);
  const llmModel = usePreferences((state) => state.llmModel);
  const sessionDisabled = useLlmStore((state) => state.sessionDisabled);
  const setParsing = useLlmStore((state) => state.setParsing);
  const setGenerating = useLlmStore((state) => state.setGenerating);
  const setReady = useLlmStore((state) => state.setReady);
  const setRuntimeMessage = useLlmStore((state) => state.setRuntimeMessage);

  const [activeTarget, setActiveTarget] = useState<
    'cook-intent' | 'eat-out-intent' | 'eat-out-refinement' | 'eat-out-rerank' | null
  >(null);

  const semanticEnabled = isSemanticSearchEnabled(llmEnabled) && !sessionDisabled;
  const normalizedModel = normalizeConfiguredLlmModel(llmModel);

  const notifyFatalFallback = useCallback(
    (message: string) => {
      notifications.show({
        color: 'yellow',
        title:
          locale === 'zh-CN'
            ? 'AI 搜索已回退'
            : locale === 'ja'
              ? 'AI 検索をフォールバックしました'
              : 'AI search fell back',
        message:
          locale === 'zh-CN'
            ? `已切回关键词搜索：${message}`
            : locale === 'ja'
              ? `キーワード検索に戻しました: ${message}`
              : `Switched back to keyword search: ${message}`,
      });
    },
    [locale],
  );

  const runStructuredQuery = useCallback(
    async (
      action: 'cook-intent' | 'eat-out-intent' | 'eat-out-refinement' | 'eat-out-rerank',
      task: 'cook' | 'eat-out',
      messages: ChatCompletionMessageParam[],
      schema: string,
      maxTokens = 220,
      readyMessage = 'Local semantic parsing is ready.',
    ): Promise<string | null> => {
      if (!semanticEnabled) return null;

      setActiveTarget(action);
      setParsing(task);

      try {
        const engine = await ensureLlmEngine(normalizedModel, task);
        await refreshLlmModelCacheStatus(normalizedModel);
        setGenerating(task);
        await engine.resetChat(true);
        const response = await engine.chat.completions.create({
          messages,
          temperature: 0,
          max_tokens: maxTokens,
          response_format: {
            type: 'json_object',
            schema,
          },
        });

        const raw = getMessageContent(response.choices[0]?.message);
        recordLlmDebugCompletion(action, raw);
        setReady(normalizedModel, readyMessage);
        return raw;
      } catch (error) {
        const isTransient = isTransientLlmRuntimeError(error);
        const message = markLlmRuntimeError(error, { disableSession: !isTransient });
        if (isTransient) {
          setRuntimeMessage(`Local AI request was interrupted: ${message}`);
        } else {
          notifyFatalFallback(message);
        }
        return null;
      } finally {
        setActiveTarget(null);
      }
    },
    [
      normalizedModel,
      notifyFatalFallback,
      semanticEnabled,
      setGenerating,
      setParsing,
      setReady,
      setRuntimeMessage,
    ],
  );

  const analyzeCookQuery = useCallback(
    async (query: string): Promise<SemanticSearchResult<CookSemanticIntent>> => {
      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery || !semanticEnabled) {
        return { mode: 'fallback', intent: null };
      }

      const prompt = buildCookPrompt(normalizedQuery);
      const raw = await runStructuredQuery(
        'cook-intent',
        'cook',
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        COOK_INTENT_SCHEMA,
      );

      if (!raw) {
        return { mode: 'fallback', intent: null };
      }

      try {
        const intent = parseCookIntent(raw);
        if (!intent) {
          setRuntimeMessage('No reliable semantic filters were found. Using keyword search.');
          return { mode: 'fallback', intent: null };
        }

        return { mode: 'semantic', intent };
      } catch {
        setRuntimeMessage('Semantic output was invalid JSON. Using keyword search.');
        return { mode: 'fallback', intent: null, error: 'invalid-json' };
      }
    },
    [runStructuredQuery, semanticEnabled, setRuntimeMessage],
  );

  const analyzeEatOutQuery = useCallback(
    async (query: string): Promise<SemanticSearchResult<EatOutSemanticIntent>> => {
      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery || !semanticEnabled) {
        return { mode: 'fallback', intent: null };
      }

      const prompt = buildEatOutPrompt(normalizedQuery);
      const raw = await runStructuredQuery(
        'eat-out-intent',
        'eat-out',
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        EAT_OUT_INTENT_SCHEMA,
      );

      if (!raw) {
        return { mode: 'fallback', intent: deriveEatOutIntentFromQuery(normalizedQuery) };
      }

      try {
        const intent = parseEatOutIntent(raw, normalizedQuery);
        if (!intent) {
          setRuntimeMessage(
            'No reliable semantic restaurant filters were found. Using keyword search.',
          );
          return { mode: 'fallback', intent: deriveEatOutIntentFromQuery(normalizedQuery) };
        }

        return { mode: 'semantic', intent };
      } catch {
        setRuntimeMessage('Semantic output was invalid JSON. Using keyword search.');
        return {
          mode: 'fallback',
          intent: deriveEatOutIntentFromQuery(normalizedQuery),
          error: 'invalid-json',
        };
      }
    },
    [runStructuredQuery, semanticEnabled, setRuntimeMessage],
  );

  const rerankEatOutResults = useCallback(
    async ({
      goalSummary,
      tasteProfileSummary,
      candidateCatalog,
      validIds,
      factCards,
    }: {
      goalSummary: string;
      tasteProfileSummary?: string | null;
      candidateCatalog: string;
      validIds: string[];
      factCards?: RestaurantFactCard[];
    }): Promise<SemanticRerankResult<EatOutRerankEntry>> => {
      if (!semanticEnabled || !goalSummary || !candidateCatalog || validIds.length === 0) {
        return { mode: 'fallback', items: [] };
      }

      const prompt = buildEatOutRerankPrompt({
        locale,
        goalSummary,
        tasteProfileSummary,
        candidateCatalog,
      });
      const raw = await runStructuredQuery(
        'eat-out-rerank',
        'eat-out',
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        EAT_OUT_RERANK_SCHEMA,
        520,
        'Local restaurant ranking is ready.',
      );

      if (!raw) {
        return { mode: 'fallback', items: [] };
      }

      try {
        const items = parseEatOutRerank(raw, factCards?.length ? factCards : validIds, locale);
        if (!items) {
          setRuntimeMessage('No reliable AI reranking was produced. Keeping current order.');
          return { mode: 'fallback', items: [] };
        }

        return { mode: 'semantic', items };
      } catch {
        setRuntimeMessage('AI reranking output was invalid JSON. Keeping current order.');
        return { mode: 'fallback', items: [], error: 'invalid-json' };
      }
    },
    [locale, runStructuredQuery, semanticEnabled, setRuntimeMessage],
  );

  const analyzeEatOutRefinement = useCallback(
    async (params: {
      query: string;
      currentGoalSummary: string;
    }): Promise<SemanticSearchResult<EatOutRefinementPatch>> => {
      const normalizedQuery = normalizeSearchQuery(params.query);
      if (!normalizedQuery || !semanticEnabled) {
        return { mode: 'fallback', intent: null };
      }

      const prompt = buildEatOutRefinementPatchPrompt({
        query: normalizedQuery,
        currentGoalSummary: params.currentGoalSummary,
      });
      const raw = await runStructuredQuery(
        'eat-out-refinement',
        'eat-out',
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        EAT_OUT_REFINEMENT_PATCH_SCHEMA,
        220,
        'Local restaurant refinement is ready.',
      );

      if (!raw) {
        return { mode: 'fallback', intent: deriveEatOutRefinementPatchFromQuery(normalizedQuery) };
      }

      try {
        const intent = parseEatOutRefinementPatch(raw);
        if (!intent) {
          setRuntimeMessage('No reliable refinement patch was found. Using keyword refine.');
          return {
            mode: 'fallback',
            intent: deriveEatOutRefinementPatchFromQuery(normalizedQuery),
          };
        }

        return { mode: 'semantic', intent };
      } catch {
        setRuntimeMessage('Refinement output was invalid JSON. Using keyword refine.');
        return {
          mode: 'fallback',
          intent: deriveEatOutRefinementPatchFromQuery(normalizedQuery),
          error: 'invalid-json',
        };
      }
    },
    [runStructuredQuery, semanticEnabled, setRuntimeMessage],
  );

  return useMemo(
    () => ({
      semanticEnabled,
      isAnalyzingCook: activeTarget === 'cook-intent',
      isAnalyzingEatOut: activeTarget === 'eat-out-intent' || activeTarget === 'eat-out-refinement',
      isRerankingEatOut: activeTarget === 'eat-out-rerank',
      analyzeCookQuery,
      analyzeEatOutQuery,
      analyzeEatOutRefinement,
      rerankEatOutResults,
    }),
    [
      activeTarget,
      analyzeCookQuery,
      analyzeEatOutQuery,
      analyzeEatOutRefinement,
      rerankEatOutResults,
      semanticEnabled,
    ],
  );
}
