'use client';

import {
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
import { categories } from '@/data/categories';
import { foods } from '@/data/foods';
import { filterFoods } from '@/lib/food-filter';
import { getCurrentSeason } from '@/lib/season-utils';
import { getCurrentMealTime } from '@/lib/time-utils';
import { useAppState } from '@/stores/app-state';
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
  const autoLocationRequestDone = useRef(false);

  const mealTime = getCurrentMealTime();
  const season = getCurrentSeason(lat);
  const needsFreshLocation =
    mode === 'eatOut' &&
    (lat == null || lng == null || !locatedAt || Date.now() - locatedAt > LOCATION_MAX_AGE_MS);

  // Filtered food candidates for cook mode
  const candidates = useMemo(() => {
    const filtered = filterFoods(foods, {
      season,
      mealTime,
      mood: selectedMood ?? undefined,
      cookableOnly: true,
      maxSpicy,
      excludedIds: excludedFoodIds,
    });
    return filtered.length > 0 ? filtered : foods.filter((f) => f.cookable);
  }, [season, mealTime, selectedMood, maxSpicy, excludedFoodIds]);

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

  const handleRandomRestaurant = useCallback(() => {
    router.push('/eat-out?random=true');
  }, [router]);

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
                        ? `已为你筛选出 ${candidates.length} 道菜`
                        : locale === 'ja'
                          ? `${candidates.length} 品が候補に選ばれています`
                          : `${candidates.length} dishes currently match your filters`}
                    </Text>
                  </Box>
                  <MoodSelector value={selectedMood} onChange={setMood} locale={locale} />
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

                  <Button
                    size="md"
                    radius="xl"
                    color="orange"
                    variant="filled"
                    onClick={handleRandomRestaurant}
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
