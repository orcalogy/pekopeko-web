'use client';

import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MealTimeIndicator } from '@/components/filters/MealTimeIndicator';
import { MoodSelector } from '@/components/filters/MoodSelector';
import { SeasonBadge } from '@/components/filters/SeasonBadge';
import { FoodCard } from '@/components/food/FoodCard';
import { AppShell } from '@/components/layout/AppShell';
import { FoodPicker } from '@/components/picker/FoodPicker';
import { SmartSearchInput } from '@/components/search/SmartSearchInput';
import { categories } from '@/data/categories';
import { foods } from '@/data/foods';
import { filterFoods } from '@/lib/food-filter';
import { buildEatOutNavigationParams } from '@/lib/llm/eat-out-navigation';
import { filterFoodsByKeyword, normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import type { EatOutSemanticIntent } from '@/lib/llm/types';
import { useSemanticSearch } from '@/lib/llm/use-semantic-search';
import { getCurrentSeason } from '@/lib/season-utils';
import { getCurrentMealTime } from '@/lib/time-utils';
import { useAppState } from '@/stores/app-state';
import { useLlmStore } from '@/stores/llm';
import { useLocation } from '@/stores/location';
import { usePreferences } from '@/stores/preferences';
import type { Food } from '@/types/food';

const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;
const CATEGORY_ICONS: Record<string, string> = {
  chinese: '🥢',
  japanese: '🍣',
  korean: '🥘',
  western: '🍽️',
  'southeast-asian': '🌿',
  fastfood: '🍔',
  hotpot: '🍲',
  bbq: '🔥',
  noodles: '🍜',
  dessert: '🍰',
  cafe: '☕',
  seafood: '🦞',
};

const RestaurantMap = dynamic(() => import('../components/restaurant/RestaurantMap'), {
  ssr: false,
  loading: () => (
    <Center py="xl">
      <Text size="sm" c="dimmed">
        Loading map...
      </Text>
    </Center>
  ),
});

export default function Home() {
  const locale = usePreferences((s) => s.locale);
  const maxSpicy = usePreferences((s) => s.maxSpicy);
  const excludedFoodIds = usePreferences((s) => s.excludedFoodIds);
  const {
    lat,
    lng,
    locatedAt,
    loading: locationLoading,
    error: locationError,
    requestLocation,
  } = useLocation();

  const {
    mode,
    setMode,
    selectedMood,
    setMood,
    currentResult,
    setResult,
    addToHistory,
    isSpinning,
    setSpinning,
    history,
  } = useAppState();

  const [showResult, setShowResult] = useState(false);
  const [cookQuery, setCookQuery] = useState('');
  const [eatOutQuery, setEatOutQuery] = useState('');
  const [eatOutClarification, setEatOutClarification] = useState<
    EatOutSemanticIntent['clarifyingQuestion'] | null
  >(null);
  const [eatOutSubmitTarget, setEatOutSubmitTarget] = useState<'search' | 'random' | null>(null);
  const [cookAiNotice, setCookAiNotice] = useState<string | null>(null);
  const [eatOutAiNotice, setEatOutAiNotice] = useState<string | null>(null);
  const [cookSemanticIntent, setCookSemanticIntent] = useState<{
    keyword?: string;
    mood?: Food['moods'][number];
    category?: string;
    maxSpicy?: 0 | 1 | 2 | 3;
    mealTime?: Food['mealTimes'][number];
    cookableOnly?: boolean;
    recommendedIds?: string[];
  } | null>(null);
  const [hasManualMoodOverride, setHasManualMoodOverride] = useState(false);
  const autoLocationRequestDone = useRef(false);
  const {
    semanticEnabled,
    isAnalyzingCook,
    isAnalyzingEatOut,
    analyzeCookQuery,
    analyzeEatOutQuery,
  } = useSemanticSearch();
  const llmLastError = useLlmStore((state) => state.lastError);

  const mealTime = getCurrentMealTime();
  const season = getCurrentSeason(lat);
  const normalizedCookQuery = normalizeSearchQuery(cookQuery);
  const normalizedEatOutQuery = normalizeSearchQuery(eatOutQuery);
  const effectiveCookMood = hasManualMoodOverride
    ? (selectedMood ?? undefined)
    : (selectedMood ?? cookSemanticIntent?.mood ?? undefined);
  const effectiveCookKeyword = cookSemanticIntent
    ? (cookSemanticIntent.keyword ?? '')
    : normalizedCookQuery;
  const effectiveMealTime = cookSemanticIntent?.mealTime ?? mealTime;
  const effectiveMaxSpicy =
    cookSemanticIntent?.maxSpicy != null
      ? Math.min(maxSpicy, cookSemanticIntent.maxSpicy)
      : maxSpicy;
  const needsFreshLocation =
    mode === 'eatOut' &&
    (lat == null || lng == null || !locatedAt || Date.now() - locatedAt > LOCATION_MAX_AGE_MS);

  // Filtered food candidates for cook mode
  const candidates = useMemo(() => {
    const filtered = filterFoods(foods, {
      season,
      mealTime: effectiveMealTime,
      mood: effectiveCookMood,
      category: cookSemanticIntent?.category,
      cookableOnly: cookSemanticIntent?.cookableOnly ?? true,
      maxSpicy: effectiveMaxSpicy,
      excludedIds: excludedFoodIds,
    });
    const baseCandidates = filtered.length > 0 ? filtered : foods.filter((f) => f.cookable);

    return filterFoodsByKeyword(baseCandidates, effectiveCookKeyword);
  }, [
    cookSemanticIntent,
    effectiveCookKeyword,
    effectiveCookMood,
    effectiveMaxSpicy,
    effectiveMealTime,
    excludedFoodIds,
    season,
  ]);

  const handlePick = useCallback(() => {
    if (isSpinning) return;
    setShowResult(false);
    setResult(null);
    setSpinning(true);
  }, [isSpinning, setResult, setSpinning]);

  const handleResult = useCallback(
    (food: Food) => {
      setResult(food);
      addToHistory(food);
      setShowResult(true);
    },
    [setResult, addToHistory],
  );

  const handlePickEnd = useCallback(() => {
    setSpinning(false);
  }, [setSpinning]);

  const handleRespin = useCallback(() => {
    setShowResult(false);
    setResult(null);
    setTimeout(() => setSpinning(true), 100);
  }, [setResult, setSpinning]);

  const router = useRouter();

  const handleCategoryPick = useCallback(
    (categoryId: string) => {
      router.push(`/eat-out?category=${categoryId}`);
    },
    [router],
  );

  const buildEatOutRouteParams = useCallback(
    async (target: 'search' | 'random', queryOverride?: string) => {
      const searchQuery = normalizeSearchQuery(queryOverride ?? normalizedEatOutQuery);
      if (!searchQuery) {
        return buildEatOutNavigationParams({});
      }

      if (!semanticEnabled) {
        return buildEatOutNavigationParams({ query: searchQuery });
      }

      const result = await analyzeEatOutQuery(searchQuery);
      if (result.mode === 'fallback') {
        setEatOutAiNotice(
          locale === 'zh-CN'
            ? 'AI 暂时不可用，已按关键词继续。'
            : locale === 'ja'
              ? 'AI は一時的に使えないため、キーワードで続行しました。'
              : 'AI was unavailable, so keyword search continued.',
        );
      }
      if (
        target !== 'random' &&
        result.intent?.confidence != null &&
        result.intent.confidence < 0.45 &&
        result.intent.clarifyingQuestion
      ) {
        setEatOutClarification(result.intent.clarifyingQuestion);
        return null;
      }

      setEatOutClarification(null);
      if (result.mode === 'semantic') {
        setEatOutAiNotice(null);
      }
      return buildEatOutNavigationParams({
        query: searchQuery,
        intent: result.intent,
      });
    },
    [analyzeEatOutQuery, locale, normalizedEatOutQuery, semanticEnabled],
  );

  const navigateToEatOut = useCallback(
    async (target: 'search' | 'random') => {
      if (target === 'search' && !normalizedEatOutQuery) return;

      setEatOutSubmitTarget(target);

      try {
        const params = await buildEatOutRouteParams(target);
        if (!params) return;

        if (target === 'random') {
          params.set('random', 'true');
        }

        const query = params.toString();
        router.push(query ? `/eat-out?${query}` : '/eat-out');
      } finally {
        setEatOutSubmitTarget(null);
      }
    },
    [buildEatOutRouteParams, normalizedEatOutQuery, router],
  );

  const handleRandomRestaurant = useCallback(() => {
    return navigateToEatOut('random');
  }, [navigateToEatOut]);

  const handleEatOutClarificationOption = useCallback(
    async (option: string) => {
      const nextQuery = normalizeSearchQuery(`${eatOutQuery} ${option}`);
      setEatOutQuery(nextQuery);
      setEatOutClarification(null);
      setEatOutSubmitTarget('search');

      try {
        const params = await buildEatOutRouteParams('search', nextQuery);
        if (!params) return;

        const query = params.toString();
        router.push(query ? `/eat-out?${query}` : '/eat-out');
      } finally {
        setEatOutSubmitTarget(null);
      }
    },
    [buildEatOutRouteParams, eatOutQuery, router],
  );

  const handleCookMoodChange = useCallback(
    (mood: Food['moods'][number] | null) => {
      setHasManualMoodOverride(true);
      setMood(mood);
    },
    [setMood],
  );

  const handleCookIntentApply = useCallback(async () => {
    if (!normalizedCookQuery || !semanticEnabled) return;

    const result = await analyzeCookQuery(normalizedCookQuery);

    if (result.mode === 'semantic' && result.intent) {
      setCookSemanticIntent(result.intent);
      setCookAiNotice(null);

      if (result.intent.mood) {
        setHasManualMoodOverride(false);
        setMood(null);
      }

      return;
    }

    setCookSemanticIntent(null);
    setCookAiNotice(
      locale === 'zh-CN'
        ? 'AI 暂时没有可靠结果，已保留关键词筛选。'
        : locale === 'ja'
          ? 'AI の確かな結果がなかったため、キーワード絞り込みを維持しました。'
          : 'AI did not return a reliable result, so keyword filters stayed in place.',
    );
  }, [analyzeCookQuery, locale, normalizedCookQuery, semanticEnabled, setMood]);

  const handleEatOutSearch = useCallback(() => {
    return navigateToEatOut('search');
  }, [navigateToEatOut]);

  useEffect(() => {
    if (mode !== 'eatOut') {
      autoLocationRequestDone.current = false;
      return;
    }

    if (!needsFreshLocation) {
      autoLocationRequestDone.current = false;
      return;
    }

    if (autoLocationRequestDone.current) return;

    autoLocationRequestDone.current = true;
    requestLocation();
  }, [mode, needsFreshLocation, requestLocation]);

  useEffect(() => {
    if (normalizedCookQuery !== undefined) {
      setCookSemanticIntent(null);
      setCookAiNotice(null);
    }
  }, [normalizedCookQuery]);

  useEffect(() => {
    if (semanticEnabled) return;
    setCookSemanticIntent(null);
    setCookAiNotice(null);
    setEatOutAiNotice(null);
  }, [semanticEnabled]);

  return (
    <AppShell>
      <Container py="sm" px="sm">
        <Stack gap="sm" w="100%">
          <Box className="app-hero-card" p="md">
            <Stack gap="sm">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Title order={1} size="h2" fw={800} style={{ letterSpacing: '-0.03em' }}>
                  {locale === 'zh-CN' ? '饿死啦' : locale === 'ja' ? 'ぺこぺこ！' : 'pekopeko'}
                </Title>
              </Box>

              <Group gap="xs" wrap="wrap">
                <MealTimeIndicator locale={locale} />
                <SeasonBadge locale={locale} lat={lat} />
              </Group>

              <Box className="app-panel-muted" p={4}>
                <SegmentedControl
                  value={mode}
                  onChange={(v) => {
                    setMode(v as 'cook' | 'eatOut');
                    setShowResult(false);
                    setResult(null);
                    setSpinning(false);
                  }}
                  data={[
                    {
                      value: 'eatOut',
                      label:
                        locale === 'zh-CN'
                          ? '🍽️ 出去吃'
                          : locale === 'ja'
                            ? '🍽️ 外食する'
                            : '🍽️ Eat Out',
                    },
                    {
                      value: 'cook',
                      label:
                        locale === 'zh-CN'
                          ? '🍳 自己做'
                          : locale === 'ja'
                            ? '🍳 自炊する'
                            : '🍳 Cook',
                    },
                  ]}
                  radius="xl"
                  size="sm"
                  fullWidth
                />
              </Box>
            </Stack>
          </Box>

          {/* ===== Cook Mode ===== */}
          {mode === 'cook' && (
            <Stack gap="sm">
              <Box className="app-panel" p="sm">
                <Stack gap="sm">
                  <Box>
                    <Text fw={700} size="md">
                      {locale === 'zh-CN'
                        ? '先缩小一下选项'
                        : locale === 'ja'
                          ? 'まずは候補を絞り込む'
                          : 'Narrow down the options first'}
                    </Text>
                    <Text size="xs" c="dimmed" mt={3}>
                      {locale === 'zh-CN'
                        ? cookSemanticIntent
                          ? `AI 已补充筛选，当前剩下 ${candidates.length} 道菜`
                          : normalizedCookQuery
                            ? `“${normalizedCookQuery}” 匹配到 ${candidates.length} 道菜`
                            : `已为你筛选出 ${candidates.length} 道菜`
                        : locale === 'ja'
                          ? cookSemanticIntent
                            ? `AI で条件を補い、現在 ${candidates.length} 品まで絞り込みました`
                            : normalizedCookQuery
                              ? `「${normalizedCookQuery}」に一致した候補は ${candidates.length} 品です`
                              : `${candidates.length} 品が候補に選ばれています`
                          : cookSemanticIntent
                            ? `AI added extra filters and narrowed this to ${candidates.length} dishes`
                            : normalizedCookQuery
                              ? `${candidates.length} dishes match "${normalizedCookQuery}"`
                              : `${candidates.length} dishes currently match your filters`}
                    </Text>
                  </Box>
                  <SmartSearchInput
                    value={cookQuery}
                    onChange={setCookQuery}
                    onSubmit={semanticEnabled ? handleCookIntentApply : undefined}
                    submitLabel={
                      semanticEnabled
                        ? locale === 'zh-CN'
                          ? '理解一下'
                          : locale === 'ja'
                            ? '意味で絞る'
                            : 'Apply AI'
                        : undefined
                    }
                    loading={semanticEnabled && isAnalyzingCook}
                    submitDisabled={!normalizedCookQuery}
                    inputTestId="cook-query-input"
                    submitTestId="cook-apply-ai"
                    placeholder={
                      locale === 'zh-CN'
                        ? '再加一点关键词，比如：汤面、香辣、快手'
                        : locale === 'ja'
                          ? 'さらにキーワードを追加: 温かい麺、少し辛い、すぐ作れる'
                          : 'Add keywords like warm noodles, spicy, or quick'
                    }
                    description={
                      semanticEnabled
                        ? locale === 'zh-CN'
                          ? '先按关键词筛，再点右侧按钮让本地模型补充心情、餐时或分类筛选。'
                          : locale === 'ja'
                            ? 'まずキーワードで絞り込み、右のボタンでローカルモデルに気分や時間帯の条件を補わせます。'
                            : 'Filter by keyword first, then use the button to let the local model add mood, mealtime, or category filters.'
                        : locale === 'zh-CN'
                          ? '按菜名、标签、分类或描述做本地关键词筛选。'
                          : locale === 'ja'
                            ? '料理名、タグ、カテゴリ、説明文からローカルで絞り込みます。'
                            : 'Filter locally by dish name, tags, category, or description.'
                    }
                  />
                  {semanticEnabled && (cookAiNotice || llmLastError) && (
                    <Text size="xs" c={llmLastError ? 'red' : 'dimmed'} data-testid="cook-ai-note">
                      {cookAiNotice ?? llmLastError}
                    </Text>
                  )}
                  {cookSemanticIntent && (
                    <Group gap="xs" wrap="wrap">
                      {cookSemanticIntent.mood && !hasManualMoodOverride && (
                        <Badge variant="light" color="orange" radius="xl">
                          {locale === 'zh-CN'
                            ? `AI 心情: ${cookSemanticIntent.mood}`
                            : locale === 'ja'
                              ? `AI 気分: ${cookSemanticIntent.mood}`
                              : `AI mood: ${cookSemanticIntent.mood}`}
                        </Badge>
                      )}
                      {cookSemanticIntent.category && (
                        <Badge variant="light" color="grape" radius="xl">
                          {categories.find(
                            (category) => category.id === cookSemanticIntent.category,
                          )?.name[locale] ?? cookSemanticIntent.category}
                        </Badge>
                      )}
                      {cookSemanticIntent.mealTime && (
                        <Badge variant="light" color="blue" radius="xl">
                          {locale === 'zh-CN'
                            ? `餐时: ${cookSemanticIntent.mealTime}`
                            : locale === 'ja'
                              ? `時間帯: ${cookSemanticIntent.mealTime}`
                              : `Meal: ${cookSemanticIntent.mealTime}`}
                        </Badge>
                      )}
                      {cookSemanticIntent.maxSpicy != null && (
                        <Badge variant="light" color="red" radius="xl">
                          {locale === 'zh-CN'
                            ? `辣度 ≤ ${cookSemanticIntent.maxSpicy}`
                            : locale === 'ja'
                              ? `辛さ ≤ ${cookSemanticIntent.maxSpicy}`
                              : `Spice <= ${cookSemanticIntent.maxSpicy}`}
                        </Badge>
                      )}
                      {cookSemanticIntent.recommendedIds?.map((foodId) => {
                        const food = foods.find((item) => item.id === foodId);
                        if (!food) return null;

                        return (
                          <Badge key={foodId} variant="outline" color="orange" radius="xl">
                            {food.name[locale]}
                          </Badge>
                        );
                      })}
                    </Group>
                  )}
                  <MoodSelector
                    value={
                      hasManualMoodOverride
                        ? selectedMood
                        : (selectedMood ?? cookSemanticIntent?.mood ?? null)
                    }
                    onChange={handleCookMoodChange}
                    locale={locale}
                  />
                </Stack>
              </Box>

              <Box className="app-panel" p="sm">
                <Stack gap="sm">
                  <Group justify="space-between" align="end" gap="sm">
                    <Box>
                      <Text fw={700} size="md">
                        {locale === 'zh-CN'
                          ? '帮你快速拿主意'
                          : locale === 'ja'
                            ? 'ひと押しで決める'
                            : 'Let the app decide quickly'}
                      </Text>
                    </Box>
                    <Box className="app-stat-pill">
                      <Text size="sm" fw={600}>
                        {locale === 'zh-CN'
                          ? `${candidates.length} 道候选`
                          : locale === 'ja'
                            ? `${candidates.length}候補`
                            : `${candidates.length} candidates`}
                      </Text>
                    </Box>
                  </Group>

                  <AnimatePresence mode="wait">
                    {!showResult ? (
                      <motion.div
                        key="picker"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: '100%' }}
                      >
                        <FoodPicker
                          candidates={candidates}
                          locale={locale}
                          picking={isSpinning}
                          onResult={handleResult}
                          onPickEnd={handlePickEnd}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {!showResult && (
                    <Button
                      size="lg"
                      radius="xl"
                      onClick={handlePick}
                      loading={isSpinning}
                      disabled={isSpinning || candidates.length === 0}
                      color="orange"
                      variant="filled"
                      fullWidth
                    >
                      {isSpinning
                        ? locale === 'zh-CN'
                          ? '选选选...'
                          : locale === 'ja'
                            ? '選んでる...'
                            : 'Picking...'
                        : locale === 'zh-CN'
                          ? '🎲 帮我选！'
                          : locale === 'ja'
                            ? '🎲 選んで！'
                            : '🎲 Pick for me!'}
                    </Button>
                  )}

                  <AnimatePresence>
                    {showResult && currentResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{ width: '100%' }}
                      >
                        <FoodCard
                          food={currentResult}
                          locale={locale}
                          showCookInfo
                          currentSeason={season}
                        />
                        <Group justify="center" mt="sm" gap="sm">
                          <Button variant="light" color="orange" radius="xl" onClick={handleRespin}>
                            {locale === 'zh-CN'
                              ? '🔄 换一个'
                              : locale === 'ja'
                                ? '🔄 もう一回'
                                : '🔄 Pick Again'}
                          </Button>
                          <Button
                            variant="subtle"
                            color="gray"
                            radius="xl"
                            onClick={() => {
                              if (currentResult) {
                                usePreferences.getState().excludeFood(currentResult.id);
                              }
                              handleRespin();
                            }}
                          >
                            {locale === 'zh-CN'
                              ? '🚫 不要这个'
                              : locale === 'ja'
                                ? '🚫 これじゃない'
                                : '🚫 Not This'}
                          </Button>
                        </Group>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Stack>
              </Box>

              {history.length > 0 && !isSpinning && (
                <Box className="app-panel" p="sm" w="100%">
                  <Divider
                    label={
                      locale === 'zh-CN'
                        ? '📜 最近推荐'
                        : locale === 'ja'
                          ? '📜 最近の履歴'
                          : '📜 Recent'
                    }
                    labelPosition="center"
                    mb="sm"
                  />
                  <Group gap="xs" wrap="wrap" justify="center">
                    {history.slice(0, 8).map((food) => (
                      <Button
                        key={food.id}
                        variant="light"
                        color="gray"
                        size="xs"
                        radius="xl"
                        onClick={() => {
                          setResult(food);
                          setShowResult(true);
                        }}
                      >
                        {food.name[locale]}
                      </Button>
                    ))}
                  </Group>
                </Box>
              )}
            </Stack>
          )}

          {/* ===== Eat Out Mode ===== */}
          {mode === 'eatOut' && (
            <Stack gap="sm" w="100%">
              <Box className="app-panel" p="sm">
                <Stack gap="sm">
                  <Box>
                    <Title order={3} size="h4" fw={800}>
                      {locale === 'zh-CN'
                        ? '先看你周围有什么'
                        : locale === 'ja'
                          ? 'まずは近くのお店から'
                          : 'Start with what is around you'}
                    </Title>
                  </Box>

                  {locationLoading && lat == null && lng == null && (
                    <Center py="sm">
                      <Stack gap="xs" align="center">
                        <Text size="sm" c="dimmed" ta="center">
                          {locale === 'zh-CN'
                            ? '正在获取你的位置...'
                            : locale === 'ja'
                              ? '現在地を取得中...'
                              : 'Getting your location...'}
                        </Text>
                      </Stack>
                    </Center>
                  )}

                  {locationError && lat == null && lng == null && (
                    <Stack gap="xs" align="center" w="100%" className="app-panel-muted" p="sm">
                      <Text size="sm" c="red" ta="center">
                        {locale === 'zh-CN'
                          ? '无法获取当前位置'
                          : locale === 'ja'
                            ? '現在地を取得できません'
                            : 'Unable to get your current location'}
                      </Text>
                      <Button
                        variant="light"
                        color="orange"
                        radius="xl"
                        size="sm"
                        onClick={requestLocation}
                      >
                        {locale === 'zh-CN' ? '再试一次' : locale === 'ja' ? 'もう一度' : 'Retry'}
                      </Button>
                    </Stack>
                  )}

                  {lat != null && lng != null && (
                    <Box className="app-map-frame" w="100%">
                      <Box px="sm" py="xs" style={{ borderBottom: '1px solid var(--app-border)' }}>
                        <Text fw={700} size="sm">
                          {locale === 'zh-CN'
                            ? '当前位置'
                            : locale === 'ja'
                              ? '現在地'
                              : 'Current location'}
                        </Text>
                      </Box>
                      <RestaurantMap
                        restaurants={[]}
                        userLat={lat}
                        userLng={lng}
                        locale={locale}
                        height={216}
                        minHeight={216}
                        maxHeight={216}
                      />
                    </Box>
                  )}

                  <SmartSearchInput
                    value={eatOutQuery}
                    onChange={(value) => {
                      setEatOutQuery(value);
                      setEatOutClarification(null);
                      setEatOutAiNotice(null);
                    }}
                    onSubmit={handleEatOutSearch}
                    loading={
                      semanticEnabled && isAnalyzingEatOut && eatOutSubmitTarget === 'search'
                    }
                    submitLabel={
                      locale === 'zh-CN' ? '搜附近' : locale === 'ja' ? '近くを探す' : 'Search'
                    }
                    submitDisabled={!normalizedEatOutQuery}
                    inputTestId="eat-out-query-input"
                    submitTestId="eat-out-search-ai"
                    placeholder={
                      locale === 'zh-CN'
                        ? '比如：拉面、夜宵、咖啡馆'
                        : locale === 'ja'
                          ? '例: ラーメン、深夜ごはん、カフェ'
                          : 'Try ramen, late-night food, or cafe'
                    }
                    description={
                      semanticEnabled
                        ? locale === 'zh-CN'
                          ? '提交时会先用本地模型拆出关键词、分类和是否营业中，再跳到结果页。'
                          : locale === 'ja'
                            ? '送信時にローカルモデルでキーワード・カテゴリ・営業中条件を推定してから結果ページへ移動します。'
                            : 'On submit, the local model infers keyword, category, and open-now intent before navigating to results.'
                        : locale === 'zh-CN'
                          ? '直接输入想吃的内容，跳转到附近结果页。'
                          : locale === 'ja'
                            ? '食べたいものを直接入力すると、近くの検索結果へ移動します。'
                            : 'Type what you want and jump straight to nearby results.'
                    }
                  />
                  {semanticEnabled && (eatOutAiNotice || llmLastError) && (
                    <Text
                      size="xs"
                      c={llmLastError ? 'red' : 'dimmed'}
                      data-testid="eat-out-ai-note"
                    >
                      {eatOutAiNotice ?? llmLastError}
                    </Text>
                  )}

                  {eatOutClarification && (
                    <Box className="app-panel-muted" p="sm" w="100%">
                      <Stack gap="xs">
                        <Text size="sm" fw={600}>
                          {eatOutClarification.question}
                        </Text>
                        <Group gap="xs" wrap="wrap">
                          {eatOutClarification.options.map((option) => (
                            <Button
                              key={option}
                              variant="light"
                              color="orange"
                              size="xs"
                              radius="xl"
                              onClick={() => handleEatOutClarificationOption(option)}
                            >
                              {option}
                            </Button>
                          ))}
                        </Group>
                      </Stack>
                    </Box>
                  )}

                  <Button
                    size="md"
                    radius="xl"
                    color="orange"
                    variant="filled"
                    onClick={handleRandomRestaurant}
                    loading={
                      semanticEnabled && isAnalyzingEatOut && eatOutSubmitTarget === 'random'
                    }
                    fullWidth
                  >
                    {locale === 'zh-CN'
                      ? '🎲 随便吃点'
                      : locale === 'ja'
                        ? '🎲 おまかせ'
                        : '🎲 Surprise me!'}
                  </Button>
                </Stack>
              </Box>

              <Box className="app-panel" p="sm">
                <Group justify="space-between" align="end" mb="sm">
                  <Box>
                    <Text fw={700} size="md">
                      {locale === 'zh-CN'
                        ? '按想吃的类型快速开始'
                        : locale === 'ja'
                          ? '気分のジャンルからすぐ始める'
                          : 'Jump in by cuisine'}
                    </Text>
                  </Box>
                  <Text size="xs" c="dimmed">
                    {locale === 'zh-CN'
                      ? `${categories.length} 种`
                      : locale === 'ja'
                        ? `${categories.length}種`
                        : `${categories.length} types`}
                  </Text>
                </Group>

                <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="sm" w="100%">
                  {categories.map((cat) => (
                    <UnstyledButton
                      key={cat.id}
                      onClick={() => handleCategoryPick(cat.id)}
                      style={{
                        padding: '14px 12px',
                        minHeight: 96,
                        borderRadius: 'var(--mantine-radius-md)',
                        border: '1px solid var(--app-border)',
                        background: 'var(--app-surface-muted)',
                        textAlign: 'left',
                        transition: 'background-color 160ms ease, border-color 160ms ease',
                      }}
                    >
                      <Stack gap={6}>
                        <Text size="lg">{CATEGORY_ICONS[cat.id] ?? '🍽️'}</Text>
                        <Text size="md" fw={700}>
                          {cat.name[locale]}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {locale === 'zh-CN'
                            ? '查看附近选项'
                            : locale === 'ja'
                              ? '近くのお店を探す'
                              : 'See nearby options'}
                        </Text>
                      </Stack>
                    </UnstyledButton>
                  ))}
                </SimpleGrid>
              </Box>
            </Stack>
          )}
        </Stack>
      </Container>
    </AppShell>
  );
}
