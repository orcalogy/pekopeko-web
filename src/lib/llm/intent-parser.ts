import { categories } from '@/data/categories';
import { foods } from '@/data/foods';
import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import {
  COOK_MEAL_TIMES,
  COOK_MOODS,
  type CookSemanticIntent,
  EAT_OUT_FEATURES,
  EAT_OUT_MISSING_INFO,
  EAT_OUT_SORT_OPTIONS,
  type EatOutQueryExpansion,
  type EatOutRefinementPatch,
  type EatOutRerankEntry,
  type EatOutSemanticIntent,
  type RestaurantFactCard,
  SPATIAL_IMPORTANCE,
  SPATIAL_INTENT_TYPES,
  type SpatialIntent,
} from '@/lib/llm/types';
import type { Locale } from '@/types/food';
import type { MapProviderType } from '@/types/restaurant';

const categoryIds = new Set(categories.map((category) => category.id));
const foodIds = new Set(foods.map((food) => food.id));
const moodIds = new Set<string>(COOK_MOODS);
const mealTimeIds = new Set<string>(COOK_MEAL_TIMES);
const eatOutFeatureIds = new Set<string>(EAT_OUT_FEATURES);
const eatOutSortOptions = new Set<string>(EAT_OUT_SORT_OPTIONS);
const eatOutMissingInfoIds = new Set<string>(EAT_OUT_MISSING_INFO);
const spatialIntentTypes = new Set<string>(SPATIAL_INTENT_TYPES);
const spatialImportanceIds = new Set<string>(SPATIAL_IMPORTANCE);
const mapProviderIds = new Set<string>(['google', 'hotpepper', 'amap']);
const WALK_METERS_PER_MINUTE = 70;
const MAX_SOFT_PREFERENCES = 8;
const MAX_PROVIDER_QUERIES_PER_PROVIDER = 3;
const MAX_PROVIDER_QUERIES_TOTAL = 6;

const eatOutKeywordRules = [
  { keyword: 'cafe', pattern: /\b(caf[eé]|coffee)\b|カフェ|喫茶|咖啡/i },
  { keyword: 'sushi', pattern: /\bsushi\b|寿司|すし|鮨/i },
  { keyword: 'ramen', pattern: /\bramen\b|ラーメン|拉面|拉麺/i },
  { keyword: 'izakaya', pattern: /\bizakaya\b|居酒屋/i },
  { keyword: 'chinese', pattern: /\bchinese\b|中餐|中華|中国菜/i },
  { keyword: 'korean', pattern: /\bkorean\b|韓国|韩餐|韩国/i },
  { keyword: 'bbq', pattern: /\b(bbq|barbecue|yakiniku)\b|焼肉|烤肉|烧烤/i },
  { keyword: 'hotpot', pattern: /\bhot\s*pot\b|火锅|火鍋/i },
  { keyword: 'dessert', pattern: /\b(dessert|sweets?)\b|甜品|スイーツ/i },
];

function parseIntentObject(raw: string): Record<string, unknown> | null {
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return parsed as Record<string, unknown>;
}

function isAllowedEatOutRating(value: unknown): value is 3 | 3.5 | 4 | 4.5 {
  return typeof value === 'number' && [3, 3.5, 4, 4.5].includes(value);
}

function clampUnitInterval(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

function parseStringArray(
  value: unknown,
  options?: {
    allowed?: Set<string>;
    maxItems?: number;
  },
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  const maxItems = options?.maxItems ?? 8;

  for (const item of value) {
    const normalized = typeof item === 'string' ? normalizeSearchQuery(item) : '';
    if (!normalized || seen.has(normalized)) continue;
    if (options?.allowed && !options.allowed.has(normalized)) continue;

    seen.add(normalized);
    result.push(normalized);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeEatOutKeyword(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? normalizeSearchQuery(value) : '';
  if (!normalized) return undefined;

  const matchingRule = eatOutKeywordRules.find((rule) => rule.pattern.test(normalized));
  if (matchingRule) {
    return matchingRule.keyword;
  }

  return normalized;
}

function pushUnique<TValue>(items: TValue[] | undefined, item: TValue): TValue[] {
  const next = items ? [...items] : [];
  if (!next.includes(item)) {
    next.push(item);
  }
  return next;
}

function applyEatOutSourceHints(
  intent: Omit<EatOutSemanticIntent, 'confidence'>,
  sourceQuery?: string,
) {
  const normalized = normalizeSearchQuery(sourceQuery);
  if (!normalized) return;

  const sourceKeyword = normalizeEatOutKeyword(normalized);
  if (!intent.keyword && sourceKeyword) {
    intent.keyword = sourceKeyword;
  } else if (intent.keyword && sourceKeyword && intent.keyword === normalized) {
    intent.keyword = sourceKeyword;
  }

  if (/\b(quiet|calm|not noisy|low noise)\b|静か|落ち着|安静/i.test(normalized)) {
    intent.softPreferences = pushUnique(intent.softPreferences, 'quiet');
  }

  if (/\b(wifi|wi-fi|work|laptop|study)\b|仕事|作業|办公|工作/i.test(normalized)) {
    intent.features = pushUnique(intent.features, 'wifi');
    intent.softPreferences = pushUnique(intent.softPreferences, 'wifi');
  }
}

export function deriveEatOutIntentFromQuery(sourceQuery: string): EatOutSemanticIntent | null {
  const intent: Omit<EatOutSemanticIntent, 'confidence'> = {};
  applyEatOutSourceHints(intent, sourceQuery);

  if (!hasActionableEatOutIntent(intent)) {
    return null;
  }

  return {
    ...intent,
    confidence: 0.45,
  };
}

export function deriveEatOutRefinementPatchFromQuery(
  sourceQuery: string,
): EatOutRefinementPatch | null {
  const normalized = normalizeSearchQuery(sourceQuery);
  if (!normalized) return null;

  const patch: EatOutRefinementPatch = { operation: 'refine' };
  const distanceMatch = normalized.match(/(\d{2,5})\s*(m|meter|meters|米|メートル)\b/i);
  if (distanceMatch?.[1]) {
    const radiusM = Math.max(100, Math.min(10_000, Number.parseInt(distanceMatch[1], 10)));
    patch.spatialIntent = {
      type: 'near_current_location',
      radiusM,
      importance: /\b(within|under|inside)\b|以内|圏内/i.test(normalized) ? 'hard' : 'soft',
    };
  }

  const walkMatch = normalized.match(/(\d{1,2})\s*(min|mins|minute|minutes|分)/i);
  if (walkMatch?.[1]) {
    const maxWalkMinutes = Math.max(1, Math.min(60, Number.parseInt(walkMatch[1], 10)));
    patch.spatialIntent = {
      type: 'near_current_location',
      maxWalkMinutes,
      radiusM: radiusFromWalkMinutes(maxWalkMinutes),
      importance: /\b(within|under|inside)\b|以内|圏内/i.test(normalized) ? 'hard' : 'soft',
    };
  }

  if (/\b(open now|currently open)\b|営業中|营业中|现在开|现在还开/i.test(normalized)) {
    patch.openNow = true;
  }

  if (/\b(cheap|cheaper|budget|inexpensive)\b|安い|便宜|不贵/i.test(normalized)) {
    patch.maxBudgetLevel = 2;
  }

  const addSoftPreferences: string[] = [];
  if (/\b(quiet|quieter|calm|not noisy|low noise)\b|静か|落ち着|安静/i.test(normalized)) {
    addSoftPreferences.push('quiet');
  }
  if (/\b(wifi|wi-fi|work|laptop|study)\b|仕事|作業|办公|工作/i.test(normalized)) {
    addSoftPreferences.push('wifi');
  }
  if (addSoftPreferences.length > 0) {
    patch.addSoftPreferences = [...new Set(addSoftPreferences)];
    patch.rerankOnly = !patch.spatialIntent;
  }

  const partyMatch = normalized.match(/\b([1-9]|1[0-2])\s*(people|persons|guests|friends)\b/i);
  if (partyMatch?.[1]) {
    patch.partySize = Number.parseInt(partyMatch[1], 10);
  }

  return Object.keys(patch).length > 1 ? patch : null;
}

export function radiusFromWalkMinutes(minutes: number): number {
  return Math.max(100, Math.min(10_000, Math.round(minutes * WALK_METERS_PER_MINUTE)));
}

export function parseSpatialIntent(value: unknown): SpatialIntent | undefined {
  const parsed = parseObject(value);
  if (!parsed) return undefined;

  if (typeof parsed.type !== 'string' || !spatialIntentTypes.has(parsed.type)) {
    return undefined;
  }

  const intent: SpatialIntent = {
    type: parsed.type as SpatialIntent['type'],
    importance:
      typeof parsed.importance === 'string' && spatialImportanceIds.has(parsed.importance)
        ? (parsed.importance as SpatialIntent['importance'])
        : 'soft',
  };

  const anchorText =
    typeof parsed.anchorText === 'string' ? normalizeSearchQuery(parsed.anchorText) : '';
  if (anchorText) {
    intent.anchorText = anchorText;
  }

  if (
    typeof parsed.maxWalkMinutes === 'number' &&
    Number.isFinite(parsed.maxWalkMinutes) &&
    parsed.maxWalkMinutes > 0
  ) {
    intent.maxWalkMinutes = Math.min(60, Math.round(parsed.maxWalkMinutes));
    intent.radiusM = radiusFromWalkMinutes(intent.maxWalkMinutes);
  } else if (
    typeof parsed.radiusM === 'number' &&
    Number.isFinite(parsed.radiusM) &&
    parsed.radiusM > 0
  ) {
    intent.radiusM = Math.max(100, Math.min(10_000, Math.round(parsed.radiusM)));
  }

  return intent;
}

export function parseEatOutQueryExpansion(value: unknown): EatOutQueryExpansion | undefined {
  const parsed = parseObject(value);
  if (!parsed) return undefined;

  const expansion: EatOutQueryExpansion = {};
  const primaryKeyword =
    typeof parsed.primaryKeyword === 'string'
      ? normalizeSearchQuery(parsed.primaryKeyword)
      : undefined;

  if (primaryKeyword) {
    expansion.primaryKeyword = primaryKeyword;
  }

  const providerQueriesObject = parseObject(parsed.providerQueries);
  let totalQueries = 0;
  if (providerQueriesObject) {
    const providerQueries: EatOutQueryExpansion['providerQueries'] = {};

    for (const [provider, queries] of Object.entries(providerQueriesObject)) {
      if (!mapProviderIds.has(provider) || totalQueries >= MAX_PROVIDER_QUERIES_TOTAL) {
        continue;
      }

      const remaining = MAX_PROVIDER_QUERIES_TOTAL - totalQueries;
      const normalizedQueries = parseStringArray(queries, {
        maxItems: Math.min(MAX_PROVIDER_QUERIES_PER_PROVIDER, remaining),
      });

      if (normalizedQueries.length > 0) {
        providerQueries[provider as MapProviderType] = normalizedQueries;
        totalQueries += normalizedQueries.length;
      }
    }

    if (Object.keys(providerQueries).length > 0) {
      expansion.providerQueries = providerQueries;
    }
  }

  if (Array.isArray(parsed.hardFilters) && parsed.hardFilters.includes('openNow')) {
    expansion.hardFilters = ['openNow'];
  }

  const softPreferences = parseStringArray(parsed.softPreferences, {
    maxItems: MAX_SOFT_PREFERENCES,
  });
  if (softPreferences.length > 0) {
    expansion.softPreferences = softPreferences;
  }

  return Object.keys(expansion).length > 0 ? expansion : undefined;
}

function parseClarifyingQuestion(value: unknown): EatOutSemanticIntent['clarifyingQuestion'] {
  const parsed = parseObject(value);
  if (!parsed) return undefined;

  const question = typeof parsed.question === 'string' ? normalizeSearchQuery(parsed.question) : '';
  const options = parseStringArray(parsed.options, { maxItems: 4 });

  if (!question || options.length < 2) {
    return undefined;
  }

  return { question, options };
}

function hasActionableEatOutIntent(intent: Omit<EatOutSemanticIntent, 'confidence'>): boolean {
  return Boolean(
    intent.keyword ||
      intent.category ||
      intent.openNow != null ||
      intent.minRating != null ||
      intent.maxBudgetLevel != null ||
      intent.partySize != null ||
      intent.features?.length ||
      intent.sortBy ||
      intent.spatialIntent ||
      intent.queryExpansion ||
      intent.softPreferences?.length,
  );
}

export function parseCookIntent(raw: string): CookSemanticIntent | null {
  const parsed = parseIntentObject(raw);
  if (!parsed) return null;

  const intent: CookSemanticIntent = {};
  const keyword =
    typeof parsed.keyword === 'string' ? normalizeSearchQuery(parsed.keyword) : undefined;
  if (keyword) {
    intent.keyword = keyword;
  }

  if (typeof parsed.mood === 'string' && moodIds.has(parsed.mood)) {
    intent.mood = parsed.mood as CookSemanticIntent['mood'];
  }

  if (typeof parsed.category === 'string' && categoryIds.has(parsed.category)) {
    intent.category = parsed.category;
  }

  if (
    typeof parsed.maxSpicy === 'number' &&
    Number.isInteger(parsed.maxSpicy) &&
    parsed.maxSpicy >= 0 &&
    parsed.maxSpicy <= 3
  ) {
    intent.maxSpicy = parsed.maxSpicy as 0 | 1 | 2 | 3;
  }

  if (typeof parsed.mealTime === 'string' && mealTimeIds.has(parsed.mealTime)) {
    intent.mealTime = parsed.mealTime as CookSemanticIntent['mealTime'];
  }

  if (parsed.cookableOnly !== false) {
    intent.cookableOnly = true;
  }

  if (Array.isArray(parsed.recommendedIds)) {
    const ids = parsed.recommendedIds
      .filter((value): value is string => typeof value === 'string' && foodIds.has(value))
      .slice(0, 5);

    if (ids.length > 0) {
      intent.recommendedIds = ids;
    }
  }

  return Object.keys(intent).length > 0 ? intent : null;
}

export function parseEatOutIntent(raw: string, sourceQuery?: string): EatOutSemanticIntent | null {
  const parsed = parseIntentObject(raw);
  if (!parsed) return null;

  const intent: Omit<EatOutSemanticIntent, 'confidence'> = {};
  const keyword = normalizeEatOutKeyword(parsed.keyword);
  if (keyword) {
    intent.keyword = keyword;
  }

  if (typeof parsed.category === 'string' && categoryIds.has(parsed.category)) {
    intent.category = parsed.category;
  }

  if (typeof parsed.openNow === 'boolean') {
    intent.openNow = parsed.openNow;
  }

  if (isAllowedEatOutRating(parsed.minRating)) {
    intent.minRating = parsed.minRating;
  }

  if (
    typeof parsed.maxBudgetLevel === 'number' &&
    Number.isInteger(parsed.maxBudgetLevel) &&
    parsed.maxBudgetLevel >= 1 &&
    parsed.maxBudgetLevel <= 4
  ) {
    intent.maxBudgetLevel = parsed.maxBudgetLevel as 1 | 2 | 3 | 4;
  }

  if (
    typeof parsed.partySize === 'number' &&
    Number.isInteger(parsed.partySize) &&
    parsed.partySize >= 1 &&
    parsed.partySize <= 12
  ) {
    intent.partySize = parsed.partySize;
  }

  if (Array.isArray(parsed.features)) {
    const features = parsed.features
      .filter(
        (value): value is NonNullable<EatOutSemanticIntent['features']>[number] =>
          typeof value === 'string' && eatOutFeatureIds.has(value),
      )
      .slice(0, 4);

    if (features.length > 0) {
      intent.features = features;
    }
  }

  if (typeof parsed.sortBy === 'string' && eatOutSortOptions.has(parsed.sortBy)) {
    intent.sortBy = parsed.sortBy as EatOutSemanticIntent['sortBy'];
  }

  const missingInfo = parseStringArray(parsed.missingInfo, {
    allowed: eatOutMissingInfoIds,
    maxItems: 8,
  }) as NonNullable<EatOutSemanticIntent['missingInfo']>;
  if (missingInfo.length > 0) {
    intent.missingInfo = missingInfo;
  }

  const clarifyingQuestion = parseClarifyingQuestion(parsed.clarifyingQuestion);
  if (clarifyingQuestion) {
    intent.clarifyingQuestion = clarifyingQuestion;
  }

  const spatialIntent = parseSpatialIntent(parsed.spatialIntent);
  if (spatialIntent) {
    intent.spatialIntent = spatialIntent;
  }

  const queryExpansion = parseEatOutQueryExpansion(parsed.queryExpansion);
  if (queryExpansion) {
    intent.queryExpansion = queryExpansion;
  }

  const softPreferences = parseStringArray(parsed.softPreferences, {
    maxItems: MAX_SOFT_PREFERENCES,
  });
  if (softPreferences.length > 0) {
    intent.softPreferences = softPreferences;
  }

  applyEatOutSourceHints(intent, sourceQuery);

  const actionable = hasActionableEatOutIntent(intent);
  if (!actionable && !clarifyingQuestion) {
    return null;
  }

  return {
    ...intent,
    confidence: clampUnitInterval(parsed.confidence, actionable ? 0.7 : 0.25),
  };
}

export function parseEatOutRefinementPatch(raw: string): EatOutRefinementPatch | null {
  const parsed = parseIntentObject(raw);
  if (!parsed) return null;

  if (parsed.operation !== 'refine') {
    return null;
  }

  const patch: EatOutRefinementPatch = { operation: 'refine' };

  const addSoftPreferences = parseStringArray(parsed.addSoftPreferences, {
    maxItems: MAX_SOFT_PREFERENCES,
  });
  if (addSoftPreferences.length > 0) {
    patch.addSoftPreferences = addSoftPreferences;
  }

  const removeCuisines = parseStringArray(parsed.removeCuisines, { maxItems: 6 });
  if (removeCuisines.length > 0) {
    patch.removeCuisines = removeCuisines;
  }

  if (
    typeof parsed.maxBudgetLevel === 'number' &&
    Number.isInteger(parsed.maxBudgetLevel) &&
    parsed.maxBudgetLevel >= 1 &&
    parsed.maxBudgetLevel <= 4
  ) {
    patch.maxBudgetLevel = parsed.maxBudgetLevel as 1 | 2 | 3 | 4;
  }

  if (
    typeof parsed.partySize === 'number' &&
    Number.isInteger(parsed.partySize) &&
    parsed.partySize >= 1 &&
    parsed.partySize <= 12
  ) {
    patch.partySize = parsed.partySize;
  }

  if (typeof parsed.openNow === 'boolean') {
    patch.openNow = parsed.openNow;
  }

  const spatialIntent = parseSpatialIntent(parsed.spatialIntent);
  if (spatialIntent) {
    patch.spatialIntent = spatialIntent;
  }

  if (typeof parsed.rerankOnly === 'boolean') {
    patch.rerankOnly = parsed.rerankOnly;
  }

  return Object.keys(patch).length > 1 ? patch : null;
}

export function parseEatOutRerank(
  raw: string,
  factCardsOrIds: readonly RestaurantFactCard[] | readonly string[],
  locale: Locale = 'en',
): EatOutRerankEntry[] | null {
  const parsed = JSON.parse(raw) as unknown;
  const recommendationCandidates = getRerankRecommendationCandidates(parsed);
  if (!recommendationCandidates) return null;

  const factCards = factCardsOrIds.filter(
    (item): item is RestaurantFactCard => typeof item === 'object',
  );
  const validIds =
    factCards.length > 0 ? factCards.map((card) => card.id) : (factCardsOrIds as readonly string[]);
  const factCardById = new Map(factCards.map((card) => [card.id, card]));
  const factCardByName = new Map(factCards.map((card) => [card.name.toLowerCase(), card]));
  const validIdSet = new Set(validIds);
  const seen = new Set<string>();
  const recommendations: EatOutRerankEntry[] = [];

  for (const item of recommendationCandidates) {
    const itemObject = parseObject(item);
    const id = resolveRerankCandidateId(item, itemObject, validIdSet, factCardByName);
    if (!id || !validIdSet.has(id) || seen.has(id)) {
      continue;
    }

    const factCard = factCardById.get(id);
    const matched = sanitizeEvidenceList(itemObject?.matched, factCard);
    const tradeoffs = sanitizeEvidenceList(itemObject?.tradeoffs, factCard);
    const rawReason =
      typeof itemObject?.reason === 'string' ? normalizeSearchQuery(itemObject.reason) : '';
    const reason =
      rawReason && (!factCard || isGroundedReason(rawReason, factCard))
        ? rawReason
        : composeGroundedReason(locale, factCard, matched, tradeoffs) || id;

    if (!reason) {
      continue;
    }

    seen.add(id);
    recommendations.push({
      id,
      reason,
      score: clampUnitInterval(itemObject?.score, 0),
      matched,
      tradeoffs,
      confidence: clampUnitInterval(itemObject?.confidence, factCard ? 0.6 : 0.5),
    });

    if (recommendations.length >= 8) {
      break;
    }
  }

  return recommendations.length > 0 ? recommendations : null;
}

function getRerankRecommendationCandidates(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  const parsedObject = parseObject(parsed);
  if (!parsedObject) return null;

  for (const key of ['recommendations', 'ranking', 'rankings', 'items', 'restaurants', 'order']) {
    const value = parsedObject[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return null;
}

function resolveRerankCandidateId(
  item: unknown,
  itemObject: Record<string, unknown> | null,
  validIdSet: Set<string>,
  factCardByName: Map<string, RestaurantFactCard>,
): string | null {
  const candidateStrings =
    typeof item === 'string'
      ? [item]
      : [
          itemObject?.id,
          itemObject?.restaurantId,
          itemObject?.restaurant_id,
          itemObject?.restaurantKey,
          itemObject?.restaurant_key,
          itemObject?.name,
        ];

  for (const candidate of candidateStrings) {
    if (typeof candidate !== 'string') continue;

    if (validIdSet.has(candidate)) {
      return candidate;
    }

    const factCard = factCardByName.get(candidate.toLowerCase());
    if (factCard) {
      return factCard.id;
    }
  }

  return null;
}

function sanitizeEvidenceList(value: unknown, factCard?: RestaurantFactCard): string[] {
  const items = parseStringArray(value, { maxItems: 4 });
  if (!factCard) return items;

  return items.filter((item) => isSupportedEvidence(item, factCard));
}

function buildEvidenceText(factCard: RestaurantFactCard): string {
  return [
    factCard.name,
    factCard.cuisine,
    factCard.distanceM != null ? `${factCard.distanceM}m` : null,
    factCard.rating != null ? `rating ${factCard.rating}` : null,
    factCard.priceLevel != null ? 'budget price cheap yen' : null,
    factCard.openNow === true ? 'open now currently available' : null,
    factCard.openNow === false ? 'closed not open' : null,
    ...factCard.features,
    ...(factCard.ambienceHints ?? []),
    ...(factCard.occasionHints ?? []),
    ...factCard.deterministicReasons,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isSupportedEvidence(value: string, factCard: RestaurantFactCard): boolean {
  const normalized = value.toLowerCase();
  const evidenceText = buildEvidenceText(factCard);

  return normalized
    .split(/\s+/)
    .filter((part) => part.length > 2)
    .some((part) => evidenceText.includes(part));
}

function isGroundedReason(reason: string, factCard: RestaurantFactCard): boolean {
  const lower = reason.toLowerCase();
  const hasFeature = (feature: string) => factCard.features.includes(feature);
  const hasHint = (pattern: RegExp) =>
    [...(factCard.ambienceHints ?? []), ...(factCard.occasionHints ?? [])].some((hint) =>
      pattern.test(hint.toLowerCase()),
    );

  const unsupportedClaims = [
    {
      pattern: /\b(quiet|calm|silent|not noisy)\b|安静|静か|落ち着|吵|嘈杂|騒がしくない/i,
      supported: hasFeature('private_room') || hasHint(/quiet|calm|private|個室|安静|静か/),
    },
    {
      pattern: /\b(vegetarian|vegan|halal|gluten|dietary)\b|素食|清真|ベジ|ビーガン/i,
      supported: hasHint(/vegetarian|vegan|halal|dietary|素食|清真|ベジ|ビーガン/),
    },
    {
      pattern: /\b(date|romantic|anniversary)\b|デート|記念日|约会|浪漫/i,
      supported: hasHint(/date|romantic|anniversary|デート|記念日|约会|浪漫/),
    },
    {
      pattern: /\b(english menu|english support)\b|英語|英语菜单|英文菜单/i,
      supported: hasFeature('english'),
    },
    {
      pattern: /\b(wifi|wi-fi|work cafe|work-friendly)\b|仕事|作業|办公|工作/i,
      supported: hasFeature('wifi'),
    },
    {
      pattern: /\b(open now|currently open)\b|営業中|营业中|现在营业/i,
      supported: factCard.openNow === true,
    },
    {
      pattern: /\b(cheap|budget|inexpensive)\b|安い|便宜|不贵/i,
      supported: factCard.priceLevel != null && factCard.priceLevel <= 2,
    },
    {
      pattern: /\b(group|party)\b|宴会|グループ|聚会|多人/i,
      supported: hasHint(/group|party|capacity|宴会|グループ|聚会|多人/),
    },
    {
      pattern: /\b(solo|alone)\b|一人|ひとり|一个人/i,
      supported: hasHint(/solo|alone|一人|ひとり|一个人/),
    },
    {
      pattern: /\b(station|access)\b|駅|车站|アクセス|交通/i,
      supported: hasHint(/station|駅|车站|access|アクセス|交通/),
    },
  ];

  return unsupportedClaims.every((claim) => !claim.pattern.test(lower) || claim.supported);
}

function composeGroundedReason(
  locale: Locale,
  factCard: RestaurantFactCard | undefined,
  matched: string[],
  tradeoffs: string[],
): string {
  if (!factCard) {
    return matched[0] ?? '';
  }

  const facts =
    matched.length > 0
      ? matched
      : [
          factCard.cuisine,
          factCard.rating != null ? `rating ${factCard.rating.toFixed(1)}` : null,
          factCard.distanceM != null ? `${factCard.distanceM}m away` : null,
          factCard.priceLevel != null ? `${'¥'.repeat(factCard.priceLevel)}` : null,
          ...factCard.deterministicReasons.slice(0, 1),
        ].filter((value): value is string => Boolean(value));

  const primary = facts.slice(0, 2).join(', ');
  const tradeoff = tradeoffs[0];

  if (locale === 'zh-CN') {
    return tradeoff ? `匹配：${primary}；取舍：${tradeoff}` : `匹配：${primary}`;
  }
  if (locale === 'ja') {
    return tradeoff ? `合う点: ${primary}。注意: ${tradeoff}` : `合う点: ${primary}`;
  }

  return tradeoff ? `Matches ${primary}; tradeoff: ${tradeoff}` : `Matches ${primary}`;
}
