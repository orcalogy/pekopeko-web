import type { CookSemanticIntent } from '@/lib/llm/types';
import type { FilterOptions, Food, Season } from '@/types/food';

export function filterFoods(foods: Food[], options: FilterOptions): Food[] {
  return foods.filter((food) => {
    if (options.season && !food.seasons.includes(options.season)) {
      // Allow foods tagged for all seasons (4 seasons = always)
      if (food.seasons.length < 4) return false;
    }

    if (options.mealTime && !food.mealTimes.includes(options.mealTime)) {
      return false;
    }

    if (options.mood && !food.moods.includes(options.mood)) {
      return false;
    }

    if (options.category && food.category !== options.category) {
      return false;
    }

    if (options.cookableOnly && !food.cookable) {
      return false;
    }

    if (options.maxSpicy !== undefined && food.spicyLevel > options.maxSpicy) {
      return false;
    }

    if (options.excludedIds?.includes(food.id)) {
      return false;
    }

    if (options.region && !food.region.includes(options.region)) {
      return false;
    }

    return true;
  });
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Weighted random pick - seasonal foods get boosted weight
 */
export function pickWeightedRandom(foods: Food[], currentSeason?: Season): Food {
  const weighted = foods.map((food) => ({
    food,
    weight:
      food.seasons.length < 4 && currentSeason && food.seasons.includes(currentSeason) ? 2 : 1,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { food, weight } of weighted) {
    random -= weight;
    if (random <= 0) return food;
  }

  return foods[0];
}

export interface RankedFoodCandidate {
  food: Food;
  score: number;
}

const GENTLE_FOOD_IDS = new Set(['congee', 'udon-kake', 'miso-soup', 'ochazuke', 'chawanmushi']);
const LIGHT_TAG_PATTERN = /清淡|粥|汤|湯|茶|蒸|soup|congee|porridge|udon|miso|tea|steamed/i;
const HEAVY_TAG_PATTERN =
  /烧烤|烤肉|火锅|火鍋|油炸|炸|辣|麻辣|bbq|barbecue|hot\s*pot|fried|spicy|ramen|burger|curry/i;

export function rankFoodsForIntent(
  candidates: Food[],
  intent: CookSemanticIntent | null | undefined,
): RankedFoodCandidate[] {
  return candidates
    .map((food) => ({ food, score: scoreFoodForIntent(food, intent) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.food.name.en.localeCompare(b.food.name.en);
    });
}

export function buildFoodCandidateWeights(
  rankedCandidates: RankedFoodCandidate[],
): Record<string, number> {
  if (rankedCandidates.length === 0) return {};

  const maxScore = Math.max(...rankedCandidates.map((item) => item.score));
  const minScore = Math.min(...rankedCandidates.map((item) => item.score));
  const range = Math.max(1, maxScore - minScore);

  return Object.fromEntries(
    rankedCandidates.map((item, index) => {
      const normalized = (item.score - minScore) / range;
      const rankBoost = Math.max(0, 1 - index / Math.max(1, rankedCandidates.length - 1));
      return [item.food.id, 1 + normalized * 5 + rankBoost * 2] as const;
    }),
  );
}

function scoreFoodForIntent(food: Food, intent: CookSemanticIntent | null | undefined): number {
  let score = 0;
  const softPreferences = new Set(intent?.softPreferences ?? []);
  const avoidPreferences = new Set(intent?.avoidPreferences ?? []);
  const tags = food.tags.join(' ');
  const text = [food.id, food.name.en, food.name.ja, food.name['zh-CN'], food.category, tags]
    .join(' ')
    .toLocaleLowerCase();

  if (intent?.occasion === 'low_appetite') {
    softPreferences.add('light');
    softPreferences.add('gentle');
    softPreferences.add('warm');
    softPreferences.add('soup');
    softPreferences.add('low_spice');
    avoidPreferences.add('spicy');
    avoidPreferences.add('fried');
    avoidPreferences.add('heavy');
    avoidPreferences.add('rich');
    avoidPreferences.add('large_portion');
  }

  if (intent?.recommendedIds?.includes(food.id)) score += 6;
  if (GENTLE_FOOD_IDS.has(food.id)) score += 4.5;
  if (food.spicyLevel === 0) score += 1.3;
  if (food.cookDifficulty != null && food.cookDifficulty <= 2) score += 0.8;
  if (food.cookTimeMinutes != null && food.cookTimeMinutes <= 20) score += 0.8;
  if (food.moods.includes('comfort')) score += 0.6;
  if (food.moods.includes('tired')) score += 0.8;

  if (softPreferences.has('light') || softPreferences.has('gentle')) {
    if (LIGHT_TAG_PATTERN.test(text)) score += 2.2;
    if (food.spicyLevel === 0) score += 1;
  }
  if (softPreferences.has('warm') || softPreferences.has('soup')) {
    if (/soup|congee|porridge|udon|miso|ochazuke|粥|汤|湯|うどん|味噌汁|茶漬け/i.test(text)) {
      score += 2.4;
    }
  }
  if (softPreferences.has('quick') && food.cookTimeMinutes != null && food.cookTimeMinutes <= 20) {
    score += 1.5;
  }
  if (softPreferences.has('easy') && food.cookDifficulty != null && food.cookDifficulty <= 2) {
    score += 1.2;
  }
  if (softPreferences.has('healthy') && /清淡|蒸|salad|healthy|fish|vegetable|野菜/i.test(text)) {
    score += 1;
  }
  if (softPreferences.has('low_spice') && food.spicyLevel === 0) {
    score += 1.6;
  }

  if (avoidPreferences.has('spicy')) score -= food.spicyLevel * 1.8;
  if (avoidPreferences.has('fried') && /fried|揚げ|炸|油炸|天ぷら|唐揚げ/i.test(text)) {
    score -= 2.4;
  }
  if (
    (avoidPreferences.has('heavy') || avoidPreferences.has('rich')) &&
    HEAVY_TAG_PATTERN.test(text)
  ) {
    score -= 3.2;
  }
  if (avoidPreferences.has('bbq') && food.category === 'bbq') score -= 3;
  if (avoidPreferences.has('hotpot') && food.category === 'hotpot') score -= 3;
  if (avoidPreferences.has('fastfood') && food.category === 'fastfood') score -= 3;

  return score;
}
