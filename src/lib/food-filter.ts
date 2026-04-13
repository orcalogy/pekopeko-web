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
