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
  useMantineTheme,
} from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
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

export default function Home() {
  const locale = usePreferences((s) => s.locale);
  const maxSpicy = usePreferences((s) => s.maxSpicy);
  const excludedFoodIds = usePreferences((s) => s.excludedFoodIds);
  const lat = useLocation((s) => s.lat);

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

  const theme = useMantineTheme();
  const [showResult, setShowResult] = useState(false);

  const mealTime = getCurrentMealTime();
  const season = getCurrentSeason(lat);

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

  return (
    <AppShell>
      <Container py="md" px="md">
        <Stack gap="md" align="center">
          {/* Header */}
          <Box ta="center" mt="sm">
            <Title order={1} size="h2" fw={800}>
              {locale === 'zh-CN'
                ? '\u4ECA\u5929\u5403\u4EC0\u4E48'
                : locale === 'ja'
                  ? '\u4ECA\u65E5\u4F55\u98DF\u3079\u308B\uFF1F'
                  : 'pekopeko'}
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              {locale === 'zh-CN'
                ? '\u89E3\u51B3\u4F60\u7684\u9009\u62E9\u56F0\u96BE\u75C7'
                : locale === 'ja'
                  ? '\u9078\u629E\u969C\u5BB3\u3092\u89E3\u6C7A\u3057\u3088\u3046'
                  : 'Solve your food choice paralysis'}
            </Text>
          </Box>

          {/* Context Badges */}
          <Group gap="xs" justify="center">
            <MealTimeIndicator locale={locale} />
            <SeasonBadge locale={locale} lat={lat} />
          </Group>

          {/* Mode Switch */}
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
                value: 'cook',
                label:
                  locale === 'zh-CN'
                    ? '\u{1F373} \u81EA\u5DF1\u505A'
                    : locale === 'ja'
                      ? '\u{1F373} \u81EA\u7082\u3059\u308B'
                      : '\u{1F373} Cook',
              },
              {
                value: 'eatOut',
                label:
                  locale === 'zh-CN'
                    ? '\u{1F37D}\u{FE0F} \u51FA\u53BB\u5403'
                    : locale === 'ja'
                      ? '\u{1F37D}\u{FE0F} \u5916\u98DF\u3059\u308B'
                      : '\u{1F37D}\u{FE0F} Eat Out',
              },
            ]}
            radius="xl"
            size="md"
            fullWidth
            style={{ maxWidth: 300 }}
          />

          {/* ===== Cook Mode ===== */}
          {mode === 'cook' && (
            <>
              <MoodSelector value={selectedMood} onChange={setMood} locale={locale} />

              <Text size="sm" c="dimmed">
                {locale === 'zh-CN'
                  ? `\u5DF2\u4E3A\u4F60\u7B5B\u9009\u51FA ${candidates.length} \u9053\u83DC`
                  : locale === 'ja'
                    ? `${candidates.length} \u54C1\u304C\u5019\u88DC\u306B\u9078\u3070\u308C\u307E\u3057\u305F`
                    : `${candidates.length} dishes match your filters`}
              </Text>

              {/* Picker Animation */}
              <AnimatePresence mode="wait">
                {!showResult ? (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}
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

              {/* Pick Button */}
              {!showResult && (
                <Center>
                  <Button
                    size="xl"
                    radius="xl"
                    onClick={handlePick}
                    loading={isSpinning}
                    disabled={isSpinning || candidates.length === 0}
                    color="orange"
                    variant="filled"
                    style={{ minWidth: 180 }}
                  >
                    {isSpinning
                      ? locale === 'zh-CN'
                        ? '\u9009\u9009\u9009...'
                        : locale === 'ja'
                          ? '\u9078\u3093\u3067\u308B...'
                          : 'Picking...'
                      : locale === 'zh-CN'
                        ? '\u{1F3B2} \u5E2E\u6211\u9009\uFF01'
                        : locale === 'ja'
                          ? '\u{1F3B2} \u9078\u3093\u3067\uFF01'
                          : '\u{1F3B2} Pick for me!'}
                  </Button>
                </Center>
              )}

              {/* Result Card */}
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
                    <Group justify="center" mt="md" gap="sm">
                      <Button variant="light" color="orange" radius="xl" onClick={handleRespin}>
                        {locale === 'zh-CN'
                          ? '\u{1F504} \u6362\u4E00\u4E2A'
                          : locale === 'ja'
                            ? '\u{1F504} \u3082\u3046\u4E00\u56DE'
                            : '\u{1F504} Pick Again'}
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
                          ? '\u{1F6AB} \u4E0D\u8981\u8FD9\u4E2A'
                          : locale === 'ja'
                            ? '\u{1F6AB} \u3053\u308C\u3058\u3083\u306A\u3044'
                            : '\u{1F6AB} Not This'}
                      </Button>
                    </Group>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              {history.length > 0 && !isSpinning && (
                <Box w="100%" mt="md">
                  <Divider
                    label={
                      locale === 'zh-CN'
                        ? '\u{1F4DC} \u6700\u8FD1\u63A8\u8350'
                        : locale === 'ja'
                          ? '\u{1F4DC} \u6700\u8FD1\u306E\u5C65\u6B74'
                          : '\u{1F4DC} Recent'
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
            </>
          )}

          {/* ===== Eat Out Mode ===== */}
          {mode === 'eatOut' && (
            <>
              <Text size="sm" c="dimmed" ta="center">
                {locale === 'zh-CN'
                  ? '\u9009\u4E00\u79CD\u83DC\u7CFB\uFF0C\u5E2E\u4F60\u627E\u9644\u8FD1\u7684\u9910\u5385'
                  : locale === 'ja'
                    ? '\u30B8\u30E3\u30F3\u30EB\u3092\u9078\u3093\u3067\u3001\u8FD1\u304F\u306E\u304A\u5E97\u3092\u63A2\u3057\u307E\u3059'
                    : 'Pick a cuisine to find nearby restaurants'}
              </Text>

              {/* Random restaurant button */}
              <Button
                size="lg"
                radius="xl"
                color="orange"
                variant="filled"
                onClick={handleRandomRestaurant}
                style={{ minWidth: 200 }}
              >
                {locale === 'zh-CN'
                  ? '\u{1F3B2} \u968F\u4FBF\u5403\u70B9'
                  : locale === 'ja'
                    ? '\u{1F3B2} \u304A\u307E\u304B\u305B'
                    : '\u{1F3B2} Surprise me!'}
              </Button>

              {/* Category Grid */}
              <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="sm" w="100%">
                {categories.map((cat) => (
                  <UnstyledButton
                    key={cat.id}
                    onClick={() => handleCategoryPick(cat.id)}
                    style={{
                      padding: '16px 12px',
                      borderRadius: theme.radius.md,
                      border: '1px solid var(--mantine-color-default-border)',
                      background: 'var(--mantine-color-body)',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Text size="lg" fw={600} style={{ color: cat.color }}>
                      {cat.name[locale]}
                    </Text>
                  </UnstyledButton>
                ))}
              </SimpleGrid>
            </>
          )}
        </Stack>
      </Container>
    </AppShell>
  );
}
