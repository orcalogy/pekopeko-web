import type { Season } from '@/types/food';

const NORTHERN_SEASONS: [Season, number, number][] = [
  ['spring', 3, 5],
  ['summer', 6, 8],
  ['autumn', 9, 11],
  ['winter', 12, 2],
];

export function getCurrentSeason(lat?: number | null): Season {
  const month = new Date().getMonth() + 1; // 1-12
  const isNorthern = lat == null || lat >= 0;

  for (const [season, start, end] of NORTHERN_SEASONS) {
    const matches = start <= end ? month >= start && month <= end : month >= start || month <= end;
    if (matches) {
      if (isNorthern) return season;
      // Flip season for southern hemisphere
      const flipped: Record<Season, Season> = {
        spring: 'autumn',
        summer: 'winter',
        autumn: 'spring',
        winter: 'summer',
      };
      return flipped[season];
    }
  }
  return 'spring';
}

export function getSeasonEmoji(season: Season): string {
  const emojis: Record<Season, string> = {
    spring: '\u{1F338}', // cherry blossom
    summer: '\u{1F33B}', // sunflower
    autumn: '\u{1F341}', // maple leaf
    winter: '\u{2744}\u{FE0F}', // snowflake
  };
  return emojis[season];
}

export function getSeasonColor(season: Season): string {
  const colors: Record<Season, string> = {
    spring: 'pink',
    summer: 'yellow',
    autumn: 'orange',
    winter: 'cyan',
  };
  return colors[season];
}
