import type { MealTime } from '@/types/food';

const MEAL_TIME_RANGES: Record<MealTime, [number, number]> = {
  breakfast: [5, 10],
  lunch: [10, 14],
  afternoon: [14, 17],
  dinner: [17, 21],
  latenight: [21, 29], // wraps past midnight: 21-5 (29 = 24+5)
};

export function getCurrentMealTime(): MealTime {
  const hour = new Date().getHours();
  const adjustedHour = hour < 5 ? hour + 24 : hour;

  for (const [mealTime, [start, end]] of Object.entries(MEAL_TIME_RANGES) as [
    MealTime,
    [number, number],
  ][]) {
    if (adjustedHour >= start && adjustedHour < end) {
      return mealTime;
    }
  }
  return 'lunch'; // fallback
}

export function getMealTimeEmoji(mealTime: MealTime): string {
  const emojis: Record<MealTime, string> = {
    breakfast: '🌅', // sunrise
    lunch: '☀️', // sun
    afternoon: '☕', // coffee
    dinner: '🌇', // sunset
    latenight: '🌙', // moon
  };
  return emojis[mealTime];
}
