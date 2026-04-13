import type { Locale, MealTime } from '@/types/food';

export interface MealTimeOption {
  id: MealTime;
  emoji: string;
  label: Record<Locale, string>;
  hourRange: [number, number];
}

export const mealTimes: MealTimeOption[] = [
  {
    id: 'breakfast',
    emoji: '🌅',
    label: { 'zh-CN': '早餐', ja: '朝食', en: 'Breakfast' },
    hourRange: [5, 10],
  },
  {
    id: 'lunch',
    emoji: '☀️',
    label: { 'zh-CN': '午餐', ja: '昼食', en: 'Lunch' },
    hourRange: [10, 14],
  },
  {
    id: 'afternoon',
    emoji: '☕',
    label: { 'zh-CN': '下午茶', ja: 'おやつ', en: 'Afternoon Tea' },
    hourRange: [14, 17],
  },
  {
    id: 'dinner',
    emoji: '🌇',
    label: { 'zh-CN': '晚餐', ja: '夕食', en: 'Dinner' },
    hourRange: [17, 21],
  },
  {
    id: 'latenight',
    emoji: '🌙',
    label: { 'zh-CN': '夜宵', ja: '夜食', en: 'Late Night' },
    hourRange: [21, 5],
  },
];
