'use client';

import { Badge, Box, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  locale: Locale;
  index: number;
  onMarkVisited?: (r: Restaurant) => void;
  isVisited?: boolean;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function renderPriceLevel(level: number): string {
  return '\u{00A5}'.repeat(level || 1);
}

const openLabels: Record<Locale, string> = {
  'zh-CN': '\u8425\u4E1A\u4E2D',
  ja: '\u55B6\u696D\u4E2D',
  en: 'Open',
};
const closedLabels: Record<Locale, string> = {
  'zh-CN': '\u5DF2\u6253\u70CA',
  ja: '\u9589\u5E97',
  en: 'Closed',
};
const navigateLabels: Record<Locale, string> = {
  'zh-CN': '\u5BFC\u822A\u8FC7\u53BB',
  ja: '\u30CA\u30D3\u3067\u884C\u304F',
  en: 'Navigate',
};

const markVisitedLabels: Record<Locale, string> = {
  'zh-CN': '\u6807\u8BB0\u5DF2\u5403',
  ja: '\u98DF\u3079\u305F',
  en: 'Visited',
};

const couponLabels: Record<Locale, string> = {
  'zh-CN': '\u4F18\u60E0\u5238',
  ja: '\u30AF\u30FC\u30DD\u30F3',
  en: 'Coupon',
};

const visitedLabels: Record<Locale, string> = {
  'zh-CN': '\u5403\u8FC7',
  ja: '\u8A2A\u554F\u6E08',
  en: 'Visited',
};

export const FEATURE_LABELS: Record<string, Record<Locale, string>> = {
  wifi: { 'zh-CN': 'WiFi', ja: 'WiFi', en: 'WiFi' },
  lunch: { 'zh-CN': '\u5348\u9910', ja: '\u30E9\u30F3\u30C1', en: 'Lunch' },
  private_room: { 'zh-CN': '\u5305\u95F4', ja: '\u500B\u5BA4', en: 'Private' },
  english: {
    'zh-CN': '\u82F1\u8BED\u83DC\u5355',
    ja: '\u82F1\u8A9E\u30E1\u30CB\u30E5\u30FC',
    en: 'English',
  },
  non_smoking: { 'zh-CN': '\u7981\u70DF', ja: '\u7981\u7159', en: 'No Smoke' },
  card: { 'zh-CN': '\u53EF\u5237\u5361', ja: '\u30AB\u30FC\u30C9\u53EF', en: 'Cards' },
  parking: { 'zh-CN': '\u505C\u8F66\u573A', ja: '\u99D0\u8ECA\u5834', en: 'Parking' },
  barrier_free: {
    'zh-CN': '\u65E0\u969C\u788D',
    ja: '\u30D0\u30EA\u30A2\u30D5\u30EA\u30FC',
    en: 'Accessible',
  },
  course: { 'zh-CN': '\u5957\u9910', ja: '\u30B3\u30FC\u30B9', en: 'Course' },
  free_drink: {
    'zh-CN': '\u7545\u996E',
    ja: '\u98F2\u307F\u653E\u984C',
    en: 'Free Drink',
  },
  free_food: {
    'zh-CN': '\u81EA\u52A9',
    ja: '\u98DF\u3079\u653E\u984C',
    en: 'Buffet',
  },
};

const menuLabels: Record<Locale, string> = {
  'zh-CN': '\u83DC\u5355',
  ja: '\u30E1\u30CB\u30E5\u30FC',
  en: 'Menu',
};

const websiteLabels: Record<Locale, string> = {
  'zh-CN': '\u5B98\u7F51',
  ja: '\u516C\u5F0F\u30B5\u30A4\u30C8',
  en: 'Website',
};

function getNavigateUrl(r: Restaurant): string {
  if (r.placeUrl) return r.placeUrl;
  return `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`;
}

export function RestaurantCard({
  restaurant,
  locale,
  index,
  onMarkVisited,
  isVisited,
}: RestaurantCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card shadow="sm" radius="md" padding="md" withBorder>
        {restaurant.photoUrl && (
          <Card.Section>
            <Image
              src={restaurant.photoUrl}
              alt={restaurant.name}
              h={160}
              fallbackSrc=""
              style={{ objectFit: 'cover' }}
            />
          </Card.Section>
        )}
        <Stack gap="xs" mt={restaurant.photoUrl ? 'sm' : 0}>
          <Group justify="space-between" align="start">
            <Box style={{ flex: 1 }}>
              <Text fw={600} size="md" lineClamp={1}>
                {restaurant.name}
              </Text>
              {restaurant.cuisineType && (
                <Text size="xs" c="orange" mt={2}>
                  {restaurant.cuisineType}
                </Text>
              )}
              <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                {restaurant.address}
              </Text>
              {restaurant.accessInfo && (
                <Text size="xs" c="teal" lineClamp={1} mt={2}>
                  {'\u{1F689}'} {restaurant.accessInfo}
                </Text>
              )}
            </Box>

            {restaurant.isOpenNow !== undefined && (
              <Badge color={restaurant.isOpenNow ? 'green' : 'red'} variant="light" size="sm">
                {restaurant.isOpenNow ? openLabels[locale] : closedLabels[locale]}
              </Badge>
            )}
          </Group>

          <Group gap="sm">
            <Badge variant="outline" size="sm" color="blue">
              {formatDistance(restaurant.distance)}
            </Badge>
            {restaurant.rating && (
              <Badge variant="light" size="sm" color="yellow">
                {'\u{2B50}'} {restaurant.rating.toFixed(1)}
              </Badge>
            )}
            {restaurant.priceLevel && (
              <Badge variant="outline" size="sm" color="green">
                {renderPriceLevel(restaurant.priceLevel)}
              </Badge>
            )}
            {restaurant.budgetText && (
              <Badge variant="outline" size="sm" color="orange">
                {restaurant.budgetText}
              </Badge>
            )}
            {isVisited && (
              <Badge variant="light" size="sm" color="grape">
                {'\u{2705}'} {visitedLabels[locale]}
              </Badge>
            )}
          </Group>

          {/* Feature badges */}
          {restaurant.features && restaurant.features.length > 0 && (
            <Group gap={4}>
              {restaurant.features.slice(0, 4).map((f) => (
                <Badge key={f} variant="default" size="xs">
                  {FEATURE_LABELS[f]?.[locale] ?? f}
                </Badge>
              ))}
            </Group>
          )}

          {/* Opening hours */}
          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <Box>
              <Text size="xs" c="dimmed">
                {restaurant.openingHours.length === 1
                  ? restaurant.openingHours[0]
                  : (restaurant.openingHours.find((h) => isTodayLine(h)) ??
                    restaurant.openingHours[0])}
              </Text>
            </Box>
          )}

          {/* Phone */}
          {restaurant.phone && (
            <Text
              size="xs"
              c="blue"
              component="a"
              href={`tel:${restaurant.phone}`}
              style={{ textDecoration: 'none' }}
            >
              {'\u{1F4DE}'} {restaurant.phone}
            </Text>
          )}

          {/* Menu links */}
          {(restaurant.menuUrl || restaurant.websiteUrl) && (
            <Group gap="xs">
              {restaurant.menuUrl && (
                <Button
                  variant="light"
                  color="cyan"
                  size="xs"
                  radius="xl"
                  component="a"
                  href={restaurant.menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {'\u{1F4CB}'} {menuLabels[locale]}
                </Button>
              )}
              {restaurant.detailUrl?.includes('hotpepper.jp') && (
                <>
                  <Button
                    variant="subtle"
                    color="cyan"
                    size="xs"
                    radius="xl"
                    component="a"
                    href={`${restaurant.detailUrl.replace(/\/$/, '')}/course/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {locale === 'zh-CN'
                      ? '\u5957\u9910'
                      : locale === 'ja'
                        ? '\u30B3\u30FC\u30B9'
                        : 'Course'}
                  </Button>
                  <Button
                    variant="subtle"
                    color="cyan"
                    size="xs"
                    radius="xl"
                    component="a"
                    href={`${restaurant.detailUrl.replace(/\/$/, '')}/drink/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {locale === 'zh-CN'
                      ? '\u9152\u6C34'
                      : locale === 'ja'
                        ? '\u30C9\u30EA\u30F3\u30AF'
                        : 'Drinks'}
                  </Button>
                </>
              )}
              {restaurant.websiteUrl && restaurant.menuUrl !== restaurant.websiteUrl && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  radius="xl"
                  component="a"
                  href={restaurant.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {websiteLabels[locale]}
                </Button>
              )}
            </Group>
          )}

          <Group gap="xs">
            <Button
              variant="light"
              color="orange"
              size="xs"
              radius="xl"
              component="a"
              href={getNavigateUrl(restaurant)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1 }}
            >
              {'\u{1F4CD}'} {navigateLabels[locale]}
            </Button>
            {onMarkVisited && (
              <Button
                variant="subtle"
                color="grape"
                size="xs"
                radius="xl"
                onClick={() => onMarkVisited(restaurant)}
              >
                {'\u{1F37D}\u{FE0F}'} {markVisitedLabels[locale]}
              </Button>
            )}
            {restaurant.couponUrl && (
              <Button
                variant="light"
                color="pink"
                size="xs"
                radius="xl"
                component="a"
                href={restaurant.couponUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {'\u{1F3AB}'} {couponLabels[locale]}
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
    </motion.div>
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
