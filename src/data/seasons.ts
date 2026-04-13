import type { Locale, Season } from '@/types/food';

export interface SeasonalHighlight {
  season: Season;
  region: string;
  ingredients: Record<Locale, string[]>;
}

/** Seasonal ingredient highlights for context display */
export const seasonalHighlights: SeasonalHighlight[] = [
  {
    season: 'spring',
    region: 'china',
    ingredients: {
      'zh-CN': ['春笋', '香椿', '韭菜', '荠菜', '蚕豆'],
      ja: ['タケノコ', '椿', 'ニラ', 'ナズナ', 'ソラマメ'],
      en: ['Bamboo Shoots', 'Toon', 'Chives', "Shepherd's Purse", 'Fava Beans'],
    },
  },
  {
    season: 'summer',
    region: 'china',
    ingredients: {
      'zh-CN': ['小龙虾', '西瓜', '毛��', '丝瓜', '莲藕'],
      ja: ['ザリガニ', 'スイカ', '枝豆', 'ヘチマ', 'レンコン'],
      en: ['Crayfish', 'Watermelon', 'Edamame', 'Luffa', 'Lotus Root'],
    },
  },
  {
    season: 'autumn',
    region: 'china',
    ingredients: {
      'zh-CN': ['大闸蟹', '柿子', '栗子', '山药', '银杏'],
      ja: ['上海ガニ', '柿', '栗', '山芋', '銀杏'],
      en: ['Hairy Crab', 'Persimmon', 'Chestnut', 'Yam', 'Ginkgo'],
    },
  },
  {
    season: 'winter',
    region: 'china',
    ingredients: {
      'zh-CN': ['羊��', '白萝卜', '白菜', '红薯', '腊肉'],
      ja: ['羊肉', '大根', '白菜', 'サツマイモ', '干し肉'],
      en: ['Lamb', 'Daikon', 'Napa Cabbage', 'Sweet Potato', 'Cured Meat'],
    },
  },
  {
    season: 'spring',
    region: 'japan',
    ingredients: {
      'zh-CN': ['樱花虾', '竹笋', '油菜花', '蛤蜊', '新洋葱'],
      ja: ['桜エビ', 'たけのこ', '菜の花', 'あさり', '新玉ねぎ'],
      en: ['Sakura Shrimp', 'Bamboo Shoots', 'Rapeseed Blossom', 'Clams', 'New Onion'],
    },
  },
  {
    season: 'summer',
    region: 'japan',
    ingredients: {
      'zh-CN': ['鳗鱼', '毛豆', '西瓜', '冷面', '刨冰'],
      ja: ['うなぎ', '枝豆', 'スイカ', '冷やし麺', 'かき氷'],
      en: ['Eel', 'Edamame', 'Watermelon', 'Cold Noodles', 'Shaved Ice'],
    },
  },
  {
    season: 'autumn',
    region: 'japan',
    ingredients: {
      'zh-CN': ['秋刀鱼', '松茸', '栗子', '柿子', '新米'],
      ja: ['サンマ', '松茸', '栗', '柿', '新米'],
      en: ['Pacific Saury', 'Matsutake', 'Chestnut', 'Persimmon', 'New Rice'],
    },
  },
  {
    season: 'winter',
    region: 'japan',
    ingredients: {
      'zh-CN': ['河豚', '螃蟹', '橘子', '萝卜', '白菜'],
      ja: ['ふぐ', 'カニ', 'みかん', '大根', '白菜'],
      en: ['Fugu', 'Crab', 'Mikan', 'Daikon', 'Napa Cabbage'],
    },
  },
];
