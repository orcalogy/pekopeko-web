'use client';

import { notifications } from '@mantine/notifications';
import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { useCallback, useMemo, useState } from 'react';
import { isSemanticSearchEnabled, normalizeConfiguredLlmModel } from '@/lib/llm/availability';
import {
  ensureLlmEngine,
  interruptLlmGeneration,
  markLlmRuntimeError,
  refreshLlmModelCacheStatus,
} from '@/lib/llm/engine';
import { parseCookIntent, parseEatOutIntent } from '@/lib/llm/intent-parser';
import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import {
  buildCookPrompt,
  buildEatOutPrompt,
  COOK_INTENT_SCHEMA,
  EAT_OUT_INTENT_SCHEMA,
} from '@/lib/llm/prompts';
import type {
  CookSemanticIntent,
  EatOutSemanticIntent,
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

export function useSemanticSearch() {
  const locale = usePreferences((state) => state.locale);
  const llmEnabled = usePreferences((state) => state.llmEnabled);
  const llmModel = usePreferences((state) => state.llmModel);
  const sessionDisabled = useLlmStore((state) => state.sessionDisabled);
  const setParsing = useLlmStore((state) => state.setParsing);
  const setReady = useLlmStore((state) => state.setReady);
  const setRuntimeMessage = useLlmStore((state) => state.setRuntimeMessage);

  const [activeTarget, setActiveTarget] = useState<'cook' | 'eat-out' | null>(null);

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
      task: 'cook' | 'eat-out',
      messages: ChatCompletionMessageParam[],
      schema: string,
    ): Promise<string | null> => {
      if (!semanticEnabled) return null;

      setActiveTarget(task);
      setParsing(task);

      try {
        await interruptLlmGeneration();
        const engine = await ensureLlmEngine(normalizedModel, task);
        await refreshLlmModelCacheStatus(normalizedModel);
        const response = await engine.chat.completions.create({
          messages,
          temperature: 0,
          max_tokens: 220,
          response_format: {
            type: 'json_object',
            schema,
          },
        });

        setReady(normalizedModel, 'Local semantic parsing is ready.');
        return getMessageContent(response.choices[0]?.message);
      } catch (error) {
        const message = markLlmRuntimeError(error);
        notifyFatalFallback(message);
        return null;
      } finally {
        setActiveTarget(null);
      }
    },
    [normalizedModel, notifyFatalFallback, semanticEnabled, setParsing, setReady],
  );

  const analyzeCookQuery = useCallback(
    async (query: string): Promise<SemanticSearchResult<CookSemanticIntent>> => {
      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery || !semanticEnabled) {
        return { mode: 'fallback', intent: null };
      }

      const prompt = buildCookPrompt(normalizedQuery);
      const raw = await runStructuredQuery(
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
        'eat-out',
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        EAT_OUT_INTENT_SCHEMA,
      );

      if (!raw) {
        return { mode: 'fallback', intent: null };
      }

      try {
        const intent = parseEatOutIntent(raw);
        if (!intent) {
          setRuntimeMessage(
            'No reliable semantic restaurant filters were found. Using keyword search.',
          );
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

  return useMemo(
    () => ({
      semanticEnabled,
      isAnalyzingCook: activeTarget === 'cook',
      isAnalyzingEatOut: activeTarget === 'eat-out',
      analyzeCookQuery,
      analyzeEatOutQuery,
    }),
    [activeTarget, analyzeCookQuery, analyzeEatOutQuery, semanticEnabled],
  );
}
