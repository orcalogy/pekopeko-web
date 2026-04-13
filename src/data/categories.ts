import type { Locale } from '@/types/food';

export interface FoodCategory {
  id: string;
  name: Record<Locale, string>;
  color: string;
}

export const categories: FoodCategory[] = [
  { id: 'chinese', name: { 'zh-CN': '中餐', ja: '中華', en: 'Chinese' }, color: '#E03131' },
  { id: 'japanese', name: { 'zh-CN': '日料', ja: '和食', en: 'Japanese' }, color: '#C2255C' },
  { id: 'korean', name: { 'zh-CN': '韩餐', ja: '韓国料理', en: 'Korean' }, color: '#9C36B5' },
  { id: 'western', name: { 'zh-CN': '西餐', ja: '洋食', en: 'Western' }, color: '#6741D9' },
  {
    id: 'southeast-asian',
    name: { 'zh-CN': '东南亚', ja: '東南アジア', en: 'SE Asian' },
    color: '#3B5BDB',
  },
  {
    id: 'fastfood',
    name: { 'zh-CN': '快餐', ja: 'ファストフード', en: 'Fast Food' },
    color: '#1971C2',
  },
  { id: 'hotpot', name: { 'zh-CN': '火锅', ja: '火鍋', en: 'Hot Pot' }, color: '#D9480F' },
  { id: 'bbq', name: { 'zh-CN': '烧烤', ja: '焼肉', en: 'BBQ' }, color: '#E8590C' },
  { id: 'noodles', name: { 'zh-CN': '面食', ja: '麺類', en: 'Noodles' }, color: '#F08C00' },
  { id: 'dessert', name: { 'zh-CN': '甜品', ja: 'スイーツ', en: 'Dessert' }, color: '#E64980' },
  { id: 'cafe', name: { 'zh-CN': '咖啡简餐', ja: 'カフェ', en: 'Café' }, color: '#862E9C' },
  { id: 'seafood', name: { 'zh-CN': '海鲜', ja: '海鮮', en: 'Seafood' }, color: '#1098AD' },
];

export function getCategoryById(id: string): FoodCategory | undefined {
  return categories.find((c) => c.id === id);
}
