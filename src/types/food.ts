export type Locale = 'zh-CN' | 'ja' | 'en';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type MealTime = 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'latenight';
export type Mood = 'happy' | 'sad' | 'tired' | 'stressed' | 'adventurous' | 'comfort';

export interface Food {
  id: string;
  name: Record<Locale, string>;
  category: string;
  subcategory: string;
  tags: string[];
  seasons: Season[];
  mealTimes: MealTime[];
  moods: Mood[];
  cookable: boolean;
  cookDifficulty?: 1 | 2 | 3 | 4 | 5;
  cookTimeMinutes?: number;
  spicyLevel: 0 | 1 | 2 | 3;
  region: string[];
  description?: Partial<Record<Locale, string>>;
  funFact?: Partial<Record<Locale, string>>;
}

export interface FoodCategory {
  id: string;
  name: Record<Locale, string>;
  color: string;
  icon: string;
}

export interface FilterOptions {
  season?: Season;
  mealTime?: MealTime;
  mood?: Mood;
  category?: string;
  cookableOnly?: boolean;
  maxSpicy?: number;
  excludedIds?: string[];
  region?: string;
}
