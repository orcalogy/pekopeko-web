'use client';

import { Badge, Box, Button, Card, Group, Image, Stack, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { localizeFeedbackKind, localizeRecommendationReason } from '@/lib/recommendation/reasons';
import type { FeedbackKind, RecommendationReasonCode } from '@/lib/recommendation/types';
import type { Locale } from '@/types/food';
import type { Restaurant } from '@/types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  locale: Locale;
  index: number;
  onMarkVisited?: (r: Restaurant) => void;
  onLikeAfterVisit?: (r: Restaurant) => void;
  onDislikeAfterVisit?: (r: Restaurant) => void;
  onNotInterested?: (r: Restaurant) => void;
  isVisited?: boolean;
  feedbackKind?: FeedbackKind | null;
  isActive?: boolean;
  isPicked?: boolean;
  semanticRank?: number | null;
  semanticReason?: string | null;
  recommendationReasonCodes?: RecommendationReasonCode[];
  onActivate?: (restaurant: Restaurant) => void;
  rootRef?: (node: HTMLDivElement | null) => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function renderPriceLevel(level: number): string {
  return '¥'.repeat(level || 1);
}

const openLabels: Record<Locale, string> = {
  'zh-CN': '营业中',
  ja: '営業中',
  en: 'Open',
};
const closedLabels: Record<Locale, string> = {
  'zh-CN': '已打烊',
  ja: '閉店',
  en: 'Closed',
};
const navigateLabels: Record<Locale, string> = {
  'zh-CN': '导航过去',
  ja: 'ナビで行く',
  en: 'Navigate',
};

const markVisitedLabels: Record<Locale, string> = {
  'zh-CN': '标记已吃',
  ja: '食べた',
  en: 'Visited',
};

const likeLabels: Record<Locale, string> = {
  'zh-CN': '这家不错',
  ja: '気に入った',
  en: 'Like',
};

const dislikeLabels: Record<Locale, string> = {
  'zh-CN': '这家一般',
  ja: '合わなかった',
  en: 'Dislike',
};

const notInterestedLabels: Record<Locale, string> = {
  'zh-CN': '先不考虑',
  ja: '今回は見送り',
  en: 'Skip',
};

const couponLabels: Record<Locale, string> = {
  'zh-CN': '优惠券',
  ja: 'クーポン',
  en: 'Coupon',
};

const visitedLabels: Record<Locale, string> = {
  'zh-CN': '吃过',
  ja: '訪問済',
  en: 'Visited',
};

const focusedLabels: Record<Locale, string> = {
  'zh-CN': '地图聚焦',
  ja: '地図の中心',
  en: 'On map',
};

const pickedLabels: Record<Locale, string> = {
  'zh-CN': '今天选中',
  ja: '今日の候補',
  en: "Today's pick",
};

const aiReasonLabels: Record<Locale, string> = {
  'zh-CN': 'AI 理由',
  ja: 'AI の理由',
  en: 'AI reason',
};

const sourceLabels = {
  google: { 'zh-CN': 'Google', ja: 'Google', en: 'Google' },
  hotpepper: { 'zh-CN': 'HotPepper', ja: 'HotPepper', en: 'HotPepper' },
  amap: { 'zh-CN': '高德', ja: 'Amap', en: 'Amap' },
  hybrid: {
    'zh-CN': 'Google + HotPepper',
    ja: 'Google + HotPepper',
    en: 'Google + HotPepper',
  },
} as const;

const sourceColors = {
  google: 'blue',
  hotpepper: 'pink',
  amap: 'cyan',
  hybrid: 'orange',
} as const;

export const FEATURE_LABELS: Record<string, Record<Locale, string>> = {
  wifi: { 'zh-CN': 'WiFi', ja: 'WiFi', en: 'WiFi' },
  lunch: { 'zh-CN': '午餐', ja: 'ランチ', en: 'Lunch' },
  private_room: { 'zh-CN': '包间', ja: '個室', en: 'Private' },
  english: {
    'zh-CN': '英语菜单',
    ja: '英語メニュー',
    en: 'English',
  },
  non_smoking: { 'zh-CN': '禁烟', ja: '禁煙', en: 'No Smoke' },
  card: { 'zh-CN': '可刷卡', ja: 'カード可', en: 'Cards' },
  parking: { 'zh-CN': '停车场', ja: '駐車場', en: 'Parking' },
  barrier_free: {
    'zh-CN': '无障碍',
    ja: 'バリアフリー',
    en: 'Accessible',
  },
  course: { 'zh-CN': '套餐', ja: 'コース', en: 'Course' },
  free_drink: {
    'zh-CN': '畅饮',
    ja: '飲み放題',
    en: 'Free Drink',
  },
  free_food: {
    'zh-CN': '自助',
    ja: '食べ放題',
    en: 'Buffet',
  },
};

const menuLabels: Record<Locale, string> = {
  'zh-CN': '菜单',
  ja: 'メニュー',
  en: 'Menu',
};

const websiteLabels: Record<Locale, string> = {
  'zh-CN': '官网',
  ja: '公式サイト',
  en: 'Website',
};

const capacityLabels: Record<Locale, (count: number) => string> = {
  'zh-CN': (count) => `👥 ${count}人`,
  ja: (count) => `👥 ${count}名`,
  en: (count) => `👥 ${count} seats`,
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
  onLikeAfterVisit,
  onDislikeAfterVisit,
  onNotInterested,
  isVisited,
  feedbackKind = null,
  isActive = false,
  isPicked = false,
  semanticRank = null,
  semanticReason = null,
  recommendationReasonCodes = [],
  onActivate,
  rootRef,
}: RestaurantCardProps) {
  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onMouseEnter={onActivate ? () => onActivate(restaurant) : undefined}
      onFocusCapture={onActivate ? () => onActivate(restaurant) : undefined}
      style={{ scrollMarginTop: 'calc(env(safe-area-inset-top) + 320px)' }}
    >
      <Card
        radius="md"
        padding="md"
        withBorder
        style={{
          borderColor: isActive ? 'var(--mantine-color-orange-5)' : 'var(--app-border)',
          boxShadow: isActive ? '0 0 0 1px var(--mantine-color-orange-5)' : 'none',
          background: isActive ? 'var(--app-surface-muted)' : 'var(--app-surface-strong)',
          transition: 'background-color 160ms ease, border-color 160ms ease',
        }}
      >
        {restaurant.photoUrl && (
          <Card.Section>
            <Box style={{ position: 'relative' }}>
              <Image
                src={restaurant.photoUrl}
                alt={restaurant.name}
                h={148}
                fallbackSrc=""
                style={{ objectFit: 'cover' }}
              />
              <Group
                gap="xs"
                wrap="wrap"
                style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}
              >
                {isPicked && (
                  <Badge color="orange" variant="filled" size="sm">
                    {pickedLabels[locale]}
                  </Badge>
                )}
                {isActive && (
                  <Badge color="orange" variant="filled" size="sm">
                    {focusedLabels[locale]}
                  </Badge>
                )}
                {semanticRank != null && (
                  <Badge color="orange" variant="filled" size="sm">
                    {`AI #${semanticRank}`}
                  </Badge>
                )}
                {restaurant.isOpenNow !== undefined && (
                  <Badge color={restaurant.isOpenNow ? 'green' : 'red'} variant="light" size="sm">
                    {restaurant.isOpenNow ? openLabels[locale] : closedLabels[locale]}
                  </Badge>
                )}
              </Group>
            </Box>
          </Card.Section>
        )}
        <Stack gap="xs" mt={restaurant.photoUrl ? 'sm' : 0}>
          <Group justify="space-between" align="start" wrap="nowrap" gap="sm">
            <Box style={{ flex: 1, minWidth: 0 }}>
              {!restaurant.photoUrl && (
                <Group gap="xs" wrap="wrap" mb={8}>
                  {isPicked && (
                    <Badge color="orange" variant="filled" size="sm">
                      {pickedLabels[locale]}
                    </Badge>
                  )}
                  {isActive && (
                    <Badge color="orange" variant="light" size="sm">
                      {focusedLabels[locale]}
                    </Badge>
                  )}
                  {semanticRank != null && (
                    <Badge color="orange" variant="filled" size="sm">
                      {`AI #${semanticRank}`}
                    </Badge>
                  )}
                  {restaurant.isOpenNow !== undefined && (
                    <Badge color={restaurant.isOpenNow ? 'green' : 'red'} variant="light" size="sm">
                      {restaurant.isOpenNow ? openLabels[locale] : closedLabels[locale]}
                    </Badge>
                  )}
                </Group>
              )}
              <Text fw={700} size="md" lineClamp={1}>
                {restaurant.name}
              </Text>
              {restaurant.cuisineType && (
                <Text size="xs" c="orange" fw={600} mt={3}>
                  {restaurant.cuisineType}
                </Text>
              )}
              <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
                {restaurant.address}
              </Text>
              {restaurant.accessInfo && (
                <Text size="xs" c="teal" lineClamp={1} mt={3}>
                  {'🚉'} {restaurant.accessInfo}
                </Text>
              )}
            </Box>
          </Group>

          <Group gap="xs" wrap="wrap">
            {restaurant.source && (
              <Badge variant="light" size="sm" color={sourceColors[restaurant.source]}>
                {sourceLabels[restaurant.source][locale]}
              </Badge>
            )}
            <Badge variant="outline" size="sm" color="blue">
              {formatDistance(restaurant.distance)}
            </Badge>
            {restaurant.rating && (
              <Badge variant="light" size="sm" color="yellow">
                {'⭐'} {restaurant.rating.toFixed(1)}
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
            {restaurant.capacity && (
              <Badge variant="outline" size="sm" color="grape">
                {capacityLabels[locale](restaurant.capacity)}
              </Badge>
            )}
            {isVisited && (
              <Badge variant="light" size="sm" color="grape">
                {'✅'} {visitedLabels[locale]}
              </Badge>
            )}
            {feedbackKind && (
              <Badge
                variant="light"
                size="sm"
                color={
                  feedbackKind === 'liked_after_visit'
                    ? 'teal'
                    : feedbackKind === 'disliked_after_visit'
                      ? 'red'
                      : 'gray'
                }
              >
                {localizeFeedbackKind(feedbackKind, locale)}
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

          {recommendationReasonCodes.length > 0 && (
            <Group gap={4}>
              {recommendationReasonCodes.map((reason) => (
                <Badge key={reason} variant="light" size="xs" color="orange">
                  {localizeRecommendationReason(reason, locale)}
                </Badge>
              ))}
            </Group>
          )}

          {semanticReason && (
            <Box className="app-panel-muted" p="xs">
              <Text size="xs" fw={700} c="orange" mb={2}>
                {semanticRank != null
                  ? `${aiReasonLabels[locale]} #${semanticRank}`
                  : aiReasonLabels[locale]}
              </Text>
              <Text size="xs">{semanticReason}</Text>
            </Box>
          )}

          {/* Opening hours */}
          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <Box className="app-panel-muted" p="xs">
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
              {'📞'} {restaurant.phone}
            </Text>
          )}

          {/* Menu links */}
          {(restaurant.menuUrl || restaurant.websiteUrl) && (
            <Group gap="xs" wrap="wrap">
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
                  {'📋'} {menuLabels[locale]}
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
                    {locale === 'zh-CN' ? '套餐' : locale === 'ja' ? 'コース' : 'Course'}
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
                    {locale === 'zh-CN' ? '酒水' : locale === 'ja' ? 'ドリンク' : 'Drinks'}
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

          <Group gap="xs" align="stretch" wrap="wrap">
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
              {'📍'} {navigateLabels[locale]}
            </Button>
            {onMarkVisited && (
              <Button
                variant="subtle"
                color="grape"
                size="xs"
                radius="xl"
                onClick={() => onMarkVisited(restaurant)}
              >
                {'🍽️'} {markVisitedLabels[locale]}
              </Button>
            )}
            {isVisited ? (
              <>
                {onLikeAfterVisit && (
                  <Button
                    variant="light"
                    color="teal"
                    size="xs"
                    radius="xl"
                    onClick={() => onLikeAfterVisit(restaurant)}
                  >
                    {'👍'} {likeLabels[locale]}
                  </Button>
                )}
                {onDislikeAfterVisit && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    radius="xl"
                    onClick={() => onDislikeAfterVisit(restaurant)}
                  >
                    {'👎'} {dislikeLabels[locale]}
                  </Button>
                )}
              </>
            ) : (
              onNotInterested && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  radius="xl"
                  onClick={() => onNotInterested(restaurant)}
                >
                  {'🙈'} {notInterestedLabels[locale]}
                </Button>
              )
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
                {'🎫'} {couponLabels[locale]}
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
  const jpDays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const today = new Date().getDay();
  return line.includes(days[today]) || line.includes(jpDays[today]);
}
