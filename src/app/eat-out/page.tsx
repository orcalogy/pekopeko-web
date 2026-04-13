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
  formatSearchRadius,
  formatSearchRadiusMark,
  getSearchRadiusKmForIndex,
  getSearchRadiusPresetIndex,
  getSearchRadiusSliderMax,
  normalizeSearchRadiusKm,
  SEARCH_RADIUS_MARK_PRESETS_KM,
} from '@/lib/search-radius';
import { useLocation } from '@/stores/location';
import { usePreferences } from '@/stores/preferences';
import { useVisited, weightedRandomPick } from '@/stores/visited';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

type SortBy = 'distance' | 'rating';
const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;
const PERSISTENT_MAP_HEIGHT = 196;
const MAX_BUDGET_LEVEL = 4;
const MIN_PARTY_SIZE = 1;
const MAX_PARTY_SIZE = 12;

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

  const { records: visitedRecords, markVisited } = useVisited();
  const visitedRecordsRef = useRef(visitedRecords);

  useEffect(() => {
    visitedRecordsRef.current = visitedRecords;
  }, [visitedRecords]);

  // Filters
  const [openOnly, setOpenOnly] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const resultsViewportRef = useRef<HTMLDivElement | null>(null);
  const restaurantCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const category = categories.find((c) => c.id === categoryId);
  const effectiveSearchRadiusKm = normalizeSearchRadiusKm(searchRadiusKm);
  const searchRadiusIndex = getSearchRadiusPresetIndex(effectiveSearchRadiusKm);
  const hasCoordinates = lat != null && lng != null;
  const hasSearchLocation = hasCoordinates && !!provider;
  const needsFreshLocation =
    !hasCoordinates || !locatedAt || Date.now() - locatedAt > LOCATION_MAX_AGE_MS;
  const canUseStoredLocation = !needsFreshLocation && hasSearchLocation;

  // Derive displayed list from raw data + client-side filters
  const restaurants = useMemo(() => {
    let list = allRestaurants;

    if (minRating > 0) {
      // Keep unrated restaurants (e.g. HotPepper-only) — only exclude rated ones below threshold
      list = list.filter((r) => r.rating === undefined || r.rating >= minRating);
    }

    if (maxBudgetLevel > 0) {
      list = list.filter(
        (restaurant) =>
          restaurant.priceLevel === undefined ||
          (restaurant.priceLevel > 0 && restaurant.priceLevel <= maxBudgetLevel),
      );
    }

    if (partySize > 1) {
      list = list.filter(
        (restaurant) => restaurant.capacity === undefined || restaurant.capacity >= partySize,
      );
    }

    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    // 'distance' is the default sort from the API, no re-sort needed

    return list;
  }, [allRestaurants, minRating, maxBudgetLevel, partySize, sortBy]);

  const displayRestaurants = useMemo(() => {
    if (!isRandomMode || !pickedRestaurant) {
      return restaurants;
    }

    const picked = restaurants.find((restaurant) => restaurant.id === pickedRestaurant.id);
    if (!picked) {
      return restaurants;
    }

    return [picked, ...restaurants.filter((restaurant) => restaurant.id !== picked.id)];
  }, [isRandomMode, pickedRestaurant, restaurants]);

  const randomCandidateSignature = useMemo(
    () =>
      [...restaurants]
        .map((restaurant) => restaurant.id)
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
      const params = new URLSearchParams({
        provider,
        lat: String(lat),
        lng: String(lng),
        radius: String(effectiveSearchRadiusKm * 1000),
        locale,
      });

      if (category) {
        // HotPepper is Japanese-only — always use Japanese category name
        const kw = provider === 'hotpepper' ? category.name.ja : category.name[locale];
        params.set('keyword', kw);
      }
      if (openOnly) {
        params.set('openNow', 'true');
      }

      const res = await fetch(`/api/places/nearby?${params}`);
      if (!res.ok) throw new Error('Search failed');
      const data: Restaurant[] = await res.json();

      data.sort((a, b) => a.distance - b.distance);

      const filtered = openOnly ? data.filter((r) => r.isOpenNow !== false) : data;

      setAllRestaurants(filtered);
      initialFetchDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [lat, lng, provider, effectiveSearchRadiusKm, category, locale, openOnly]);

  const pickRandomRestaurant = useCallback(
    (excludeId?: string | null) => {
      if (restaurants.length === 0) return null;
      if (restaurants.length === 1) return restaurants[0];

      for (let i = 0; i < 5; i++) {
        const next = weightedRandomPick(restaurants, visitedRecordsRef.current);
        if (!excludeId || next.id !== excludeId) {
          return next;
        }
      }

      const others = restaurants.filter((restaurant) => restaurant.id !== excludeId);
      return others[Math.floor(Math.random() * others.length)] ?? restaurants[0];
    },
    [restaurants],
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
      markVisited(r.id, r.name);
    },
    [markVisited],
  );

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

  const l = useLabels(locale);
  const hasResults = !loading && !error && restaurants.length > 0;
  const hasActiveClientFilters = minRating > 0 || maxBudgetLevel > 0 || partySize > 1;
  const activeRestaurant =
    displayRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
    pickedRestaurant;

  return (
    <AppShell>
      <Container py="sm" px="sm">
        <Stack gap="md">
          <Box className="app-hero-card" p="sm">
            <Stack gap="sm">
              <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Title order={2} size="h3" fw={800} style={{ letterSpacing: '-0.03em' }}>
                    {category ? category.name[locale] : l.title}
                  </Title>
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
                    {minRating > 0 ? `${minRating}+` : l.any}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.budget}
                  </Text>
                  <Text size="sm" fw={600}>
                    {formatBudgetLevel(maxBudgetLevel, l)}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.partySize}
                  </Text>
                  <Text size="sm" fw={600}>
                    {l.partySizeValue(partySize)}
                  </Text>
                </Box>
                <Box className="app-stat-pill">
                  <Text size="xs" c="dimmed">
                    {l.sortBy}
                  </Text>
                  <Text size="sm" fw={600}>
                    {sortBy === 'distance' ? l.sortDistance : l.sortRating}
                  </Text>
                </Box>
              </Group>

              <Collapse expanded={filtersOpened}>
                <Stack gap="md" mt="sm" className="app-panel-muted" p="sm">
                  <Box className="app-panel-muted" p="sm">
                    <Switch
                      label={l.openOnly}
                      checked={openOnly}
                      onChange={(e) => setOpenOnly(e.currentTarget.checked)}
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
                        onChange={(value) => setSearchRadius(getSearchRadiusKmForIndex(value))}
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
                          {minRating > 0 ? `${minRating}+` : l.any}
                        </Badge>
                      </Group>
                      <Slider
                        value={minRating}
                        onChange={setMinRating}
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
                          {formatBudgetLevel(maxBudgetLevel, l)}
                        </Badge>
                      </Group>
                      <Slider
                        value={maxBudgetLevel}
                        onChange={setMaxBudgetLevel}
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
                          {l.partySizeValue(partySize)}
                        </Badge>
                      </Group>
                      <Slider
                        value={partySize}
                        onChange={setPartySize}
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
                          {sortBy === 'distance' ? l.sortDistance : l.sortRating}
                        </Badge>
                      </Group>
                      <SegmentedControl
                        value={sortBy}
                        onChange={(v) => setSortBy(v as SortBy)}
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
                            variant="light"
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

                    {visitedRecords.find((v) => v.id === pickedRestaurant.id) && (
                      <Badge variant="light" color="grape" size="sm" w="fit-content">
                        {'✅'} {l.visited}
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
                      {pickedRestaurant.couponUrl && (
                        <Button
                          variant="light"
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

                <Group justify="space-between" align="end" gap="sm">
                  <Box>
                    <Text fw={700}>{l.resultsTitle(restaurants.length)}</Text>
                  </Box>
                  <Box className="app-stat-pill">
                    <Text size="sm" fw={600}>
                      {sortBy === 'distance' ? l.sortDistance : l.sortRating}
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
                    {displayRestaurants.map((r, i) => (
                      <RestaurantCard
                        key={r.id}
                        restaurant={r}
                        locale={locale}
                        index={i}
                        onMarkVisited={handleMarkVisited}
                        isVisited={visitedRecords.some((v) => v.id === r.id)}
                        isActive={r.id === activeRestaurantId}
                        isPicked={isRandomMode && r.id === pickedRestaurant?.id}
                        onActivate={(restaurant) => setActiveRestaurantId(restaurant.id)}
                        rootRef={(node) => {
                          restaurantCardRefs.current[r.id] = node;
                        }}
                      />
                    ))}
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
      randomPick:
        locale === 'zh-CN'
          ? '🎲 随机推荐'
          : locale === 'ja'
            ? '🎲 ランダムおすすめ'
            : '🎲 Random pick',
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
      visited: locale === 'zh-CN' ? '吃过' : locale === 'ja' ? '訪問済' : 'Visited',
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
      capacityValue: (count: number) =>
        locale === 'zh-CN'
          ? `👥 ${count}人`
          : locale === 'ja'
            ? `👥 ${count}名`
            : `👥 ${count} seats`,
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
