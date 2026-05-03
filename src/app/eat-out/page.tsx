'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Container,
  Group,
  Image,
  Loader,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { FEATURE_LABELS, RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { SmartSearchInput } from '@/components/search/SmartSearchInput';

const RestaurantMap = dynamic(() => import('../../components/restaurant/RestaurantMap'), {
  ssr: false,
  loading: () => (
    <Center py="xl">
      <Loader color="orange" />
    </Center>
  ),
});

import { categories } from '@/data/categories';
import {
  EAT_OUT_LOCAL_INTENT_PARAM,
  type EatOutLocalIntentState,
  readEatOutLocalIntentState,
} from '@/lib/llm/eat-out-navigation';
import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import {
  buildRestaurantFactCards,
  formatRestaurantFactCardsForRerank,
} from '@/lib/llm/restaurant-shortlist';
import {
  buildRestaurantTasteProfilePromptSummary,
  deriveRestaurantTasteProfile,
} from '@/lib/llm/restaurant-taste-profile';
import type {
  EatOutAvoidPreference,
  EatOutQueryExpansion,
  EatOutRefinementPatch,
  EatOutRerankEntry,
  EatOutSemanticIntent,
  EatOutSoftPreference,
  SearchSessionGoal,
} from '@/lib/llm/types';
import { useSemanticSearch } from '@/lib/llm/use-semantic-search';
import { getRestaurantIdentityKey } from '@/lib/recommendation/identity';
import { getLatestFeedbackByRestaurant } from '@/lib/recommendation/profile';
import { pickRestaurantWithMode, type RandomPickMode } from '@/lib/recommendation/random-pick';
import { rankRestaurants } from '@/lib/recommendation/scoring';
import type { FeedbackAspect } from '@/lib/recommendation/types';
import {
  formatSearchRadius,
  formatSearchRadiusMark,
  getSearchRadiusKmForIndex,
  getSearchRadiusPresetIndex,
  getSearchRadiusSliderMax,
  normalizeSearchRadiusKm,
  SEARCH_RADIUS_MARK_PRESETS_KM,
} from '@/lib/search-radius';
import { useLlmStore } from '@/stores/llm';
import { useLocation } from '@/stores/location';
import { usePreferences } from '@/stores/preferences';
import { type FeedbackEvent, useRestaurantFeedback } from '@/stores/restaurant-feedback';
import { useVisited } from '@/stores/visited';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

type SortBy = 'distance' | 'rating';
type RestaurantSearchPayloadItem = Omit<Restaurant, 'id'> & Partial<Pick<Restaurant, 'id'>>;
const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;
const PERSISTENT_MAP_HEIGHT = 196;
const MAX_BUDGET_LEVEL = 4;
const MIN_PARTY_SIZE = 1;
const MAX_PARTY_SIZE = 12;
const DEFAULT_REFINEMENT_CHIPS = [
  'cheap',
  'high rating',
  'quiet',
  'quick meal',
  'solo-friendly',
  'group-friendly',
  'near station',
  'open now',
  'surprise me',
];

function parseProviderKeywordsParam(
  value: string | null,
): EatOutQueryExpansion['providerQueries'] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;

    const result: EatOutQueryExpansion['providerQueries'] = {};
    for (const provider of ['google', 'hotpepper', 'amap'] as const) {
      const queries = (parsed as Partial<Record<typeof provider, unknown>>)[provider];
      if (!Array.isArray(queries)) continue;

      const normalized = queries
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizeSearchQuery(item))
        .filter(Boolean)
        .slice(0, 3);
      if (normalized.length > 0) {
        result[provider] = normalized;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

function parseStringListParam(value: string | null): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => normalizeSearchQuery(item))
    .filter(Boolean)
    .slice(0, 8);
}

function mergeStringLists(...lists: string[][]): string[] {
  return [
    ...new Set(
      lists
        .flat()
        .map((item) => normalizeSearchQuery(item))
        .filter(Boolean),
    ),
  ].slice(0, 8);
}

function getIntentSoftPreferences(intent: EatOutSemanticIntent | null | undefined): string[] {
  if (!intent) return [];

  return mergeStringLists(
    intent.softPreferences ?? [],
    intent.queryExpansion?.softPreferences ?? [],
  );
}

function getIntentAvoidPreferences(intent: EatOutSemanticIntent | null | undefined): string[] {
  return intent?.avoidPreferences ?? [];
}

function normalizeProviderQueryExpansion(
  expansion: EatOutQueryExpansion['providerQueries'] | undefined,
): EatOutQueryExpansion['providerQueries'] | undefined {
  if (!expansion) return undefined;

  const result: EatOutQueryExpansion['providerQueries'] = {};
  for (const provider of ['google', 'hotpepper', 'amap'] as const) {
    const queries = expansion[provider]?.map((item) => normalizeSearchQuery(item)).filter(Boolean);
    if (queries?.length) {
      result[provider] = [...new Set(queries)].slice(0, 3);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function getProviderBackedRestaurantId(restaurant: RestaurantSearchPayloadItem): string | null {
  const providerRef = restaurant.providerRefs?.find((ref) => ref.providerId.trim());
  if (providerRef) {
    return `${providerRef.provider}:${providerRef.providerId}`;
  }

  return null;
}

function normalizeRestaurantSearchResult(restaurant: RestaurantSearchPayloadItem): Restaurant {
  const id =
    restaurant.id?.trim() ||
    restaurant.restaurantKey?.trim() ||
    getProviderBackedRestaurantId(restaurant) ||
    `${restaurant.source ?? 'unknown'}:${restaurant.name}:${restaurant.lat}:${restaurant.lng}`;

  return {
    ...restaurant,
    id,
  };
}

function getAspectOptionsForFeedback(
  kind: 'liked_after_visit' | 'disliked_after_visit' | 'not_interested',
): FeedbackAspect[] {
  if (kind === 'liked_after_visit') {
    return ['taste', 'price', 'ambience', 'service', 'solo', 'group', 'access'];
  }
  if (kind === 'disliked_after_visit') {
    return ['taste', 'price', 'distance', 'noise', 'crowd', 'service', 'dietary', 'not_my_mood'];
  }

  return ['price', 'distance', 'taste', 'not_my_mood', 'crowd'];
}

export default function EatOutPage() {
  return (
    <Suspense
      fallback={
        <Center py="xl">
          <Loader color="orange" />
        </Center>
      }
    >
      <EatOutContent />
    </Suspense>
  );
}

function EatOutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');
  const isRandomMode = searchParams.get('random') === 'true';
  const keyword = normalizeSearchQuery(searchParams.get('keyword'));
  const localIntentId = searchParams.get(EAT_OUT_LOCAL_INTENT_PARAM);
  const providerKeywordsParam = searchParams.get('providerKeywords');
  const softPreferencesParam = searchParams.get('softPreferences');
  const radiusMParam = searchParams.get('radiusM');
  const hasOpenNowParam = searchParams.has('openNow');
  const openNowFromQuery = searchParams.get('openNow') === 'true';
  const [localIntentState, setLocalIntentState] = useState<EatOutLocalIntentState | null>(null);
  const localIntent = localIntentState?.intent ?? null;
  const localOriginalQuery = normalizeSearchQuery(localIntentState?.originalQuery);
  const localIntentKeyword = normalizeSearchQuery(
    localIntent?.keyword ?? localIntent?.queryExpansion?.primaryKeyword,
  );
  const localIntentCategoryId = categories.some((category) => category.id === localIntent?.category)
    ? localIntent?.category
    : null;
  const localIntentSoftPreferences = useMemo(
    () => getIntentSoftPreferences(localIntent),
    [localIntent],
  );
  const localIntentAvoidPreferences = useMemo(
    () => getIntentAvoidPreferences(localIntent),
    [localIntent],
  );
  const localIntentSignature = useMemo(
    () => JSON.stringify(localIntentState ?? null),
    [localIntentState],
  );
  const serverProviderQueryExpansion = useMemo(
    () => parseProviderKeywordsParam(providerKeywordsParam),
    [providerKeywordsParam],
  );
  const isLocalIntentSearch = !!localIntentId && !keyword;
  const locale = usePreferences((s) => s.locale);
  const searchRadiusKm = usePreferences((s) => s.searchRadiusKm);
  const setSearchRadius = usePreferences((s) => s.setSearchRadius);
  const minRating = usePreferences((s) => s.minRating);
  const setMinRating = usePreferences((s) => s.setMinRating);
  const maxBudgetLevel = usePreferences((s) => s.maxBudgetLevel);
  const setMaxBudgetLevel = usePreferences((s) => s.setMaxBudgetLevel);
  const partySize = usePreferences((s) => s.partySize);
  const setPartySize = usePreferences((s) => s.setPartySize);
  const theme = useMantineTheme();
  const {
    semanticEnabled,
    isAnalyzingEatOut,
    isRerankingEatOut,
    analyzeEatOutQuery,
    analyzeEatOutRefinement,
    rerankEatOutResults,
  } = useSemanticSearch();
  const l = useLabels(locale);

  const {
    lat,
    lng,
    provider,
    locatedAt,
    loading: locLoading,
    error: locError,
    requestLocation,
  } = useLocation();

  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [pickedRestaurant, setPickedRestaurant] = useState<Restaurant | null>(null);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineQuery, setRefineQuery] = useState('');
  const [refineMode, setRefineMode] = useState<'semantic' | 'keyword' | null>(null);
  const [refineAiNotice, setRefineAiNotice] = useState<string | null>(null);
  const [rerankAiNotice, setRerankAiNotice] = useState<string | null>(null);
  const [appliedRefineIntent, setAppliedRefineIntent] = useState<EatOutSemanticIntent | null>(null);
  const [searchSessionGoal, setSearchSessionGoal] = useState<SearchSessionGoal>({
    originalQuery: localOriginalQuery || keyword || undefined,
    currentConstraints: {},
    softPreferences: mergeStringLists(
      parseStringListParam(softPreferencesParam),
      localIntentSoftPreferences,
    ),
    rejectedAspects: [],
    acceptedRefinements: [],
  });
  const [clarification, setClarification] = useState<
    EatOutSemanticIntent['clarifyingQuestion'] | null
  >(null);
  const [softPreferences, setSoftPreferences] = useState<string[]>(() =>
    parseStringListParam(softPreferencesParam),
  );
  const [providerQueryExpansion, setProviderQueryExpansion] = useState<
    EatOutQueryExpansion['providerQueries']
  >(() => parseProviderKeywordsParam(providerKeywordsParam));
  const [tempKeyword, setTempKeyword] = useState<string | null>(null);
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(null);
  const [tempOpenOnly, setTempOpenOnly] = useState<boolean | null>(null);
  const [tempMinRating, setTempMinRating] = useState<number | null>(null);
  const [tempMaxBudgetLevel, setTempMaxBudgetLevel] = useState<number | null>(null);
  const [tempPartySize, setTempPartySize] = useState<number | null>(null);
  const [tempRadiusM, setTempRadiusM] = useState<number | null>(null);
  const [tempSortBy, setTempSortBy] = useState<SortBy | null>(null);
  const [tempRequiredFeatures, setTempRequiredFeatures] = useState<
    NonNullable<EatOutSemanticIntent['features']>
  >([]);
  const [aiRerankEntries, setAiRerankEntries] = useState<EatOutRerankEntry[]>([]);
  const [randomPickMode, setRandomPickMode] = useState<RandomPickMode>('balanced');
  const llmLastError = useLlmStore((state) => state.lastError);
  const [pendingAspectFeedback, setPendingAspectFeedback] = useState<{
    eventId: string;
    restaurantId: string;
    kind: 'liked_after_visit' | 'disliked_after_visit' | 'not_interested';
  } | null>(null);

  const { records: visitedRecords, markVisited } = useVisited();
  const {
    events: feedbackEvents,
    addFeedback,
    updateFeedbackAspects,
    aspectPreferenceOverrides,
  } = useRestaurantFeedback();
  const visitedRecordsRef = useRef(visitedRecords);

  useEffect(() => {
    visitedRecordsRef.current = visitedRecords;
  }, [visitedRecords]);

  useEffect(() => {
    setLocalIntentState(readEatOutLocalIntentState(localIntentId));
  }, [localIntentId]);

  // Filters
  const [openOnly, setOpenOnly] = useState(hasOpenNowParam ? openNowFromQuery : true);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const resultsViewportRef = useRef<HTMLDivElement | null>(null);
  const restaurantCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const clearRefineState = useCallback(
    (keepInput = false) => {
      const initialSoftPreferences = mergeStringLists(
        parseStringListParam(softPreferencesParam),
        localIntentSoftPreferences,
      );

      setRefineMode(null);
      setRefineAiNotice(null);
      setRerankAiNotice(null);
      setAppliedRefineIntent(null);
      setClarification(null);
      setProviderQueryExpansion(parseProviderKeywordsParam(providerKeywordsParam));
      setSoftPreferences(initialSoftPreferences);
      setSearchSessionGoal({
        originalQuery: localOriginalQuery || keyword || undefined,
        currentConstraints: {
          ...((localIntentCategoryId ?? categoryId)
            ? { categoryId: localIntentCategoryId ?? categoryId ?? undefined }
            : {}),
          ...(hasOpenNowParam ? { openNow: openNowFromQuery } : {}),
        },
        softPreferences: initialSoftPreferences,
        rejectedAspects: [],
        acceptedRefinements: [],
      });
      setTempKeyword(null);
      setTempCategoryId(null);
      setTempOpenOnly(null);
      setTempMinRating(null);
      setTempMaxBudgetLevel(null);
      setTempPartySize(null);
      setTempRadiusM(null);
      setTempSortBy(null);
      setTempRequiredFeatures([]);

      if (!keepInput) {
        setRefineQuery('');
      }
    },
    [
      categoryId,
      hasOpenNowParam,
      keyword,
      localIntentCategoryId,
      localIntentSignature,
      localIntentSoftPreferences,
      localOriginalQuery,
      openNowFromQuery,
      providerKeywordsParam,
      radiusMParam,
      softPreferencesParam,
    ],
  );

  useEffect(() => {
    setOpenOnly(hasOpenNowParam ? openNowFromQuery : true);
  }, [hasOpenNowParam, openNowFromQuery]);

  const baseSearchResetKey = `${categoryId ?? ''}|${keyword}|${hasOpenNowParam ? '1' : '0'}|${
    openNowFromQuery ? '1' : '0'
  }|${providerKeywordsParam ?? ''}|${softPreferencesParam ?? ''}|${radiusMParam ?? ''}|${
    localIntentId ?? ''
  }|${localIntentSignature}`;

  useEffect(() => {
    void baseSearchResetKey;
    clearRefineState();
  }, [baseSearchResetKey, clearRefineState]);

  const effectiveKeyword = tempKeyword ?? localIntentKeyword ?? keyword;
  const serverSearchKeyword = keyword;
  const serverSearchCategoryId = isLocalIntentSearch ? null : categoryId;
  const effectiveCategoryId = tempCategoryId ?? localIntentCategoryId ?? categoryId;
  const effectiveCategory = categories.find((c) => c.id === effectiveCategoryId);
  const effectiveOpenOnly = tempOpenOnly ?? openOnly;
  const effectiveMinRating = tempMinRating ?? minRating;
  const effectiveMaxBudgetLevel = tempMaxBudgetLevel ?? maxBudgetLevel;
  const effectivePartySize = tempPartySize ?? partySize;
  const effectiveSortBy = tempSortBy ?? sortBy;
  const providerQueryExpansionSignature = useMemo(
    () => JSON.stringify(normalizeProviderQueryExpansion(providerQueryExpansion) ?? {}),
    [providerQueryExpansion],
  );
  const softPreferenceSignature = useMemo(() => softPreferences.join(','), [softPreferences]);
  const requiredFeatureSignature = useMemo(
    () => tempRequiredFeatures.join(','),
    [tempRequiredFeatures],
  );
  const recommendationStateSignature = useMemo(
    () =>
      [
        visitedRecords
          .map((record) => `${record.restaurantKey}:${record.visits.length}`)
          .sort()
          .join(','),
        feedbackEvents
          .map((event) => `${event.restaurantKey}:${event.kind}:${event.createdAt}`)
          .sort()
          .join(','),
      ].join('|'),
    [feedbackEvents, visitedRecords],
  );
  const radiusFromIntentKm =
    radiusMParam && Number.isFinite(Number(radiusMParam))
      ? Math.max(0.1, Math.min(10, Number(radiusMParam) / 1000))
      : null;
  const radiusFromRefinementKm =
    tempRadiusM != null ? Math.max(0.1, Math.min(10, tempRadiusM / 1000)) : null;
  const effectiveSearchRadiusKm = normalizeSearchRadiusKm(
    radiusFromRefinementKm ?? radiusFromIntentKm ?? searchRadiusKm,
  );
  const searchRadiusIndex = getSearchRadiusPresetIndex(effectiveSearchRadiusKm);
  const aiRerankResetKey = [
    effectiveKeyword,
    effectiveCategoryId ?? '',
    effectiveMinRating,
    effectiveMaxBudgetLevel,
    effectivePartySize,
    effectiveOpenOnly ? '1' : '0',
    effectiveSortBy,
    effectiveSearchRadiusKm,
    providerQueryExpansionSignature,
    softPreferenceSignature,
    requiredFeatureSignature,
  ].join('|');
  const hasCoordinates = lat != null && lng != null;
  const hasSearchLocation = hasCoordinates && !!provider;
  const needsFreshLocation =
    !hasCoordinates || !locatedAt || Date.now() - locatedAt > LOCATION_MAX_AGE_MS;
  const canUseStoredLocation = !needsFreshLocation && hasSearchLocation;

  // Apply client-side hard filters before recommendation ranking.
  const filteredRestaurants = useMemo(() => {
    let list = allRestaurants;

    if (effectiveMinRating > 0) {
      // Keep unrated restaurants (e.g. HotPepper-only) — only exclude rated ones below threshold
      list = list.filter((r) => r.rating === undefined || r.rating >= effectiveMinRating);
    }

    if (effectiveMaxBudgetLevel > 0) {
      list = list.filter(
        (restaurant) =>
          restaurant.priceLevel === undefined ||
          (restaurant.priceLevel > 0 && restaurant.priceLevel <= effectiveMaxBudgetLevel),
      );
    }

    if (effectivePartySize > 1) {
      list = list.filter(
        (restaurant) =>
          restaurant.capacity === undefined || restaurant.capacity >= effectivePartySize,
      );
    }

    if (tempRequiredFeatures.length > 0) {
      list = list.filter((restaurant) =>
        tempRequiredFeatures.every((feature) => restaurant.features?.includes(feature)),
      );
    }

    if (effectiveSortBy === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    // 'distance' is the default sort from the API, no re-sort needed

    return list;
  }, [
    allRestaurants,
    effectiveMaxBudgetLevel,
    effectiveMinRating,
    effectivePartySize,
    effectiveSortBy,
    tempRequiredFeatures,
  ]);

  const currentRecommendationIntent = useMemo<EatOutSemanticIntent | null>(() => {
    const baseIntent = appliedRefineIntent ?? localIntent;
    const mergedSoftPreferences = mergeStringLists(
      getIntentSoftPreferences(localIntent),
      getIntentSoftPreferences(appliedRefineIntent),
      softPreferences,
    ) as EatOutSoftPreference[];
    const mergedAvoidPreferences = mergeStringLists(
      localIntentAvoidPreferences,
      getIntentAvoidPreferences(appliedRefineIntent),
    ) as EatOutAvoidPreference[];

    if (!baseIntent && mergedSoftPreferences.length === 0 && mergedAvoidPreferences.length === 0) {
      return null;
    }

    return {
      ...(baseIntent ?? { confidence: 0.5 }),
      confidence: baseIntent?.confidence ?? 0.5,
      softPreferences: mergedSoftPreferences.length > 0 ? mergedSoftPreferences : undefined,
      avoidPreferences: mergedAvoidPreferences.length > 0 ? mergedAvoidPreferences : undefined,
      occasion: appliedRefineIntent?.occasion ?? localIntent?.occasion,
      personalPreferenceMode:
        appliedRefineIntent?.personalPreferenceMode ?? localIntent?.personalPreferenceMode,
      avoidCuisines: mergeStringLists(
        localIntent?.avoidCuisines ?? [],
        appliedRefineIntent?.avoidCuisines ?? [],
      ),
    };
  }, [appliedRefineIntent, localIntent, localIntentAvoidPreferences, softPreferences]);

  const rankedRestaurants = useMemo(
    () =>
      rankRestaurants({
        restaurants: filteredRestaurants,
        visitRecords: visitedRecords,
        feedbackEvents,
        preferredSort: effectiveSortBy,
        keyword: effectiveKeyword,
        currentIntent: currentRecommendationIntent,
        sessionGoal: searchSessionGoal,
      }),
    [
      currentRecommendationIntent,
      effectiveKeyword,
      effectiveSortBy,
      feedbackEvents,
      filteredRestaurants,
      searchSessionGoal,
      visitedRecords,
    ],
  );

  const restaurants = useMemo(
    () => rankedRestaurants.filter((entry) => !entry.suppressed).map((entry) => entry.restaurant),
    [rankedRestaurants],
  );

  const deterministicReasonsById = useMemo(
    () => new Map(rankedRestaurants.map((entry) => [entry.identityKey, entry.reasons] as const)),
    [rankedRestaurants],
  );

  const visitedByRestaurantKey = useMemo(
    () => new Map(visitedRecords.map((record) => [record.restaurantKey, record] as const)),
    [visitedRecords],
  );
  const latestFeedbackByRestaurantKey = useMemo(
    () => getLatestFeedbackByRestaurant(feedbackEvents),
    [feedbackEvents],
  );

  const displayRestaurants = useMemo(() => {
    const rankedRestaurants =
      aiRerankEntries.length === 0
        ? restaurants
        : (() => {
            const rankIndex = new Map(aiRerankEntries.map((entry, index) => [entry.id, index]));
            const originalIndex = new Map(
              restaurants.map((restaurant, index) => [getRestaurantIdentityKey(restaurant), index]),
            );

            return [...restaurants].sort((a, b) => {
              const aRank = rankIndex.get(getRestaurantIdentityKey(a));
              const bRank = rankIndex.get(getRestaurantIdentityKey(b));

              if (aRank != null && bRank != null) return aRank - bRank;
              if (aRank != null) return -1;
              if (bRank != null) return 1;

              return (
                (originalIndex.get(getRestaurantIdentityKey(a)) ?? 0) -
                (originalIndex.get(getRestaurantIdentityKey(b)) ?? 0)
              );
            });
          })();

    if (!isRandomMode || !pickedRestaurant) {
      return rankedRestaurants;
    }

    const picked = rankedRestaurants.find((restaurant) => restaurant.id === pickedRestaurant.id);
    if (!picked) {
      return rankedRestaurants;
    }

    return [picked, ...rankedRestaurants.filter((restaurant) => restaurant.id !== picked.id)];
  }, [aiRerankEntries, isRandomMode, pickedRestaurant, restaurants]);

  const randomCandidateSignature = useMemo(
    () =>
      [...restaurants]
        .map((restaurant) => getRestaurantIdentityKey(restaurant))
        .sort()
        .join('|'),
    [restaurants],
  );

  // Track whether this is the initial fetch (for auto-picking in random mode)
  const initialFetchDone = useRef(false);
  const autoLocationRequestDone = useRef(false);
  const lastRandomCandidateSignatureRef = useRef('');

  const fetchRestaurants = useCallback(async () => {
    if (lat == null || lng == null || !provider) return;

    setLoading(true);
    setError(null);
    initialFetchDone.current = false;

    try {
      const body = {
        locale,
        provider,
        location: { lat, lng },
        radiusM: Math.round(effectiveSearchRadiusKm * 1000),
        query: {
          keyword: serverSearchKeyword || undefined,
          categoryId: serverSearchCategoryId ?? undefined,
          providerKeywords: serverProviderQueryExpansion,
        },
        filters: {
          openNow: effectiveOpenOnly,
        },
        sort: {
          by: 'distance',
          direction: 'asc',
        },
        pagination: {
          pageSize: 40,
        },
      };

      const res = await fetch('/api/v1/restaurants/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Search failed');
      const data = (await res.json()) as { results?: RestaurantSearchPayloadItem[] };
      const results = (data.results ?? []).map(normalizeRestaurantSearchResult);

      results.sort((a, b) => a.distance - b.distance);

      const filtered = effectiveOpenOnly ? results.filter((r) => r.isOpenNow !== false) : results;

      setAllRestaurants(filtered);
      initialFetchDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [
    lat,
    lng,
    provider,
    effectiveSearchRadiusKm,
    serverSearchCategoryId,
    serverSearchKeyword,
    locale,
    effectiveOpenOnly,
    serverProviderQueryExpansion,
  ]);

  const pickRandomRestaurant = useCallback(
    (excludeId?: string | null) => {
      if (restaurants.length === 0) return null;
      if (restaurants.length === 1) return restaurants[0];

      for (let i = 0; i < 5; i++) {
        const next = pickRestaurantWithMode({
          restaurants,
          rankedResults: rankedRestaurants,
          visitRecords: visitedRecordsRef.current,
          feedbackEvents,
          mode: randomPickMode,
        });
        if (next && (!excludeId || next.id !== excludeId)) {
          return next;
        }
      }

      const others = restaurants.filter((restaurant) => restaurant.id !== excludeId);
      return others[Math.floor(Math.random() * others.length)] ?? restaurants[0];
    },
    [feedbackEvents, randomPickMode, rankedRestaurants, restaurants],
  );

  // Auto-pick in random mode when the eligible candidate set changes
  useEffect(() => {
    if (!isRandomMode) {
      lastRandomCandidateSignatureRef.current = '';
      return;
    }

    if (restaurants.length === 0) {
      setPickedRestaurant(null);
      lastRandomCandidateSignatureRef.current = '';
      return;
    }

    if (!initialFetchDone.current) return;

    setPickedRestaurant((current) => {
      const candidateSetChanged =
        lastRandomCandidateSignatureRef.current !== randomCandidateSignature;
      lastRandomCandidateSignatureRef.current = randomCandidateSignature;

      if (candidateSetChanged) {
        return pickRandomRestaurant(current?.id);
      }

      if (current && restaurants.some((restaurant) => restaurant.id === current.id)) {
        return current;
      }

      return pickRandomRestaurant(current?.id);
    });
  }, [isRandomMode, restaurants, randomCandidateSignature, pickRandomRestaurant]);

  useEffect(() => {
    setActiveRestaurantId((current) => {
      if (
        isRandomMode &&
        pickedRestaurant &&
        displayRestaurants.some((r) => r.id === pickedRestaurant.id)
      ) {
        return pickedRestaurant.id;
      }

      if (current && displayRestaurants.some((r) => r.id === current)) {
        return current;
      }

      return displayRestaurants[0]?.id ?? null;
    });
  }, [displayRestaurants, isRandomMode, pickedRestaurant]);

  useEffect(() => {
    if (!isRandomMode || !pickedRestaurant) return;

    const scrollContainer = resultsViewportRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
  }, [isRandomMode, pickedRestaurant]);

  useEffect(() => {
    if (displayRestaurants.length === 0) return;

    let frameId = 0;
    const scrollContainer = resultsViewportRef.current;
    if (!scrollContainer) return;

    const updateActiveRestaurant = () => {
      frameId = 0;

      const containerRect = scrollContainer.getBoundingClientRect();
      const anchorY = containerRect.top + Math.min(96, Math.max(56, containerRect.height * 0.28));

      let nextActiveId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const restaurant of displayRestaurants) {
        const node = restaurantCardRefs.current[restaurant.id];
        if (!node) continue;

        const rect = node.getBoundingClientRect();
        if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) continue;

        const midpoint = rect.top + rect.height / 2;
        const distance =
          rect.top <= anchorY && rect.bottom >= anchorY ? 0 : Math.abs(midpoint - anchorY);

        if (distance < bestDistance) {
          bestDistance = distance;
          nextActiveId = restaurant.id;
        }
      }

      if (!nextActiveId) {
        nextActiveId =
          (isRandomMode ? pickedRestaurant?.id : undefined) ?? displayRestaurants[0]?.id ?? null;
      }

      if (nextActiveId) {
        setActiveRestaurantId((current) => (current === nextActiveId ? current : nextActiveId));
      }
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateActiveRestaurant);
    };

    scheduleUpdate();
    scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      scrollContainer.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [displayRestaurants, isRandomMode, pickedRestaurant]);

  const handleRepick = useCallback(() => {
    const next = pickRandomRestaurant(pickedRestaurant?.id);
    if (next) {
      setPickedRestaurant(next);
    }
  }, [pickRandomRestaurant, pickedRestaurant]);

  const handleMarkVisited = useCallback(
    (r: Restaurant) => {
      markVisited(r);
    },
    [markVisited],
  );

  const feedbackContext = useMemo(
    () => ({
      queryKeyword: effectiveKeyword ?? undefined,
      categoryId: effectiveCategoryId ?? undefined,
      openNow: effectiveOpenOnly,
      partySize: effectivePartySize > 1 ? effectivePartySize : undefined,
    }),
    [effectiveCategoryId, effectiveKeyword, effectiveOpenOnly, effectivePartySize],
  );

  const handleLikeAfterVisit = useCallback(
    (restaurant: Restaurant) => {
      const eventId = addFeedback({
        restaurant,
        kind: 'liked_after_visit',
        context: feedbackContext,
      });
      if (eventId) {
        setPendingAspectFeedback({
          eventId,
          restaurantId: restaurant.id,
          kind: 'liked_after_visit',
        });
      }
    },
    [addFeedback, feedbackContext],
  );

  const handleDislikeAfterVisit = useCallback(
    (restaurant: Restaurant) => {
      const eventId = addFeedback({
        restaurant,
        kind: 'disliked_after_visit',
        context: feedbackContext,
      });
      if (eventId) {
        setPendingAspectFeedback({
          eventId,
          restaurantId: restaurant.id,
          kind: 'disliked_after_visit',
        });
      }
    },
    [addFeedback, feedbackContext],
  );

  const handleNotInterested = useCallback(
    (restaurant: Restaurant) => {
      const eventId = addFeedback({
        restaurant,
        kind: 'not_interested',
        context: feedbackContext,
      });
      if (eventId) {
        setPendingAspectFeedback({ eventId, restaurantId: restaurant.id, kind: 'not_interested' });
      }
    },
    [addFeedback, feedbackContext],
  );

  const handleFeedbackAspectToggle = useCallback(
    (eventId: string, aspect: FeedbackAspect) => {
      const event = feedbackEvents.find((item) => item.id === eventId);
      const currentAspects = event?.aspects ?? [];
      const nextAspects = currentAspects.includes(aspect)
        ? currentAspects.filter((item) => item !== aspect)
        : [...currentAspects, aspect];

      updateFeedbackAspects(eventId, nextAspects);
    },
    [feedbackEvents, updateFeedbackAspects],
  );

  const applyRefinementPatch = useCallback(
    (patch: EatOutRefinementPatch, sourceText: string) => {
      setRefineMode('semantic');
      setRefineAiNotice(null);
      setAppliedRefineIntent(null);
      setClarification(null);

      if (patch.openNow === true) {
        setTempOpenOnly(true);
      }
      if (patch.maxBudgetLevel != null) {
        setTempMaxBudgetLevel(
          maxBudgetLevel > 0
            ? Math.min(maxBudgetLevel, patch.maxBudgetLevel)
            : patch.maxBudgetLevel,
        );
      }
      if (patch.partySize != null) {
        setTempPartySize(Math.max(partySize, patch.partySize));
      }
      if (patch.spatialIntent?.radiusM != null) {
        setTempRadiusM(patch.spatialIntent.radiusM);
      }
      if (patch.addSoftPreferences?.length) {
        setSoftPreferences((current) => [
          ...new Set([...current, ...(patch.addSoftPreferences ?? [])]),
        ]);
      }
      if (patch.removeCuisines?.length) {
        const removeCuisines = patch.removeCuisines;
        setSearchSessionGoal((current) => ({
          ...current,
          rejectedAspects: [...new Set([...current.rejectedAspects, ...removeCuisines])],
        }));
        const termsToRemove = new Set(removeCuisines.map((item) => item.toLowerCase()));
        const nextKeyword = normalizeSearchQuery(
          effectiveKeyword
            .split(/\s+/)
            .filter((term) => !termsToRemove.has(term.toLowerCase()))
            .join(' '),
        );
        setTempKeyword(nextKeyword || null);
      }
      if (
        patch.spatialIntent?.anchorText &&
        (patch.spatialIntent.type === 'near_station' ||
          patch.spatialIntent.type === 'near_landmark')
      ) {
        setTempKeyword(
          normalizeSearchQuery([effectiveKeyword, patch.spatialIntent.anchorText].join(' ')),
        );
      }

      setSearchSessionGoal((current) => ({
        ...current,
        acceptedRefinements: [...current.acceptedRefinements, sourceText],
        softPreferences: [
          ...new Set([...current.softPreferences, ...(patch.addSoftPreferences ?? [])]),
        ],
      }));
    },
    [effectiveKeyword, maxBudgetLevel, partySize],
  );

  const handleRefineSearch = useCallback(async () => {
    const normalizedRefineQuery = normalizeSearchQuery(refineQuery);
    if (!normalizedRefineQuery) return;

    let nextIntent: EatOutSemanticIntent | null = null;
    let nextMode: 'semantic' | 'keyword' = 'keyword';

    if (semanticEnabled) {
      const patchResult = await analyzeEatOutRefinement({
        query: normalizedRefineQuery,
        currentGoalSummary: [
          searchSessionGoal.originalQuery
            ? `original query: ${searchSessionGoal.originalQuery}`
            : null,
          effectiveKeyword ? `keyword: ${effectiveKeyword}` : null,
          effectiveCategory ? `category: ${effectiveCategory.name.en}` : null,
          effectiveOpenOnly ? 'open now only' : null,
          effectiveMaxBudgetLevel > 0
            ? `budget at most ${'¥'.repeat(effectiveMaxBudgetLevel)}`
            : null,
          effectivePartySize > 1 ? `party size ${effectivePartySize}` : null,
          `search radius ${formatSearchRadius(effectiveSearchRadiusKm)}`,
          softPreferences.length > 0 ? `soft preferences: ${softPreferences.join(', ')}` : null,
          searchSessionGoal.rejectedAspects.length > 0
            ? `rejected: ${searchSessionGoal.rejectedAspects.join(', ')}`
            : null,
          searchSessionGoal.acceptedRefinements.length > 0
            ? `accepted refinements: ${searchSessionGoal.acceptedRefinements.join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join('; '),
      });
      if (patchResult.intent) {
        applyRefinementPatch(patchResult.intent, normalizedRefineQuery);
        if (patchResult.mode === 'fallback') {
          setRefineAiNotice(l.aiRefineFallback);
        }
        return;
      }

      const result = await analyzeEatOutQuery(normalizedRefineQuery);
      if (result.mode === 'semantic' && result.intent) {
        nextIntent = result.intent;
        nextMode = 'semantic';
        setRefineAiNotice(null);
      } else {
        setRefineAiNotice(l.aiRefineFallback);
      }
    }

    if (!nextIntent) {
      nextIntent = { keyword: normalizedRefineQuery, confidence: 0.35 };
    }

    if (nextIntent.confidence < 0.45 && nextIntent.clarifyingQuestion && !isRandomMode) {
      setClarification(nextIntent.clarifyingQuestion);
      return;
    }

    setRefineMode(nextMode);
    setAppliedRefineIntent(nextIntent);
    setTempKeyword(
      nextIntent.keyword ??
        nextIntent.queryExpansion?.primaryKeyword ??
        (nextMode === 'keyword' ? normalizedRefineQuery : null),
    );
    setTempCategoryId(nextIntent.category ?? null);
    setTempOpenOnly(
      nextIntent.openNow === true || nextIntent.queryExpansion?.hardFilters?.includes('openNow')
        ? true
        : null,
    );
    setTempMinRating(
      nextIntent.minRating != null ? Math.max(minRating, nextIntent.minRating) : null,
    );
    setTempMaxBudgetLevel(
      nextIntent.maxBudgetLevel != null
        ? maxBudgetLevel > 0
          ? Math.min(maxBudgetLevel, nextIntent.maxBudgetLevel)
          : nextIntent.maxBudgetLevel
        : null,
    );
    setTempPartySize(
      nextIntent.partySize != null ? Math.max(partySize, nextIntent.partySize) : null,
    );
    setTempRadiusM(nextIntent.spatialIntent?.radiusM ?? null);
    setTempSortBy(nextIntent.sortBy ?? null);
    setTempRequiredFeatures(nextIntent.features ?? []);
    setProviderQueryExpansion(
      normalizeProviderQueryExpansion(nextIntent.queryExpansion?.providerQueries),
    );
    setSoftPreferences((current) => [
      ...new Set([
        ...current,
        ...(nextIntent.softPreferences ?? []),
        ...(nextIntent.queryExpansion?.softPreferences ?? []),
      ]),
    ]);
  }, [
    analyzeEatOutQuery,
    analyzeEatOutRefinement,
    applyRefinementPatch,
    effectiveCategory,
    effectiveKeyword,
    effectiveMaxBudgetLevel,
    effectiveOpenOnly,
    effectivePartySize,
    effectiveSearchRadiusKm,
    isRandomMode,
    maxBudgetLevel,
    minRating,
    partySize,
    refineQuery,
    searchSessionGoal,
    semanticEnabled,
    softPreferences,
    l.aiRefineFallback,
  ]);

  const handleRefinementChip = useCallback(
    (chip: string) => {
      setClarification(null);
      setSoftPreferences((current) => [...new Set([...current, chip])]);
      if (chip === 'cheap') {
        setTempMaxBudgetLevel(maxBudgetLevel > 0 ? Math.min(maxBudgetLevel, 2) : 2);
      } else if (chip === 'high rating') {
        setTempMinRating(Math.max(minRating, 4));
      } else if (chip === 'open now') {
        setTempOpenOnly(true);
      } else if (chip === 'near station') {
        setTempSortBy('distance');
      } else if (chip === 'surprise me') {
        setRandomPickMode('adventure');
      }
    },
    [maxBudgetLevel, minRating],
  );

  const clearAiRerank = useCallback(() => {
    setAiRerankEntries([]);
  }, []);

  const tasteProfile = useMemo(
    () => deriveRestaurantTasteProfile(visitedRecords, feedbackEvents, aspectPreferenceOverrides),
    [aspectPreferenceOverrides, feedbackEvents, visitedRecords],
  );
  const tasteProfilePromptSummary = useMemo(
    () => buildRestaurantTasteProfilePromptSummary(tasteProfile),
    [tasteProfile],
  );
  const hasTasteProfileSignals =
    !!tasteProfile &&
    (tasteProfile.topCuisines.length > 0 ||
      tasteProfile.avoidedCuisines.length > 0 ||
      tasteProfile.topFeatures.length > 0 ||
      tasteProfile.avoidedFeatures.length > 0 ||
      tasteProfile.preferredAspects.length > 0 ||
      tasteProfile.avoidedAspects.length > 0 ||
      tasteProfile.alwaysConsiderAspects.length > 0 ||
      tasteProfile.preferredPriceLevel != null ||
      tasteProfile.typicalDistanceMeters != null ||
      tasteProfile.totalFeedbackEvents > 0);

  const aiRerankGoalSummary = useMemo(() => {
    const parts: string[] = [];

    if (localOriginalQuery) {
      parts.push(`original query: ${localOriginalQuery}`);
    }
    if (effectiveKeyword) {
      parts.push(`keyword: ${effectiveKeyword}`);
    }
    if (effectiveCategory) {
      parts.push(`category: ${effectiveCategory.name.en}`);
    }
    if (effectiveOpenOnly) {
      parts.push('open now only');
    }
    if (effectiveMinRating > 0) {
      parts.push(`minimum rating ${effectiveMinRating}`);
    }
    if (effectiveMaxBudgetLevel > 0) {
      parts.push(`budget at most ${'¥'.repeat(effectiveMaxBudgetLevel)}`);
    }
    if (effectivePartySize > 1) {
      parts.push(`party size ${effectivePartySize}`);
    }
    parts.push(`search radius ${formatSearchRadius(effectiveSearchRadiusKm)}`);
    if (tempRequiredFeatures.length > 0) {
      parts.push(`required features: ${tempRequiredFeatures.join(', ')}`);
    }
    if (softPreferences.length > 0) {
      parts.push(`soft preferences: ${softPreferences.join(', ')}`);
    }
    if (currentRecommendationIntent?.occasion) {
      parts.push(`occasion: ${currentRecommendationIntent.occasion}`);
    }
    if (currentRecommendationIntent?.avoidPreferences?.length) {
      parts.push(`avoid preferences: ${currentRecommendationIntent.avoidPreferences.join(', ')}`);
    }
    if (currentRecommendationIntent?.avoidCuisines?.length) {
      parts.push(`avoid cuisines: ${currentRecommendationIntent.avoidCuisines.join(', ')}`);
    }

    parts.push('prefer strong taste-profile matches when otherwise similar');
    parts.push('avoid recently negative or dismissed places');

    return parts.join('; ');
  }, [
    effectiveCategory,
    effectiveKeyword,
    effectiveMaxBudgetLevel,
    effectiveMinRating,
    effectiveOpenOnly,
    effectivePartySize,
    effectiveSearchRadiusKm,
    localOriginalQuery,
    currentRecommendationIntent,
    softPreferences,
    tempRequiredFeatures,
  ]);

  const aiRerankCandidates = useMemo(() => restaurants.slice(0, 10), [restaurants]);
  const aiRerankFactCards = useMemo(
    () =>
      buildRestaurantFactCards({
        restaurants: aiRerankCandidates,
        deterministicReasonsById,
        currentIntent: currentRecommendationIntent,
        sessionGoal: searchSessionGoal,
        visitRecords: visitedRecords,
        feedbackEvents,
      }),
    [
      aiRerankCandidates,
      currentRecommendationIntent,
      deterministicReasonsById,
      feedbackEvents,
      searchSessionGoal,
      visitedRecords,
    ],
  );

  const handleAiRerank = useCallback(async () => {
    if (aiRerankCandidates.length < 2 || !semanticEnabled) return;

    const result = await rerankEatOutResults({
      goalSummary: aiRerankGoalSummary,
      tasteProfileSummary: tasteProfilePromptSummary,
      candidateCatalog: formatRestaurantFactCardsForRerank(aiRerankFactCards),
      validIds: aiRerankFactCards.map((card) => card.id),
      factCards: aiRerankFactCards,
    });

    setAiRerankEntries(result.mode === 'semantic' ? result.items : []);
    setRerankAiNotice(result.mode === 'semantic' ? null : l.aiRerankFallback);
  }, [
    aiRerankCandidates,
    aiRerankFactCards,
    aiRerankGoalSummary,
    rerankEatOutResults,
    semanticEnabled,
    tasteProfilePromptSummary,
    l.aiRerankFallback,
  ]);

  useEffect(() => {
    void aiRerankResetKey;
    void recommendationStateSignature;
    setAiRerankEntries([]);
  }, [aiRerankResetKey, recommendationStateSignature]);

  // Request a fresh location once per mount when persisted coordinates are missing or stale.
  useEffect(() => {
    if (canUseStoredLocation) {
      autoLocationRequestDone.current = false;
      return;
    }

    if (autoLocationRequestDone.current) return;

    autoLocationRequestDone.current = true;
    requestLocation();
  }, [canUseStoredLocation, requestLocation]);

  // Fetch restaurants when location is ready
  useEffect(() => {
    if (!hasSearchLocation) return;
    fetchRestaurants();
  }, [fetchRestaurants, hasSearchLocation]);

  const pageTitle = effectiveKeyword || effectiveCategory?.name[locale] || l.title;
  const hasResults = !loading && !error && restaurants.length > 0;
  const hasActiveClientFilters =
    effectiveMinRating > 0 ||
    effectiveMaxBudgetLevel > 0 ||
    effectivePartySize > 1 ||
    tempRequiredFeatures.length > 0;
  const aiRerankById = useMemo(
    () =>
      new Map(
        aiRerankEntries.map((entry, index) => [
          entry.id,
          { rank: index + 1, reason: entry.reason },
        ]),
      ),
    [aiRerankEntries],
  );
  const activeRestaurant =
    displayRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
    pickedRestaurant;
  const pickedRestaurantIdentityKey = pickedRestaurant
    ? getRestaurantIdentityKey(pickedRestaurant)
    : null;
  const pickedRestaurantLatestFeedback = pickedRestaurantIdentityKey
    ? latestFeedbackByRestaurantKey.get(pickedRestaurantIdentityKey)
    : null;
  const pickedRestaurantIsVisited = pickedRestaurantIdentityKey
    ? visitedByRestaurantKey.has(pickedRestaurantIdentityKey)
    : false;

  return (
    <AppShell>
      <Container py="sm" px="sm">
        <Stack gap="md">
          <Box className="app-hero-card" p="sm">
            <Stack gap="sm">
              <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Title order={2} size="h3" fw={800} style={{ letterSpacing: '-0.03em' }}>
                    {pageTitle}
                  </Title>
                  {effectiveKeyword && (
                    <Text size="sm" c="dimmed" mt={4}>
                      {l.keywordSummary(effectiveKeyword)}
                    </Text>
                  )}
                </Box>
                <Button
                  variant="subtle"
                  size="xs"
                  radius="xl"
                  onClick={() => router.back()}
                  style={{ flexShrink: 0 }}
                >
                  {l.back}
                </Button>
              </Group>

              {(effectiveKeyword || effectiveCategory || hasOpenNowParam || tempOpenOnly) && (
                <Group gap="xs" wrap="wrap">
                  {effectiveKeyword && (
                    <Badge variant="light" color="orange" radius="xl">
                      {l.keywordBadge(effectiveKeyword)}
                    </Badge>
                  )}
                  {effectiveCategory && (
                    <Badge variant="outline" color="gray" radius="xl">
                      {effectiveCategory.name[locale]}
                    </Badge>
                  )}
                  {(hasOpenNowParam || tempOpenOnly) && (
                    <Badge variant="outline" color="green" radius="xl">
                      {l.openOnlyShort}
                    </Badge>
                  )}
                </Group>
              )}
            </Stack>
          </Box>

          <Box className="app-panel" p="sm">
            <Stack gap="sm">
              <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={700}>{l.filterTitle}</Text>
                </Box>
                <Button
                  variant={filtersOpened ? 'filled' : 'light'}
                  size="xs"
                  radius="xl"
                  color="orange"
                  onClick={toggleFilters}
                >
                  {'⚙️'} {l.filter}
                </Button>
              </Group>

              <SmartSearchInput
                value={refineQuery}
                onChange={(value) => {
                  setRefineQuery(value);
                  setRefineAiNotice(null);
                }}
                onSubmit={handleRefineSearch}
                loading={semanticEnabled && isAnalyzingEatOut}
                submitLabel={semanticEnabled ? l.refineSubmitAi : l.refineSubmit}
                submitDisabled={!normalizeSearchQuery(refineQuery)}
                placeholder={l.refinePlaceholder}
                description={semanticEnabled ? l.refineDescriptionAi : l.refineDescription}
                inputTestId="eat-out-refine-input"
                submitTestId="eat-out-refine-ai"
              />
              {semanticEnabled && (refineAiNotice || llmLastError) && (
                <Text size="xs" c={llmLastError ? 'red' : 'dimmed'} data-testid="refine-ai-note">
                  {refineAiNotice ?? llmLastError}
                </Text>
              )}

              {(clarification || semanticEnabled) && (
                <Box className="app-panel-muted" p="sm">
                  <Stack gap="xs">
                    {clarification && (
                      <Text size="sm" fw={600}>
                        {clarification.question}
                      </Text>
                    )}
                    <Group gap="xs" wrap="wrap">
                      {(clarification?.options ?? DEFAULT_REFINEMENT_CHIPS).map((chip) => (
                        <Button
                          key={chip}
                          variant="light"
                          color="orange"
                          size="xs"
                          radius="xl"
                          onClick={() => handleRefinementChip(chip)}
                        >
                          {chip}
                        </Button>
                      ))}
                    </Group>
                  </Stack>
                </Box>
              )}

              {(appliedRefineIntent || refineMode) && (
                <Stack gap="xs">
                  <Group gap="xs" wrap="wrap">
                    <Badge
                      variant="light"
                      color={refineMode === 'semantic' ? 'orange' : 'gray'}
                      radius="xl"
                    >
                      {refineMode === 'semantic' ? l.refineAppliedAi : l.refineApplied}
                    </Badge>
                    {tempKeyword && (
                      <Badge variant="light" color="orange" radius="xl">
                        {l.keywordBadge(tempKeyword)}
                      </Badge>
                    )}
                    {tempCategoryId && (
                      <Badge variant="outline" color="grape" radius="xl">
                        {categories.find((item) => item.id === tempCategoryId)?.name[locale] ??
                          tempCategoryId}
                      </Badge>
                    )}
                    {tempOpenOnly && (
                      <Badge variant="outline" color="green" radius="xl">
                        {l.openOnlyShort}
                      </Badge>
                    )}
                    {tempMinRating != null && (
                      <Badge variant="light" color="yellow" radius="xl">
                        {l.minRatingBadge(tempMinRating)}
                      </Badge>
                    )}
                    {tempMaxBudgetLevel != null && (
                      <Badge variant="light" color="green" radius="xl">
                        {l.maxBudgetBadge(tempMaxBudgetLevel)}
                      </Badge>
                    )}
                    {tempPartySize != null && (
                      <Badge variant="light" color="grape" radius="xl">
                        {l.partySizeBadge(tempPartySize)}
                      </Badge>
                    )}
                    {tempRadiusM != null && (
                      <Badge variant="light" color="orange" radius="xl">
                        {l.distance}: {formatSearchRadius(tempRadiusM / 1000)}
                      </Badge>
                    )}
                    {tempSortBy && (
                      <Badge variant="light" color="gray" radius="xl">
                        {tempSortBy === 'distance' ? l.sortDistance : l.sortRating}
                      </Badge>
                    )}
                    {tempRequiredFeatures.map((feature) => (
                      <Badge key={feature} variant="outline" color="cyan" radius="xl">
                        {FEATURE_LABELS[feature]?.[locale] ?? feature}
                      </Badge>
                    ))}
                  </Group>

                  <Group justify="space-between" align="center" gap="sm">
                    <Text size="xs" c="dimmed">
                      {l.refineTemporaryNote}
                    </Text>
                    <Button
                      variant="subtle"
                      size="xs"
                      radius="xl"
                      color="gray"
                      onClick={() => clearRefineState()}
                    >
                      {l.clearRefine}
                    </Button>
                  </Group>
                </Stack>
              )}

              <Group gap="xs" wrap="wrap">
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.distance}
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatSearchRadius(effectiveSearchRadiusKm)}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.minRating}
                  </Text>
                  <Text size="sm" fw={600}>
                    {effectiveMinRating > 0 ? `${effectiveMinRating}+` : l.any}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.budget}
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatBudgetLevel(effectiveMaxBudgetLevel, l)}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.partySize}
                  </Text>
                  <Text size="sm" fw={600}>
                    {l.partySizeValue(effectivePartySize)}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.sortBy}
                  </Text>
                  <Text size="sm" fw={600}>
                    {effectiveSortBy === 'distance' ? l.sortDistance : l.sortRating}
                  </Text>
                </Box>
              </Group>

              <Collapse expanded={filtersOpened}>
                <Stack gap="md" mt="sm" className="app-panel-muted" p="sm">
                  <Box className="app-panel-muted" p="sm">
                    <Switch
                      label={l.openOnly}
                      checked={effectiveOpenOnly}
                      onChange={(e) => {
                        setTempOpenOnly(null);
                        setOpenOnly(e.currentTarget.checked);
                      }}
                      color="orange"
                    />
                  </Box>

                  <Box className="app-panel-muted" p="sm">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" gap="sm">
                        <Text size="sm" fw={600}>
                          {l.distance}
                        </Text>
                        <Badge variant="light" color="orange" radius="xl">
                          {formatSearchRadius(effectiveSearchRadiusKm)}
                        </Badge>
                      </Group>
                      <Slider
                        value={searchRadiusIndex}
                        onChange={(value) => {
                          setTempRadiusM(null);
                          setSearchRadius(getSearchRadiusKmForIndex(value));
                        }}
                        label={(value) => formatSearchRadius(getSearchRadiusKmForIndex(value))}
                        min={0}
                        max={getSearchRadiusSliderMax()}
                        step={1}
                        color="orange"
                      />
                      <SliderScaleLabels
                        min={0}
                        max={getSearchRadiusSliderMax()}
                        marks={SEARCH_RADIUS_MARK_PRESETS_KM.map((km) => ({
                          value: getSearchRadiusPresetIndex(km),
                          label: formatSearchRadiusMark(km),
                        }))}
                      />
                    </Stack>
                  </Box>

                  <Box className="app-panel-muted" p="sm">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" gap="sm">
                        <Text size="sm" fw={600}>
                          {l.minRating}
                        </Text>
                        <Badge variant="light" color="yellow" radius="xl">
                          {effectiveMinRating > 0 ? `${effectiveMinRating}+` : l.any}
                        </Badge>
                      </Group>
                      <Slider
                        value={effectiveMinRating}
                        onChange={(value) => {
                          setTempMinRating(null);
                          setMinRating(value);
                        }}
                        min={0}
                        max={4.5}
                        step={0.5}
                        color="yellow"
                      />
                      <SliderScaleLabels
                        min={0}
                        max={4.5}
                        marks={[
                          { value: 0, label: l.any },
                          { value: 3, label: '3' },
                          { value: 4, label: '4' },
                          { value: 4.5, label: '4.5' },
                        ]}
                      />
                    </Stack>
                  </Box>

                  <Box className="app-panel-muted" p="sm">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" gap="sm">
                        <Text size="sm" fw={600}>
                          {l.budget}
                        </Text>
                        <Badge variant="light" color="green" radius="xl">
                          {formatBudgetLevel(effectiveMaxBudgetLevel, l)}
                        </Badge>
                      </Group>
                      <Slider
                        value={effectiveMaxBudgetLevel}
                        onChange={(value) => {
                          setTempMaxBudgetLevel(null);
                          setMaxBudgetLevel(value);
                        }}
                        label={(value) => formatBudgetLevel(value, l)}
                        min={0}
                        max={MAX_BUDGET_LEVEL}
                        step={1}
                        color="green"
                      />
                      <SliderScaleLabels
                        min={0}
                        max={MAX_BUDGET_LEVEL}
                        marks={[
                          { value: 0, label: l.any },
                          { value: 1, label: '¥' },
                          { value: 2, label: '¥¥' },
                          { value: 3, label: '¥¥¥' },
                          { value: 4, label: '¥¥¥¥' },
                        ]}
                      />
                    </Stack>
                  </Box>

                  <Box className="app-panel-muted" p="sm">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" gap="sm">
                        <Text size="sm" fw={600}>
                          {l.partySize}
                        </Text>
                        <Badge variant="light" color="grape" radius="xl">
                          {l.partySizeValue(effectivePartySize)}
                        </Badge>
                      </Group>
                      <Slider
                        value={effectivePartySize}
                        onChange={(value) => {
                          setTempPartySize(null);
                          setPartySize(value);
                        }}
                        label={(value) => l.partySizeValue(value)}
                        min={MIN_PARTY_SIZE}
                        max={MAX_PARTY_SIZE}
                        step={1}
                        color="grape"
                      />
                      <SliderScaleLabels
                        min={MIN_PARTY_SIZE}
                        max={MAX_PARTY_SIZE}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 4, label: '4' },
                          { value: 8, label: '8' },
                          { value: 12, label: '12' },
                        ]}
                      />
                    </Stack>
                  </Box>

                  <Box className="app-panel-muted" p="sm">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" gap="sm">
                        <Text size="sm" fw={600}>
                          {l.sortBy}
                        </Text>
                        <Badge variant="light" color="gray" radius="xl">
                          {effectiveSortBy === 'distance' ? l.sortDistance : l.sortRating}
                        </Badge>
                      </Group>
                      <SegmentedControl
                        value={effectiveSortBy}
                        onChange={(v) => {
                          setTempSortBy(null);
                          setSortBy(v as SortBy);
                        }}
                        data={[
                          { value: 'distance', label: l.sortDistance },
                          { value: 'rating', label: l.sortRating },
                        ]}
                        fullWidth
                        radius="xl"
                        size="xs"
                      />
                    </Stack>
                  </Box>

                  <Button size="md" radius="xl" onClick={fetchRestaurants} color="orange">
                    {l.research}
                  </Button>
                </Stack>
              </Collapse>
            </Stack>
          </Box>

          {/* Location loading */}
          {locLoading && !hasCoordinates && (
            <Center py="sm">
              <Stack align="center" gap="sm" className="app-panel-muted" p="lg" w="100%">
                <Loader color="orange" />
                <Text c="dimmed" size="sm">
                  {l.gettingLocation}
                </Text>
              </Stack>
            </Center>
          )}

          {/* Location error */}
          {locError && !hasCoordinates && (
            <Stack align="center" gap="sm" py="sm" className="app-panel-muted" p="lg">
              <Text c="red" size="sm">
                {l.locationError}
                {locError}
              </Text>
              <Button size="sm" onClick={requestLocation} color="orange" variant="light">
                {l.retry}
              </Button>
            </Stack>
          )}

          {/* Search loading */}
          {loading && !locLoading && (
            <Center py="sm">
              <Stack align="center" gap="sm" className="app-panel-muted" p="lg" w="100%">
                <Loader color="orange" />
                <Text c="dimmed" size="sm">
                  {l.searching}
                </Text>
              </Stack>
            </Center>
          )}

          {/* Search error */}
          {error && (
            <Stack align="center" gap="sm" py="sm" className="app-panel-muted" p="lg">
              <Text c="red" size="sm">
                {error}
              </Text>
              <Button size="sm" onClick={fetchRestaurants} color="orange" variant="light">
                {l.retry}
              </Button>
            </Stack>
          )}

          {/* Persistent map when there are no results yet */}
          {hasCoordinates && !hasResults && (
            <Box className="app-map-frame">
              <Box
                px="md"
                py="sm"
                style={{ borderBottom: '1px solid var(--app-border)' }}
                ref={mapWrapperRef}
              >
                <Group justify="space-between" gap="xs">
                  <Box>
                    <Text fw={700} size="sm">
                      {l.mapPreviewTitle}
                    </Text>
                  </Box>
                  <Box className="app-stat-pill">
                    <Text size="sm" fw={600}>
                      {l.providerLabel[provider ?? 'google']}
                    </Text>
                  </Box>
                </Group>
              </Box>
              <RestaurantMap
                restaurants={restaurants}
                userLat={lat}
                userLng={lng}
                focusedId={activeRestaurantId}
                locale={locale}
                height={PERSISTENT_MAP_HEIGHT}
                minHeight={PERSISTENT_MAP_HEIGHT}
                maxHeight={PERSISTENT_MAP_HEIGHT}
              />
            </Box>
          )}

          {isRandomMode && !loading && !error && restaurants.length > 0 && (
            <Box className="app-panel-muted" p="sm">
              <Stack gap="xs">
                <Text fw={700} size="sm">
                  {l.randomMode}
                </Text>
                <SegmentedControl
                  value={randomPickMode}
                  onChange={(value) => setRandomPickMode(value as RandomPickMode)}
                  data={[
                    { value: 'safe', label: l.randomSafe },
                    { value: 'balanced', label: l.randomBalanced },
                    { value: 'adventure', label: l.randomAdventure },
                  ]}
                  fullWidth
                  size="xs"
                  radius="xl"
                />
              </Stack>
            </Box>
          )}

          {/* Random mode: highlighted pick */}
          {isRandomMode && !loading && !error && pickedRestaurant && (
            <AnimatePresence mode="wait">
              <motion.div
                key={pickedRestaurant.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  radius="md"
                  padding="md"
                  withBorder
                  style={{
                    borderColor: theme.colors.orange[4],
                    background: 'var(--app-surface-strong)',
                    boxShadow: 'var(--app-shadow-sm)',
                  }}
                >
                  {pickedRestaurant.photoUrl && (
                    <Card.Section>
                      <Image
                        src={pickedRestaurant.photoUrl}
                        alt={pickedRestaurant.name}
                        h={172}
                        fallbackSrc=""
                        style={{ objectFit: 'cover' }}
                      />
                    </Card.Section>
                  )}
                  <Stack gap="xs" mt={pickedRestaurant.photoUrl ? 'sm' : 0}>
                    <Text size="xs" fw={600} c="orange" tt="uppercase">
                      {l.todaysPick}
                    </Text>
                    <Text fw={700} size="lg">
                      {pickedRestaurant.name}
                    </Text>
                    {pickedRestaurant.cuisineType && (
                      <Badge variant="light" color="orange" size="sm" w="fit-content">
                        {pickedRestaurant.cuisineType}
                      </Badge>
                    )}
                    <Text size="xs" c="dimmed">
                      {pickedRestaurant.address}
                    </Text>
                    {pickedRestaurant.accessInfo && (
                      <Text size="xs" c="teal">
                        {'🚉'} {pickedRestaurant.accessInfo}
                      </Text>
                    )}

                    <Group gap="sm">
                      {pickedRestaurant.source && (
                        <Badge
                          variant="light"
                          size="sm"
                          color={getSourceBadgeColor(pickedRestaurant.source)}
                        >
                          {l.sourceLabel[pickedRestaurant.source]}
                        </Badge>
                      )}
                      <Badge variant="outline" size="sm" color="blue">
                        {pickedRestaurant.distance >= 1000
                          ? `${(pickedRestaurant.distance / 1000).toFixed(1)} km`
                          : `${Math.round(pickedRestaurant.distance)} m`}
                      </Badge>
                      {pickedRestaurant.rating && (
                        <Badge variant="light" size="sm" color="yellow">
                          {'⭐'} {pickedRestaurant.rating.toFixed(1)}
                        </Badge>
                      )}
                      {pickedRestaurant.priceLevel && (
                        <Badge variant="outline" size="sm" color="green">
                          {'¥'.repeat(pickedRestaurant.priceLevel)}
                        </Badge>
                      )}
                      {pickedRestaurant.budgetText && (
                        <Badge variant="outline" size="sm" color="orange">
                          {pickedRestaurant.budgetText}
                        </Badge>
                      )}
                      {pickedRestaurant.capacity && (
                        <Badge variant="outline" size="sm" color="grape">
                          {l.capacityValue(pickedRestaurant.capacity)}
                        </Badge>
                      )}
                      {pickedRestaurant.isOpenNow !== undefined && (
                        <Badge
                          color={pickedRestaurant.isOpenNow ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {pickedRestaurant.isOpenNow ? l.open : l.closed}
                        </Badge>
                      )}
                    </Group>

                    {/* Feature badges */}
                    {pickedRestaurant.features && pickedRestaurant.features.length > 0 && (
                      <Group gap={4}>
                        {pickedRestaurant.features.slice(0, 5).map((f) => (
                          <Badge key={f} variant="default" size="xs">
                            {FEATURE_LABELS[f]?.[locale] ?? f}
                          </Badge>
                        ))}
                      </Group>
                    )}

                    {pickedRestaurant.openingHours && pickedRestaurant.openingHours.length > 0 && (
                      <Box>
                        {pickedRestaurant.openingHours.length === 1 ? (
                          <Text size="xs" c="dimmed">
                            {'🕒'} {pickedRestaurant.openingHours[0]}
                          </Text>
                        ) : (
                          <Stack gap={2}>
                            {pickedRestaurant.openingHours.map((h) => (
                              <Text key={h} size="xs" c="dimmed" fw={isTodayLine(h) ? 600 : 400}>
                                {isTodayLine(h) ? '👉 ' : ''}
                                {h}
                              </Text>
                            ))}
                          </Stack>
                        )}
                      </Box>
                    )}

                    {pickedRestaurant.phone && (
                      <Text
                        size="sm"
                        c="blue"
                        component="a"
                        href={`tel:${pickedRestaurant.phone}`}
                        style={{ textDecoration: 'none' }}
                      >
                        {'📞'} {pickedRestaurant.phone}
                      </Text>
                    )}

                    {/* Menu links */}
                    {(pickedRestaurant.menuUrl || pickedRestaurant.websiteUrl) && (
                      <Group gap="xs">
                        {pickedRestaurant.menuUrl && (
                          <Button
                            variant="subtle"
                            color="cyan"
                            size="xs"
                            radius="xl"
                            component="a"
                            href={pickedRestaurant.menuUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {'📋'} {l.menu}
                          </Button>
                        )}
                        {pickedRestaurant.detailUrl?.includes('hotpepper.jp') && (
                          <>
                            <Button
                              variant="subtle"
                              color="cyan"
                              size="xs"
                              radius="xl"
                              component="a"
                              href={`${pickedRestaurant.detailUrl.replace(/\/$/, '')}/course/`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {l.course}
                            </Button>
                            <Button
                              variant="subtle"
                              color="cyan"
                              size="xs"
                              radius="xl"
                              component="a"
                              href={`${pickedRestaurant.detailUrl.replace(/\/$/, '')}/drink/`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {l.drinks}
                            </Button>
                          </>
                        )}
                        {pickedRestaurant.websiteUrl &&
                          pickedRestaurant.menuUrl !== pickedRestaurant.websiteUrl && (
                            <Button
                              variant="subtle"
                              color="gray"
                              size="xs"
                              radius="xl"
                              component="a"
                              href={pickedRestaurant.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {l.website}
                            </Button>
                          )}
                      </Group>
                    )}

                    {pickedRestaurantIsVisited && (
                      <Badge variant="light" color="grape" size="sm" w="fit-content">
                        {'✅'} {l.visited}
                      </Badge>
                    )}
                    {pickedRestaurantLatestFeedback && (
                      <Badge
                        variant="light"
                        color={getFeedbackBadgeColor(pickedRestaurantLatestFeedback.kind)}
                        size="sm"
                        w="fit-content"
                      >
                        {l.feedbackLabel(pickedRestaurantLatestFeedback.kind)}
                      </Badge>
                    )}

                    <Group gap="sm" mt="xs">
                      <Button
                        variant="filled"
                        color="orange"
                        radius="xl"
                        style={{ flex: 1 }}
                        component="a"
                        href={
                          pickedRestaurant.placeUrl ??
                          `https://www.google.com/maps/dir/?api=1&destination=${pickedRestaurant.lat},${pickedRestaurant.lng}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {'📍'} {l.navigate}
                      </Button>
                      <Button variant="light" color="orange" radius="xl" onClick={handleRepick}>
                        {'🔄'} {l.another}
                      </Button>
                    </Group>
                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        color="grape"
                        size="xs"
                        radius="xl"
                        style={{ flex: 1 }}
                        onClick={() => handleMarkVisited(pickedRestaurant)}
                      >
                        {'🍽️'} {l.markVisited}
                      </Button>
                      {pickedRestaurantIsVisited ? (
                        <>
                          <Button
                            variant="light"
                            color="teal"
                            size="xs"
                            radius="xl"
                            onClick={() => handleLikeAfterVisit(pickedRestaurant)}
                          >
                            {'👍'} {l.likeAfterVisit}
                          </Button>
                          <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            radius="xl"
                            onClick={() => handleDislikeAfterVisit(pickedRestaurant)}
                          >
                            {'👎'} {l.dislikeAfterVisit}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="subtle"
                          color="gray"
                          size="xs"
                          radius="xl"
                          onClick={() => handleNotInterested(pickedRestaurant)}
                        >
                          {'🙈'} {l.notInterested}
                        </Button>
                      )}
                      {pickedRestaurant.couponUrl && (
                        <Button
                          variant="subtle"
                          color="pink"
                          size="xs"
                          radius="xl"
                          component="a"
                          href={pickedRestaurant.couponUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {'🎫'} {l.coupon}
                        </Button>
                      )}
                      {pickedRestaurant.detailUrl && (
                        <Button
                          variant="subtle"
                          color="blue"
                          size="xs"
                          radius="xl"
                          component="a"
                          href={pickedRestaurant.detailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {l.detail}
                        </Button>
                      )}
                    </Group>
                    {pendingAspectFeedback?.restaurantId === pickedRestaurant.id && (
                      <FeedbackAspectChips
                        locale={locale}
                        event={feedbackEvents.find(
                          (event) => event.id === pendingAspectFeedback.eventId,
                        )}
                        options={getAspectOptionsForFeedback(pendingAspectFeedback.kind)}
                        onToggle={(aspect) =>
                          handleFeedbackAspectToggle(pendingAspectFeedback.eventId, aspect)
                        }
                      />
                    )}
                  </Stack>
                </Card>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Results */}
          {hasResults && (
            <Box className="app-panel" p="sm">
              <Stack gap="sm">
                {hasCoordinates && (
                  <Box className="app-map-frame" ref={mapWrapperRef}>
                    <Box px="sm" py="xs" style={{ borderBottom: '1px solid var(--app-border)' }}>
                      <Group justify="space-between" gap="sm" align="center">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={700} size="sm">
                            {l.resultsMapTitle}
                          </Text>
                        </Box>
                        {activeRestaurant && (
                          <Group gap="xs" wrap="wrap" justify="flex-end">
                            {isRandomMode &&
                              pickedRestaurant &&
                              activeRestaurant?.id === pickedRestaurant.id && (
                                <Badge color="orange" variant="filled" size="sm">
                                  {l.mapLockedToPick}
                                </Badge>
                              )}
                            <Badge color="orange" variant="light" size="md">
                              {activeRestaurant.name}
                            </Badge>
                          </Group>
                        )}
                      </Group>
                    </Box>
                    <RestaurantMap
                      restaurants={displayRestaurants}
                      userLat={lat}
                      userLng={lng}
                      focusedId={activeRestaurantId}
                      locale={locale}
                      height={PERSISTENT_MAP_HEIGHT}
                      minHeight={PERSISTENT_MAP_HEIGHT}
                      maxHeight={PERSISTENT_MAP_HEIGHT}
                    />
                  </Box>
                )}

                {!isRandomMode && semanticEnabled && restaurants.length > 1 && (
                  <Box className="app-panel-muted" p="sm">
                    <Group justify="space-between" align="center" gap="sm">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={700} size="sm">
                          {l.aiRankTitle}
                        </Text>
                        <Text size="xs" c="dimmed" mt={3}>
                          {l.aiRankDescription(aiRerankCandidates.length)}
                        </Text>
                      </Box>
                      <Group gap="xs" wrap="wrap" justify="flex-end">
                        {aiRerankEntries.length > 0 && (
                          <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            radius="xl"
                            onClick={clearAiRerank}
                          >
                            {l.clearAiRank}
                          </Button>
                        )}
                        <Button
                          variant="light"
                          color="orange"
                          size="xs"
                          radius="xl"
                          onClick={handleAiRerank}
                          loading={isRerankingEatOut}
                          data-testid="eat-out-rerank-ai"
                        >
                          {aiRerankEntries.length > 0 ? l.refreshAiRank : l.applyAiRank}
                        </Button>
                      </Group>
                    </Group>
                    {semanticEnabled && (rerankAiNotice || llmLastError) && (
                      <Text
                        size="xs"
                        c={llmLastError ? 'red' : 'dimmed'}
                        mt="xs"
                        data-testid="rerank-ai-note"
                      >
                        {rerankAiNotice ?? llmLastError}
                      </Text>
                    )}

                    {hasTasteProfileSignals && tasteProfile && (
                      <Group gap="xs" wrap="wrap" mt="sm">
                        <Badge variant="light" color="grape" radius="xl">
                          {l.tasteProfileTitle}
                        </Badge>
                        {tasteProfile.topCuisines.map((cuisine) => (
                          <Badge key={cuisine} variant="outline" color="gray" radius="xl">
                            {cuisine}
                          </Badge>
                        ))}
                        {tasteProfile.topFeatures.map((feature) => (
                          <Badge key={feature} variant="outline" color="cyan" radius="xl">
                            {FEATURE_LABELS[feature]?.[locale] ?? feature}
                          </Badge>
                        ))}
                        {tasteProfile.avoidedCuisines.map((cuisine) => (
                          <Badge key={`avoid-${cuisine}`} variant="light" color="red" radius="xl">
                            {l.avoidCuisineBadge(cuisine)}
                          </Badge>
                        ))}
                        {tasteProfile.avoidedFeatures.map((feature) => (
                          <Badge
                            key={`avoid-feature-${feature}`}
                            variant="light"
                            color="red"
                            radius="xl"
                          >
                            {l.avoidFeatureBadge(FEATURE_LABELS[feature]?.[locale] ?? feature)}
                          </Badge>
                        ))}
                        {tasteProfile.preferredAspects.map((aspect) => (
                          <Badge
                            key={`aspect-${aspect}`}
                            variant="outline"
                            color="orange"
                            radius="xl"
                          >
                            {FEEDBACK_ASPECT_LABELS[aspect][locale]}
                          </Badge>
                        ))}
                        {tasteProfile.avoidedAspects.map((aspect) => (
                          <Badge
                            key={`avoid-aspect-${aspect}`}
                            variant="light"
                            color="red"
                            radius="xl"
                          >
                            {l.avoidFeatureBadge(FEEDBACK_ASPECT_LABELS[aspect][locale])}
                          </Badge>
                        ))}
                        {tasteProfile.alwaysConsiderAspects.map((aspect) => (
                          <Badge
                            key={`always-aspect-${aspect}`}
                            variant="light"
                            color="teal"
                            radius="xl"
                          >
                            {FEEDBACK_ASPECT_LABELS[aspect][locale]}
                          </Badge>
                        ))}
                        {tasteProfile.preferredPriceLevel != null && (
                          <Badge variant="light" color="green" radius="xl">
                            {l.tasteBudgetBadge(tasteProfile.preferredPriceLevel)}
                          </Badge>
                        )}
                        {tasteProfile.typicalDistanceMeters != null && (
                          <Badge variant="light" color="blue" radius="xl">
                            {l.tasteDistanceBadge(tasteProfile.typicalDistanceMeters)}
                          </Badge>
                        )}
                        {tasteProfile.totalFeedbackEvents > 0 && (
                          <Badge variant="light" color="gray" radius="xl">
                            {l.feedbackCountBadge(tasteProfile.totalFeedbackEvents)}
                          </Badge>
                        )}
                      </Group>
                    )}
                  </Box>
                )}

                <Group justify="space-between" align="end" gap="sm">
                  <Box>
                    <Text fw={700}>{l.resultsTitle(restaurants.length)}</Text>
                  </Box>
                  <Box className="app-stat-pill">
                    <Text size="sm" fw={600}>
                      {aiRerankEntries.length > 0
                        ? l.aiRankShort
                        : effectiveSortBy === 'distance'
                          ? l.sortDistance
                          : l.sortRating}
                    </Text>
                  </Box>
                </Group>

                <Box
                  ref={resultsViewportRef}
                  style={{
                    maxHeight: 'min(52dvh, 500px)',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    paddingRight: 4,
                    paddingBottom: 6,
                  }}
                >
                  <Stack gap="sm">
                    {displayRestaurants.map((r, i) => {
                      const latestFeedback = latestFeedbackByRestaurantKey.get(
                        getRestaurantIdentityKey(r),
                      );
                      const pendingFeedback =
                        pendingAspectFeedback?.restaurantId === r.id ? pendingAspectFeedback : null;

                      return (
                        <Stack key={r.id} gap={6}>
                          <RestaurantCard
                            restaurant={r}
                            locale={locale}
                            index={i}
                            onMarkVisited={handleMarkVisited}
                            onLikeAfterVisit={handleLikeAfterVisit}
                            onDislikeAfterVisit={handleDislikeAfterVisit}
                            onNotInterested={handleNotInterested}
                            isVisited={visitedByRestaurantKey.has(getRestaurantIdentityKey(r))}
                            feedbackKind={latestFeedback?.kind ?? null}
                            isActive={r.id === activeRestaurantId}
                            isPicked={isRandomMode && r.id === pickedRestaurant?.id}
                            semanticRank={
                              aiRerankById.get(getRestaurantIdentityKey(r))?.rank ?? null
                            }
                            semanticReason={
                              aiRerankById.get(getRestaurantIdentityKey(r))?.reason ?? null
                            }
                            recommendationReasonCodes={
                              deterministicReasonsById.get(getRestaurantIdentityKey(r)) ?? []
                            }
                            onActivate={(restaurant) => setActiveRestaurantId(restaurant.id)}
                            rootRef={(node) => {
                              restaurantCardRefs.current[r.id] = node;
                            }}
                          />
                          {pendingFeedback && (
                            <FeedbackAspectChips
                              locale={locale}
                              event={feedbackEvents.find(
                                (event) => event.id === pendingFeedback.eventId,
                              )}
                              options={getAspectOptionsForFeedback(pendingFeedback.kind)}
                              onToggle={(aspect) =>
                                handleFeedbackAspectToggle(pendingFeedback.eventId, aspect)
                              }
                            />
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )}

          {/* No results */}
          {!loading &&
            !error &&
            !locLoading &&
            restaurants.length === 0 &&
            lat != null &&
            lng != null && (
              <Center py="sm">
                <Box className="app-panel-muted" p="lg">
                  <Text c="dimmed">
                    {allRestaurants.length > 0 && hasActiveClientFilters
                      ? l.noMatchFilters
                      : l.noResults}
                  </Text>
                </Box>
              </Center>
            )}
        </Stack>
      </Container>
    </AppShell>
  );
}

/** Centralized labels to keep JSX readable */
function useLabels(locale: Locale) {
  return useMemo(
    () => ({
      title: locale === 'zh-CN' ? '🍽️ 出去吃' : locale === 'ja' ? '🍽️ 外食する' : '🍽️ Eat Out',
      keywordSummary:
        locale === 'zh-CN'
          ? (keyword: string) => `关键词：${keyword}`
          : locale === 'ja'
            ? (keyword: string) => `キーワード: ${keyword}`
            : (keyword: string) => `Keyword: ${keyword}`,
      keywordBadge:
        locale === 'zh-CN'
          ? (keyword: string) => `搜索: ${keyword}`
          : locale === 'ja'
            ? (keyword: string) => `検索: ${keyword}`
            : (keyword: string) => `Search: ${keyword}`,
      randomPick:
        locale === 'zh-CN'
          ? '🎲 随机推荐'
          : locale === 'ja'
            ? '🎲 ランダムおすすめ'
            : '🎲 Random pick',
      randomMode:
        locale === 'zh-CN' ? '随机模式' : locale === 'ja' ? 'ランダムモード' : 'Random mode',
      randomSafe: locale === 'zh-CN' ? '稳妥' : locale === 'ja' ? '安心' : 'Safe',
      randomBalanced: locale === 'zh-CN' ? '平衡' : locale === 'ja' ? 'バランス' : 'Balanced',
      randomAdventure: locale === 'zh-CN' ? '冒险' : locale === 'ja' ? '冒険' : 'Adventure',
      waitingForLocation:
        locale === 'zh-CN' ? '等待定位' : locale === 'ja' ? '位置待機' : 'Waiting for location',
      providerLabel: {
        amap: locale === 'zh-CN' ? '高德地图' : locale === 'ja' ? 'Amap' : 'Amap',
        google:
          locale === 'zh-CN' ? 'Google Maps' : locale === 'ja' ? 'Google Maps' : 'Google Maps',
        hotpepper:
          locale === 'zh-CN' ? '日本餐厅搜索' : locale === 'ja' ? '日本向け検索' : 'Japan search',
      },
      sourceLabel: {
        amap: locale === 'zh-CN' ? '高德' : locale === 'ja' ? 'Amap' : 'Amap',
        google: 'Google',
        hotpepper: 'HotPepper',
        hybrid:
          locale === 'zh-CN'
            ? 'Google + HotPepper'
            : locale === 'ja'
              ? 'Google + HotPepper'
              : 'Google + HotPepper',
      },
      back: locale === 'zh-CN' ? '← 返回' : locale === 'ja' ? '← 戻る' : '← Back',
      filter: locale === 'zh-CN' ? '筛选' : locale === 'ja' ? 'フィルター' : 'Filters',
      refineSubmitAi: locale === 'zh-CN' ? 'AI 细化' : locale === 'ja' ? 'AIで絞る' : 'Refine AI',
      refineSubmit: locale === 'zh-CN' ? '细化搜索' : locale === 'ja' ? '絞り込む' : 'Refine',
      refinePlaceholder:
        locale === 'zh-CN'
          ? '比如：更便宜一点、适合4人、有 WiFi'
          : locale === 'ja'
            ? '例: もう少し安く、4人向け、WiFiあり'
            : 'Try cheaper, for 4 people, or with WiFi',
      refineDescriptionAi:
        locale === 'zh-CN'
          ? '本地模型会临时补充评分、预算、人数、营业中或设施条件，不会改你的已保存偏好。'
          : locale === 'ja'
            ? 'ローカルモデルが評価・予算・人数・営業中・設備条件を一時的に補います。保存済み設定は変更しません。'
            : 'The local model adds temporary rating, budget, party size, open-now, or feature filters without changing saved preferences.',
      refineDescription:
        locale === 'zh-CN'
          ? '用一句话临时细化当前结果。'
          : locale === 'ja'
            ? '一文で現在の結果を一時的に絞り込みます。'
            : 'Temporarily refine the current results with one short query.',
      aiRefineFallback:
        locale === 'zh-CN'
          ? 'AI 暂时没有可靠细化结果，已按关键词临时筛选。'
          : locale === 'ja'
            ? 'AI の確かな絞り込み結果がなかったため、キーワードで一時的に絞り込みました。'
            : 'AI did not return a reliable refinement, so keyword refine was used.',
      refineAppliedAi:
        locale === 'zh-CN' ? 'AI 已细化' : locale === 'ja' ? 'AIで絞り込み済み' : 'AI refined',
      refineApplied:
        locale === 'zh-CN' ? '已细化搜索' : locale === 'ja' ? '絞り込み済み' : 'Refined search',
      refineTemporaryNote:
        locale === 'zh-CN'
          ? '这些条件仅在当前页面临时生效。'
          : locale === 'ja'
            ? 'これらの条件はこのページだけで一時的に有効です。'
            : 'These extra filters are temporary to this page.',
      clearRefine:
        locale === 'zh-CN' ? '清除细化' : locale === 'ja' ? '絞り込み解除' : 'Clear refine',
      aiRankTitle:
        locale === 'zh-CN' ? 'AI 排一下顺序' : locale === 'ja' ? 'AI で並び替え' : 'AI rerank',
      aiRankDescription: (count: number) =>
        locale === 'zh-CN'
          ? `让本地模型重排前 ${count} 家候选，并给出简短理由。`
          : locale === 'ja'
            ? `上位 ${count} 件をローカルモデルで並び替え、短い理由を付けます。`
            : `Rerank the top ${count} nearby options locally and add short reasons.`,
      applyAiRank: locale === 'zh-CN' ? 'AI 排序' : locale === 'ja' ? 'AI 並び替え' : 'AI rerank',
      refreshAiRank:
        locale === 'zh-CN' ? '重新排序' : locale === 'ja' ? '並び替え直す' : 'Refresh rank',
      clearAiRank: locale === 'zh-CN' ? '清除排序' : locale === 'ja' ? 'AI順を解除' : 'Clear rank',
      aiRankShort: locale === 'zh-CN' ? 'AI 顺序' : locale === 'ja' ? 'AI順' : 'AI order',
      aiRerankFallback:
        locale === 'zh-CN'
          ? 'AI 暂时无法可靠排序，已保留当前顺序。'
          : locale === 'ja'
            ? 'AI の並び替えが信頼できなかったため、現在の順序を維持しました。'
            : 'AI could not produce a reliable ranking, so the current order stayed in place.',
      tasteProfileTitle:
        locale === 'zh-CN' ? '你的口味' : locale === 'ja' ? 'あなたの傾向' : 'Your taste',
      openOnly:
        locale === 'zh-CN' ? '仅看营业中' : locale === 'ja' ? '営業中のみ' : 'Open Now Only',
      openOnlyShort: locale === 'zh-CN' ? '营业中' : locale === 'ja' ? '営業中' : 'Open now',
      allHours: locale === 'zh-CN' ? '全时段' : locale === 'ja' ? '全時間帯' : 'All hours',
      distance: locale === 'zh-CN' ? '搜索距离' : locale === 'ja' ? '検索距離' : 'Search Distance',
      minRating: locale === 'zh-CN' ? '最低评分' : locale === 'ja' ? '最低評価' : 'Min Rating',
      budget: locale === 'zh-CN' ? '预算' : locale === 'ja' ? '予算' : 'Budget',
      partySize: locale === 'zh-CN' ? '人数' : locale === 'ja' ? '人数' : 'Party size',
      any: locale === 'zh-CN' ? '不限' : locale === 'ja' ? '指定なし' : 'Any',
      sortBy: locale === 'zh-CN' ? '排序方式' : locale === 'ja' ? '並び替え' : 'Sort by',
      sortDistance: locale === 'zh-CN' ? '距离优先' : locale === 'ja' ? '距離順' : 'Distance',
      sortRating: locale === 'zh-CN' ? '评分优先' : locale === 'ja' ? '評価順' : 'Rating',
      research: locale === 'zh-CN' ? '重新搜索' : locale === 'ja' ? '再検索' : 'Re-search',
      searching:
        locale === 'zh-CN'
          ? '正在搜索附近餐厅...'
          : locale === 'ja'
            ? '近くのレストランを検索中...'
            : 'Searching nearby...',
      gettingLocation:
        locale === 'zh-CN'
          ? '正在获取位置...'
          : locale === 'ja'
            ? '位置情報取得中...'
            : 'Getting location...',
      locationError:
        locale === 'zh-CN'
          ? '无法获取位置: '
          : locale === 'ja'
            ? '位置情報を取得できません: '
            : 'Cannot get location: ',
      retry: locale === 'zh-CN' ? '重试' : locale === 'ja' ? '再試行' : 'Retry',
      noResults:
        locale === 'zh-CN'
          ? '附近没有找到相关餐厅'
          : locale === 'ja'
            ? '近くにレストランが見つかりません'
            : 'No restaurants found nearby',
      noMatchFilters:
        locale === 'zh-CN'
          ? '没有符合筛选条件的餐厅，试试放宽筛选条件'
          : locale === 'ja'
            ? '条件に合うお店がありません。条件を少し緩めてみてください'
            : 'No restaurants match your filters. Try relaxing one or more filters.',
      todaysPick:
        locale === 'zh-CN'
          ? '🎲 今天就吃这家'
          : locale === 'ja'
            ? '🎲 今日はここ！'
            : '🎲 Today’s pick',
      open: locale === 'zh-CN' ? '营业中' : locale === 'ja' ? '営業中' : 'Open',
      closed: locale === 'zh-CN' ? '已打烊' : locale === 'ja' ? '閉店' : 'Closed',
      navigate: locale === 'zh-CN' ? '导航过去' : locale === 'ja' ? 'ナビで行く' : 'Navigate',
      another: locale === 'zh-CN' ? '换一家' : locale === 'ja' ? '別のお店' : 'Another',
      markVisited: locale === 'zh-CN' ? '标记已吃' : locale === 'ja' ? '食べた' : 'Mark visited',
      likeAfterVisit: locale === 'zh-CN' ? '这家不错' : locale === 'ja' ? '気に入った' : 'Like',
      dislikeAfterVisit:
        locale === 'zh-CN' ? '这家一般' : locale === 'ja' ? '合わなかった' : 'Dislike',
      notInterested:
        locale === 'zh-CN' ? '先不考虑' : locale === 'ja' ? '今回は見送り' : 'Not interested',
      visited: locale === 'zh-CN' ? '吃过' : locale === 'ja' ? '訪問済' : 'Visited',
      feedbackLabel: (kind: 'liked_after_visit' | 'disliked_after_visit' | 'not_interested') =>
        kind === 'liked_after_visit'
          ? locale === 'zh-CN'
            ? '喜欢'
            : locale === 'ja'
              ? '気に入った'
              : 'Liked'
          : kind === 'disliked_after_visit'
            ? locale === 'zh-CN'
              ? '不太喜欢'
              : locale === 'ja'
                ? '合わなかった'
                : 'Disliked'
            : locale === 'zh-CN'
              ? '暂不考虑'
              : locale === 'ja'
                ? '今回は見送り'
                : 'Not interested',
      coupon: locale === 'zh-CN' ? '优惠券' : locale === 'ja' ? 'クーポン' : 'Coupon',
      detail: locale === 'zh-CN' ? '详情' : locale === 'ja' ? '詳細' : 'Details',
      menu: locale === 'zh-CN' ? '菜单' : locale === 'ja' ? 'メニュー' : 'Menu',
      course: locale === 'zh-CN' ? '套餐' : locale === 'ja' ? 'コース' : 'Course',
      drinks: locale === 'zh-CN' ? '酒水' : locale === 'ja' ? 'ドリンク' : 'Drinks',
      website: locale === 'zh-CN' ? '官网' : locale === 'ja' ? '公式サイト' : 'Website',
      partySizeValue: (count: number) =>
        locale === 'zh-CN'
          ? `${count}人`
          : locale === 'ja'
            ? `${count}名`
            : `${count} ${count === 1 ? 'person' : 'people'}`,
      partySizeBadge: (count: number) =>
        locale === 'zh-CN' ? `${count}人` : locale === 'ja' ? `${count}名向け` : `For ${count}`,
      capacityValue: (count: number) =>
        locale === 'zh-CN'
          ? `👥 ${count}人`
          : locale === 'ja'
            ? `👥 ${count}名`
            : `👥 ${count} seats`,
      minRatingBadge: (rating: number) =>
        locale === 'zh-CN'
          ? `评分 ≥ ${rating}`
          : locale === 'ja'
            ? `評価 ${rating}+`
            : `Rating >= ${rating}`,
      maxBudgetBadge: (level: number) =>
        locale === 'zh-CN'
          ? `预算 ≤ ${'¥'.repeat(level)}`
          : locale === 'ja'
            ? `予算 ${'¥'.repeat(level)}まで`
            : `Budget <= ${'¥'.repeat(level)}`,
      tasteBudgetBadge: (level: number) =>
        locale === 'zh-CN'
          ? `常点 ${'¥'.repeat(level)}`
          : locale === 'ja'
            ? `よく選ぶ ${'¥'.repeat(level)}`
            : `Usually ${'¥'.repeat(level)}`,
      avoidCuisineBadge: (cuisine: string) =>
        locale === 'zh-CN'
          ? `少推 ${cuisine}`
          : locale === 'ja'
            ? `${cuisine} は控えめ`
            : `Avoids ${cuisine}`,
      avoidFeatureBadge: (feature: string) =>
        locale === 'zh-CN'
          ? `少推 ${feature}`
          : locale === 'ja'
            ? `${feature} は控えめ`
            : `Avoids ${feature}`,
      feedbackCountBadge: (count: number) =>
        locale === 'zh-CN'
          ? `${count} 个反馈`
          : locale === 'ja'
            ? `フィードバック ${count} 件`
            : `${count} feedback events`,
      tasteDistanceBadge: (meters: number) =>
        locale === 'zh-CN'
          ? `常去 ${meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`}`
          : locale === 'ja'
            ? `よく行く距離 ${meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`}`
            : `Usually ${meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`}`,
      filterTitle:
        locale === 'zh-CN'
          ? '筛选及排序'
          : locale === 'ja'
            ? 'フィルターと並び替え'
            : 'Filters and ranking',
      mapPreviewTitle:
        locale === 'zh-CN' ? '先看地图' : locale === 'ja' ? 'まず地図から' : 'Map preview',
      resultsMapTitle:
        locale === 'zh-CN' ? '地图跟随' : locale === 'ja' ? '地図の追従' : 'Map follow mode',
      resultsTitle: (count: number) =>
        locale === 'zh-CN'
          ? `已找到 ${count} 家餐厅`
          : locale === 'ja'
            ? `${count}件のお店`
            : `${count} restaurants found`,
      mapLockedToPick:
        locale === 'zh-CN' ? '随机选中' : locale === 'ja' ? 'ランダム選択' : 'Random pick',
      viewList: locale === 'zh-CN' ? '📋 列表' : locale === 'ja' ? '📋 リスト' : '📋 List',
      viewMap: locale === 'zh-CN' ? '🗺️ 地图' : locale === 'ja' ? '🗺️ 地図' : '🗺️ Map',
    }),
    [locale],
  );
}

function formatBudgetLevel(level: number, labels: ReturnType<typeof useLabels>): string {
  return level > 0 ? '¥'.repeat(level) : labels.any;
}

function getSourceBadgeColor(source: NonNullable<Restaurant['source']>) {
  switch (source) {
    case 'google':
      return 'blue';
    case 'hotpepper':
      return 'pink';
    case 'amap':
      return 'cyan';
    case 'hybrid':
      return 'orange';
  }
}

const FEEDBACK_ASPECT_LABELS: Record<FeedbackAspect, Record<Locale, string>> = {
  taste: { 'zh-CN': '口味', ja: '味', en: 'Taste' },
  price: { 'zh-CN': '价格', ja: '価格', en: 'Price' },
  distance: { 'zh-CN': '距离', ja: '距離', en: 'Distance' },
  ambience: { 'zh-CN': '氛围', ja: '雰囲気', en: 'Ambience' },
  noise: { 'zh-CN': '吵', ja: '騒音', en: 'Noise' },
  crowd: { 'zh-CN': '拥挤', ja: '混雑', en: 'Crowd' },
  service: { 'zh-CN': '服务', ja: 'サービス', en: 'Service' },
  solo: { 'zh-CN': '一人', ja: 'ひとり', en: 'Solo' },
  group: { 'zh-CN': '多人', ja: 'グループ', en: 'Group' },
  dietary: { 'zh-CN': '饮食限制', ja: '食事制限', en: 'Dietary' },
  access: { 'zh-CN': '交通', ja: 'アクセス', en: 'Access' },
  opening_hours: { 'zh-CN': '营业时间', ja: '営業時間', en: 'Hours' },
  not_my_mood: { 'zh-CN': '不合心情', ja: '気分違い', en: 'Not mood' },
};

function FeedbackAspectChips({
  locale,
  event,
  options,
  onToggle,
}: {
  locale: Locale;
  event?: FeedbackEvent;
  options: FeedbackAspect[];
  onToggle: (aspect: FeedbackAspect) => void;
}) {
  if (!event) return null;

  const selected = new Set(event.aspects ?? []);

  return (
    <Box className="app-panel-muted" p="xs">
      <Group gap="xs" wrap="wrap">
        {options.map((aspect) => (
          <Button
            key={aspect}
            variant={selected.has(aspect) ? 'filled' : 'light'}
            color={selected.has(aspect) ? 'orange' : 'gray'}
            size="xs"
            radius="xl"
            onClick={() => onToggle(aspect)}
          >
            {FEEDBACK_ASPECT_LABELS[aspect][locale]}
          </Button>
        ))}
      </Group>
    </Box>
  );
}

function getFeedbackBadgeColor(
  kind: 'liked_after_visit' | 'disliked_after_visit' | 'not_interested',
) {
  switch (kind) {
    case 'liked_after_visit':
      return 'teal';
    case 'disliked_after_visit':
      return 'red';
    case 'not_interested':
      return 'gray';
  }
}

function SliderScaleLabels({
  min,
  max,
  marks,
}: {
  min: number;
  max: number;
  marks: Array<{ value: number; label: string }>;
}) {
  return (
    <Box style={{ position: 'relative', height: 18 }}>
      {marks.map((mark) => {
        const ratio = (mark.value - min) / (max - min);
        const align =
          ratio <= 0.05
            ? 'translateX(0)'
            : ratio >= 0.95
              ? 'translateX(-100%)'
              : 'translateX(-50%)';

        return (
          <Text
            key={`${mark.value}-${mark.label}`}
            size="xs"
            c="dimmed"
            style={{
              position: 'absolute',
              left: `${ratio * 100}%`,
              transform: align,
              whiteSpace: 'nowrap',
            }}
          >
            {mark.label}
          </Text>
        );
      })}
    </Box>
  );
}

/** Best-effort check if an opening-hours line describes today */
function isTodayLine(line: string): boolean {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const jpDays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const today = new Date().getDay();
  return line.includes(days[today]) || line.includes(jpDays[today]);
}
