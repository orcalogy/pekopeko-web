'use client';

import { Badge } from '@mantine/core';
import { getCurrentSeason, getSeasonColor, getSeasonEmoji } from '@/lib/season-utils';
import type { Locale, Season } from '@/types/food';

const seasonLabels: Record<Season, Record<Locale, string>> = {
  spring: { 'zh-CN': '春季', ja: '春', en: 'Spring' },
  summer: { 'zh-CN': '夏季', ja: '夏', en: 'Summer' },
  autumn: { 'zh-CN': '秋季', ja: '秋', en: 'Autumn' },
  winter: { 'zh-CN': '冬季', ja: '冬', en: 'Winter' },
};

interface SeasonBadgeProps {
  locale: Locale;
  lat?: number | null;
}

export function SeasonBadge({ locale, lat }: SeasonBadgeProps) {
  const season = getCurrentSeason(lat);

  return (
    <Badge variant="light" color={getSeasonColor(season)} size="lg" radius="xl">
      {getSeasonEmoji(season)} {seasonLabels[season][locale]}
    </Badge>
  );
}
