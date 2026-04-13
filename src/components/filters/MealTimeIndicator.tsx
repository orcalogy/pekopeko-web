'use client';

import { Badge } from '@mantine/core';
import { mealTimes } from '@/data/meal-times';
import { getCurrentMealTime, getMealTimeEmoji } from '@/lib/time-utils';
import type { Locale } from '@/types/food';

interface MealTimeIndicatorProps {
  locale: Locale;
}

export function MealTimeIndicator({ locale }: MealTimeIndicatorProps) {
  const current = getCurrentMealTime();
  const info = mealTimes.find((m) => m.id === current);

  if (!info) return null;

  return (
    <Badge variant="light" color="orange" size="lg" radius="xl">
      {getMealTimeEmoji(current)} {info.label[locale]}
    </Badge>
  );
}
