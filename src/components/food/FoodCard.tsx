'use client';

import { Badge, Box, Card, Divider, Group, Rating, Stack, Text, Title } from '@mantine/core';
import { motion } from 'framer-motion';
import { getCurrentSeason, getSeasonEmoji } from '@/lib/season-utils';
import type { Food, Locale, Season } from '@/types/food';

interface FoodCardProps {
  food: Food;
  locale: Locale;
  showCookInfo?: boolean;
  currentSeason?: Season;
}

const spicyLabels: Record<number, Record<Locale, string>> = {
  0: { 'zh-CN': '不辣', ja: '辛くない', en: 'Not Spicy' },
  1: { 'zh-CN': '微辣', ja: 'ちょい辛', en: 'Mild' },
  2: { 'zh-CN': '中辣', ja: '中辛', en: 'Medium' },
  3: { 'zh-CN': '特辣', ja: '激辛', en: 'Very Spicy' },
};

const spicyEmojis = ['', '🌶️', '🌶️🌶️', '🔥🔥🔥'];

const difficultyLabels: Record<Locale, string> = {
  'zh-CN': '难度',
  ja: '難易度',
  en: 'Difficulty',
};

const cookTimeLabels: Record<Locale, string> = {
  'zh-CN': '烹饪时间',
  ja: '調理時間',
  en: 'Cook Time',
};

const minuteLabels: Record<Locale, string> = {
  'zh-CN': '分钟',
  ja: '分',
  en: 'min',
};

export function FoodCard({ food, locale, showCookInfo = true, currentSeason }: FoodCardProps) {
  const season = currentSeason ?? getCurrentSeason();
  const isSeasonal = food.seasons.length < 4 && food.seasons.includes(season);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Card radius="md" padding="lg" withBorder style={{ background: 'var(--app-surface-strong)' }}>
        <Stack gap="sm">
          {/* Title */}
          <Group justify="space-between" align="start">
            <Title order={2} size="h3">
              {food.name[locale]}
            </Title>
            {isSeasonal && (
              <Badge color="teal" variant="light" size="sm">
                {getSeasonEmoji(season)}{' '}
                {locale === 'zh-CN' ? '当季' : locale === 'ja' ? '旬' : 'In Season'}
              </Badge>
            )}
          </Group>

          {/* Subcategory & Spicy */}
          <Group gap="xs">
            <Badge variant="outline" size="sm">
              {food.subcategory}
            </Badge>
            {food.spicyLevel > 0 && (
              <Badge color="red" variant="light" size="sm">
                {spicyEmojis[food.spicyLevel]} {spicyLabels[food.spicyLevel][locale]}
              </Badge>
            )}
          </Group>

          {/* Description */}
          {food.description?.[locale] && (
            <Text size="sm" c="dimmed">
              {food.description[locale]}
            </Text>
          )}

          {/* Cook Info */}
          {showCookInfo && food.cookable && (
            <>
              <Divider />
              <Group gap="lg">
                {food.cookDifficulty && (
                  <Box>
                    <Text size="xs" c="dimmed">
                      {difficultyLabels[locale]}
                    </Text>
                    <Rating value={food.cookDifficulty} count={5} readOnly size="sm" />
                  </Box>
                )}
                {food.cookTimeMinutes && (
                  <Box>
                    <Text size="xs" c="dimmed">
                      {cookTimeLabels[locale]}
                    </Text>
                    <Text size="sm" fw={600}>
                      {food.cookTimeMinutes} {minuteLabels[locale]}
                    </Text>
                  </Box>
                )}
              </Group>
            </>
          )}

          {/* Fun Fact */}
          {food.funFact?.[locale] && (
            <>
              <Divider />
              <Box className="app-panel-muted" p="sm">
                <Text size="xs" fw={600} c="orange" mb={4}>
                  {locale === 'zh-CN' ? '💡 冷知识' : locale === 'ja' ? '💡 豆知識' : '💡 Fun Fact'}
                </Text>
                <Text size="sm">{food.funFact[locale]}</Text>
              </Box>
            </>
          )}
        </Stack>
      </Card>
    </motion.div>
  );
}
