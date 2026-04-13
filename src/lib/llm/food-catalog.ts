import { categories, getCategoryById } from '@/data/categories';
import { foods } from '@/data/foods';

const SAMPLE_FOODS_PER_CATEGORY = 4;
const SAMPLE_TAGS_PER_FOOD = 3;

export function getCondensedFoodCatalog(): string {
  return categories
    .map((category) => {
      const sampleFoods = foods
        .filter((food) => food.category === category.id && food.cookable)
        .slice(0, SAMPLE_FOODS_PER_CATEGORY)
        .map((food) => {
          const sampleTags = food.tags.slice(0, SAMPLE_TAGS_PER_FOOD).join(', ');
          return `${food.id}: ${food.name.en} / ${food.name['zh-CN']} / ${food.name.ja}${sampleTags ? ` [${sampleTags}]` : ''}`;
        });

      return `- ${category.id}: ${category.name.en} / ${category.name['zh-CN']} / ${category.name.ja}\n  examples: ${sampleFoods.join('; ')}`;
    })
    .join('\n');
}

export function getCookCategoryGuide(): string {
  return categories
    .map(
      (category) =>
        `${category.id}: ${category.name.en} / ${category.name['zh-CN']} / ${category.name.ja}`,
    )
    .join('\n');
}

export function describeFoodId(foodId: string): string | null {
  const food = foods.find((item) => item.id === foodId);
  if (!food) return null;

  const category = getCategoryById(food.category);
  return `${food.name.en}${category ? ` (${category.name.en})` : ''}`;
}
