import type {
  EatOutAvoidPreference,
  EatOutSemanticIntent,
  EatOutSoftPreference,
  SearchSessionGoal,
} from '@/lib/llm/types';
import type { FeedbackEvent } from '@/stores/restaurant-feedback';
import type { VisitRecord } from '@/stores/visited';
import type { Restaurant } from '@/types/restaurant';
import type { DerivedTasteProfile } from './types';

const LOW_APPETITE_GENTLE_PATTERN =
  /\b(cafe|coffee|udon|soba|soup|congee|porridge|ochazuke|chawanmushi|salad|teishoku|japanese)\b|カフェ|喫茶|うどん|そば|蕎麦|味噌汁|お茶漬け|茶漬け|茶碗蒸し|定食|粥|清淡|湯|汤/i;
const HEAVY_RISK_PATTERN =
  /\b(ramen|bbq|barbecue|yakiniku|hot\s*pot|izakaya|burger|fried|buffet|all-you-can|curry|tonkatsu|karaage)\b|ラーメン|焼肉|火鍋|鍋|居酒屋|揚げ|唐揚げ|食べ放題|飲み放題|カレー|拉面|拉麺|烤肉|烧烤|火锅|油炸/i;
const SPICY_PATTERN = /\b(spicy|hot|chili|chilli|mala)\b|辛い|激辛|麻辣|辣/i;
const FRIED_PATTERN = /\b(fried|tempura|tonkatsu|karaage|cutlet)\b|揚げ|天ぷら|唐揚げ|炸|油炸/i;
const BBQ_PATTERN = /\b(bbq|barbecue|yakiniku)\b|焼肉|烤肉|烧烤/i;
const HOTPOT_PATTERN = /\bhot\s*pot\b|火鍋|火锅/i;
const FASTFOOD_PATTERN = /\b(fast\s*food|burger|fries|fried chicken)\b|快餐|ハンバーガー/i;
const ALCOHOL_PATTERN = /\b(izakaya|bar|pub|drinks?|alcohol)\b|居酒屋|飲み放題|酒|バー/i;

export interface RestaurantPreferenceEvidence {
  preferenceEvidence: string[];
  riskEvidence: string[];
  profileEvidence: string[];
  sessionEvidence: string[];
  score: number;
}

export function buildRestaurantPreferenceEvidence(params: {
  restaurant: Restaurant;
  currentIntent?: EatOutSemanticIntent | null;
  sessionGoal?: SearchSessionGoal | null;
  visitRecord?: VisitRecord;
  latestFeedback?: FeedbackEvent;
  profile?: DerivedTasteProfile | null;
}): RestaurantPreferenceEvidence {
  const { restaurant, currentIntent, sessionGoal, visitRecord, latestFeedback, profile } = params;
  const text = getRestaurantEvidenceText(restaurant);
  const preferenceEvidence: string[] = [];
  const riskEvidence: string[] = [];
  const profileEvidence: string[] = [];
  const sessionEvidence: string[] = [];
  let score = 0;

  const softPreferences = new Set(currentIntent?.softPreferences ?? []);
  const avoidPreferences = new Set(currentIntent?.avoidPreferences ?? []);

  if (currentIntent?.occasion === 'low_appetite') {
    softPreferences.add('light');
    softPreferences.add('gentle');
    softPreferences.add('warm');
    softPreferences.add('soup');
    softPreferences.add('small_portion');
    avoidPreferences.add('spicy');
    avoidPreferences.add('fried');
    avoidPreferences.add('heavy');
    avoidPreferences.add('rich');
    avoidPreferences.add('large_portion');
    avoidPreferences.add('alcohol_focused');
    avoidPreferences.add('bbq');
    avoidPreferences.add('hotpot');
    avoidPreferences.add('fastfood');
  }

  for (const preference of softPreferences) {
    const evidence = getSoftPreferenceEvidence(preference, restaurant, text, visitRecord);
    if (!evidence) continue;
    preferenceEvidence.push(evidence);
    score += getSoftPreferenceWeight(preference);
  }

  for (const preference of avoidPreferences) {
    const evidence = getAvoidPreferenceEvidence(
      preference,
      restaurant,
      text,
      visitRecord,
      latestFeedback,
    );
    if (!evidence) continue;
    riskEvidence.push(evidence);
    score -= getAvoidPreferenceWeight(preference);
  }

  for (const cuisine of currentIntent?.avoidCuisines ?? []) {
    const normalizedCuisine = cuisine.toLocaleLowerCase();
    if (normalizedCuisine && text.includes(normalizedCuisine)) {
      riskEvidence.push(`current query avoids cuisine:${cuisine}`);
      score -= 2.8;
    }
  }

  if (currentIntent?.openNow && restaurant.isOpenNow === false) {
    riskEvidence.push('hard constraint conflict: closed now');
    score -= 8;
  }
  if (
    currentIntent?.maxBudgetLevel != null &&
    restaurant.priceLevel != null &&
    restaurant.priceLevel > currentIntent.maxBudgetLevel
  ) {
    riskEvidence.push(`hard constraint conflict: price ¥${restaurant.priceLevel}`);
    score -= 3;
  }
  if (
    currentIntent?.partySize != null &&
    currentIntent.partySize > 1 &&
    restaurant.capacity != null &&
    restaurant.capacity < currentIntent.partySize
  ) {
    riskEvidence.push(`hard constraint conflict: capacity ${restaurant.capacity}`);
    score -= 5;
  }

  for (const rejected of sessionGoal?.rejectedAspects ?? []) {
    const normalizedRejected = rejected.toLocaleLowerCase();
    if (normalizedRejected && text.includes(normalizedRejected)) {
      sessionEvidence.push(`session rejected:${rejected}`);
      score -= 1.6;
    }
  }

  if (profile) {
    if (restaurant.cuisineType && profile.topCuisines.includes(restaurant.cuisineType)) {
      profileEvidence.push(`user often likes cuisine:${restaurant.cuisineType}`);
    }
    if (restaurant.cuisineType && profile.avoidedCuisines.includes(restaurant.cuisineType)) {
      profileEvidence.push(`user avoids cuisine:${restaurant.cuisineType}`);
    }
    for (const feature of restaurant.features ?? []) {
      if (profile.topFeatures.includes(feature))
        profileEvidence.push(`user likes feature:${feature}`);
      if (profile.avoidedFeatures.includes(feature)) {
        profileEvidence.push(`user avoids feature:${feature}`);
      }
    }
    if (visitRecord) profileEvidence.push('visited before');
    if (latestFeedback?.kind === 'not_interested') profileEvidence.push('previously rejected');
    if (latestFeedback?.kind === 'liked_after_visit') profileEvidence.push('liked after visit');
  }

  return {
    preferenceEvidence: unique(preferenceEvidence).slice(0, 8),
    riskEvidence: unique(riskEvidence).slice(0, 8),
    profileEvidence: unique(profileEvidence).slice(0, 8),
    sessionEvidence: unique(sessionEvidence).slice(0, 8),
    score,
  };
}

export function getRestaurantEvidenceText(restaurant: Restaurant): string {
  return [
    restaurant.name,
    restaurant.cuisineType,
    restaurant.address,
    restaurant.accessInfo,
    restaurant.budgetText,
    restaurant.source,
    ...(restaurant.features ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

function getSoftPreferenceEvidence(
  preference: EatOutSoftPreference,
  restaurant: Restaurant,
  text: string,
  visitRecord?: VisitRecord,
): string | null {
  switch (preference) {
    case 'light':
    case 'gentle':
    case 'warm':
    case 'soup':
    case 'small_portion':
    case 'healthy':
      return LOW_APPETITE_GENTLE_PATTERN.test(text) ? `current query prefers ${preference}` : null;
    case 'quick':
    case 'solo_friendly':
      return /\b(cafe|ramen|udon|soba|quick|counter)\b|カフェ|うどん|そば|一人|ひとり/i.test(text)
        ? `current query prefers ${preference}`
        : null;
    case 'quiet':
      return restaurant.features?.includes('private_room') ||
        restaurant.features?.includes('non_smoking')
        ? `evidence supports ${preference}`
        : null;
    case 'wifi':
    case 'non_smoking':
      return restaurant.features?.includes(preference) ? `feature:${preference}` : null;
    case 'budget_friendly':
      return restaurant.priceLevel != null && restaurant.priceLevel <= 2
        ? `price level ${restaurant.priceLevel}`
        : null;
    case 'high_rating':
      return restaurant.rating != null && restaurant.rating >= 4.2
        ? `rating ${restaurant.rating}`
        : null;
    case 'nearby':
      return restaurant.distance <= 800 ? `distance ${Math.round(restaurant.distance)}m` : null;
    case 'familiar':
      return visitRecord ? 'visited before' : null;
    case 'novel':
      return !visitRecord ? 'not visited before' : null;
  }
}

function getAvoidPreferenceEvidence(
  preference: EatOutAvoidPreference,
  restaurant: Restaurant,
  text: string,
  visitRecord?: VisitRecord,
  latestFeedback?: FeedbackEvent,
): string | null {
  switch (preference) {
    case 'spicy':
      return SPICY_PATTERN.test(text) ? 'risk:spicy' : null;
    case 'fried':
      return FRIED_PATTERN.test(text) ? 'risk:fried' : null;
    case 'heavy':
    case 'rich':
    case 'large_portion':
      return HEAVY_RISK_PATTERN.test(text) ? `risk:${preference}` : null;
    case 'alcohol_focused':
      return ALCOHOL_PATTERN.test(text) || restaurant.features?.includes('free_drink')
        ? 'risk:alcohol_focused'
        : null;
    case 'bbq':
      return BBQ_PATTERN.test(text) ? 'risk:bbq' : null;
    case 'hotpot':
      return HOTPOT_PATTERN.test(text) ? 'risk:hotpot' : null;
    case 'fastfood':
      return FASTFOOD_PATTERN.test(text) ? 'risk:fastfood' : null;
    case 'noisy':
    case 'crowded':
      return restaurant.features?.includes('free_drink') ||
        restaurant.features?.includes('free_food') ||
        (restaurant.capacity != null && restaurant.capacity >= 50)
        ? `risk:${preference}`
        : null;
    case 'expensive':
      return restaurant.priceLevel != null && restaurant.priceLevel >= 3
        ? `risk:price ¥${restaurant.priceLevel}`
        : null;
    case 'recently_visited':
      return visitRecord?.visits.length ? 'risk:recently_visited' : null;
    case 'previously_rejected':
      return latestFeedback?.kind === 'not_interested' ||
        latestFeedback?.kind === 'disliked_after_visit'
        ? 'risk:previously_rejected'
        : null;
  }
}

function getSoftPreferenceWeight(preference: EatOutSoftPreference): number {
  if (['light', 'gentle', 'warm', 'soup', 'small_portion'].includes(preference)) return 0.95;
  if (['budget_friendly', 'nearby', 'high_rating'].includes(preference)) return 0.75;
  return 0.55;
}

function getAvoidPreferenceWeight(preference: EatOutAvoidPreference): number {
  if (['heavy', 'rich', 'spicy', 'fried', 'alcohol_focused'].includes(preference)) return 1.25;
  if (['bbq', 'hotpot', 'fastfood', 'previously_rejected'].includes(preference)) return 1.5;
  return 0.85;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
