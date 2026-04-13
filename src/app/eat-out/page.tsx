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

const RestaurantMap = dynamic(
  () => import('@/components/restaurant/RestaurantMap').then((m) => m.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <Center py="xl">
        <Loader color="orange" />
      </Center>
    ),
  },
);

import { categories } from '@/data/categories';
import { useLocation } from '@/stores/location';
import { usePreferences } from '@/stores/preferences';
import { useVisited, weightedRandomPick } from '@/stores/visited';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

type SortBy = 'distance' | 'rating';
const LOCATION_MAX_AGE_MS = 30 * 60 * 1000;

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
  const prefMinRating = usePreferences((s) => s.minRating);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { records: visitedRecords, markVisited } = useVisited();
  const visitedRecordsRef = useRef(visitedRecords);

  useEffect(() => {
    visitedRecordsRef.current = visitedRecords;
  }, [visitedRecords]);

  // Filters — minRating defaults to the persisted preference
  const [openOnly, setOpenOnly] = useState(true);
  const [minRating, setMinRating] = useState(prefMinRating);
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const category = categories.find((c) => c.id === categoryId);
  const needsFreshLocation =
    lat == null ||
    lng == null ||
    !provider ||
    !locatedAt ||
    Date.now() - locatedAt > LOCATION_MAX_AGE_MS;

  // Derive displayed list from raw data + client-side filters
  const restaurants = useMemo(() => {
    let list = allRestaurants;

    if (minRating > 0) {
      // Keep unrated restaurants (e.g. HotPepper-only) — only exclude rated ones below threshold
      list = list.filter((r) => r.rating === undefined || r.rating >= minRating);
    }

    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    // 'distance' is the default sort from the API, no re-sort needed

    return list;
  }, [allRestaurants, minRating, sortBy]);

  // Track whether this is the initial fetch (for auto-picking in random mode)
  const initialFetchDone = useRef(false);
  const autoLocationRequestDone = useRef(false);

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
        radius: String(searchRadiusKm * 1000),
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
  }, [lat, lng, provider, searchRadiusKm, category, locale, openOnly]);

  // Auto-pick in random mode when filtered list changes
  useEffect(() => {
    if (!isRandomMode) return;

    if (restaurants.length === 0) {
      setPickedRestaurant(null);
      return;
    }

    if (!initialFetchDone.current) return;

    setPickedRestaurant((current) => {
      if (current && restaurants.some((r) => r.id === current.id)) {
        return current;
      }
      return weightedRandomPick(restaurants, visitedRecordsRef.current);
    });
  }, [isRandomMode, restaurants]);

  const handleRepick = useCallback(() => {
    if (restaurants.length === 0) return;
    if (restaurants.length === 1) {
      setPickedRestaurant(restaurants[0]);
      return;
    }
    // Try up to 5 times to pick a different one
    for (let i = 0; i < 5; i++) {
      const next = weightedRandomPick(restaurants, visitedRecords);
      if (next.id !== pickedRestaurant?.id) {
        setPickedRestaurant(next);
        return;
      }
    }
    // Fallback: just pick any different one
    const others = restaurants.filter((r) => r.id !== pickedRestaurant?.id);
    setPickedRestaurant(others[Math.floor(Math.random() * others.length)]);
  }, [restaurants, pickedRestaurant, visitedRecords]);

  const handleMarkVisited = useCallback(
    (r: Restaurant) => {
      markVisited(r.id, r.name);
    },
    [markVisited],
  );

  // Request a fresh location once per mount when persisted coordinates are missing or stale.
  useEffect(() => {
    if (!needsFreshLocation) {
      autoLocationRequestDone.current = false;
      return;
    }

    if (autoLocationRequestDone.current) return;

    autoLocationRequestDone.current = true;
    requestLocation();
  }, [needsFreshLocation, requestLocation]);

  // Fetch restaurants when location is ready
  useEffect(() => {
    if (needsFreshLocation) return;
    fetchRestaurants();
  }, [needsFreshLocation, fetchRestaurants]);

  const l = useLabels(locale);

  return (
    <AppShell>
      <Container py="md" px="md">
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Box>
              <Title order={2} size="h3">
                {l.title}
              </Title>
              {category && (
                <Badge color={category.color} variant="light" size="md" mt={4}>
                  {category.name[locale]}
                </Badge>
              )}
              {isRandomMode && !category && (
                <Text size="xs" c="dimmed" mt={4}>
                  {l.randomPick}
                </Text>
              )}
            </Box>
            <Button variant="subtle" size="sm" onClick={() => router.back()}>
              {l.back}
            </Button>
          </Group>

          {/* View toggle + Filters */}
          <Group gap="xs">
            <Button variant="light" size="xs" radius="xl" onClick={toggleFilters}>
              {'\u{2699}\u{FE0F}'} {l.filter}
            </Button>
            <SegmentedControl
              value={viewMode}
              onChange={(v) => setViewMode(v as 'list' | 'map')}
              data={[
                { value: 'list', label: l.viewList },
                { value: 'map', label: l.viewMap },
              ]}
              size="xs"
              radius="xl"
            />
          </Group>
          <Box>
            <Collapse expanded={filtersOpened}>
              <Stack
                gap="sm"
                mt="sm"
                p="sm"
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Switch
                  label={l.openOnly}
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.currentTarget.checked)}
                  color="orange"
                />

                {/* Distance */}
                <Box>
                  <Text size="sm" mb="xs">
                    {l.distance}: {searchRadiusKm} km
                  </Text>
                  <Slider
                    value={searchRadiusKm}
                    onChange={setSearchRadius}
                    min={0.5}
                    max={10}
                    step={0.5}
                    marks={[
                      { value: 1, label: '1km' },
                      { value: 3, label: '3km' },
                      { value: 5, label: '5km' },
                      { value: 10, label: '10km' },
                    ]}
                    color="orange"
                  />
                </Box>

                {/* Min rating */}
                <Box>
                  <Text size="sm" mb="xs">
                    {l.minRating}: {minRating > 0 ? `${minRating}+` : l.any}
                  </Text>
                  <Slider
                    value={minRating}
                    onChange={setMinRating}
                    min={0}
                    max={4.5}
                    step={0.5}
                    marks={[
                      { value: 0, label: l.any },
                      { value: 3, label: '3' },
                      { value: 4, label: '4' },
                      { value: 4.5, label: '4.5' },
                    ]}
                    color="yellow"
                  />
                </Box>

                {/* Sort by */}
                <Box>
                  <Text size="sm" mb="xs">
                    {l.sortBy}
                  </Text>
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
                </Box>

                <Button size="xs" onClick={fetchRestaurants} color="orange">
                  {l.research}
                </Button>
              </Stack>
            </Collapse>
          </Box>

          {/* Location loading */}
          {locLoading && (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Loader color="orange" />
                <Text c="dimmed" size="sm">
                  {l.gettingLocation}
                </Text>
              </Stack>
            </Center>
          )}

          {/* Location error */}
          {locError && (
            <Stack align="center" gap="sm" py="xl">
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
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Loader color="orange" />
                <Text c="dimmed" size="sm">
                  {l.searching}
                </Text>
              </Stack>
            </Center>
          )}

          {/* Search error */}
          {error && (
            <Stack align="center" gap="sm" py="xl">
              <Text c="red" size="sm">
                {error}
              </Text>
              <Button size="sm" onClick={fetchRestaurants} color="orange" variant="light">
                {l.retry}
              </Button>
            </Stack>
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
                  shadow="md"
                  radius="lg"
                  padding="lg"
                  withBorder
                  style={{ borderColor: theme.colors.orange[5], borderWidth: 2 }}
                >
                  {pickedRestaurant.photoUrl && (
                    <Card.Section>
                      <Image
                        src={pickedRestaurant.photoUrl}
                        alt={pickedRestaurant.name}
                        h={200}
                        fallbackSrc=""
                        style={{ objectFit: 'cover' }}
                      />
                    </Card.Section>
                  )}
                  <Stack gap="sm" mt={pickedRestaurant.photoUrl ? 'md' : 0}>
                    <Text size="xs" fw={600} c="orange" tt="uppercase">
                      {l.todaysPick}
                    </Text>
                    <Text fw={700} size="xl">
                      {pickedRestaurant.name}
                    </Text>
                    {pickedRestaurant.cuisineType && (
                      <Badge variant="light" color="orange" size="sm" w="fit-content">
                        {pickedRestaurant.cuisineType}
                      </Badge>
                    )}
                    <Text size="sm" c="dimmed">
                      {pickedRestaurant.address}
                    </Text>
                    {pickedRestaurant.accessInfo && (
                      <Text size="sm" c="teal">
                        {'\u{1F689}'} {pickedRestaurant.accessInfo}
                      </Text>
                    )}

                    <Group gap="sm">
                      <Badge variant="outline" size="sm" color="blue">
                        {pickedRestaurant.distance >= 1000
                          ? `${(pickedRestaurant.distance / 1000).toFixed(1)} km`
                          : `${Math.round(pickedRestaurant.distance)} m`}
                      </Badge>
                      {pickedRestaurant.rating && (
                        <Badge variant="light" size="sm" color="yellow">
                          {'\u{2B50}'} {pickedRestaurant.rating.toFixed(1)}
                        </Badge>
                      )}
                      {pickedRestaurant.priceLevel && (
                        <Badge variant="outline" size="sm" color="green">
                          {'\u{00A5}'.repeat(pickedRestaurant.priceLevel)}
                        </Badge>
                      )}
                      {pickedRestaurant.budgetText && (
                        <Badge variant="outline" size="sm" color="orange">
                          {pickedRestaurant.budgetText}
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
                            {'\u{1F552}'} {pickedRestaurant.openingHours[0]}
                          </Text>
                        ) : (
                          <Stack gap={2}>
                            {pickedRestaurant.openingHours.map((h) => (
                              <Text key={h} size="xs" c="dimmed" fw={isTodayLine(h) ? 600 : 400}>
                                {isTodayLine(h) ? '\u{1F449} ' : ''}
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
                        {'\u{1F4DE}'} {pickedRestaurant.phone}
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
                            {'\u{1F4CB}'} {l.menu}
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
                        {'\u{2705}'} {l.visited}
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
                        {'\u{1F4CD}'} {l.navigate}
                      </Button>
                      <Button variant="light" color="orange" radius="xl" onClick={handleRepick}>
                        {'\u{1F504}'} {l.another}
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
                        {'\u{1F37D}\u{FE0F}'} {l.markVisited}
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
                          {'\u{1F3AB}'} {l.coupon}
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
          {!loading && !error && restaurants.length > 0 && (
            <>
              {/* Result count */}
              <Text size="sm" c="dimmed" ta="center">
                {locale === 'zh-CN'
                  ? `\u5171 ${restaurants.length} \u5BB6\u9910\u5385`
                  : locale === 'ja'
                    ? `${restaurants.length}\u4EF6`
                    : `${restaurants.length} results`}
              </Text>

              {/* Map view */}
              {viewMode === 'map' && lat != null && lng != null && (
                <RestaurantMap
                  restaurants={restaurants}
                  userLat={lat}
                  userLng={lng}
                  pickedId={pickedRestaurant?.id}
                  locale={locale}
                />
              )}

              {/* List view */}
              {viewMode === 'list' && (
                <Stack gap="sm">
                  {restaurants.map((r, i) => (
                    <RestaurantCard
                      key={r.id}
                      restaurant={r}
                      locale={locale}
                      index={i}
                      onMarkVisited={handleMarkVisited}
                      isVisited={visitedRecords.some((v) => v.id === r.id)}
                    />
                  ))}
                </Stack>
              )}
            </>
          )}

          {/* No results */}
          {!loading &&
            !error &&
            !locLoading &&
            restaurants.length === 0 &&
            lat != null &&
            lng != null && (
              <Center py="xl">
                <Text c="dimmed">
                  {allRestaurants.length > 0 && minRating > 0 ? l.noMatchFilters : l.noResults}
                </Text>
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
      title:
        locale === 'zh-CN'
          ? '\u{1F37D}\u{FE0F} \u51FA\u53BB\u5403'
          : locale === 'ja'
            ? '\u{1F37D}\u{FE0F} \u5916\u98DF\u3059\u308B'
            : '\u{1F37D}\u{FE0F} Eat Out',
      randomPick:
        locale === 'zh-CN'
          ? '\u{1F3B2} \u968F\u673A\u63A8\u8350'
          : locale === 'ja'
            ? '\u{1F3B2} \u30E9\u30F3\u30C0\u30E0\u304A\u3059\u3059\u3081'
            : '\u{1F3B2} Random pick',
      back:
        locale === 'zh-CN'
          ? '\u{2190} \u8FD4\u56DE'
          : locale === 'ja'
            ? '\u{2190} \u623B\u308B'
            : '\u{2190} Back',
      filter:
        locale === 'zh-CN'
          ? '\u7B5B\u9009'
          : locale === 'ja'
            ? '\u30D5\u30A3\u30EB\u30BF\u30FC'
            : 'Filters',
      openOnly:
        locale === 'zh-CN'
          ? '\u4EC5\u770B\u8425\u4E1A\u4E2D'
          : locale === 'ja'
            ? '\u55B6\u696D\u4E2D\u306E\u307F'
            : 'Open Now Only',
      distance:
        locale === 'zh-CN'
          ? '\u641C\u7D22\u8DDD\u79BB'
          : locale === 'ja'
            ? '\u691C\u7D22\u8DDD\u96E2'
            : 'Search Distance',
      minRating:
        locale === 'zh-CN'
          ? '\u6700\u4F4E\u8BC4\u5206'
          : locale === 'ja'
            ? '\u6700\u4F4E\u8A55\u4FA1'
            : 'Min Rating',
      any:
        locale === 'zh-CN' ? '\u4E0D\u9650' : locale === 'ja' ? '\u6307\u5B9A\u306A\u3057' : 'Any',
      sortBy:
        locale === 'zh-CN'
          ? '\u6392\u5E8F\u65B9\u5F0F'
          : locale === 'ja'
            ? '\u4E26\u3073\u66FF\u3048'
            : 'Sort by',
      sortDistance:
        locale === 'zh-CN'
          ? '\u8DDD\u79BB\u4F18\u5148'
          : locale === 'ja'
            ? '\u8DDD\u96E2\u9806'
            : 'Distance',
      sortRating:
        locale === 'zh-CN'
          ? '\u8BC4\u5206\u4F18\u5148'
          : locale === 'ja'
            ? '\u8A55\u4FA1\u9806'
            : 'Rating',
      research:
        locale === 'zh-CN'
          ? '\u91CD\u65B0\u641C\u7D22'
          : locale === 'ja'
            ? '\u518D\u691C\u7D22'
            : 'Re-search',
      searching:
        locale === 'zh-CN'
          ? '\u6B63\u5728\u641C\u7D22\u9644\u8FD1\u9910\u5385...'
          : locale === 'ja'
            ? '\u8FD1\u304F\u306E\u30EC\u30B9\u30C8\u30E9\u30F3\u3092\u691C\u7D22\u4E2D...'
            : 'Searching nearby...',
      gettingLocation:
        locale === 'zh-CN'
          ? '\u6B63\u5728\u83B7\u53D6\u4F4D\u7F6E...'
          : locale === 'ja'
            ? '\u4F4D\u7F6E\u60C5\u5831\u53D6\u5F97\u4E2D...'
            : 'Getting location...',
      locationError:
        locale === 'zh-CN'
          ? '\u65E0\u6CD5\u83B7\u53D6\u4F4D\u7F6E: '
          : locale === 'ja'
            ? '\u4F4D\u7F6E\u60C5\u5831\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093: '
            : 'Cannot get location: ',
      retry: locale === 'zh-CN' ? '\u91CD\u8BD5' : locale === 'ja' ? '\u518D\u8A66\u884C' : 'Retry',
      noResults:
        locale === 'zh-CN'
          ? '\u9644\u8FD1\u6CA1\u6709\u627E\u5230\u76F8\u5173\u9910\u5385'
          : locale === 'ja'
            ? '\u8FD1\u304F\u306B\u30EC\u30B9\u30C8\u30E9\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093'
            : 'No restaurants found nearby',
      noMatchFilters:
        locale === 'zh-CN'
          ? '\u6CA1\u6709\u7B26\u5408\u7B5B\u9009\u6761\u4EF6\u7684\u9910\u5385\uFF0C\u8BD5\u8BD5\u964D\u4F4E\u8BC4\u5206\u8981\u6C42'
          : locale === 'ja'
            ? '\u6761\u4EF6\u306B\u5408\u3046\u304A\u5E97\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u8A55\u4FA1\u3092\u4E0B\u3052\u3066\u307F\u3066\u304F\u3060\u3055\u3044'
            : 'No restaurants match your filters. Try lowering the minimum rating.',
      todaysPick:
        locale === 'zh-CN'
          ? '\u{1F3B2} \u4ECA\u5929\u5C31\u5403\u8FD9\u5BB6'
          : locale === 'ja'
            ? '\u{1F3B2} \u4ECA\u65E5\u306F\u3053\u3053\uFF01'
            : '\u{1F3B2} Today\u2019s pick',
      open:
        locale === 'zh-CN' ? '\u8425\u4E1A\u4E2D' : locale === 'ja' ? '\u55B6\u696D\u4E2D' : 'Open',
      closed:
        locale === 'zh-CN' ? '\u5DF2\u6253\u70CA' : locale === 'ja' ? '\u9589\u5E97' : 'Closed',
      navigate:
        locale === 'zh-CN'
          ? '\u5BFC\u822A\u8FC7\u53BB'
          : locale === 'ja'
            ? '\u30CA\u30D3\u3067\u884C\u304F'
            : 'Navigate',
      another:
        locale === 'zh-CN'
          ? '\u6362\u4E00\u5BB6'
          : locale === 'ja'
            ? '\u5225\u306E\u304A\u5E97'
            : 'Another',
      markVisited:
        locale === 'zh-CN'
          ? '\u6807\u8BB0\u5DF2\u5403'
          : locale === 'ja'
            ? '\u98DF\u3079\u305F'
            : 'Mark visited',
      visited:
        locale === 'zh-CN' ? '\u5403\u8FC7' : locale === 'ja' ? '\u8A2A\u554F\u6E08' : 'Visited',
      coupon:
        locale === 'zh-CN'
          ? '\u4F18\u60E0\u5238'
          : locale === 'ja'
            ? '\u30AF\u30FC\u30DD\u30F3'
            : 'Coupon',
      detail: locale === 'zh-CN' ? '\u8BE6\u60C5' : locale === 'ja' ? '\u8A73\u7D30' : 'Details',
      menu:
        locale === 'zh-CN' ? '\u83DC\u5355' : locale === 'ja' ? '\u30E1\u30CB\u30E5\u30FC' : 'Menu',
      course:
        locale === 'zh-CN' ? '\u5957\u9910' : locale === 'ja' ? '\u30B3\u30FC\u30B9' : 'Course',
      drinks:
        locale === 'zh-CN'
          ? '\u9152\u6C34'
          : locale === 'ja'
            ? '\u30C9\u30EA\u30F3\u30AF'
            : 'Drinks',
      website:
        locale === 'zh-CN'
          ? '\u5B98\u7F51'
          : locale === 'ja'
            ? '\u516C\u5F0F\u30B5\u30A4\u30C8'
            : 'Website',
      viewList:
        locale === 'zh-CN'
          ? '\u{1F4CB} \u5217\u8868'
          : locale === 'ja'
            ? '\u{1F4CB} \u30EA\u30B9\u30C8'
            : '\u{1F4CB} List',
      viewMap:
        locale === 'zh-CN'
          ? '\u{1F5FA}\u{FE0F} \u5730\u56FE'
          : locale === 'ja'
            ? '\u{1F5FA}\u{FE0F} \u5730\u56F3'
            : '\u{1F5FA}\u{FE0F} Map',
    }),
    [locale],
  );
}

/** Best-effort check if an opening-hours line describes today */
function isTodayLine(line: string): boolean {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const jpDays = [
    '\u65E5\u66DC\u65E5',
    '\u6708\u66DC\u65E5',
    '\u706B\u66DC\u65E5',
    '\u6C34\u66DC\u65E5',
    '\u6728\u66DC\u65E5',
    '\u91D1\u66DC\u65E5',
    '\u571F\u66DC\u65E5',
  ];
  const today = new Date().getDay();
  return line.includes(days[today]) || line.includes(jpDays[today]);
}
