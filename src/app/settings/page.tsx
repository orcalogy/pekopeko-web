'use client';

import {
  Box,
  Button,
  Card,
  Container,
  Group,
  Progress,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import type { AppLocale } from '@/lib/app-locale';
import { isLlmFeatureAvailable } from '@/lib/llm/availability';
import { clearLlmModelCache } from '@/lib/llm/engine';
import {
  formatSearchRadius,
  formatSearchRadiusMark,
  getSearchRadiusKmForIndex,
  getSearchRadiusPresetIndex,
  getSearchRadiusSliderMax,
  normalizeSearchRadiusKm,
  SEARCH_RADIUS_MARK_PRESETS_KM,
} from '@/lib/search-radius';
import { useAppState } from '@/stores/app-state';
import { useLlmStore } from '@/stores/llm';
import { usePreferences } from '@/stores/preferences';
import { useVisited } from '@/stores/visited';

export default function SettingsPage() {
  const {
    locale,
    theme,
    maxSpicy,
    searchRadiusKm,
    minRating,
    llmEnabled,
    llmModel,
    setLocale,
    setTheme,
    setMaxSpicy,
    setSearchRadius,
    setMinRating,
    setLlmEnabled,
  } = usePreferences();

  const { history, clearHistory } = useAppState();
  const {
    records: visitedRecords,
    removeRecord: removeVisited,
    clearAll: clearVisited,
  } = useVisited();
  const { setColorScheme } = useMantineColorScheme();
  const llmAvailability = useLlmStore((state) => state.availability);
  const llmRuntimeState = useLlmStore((state) => state.runtimeState);
  const llmSupportMessage = useLlmStore((state) => state.supportMessage);
  const llmRuntimeMessage = useLlmStore((state) => state.runtimeMessage);
  const llmProgress = useLlmStore((state) => state.progress);
  const llmIsModelCached = useLlmStore((state) => state.isModelCached);
  const llmLastError = useLlmStore((state) => state.lastError);
  const llmSessionDisabled = useLlmStore((state) => state.sessionDisabled);
  const [clearingCache, setClearingCache] = useState(false);

  const handleThemeChange = (value: string) => {
    const t = value as 'light' | 'dark' | 'auto';
    setTheme(t);
    setColorScheme(t);
  };

  const handleLocaleChange = (value: string) => {
    setLocale(value as AppLocale);
  };

  const labels = {
    title: { 'zh-CN': '设置', ja: '設定', en: 'Settings' },
    language: { 'zh-CN': '语言', ja: '言語', en: 'Language' },
    theme: { 'zh-CN': '主题', ja: 'テーマ', en: 'Theme' },
    light: { 'zh-CN': '浅色', ja: 'ライト', en: 'Light' },
    dark: { 'zh-CN': '深色', ja: 'ダーク', en: 'Dark' },
    auto: { 'zh-CN': '自动', ja: '自動', en: 'Auto' },
    foodPrefs: { 'zh-CN': '口味偏好', ja: '味の好み', en: 'Taste Preferences' },
    spicyMax: { 'zh-CN': '辣度上限', ja: '辛さ上限', en: 'Max Spicy' },
    searchDist: { 'zh-CN': '搜索距离', ja: '検索距離', en: 'Search Distance' },
    minRating: { 'zh-CN': '最低评分', ja: '最低評価', en: 'Min Rating' },
    minRatingAny: { 'zh-CN': '不限', ja: '指定なし', en: 'Any' },
    aiSearch: { 'zh-CN': 'AI 搜索', ja: 'AI 検索', en: 'AI Search' },
    aiSearchDesc: {
      'zh-CN': '默认关闭。开启后会为自然语言搜索预留能力，关闭时保持纯关键词搜索。',
      ja: '初期状態はオフ。オンにすると自然文検索の準備が有効になり、オフではキーワード検索のみを使います。',
      en: 'Default off. Turning it on prepares natural-language search, while off keeps search in keyword-only mode.',
    },
    aiOn: { 'zh-CN': '已开启', ja: 'オン', en: 'On' },
    aiOff: { 'zh-CN': '已关闭', ja: 'オフ', en: 'Off' },
    aiModel: { 'zh-CN': '预设模型', ja: '既定モデル', en: 'Default model' },
    aiStatus: { 'zh-CN': '支持状态', ja: '対応状況', en: 'Support status' },
    aiRuntime: { 'zh-CN': '运行状态', ja: '実行状態', en: 'Runtime status' },
    aiCache: { 'zh-CN': '本地缓存', ja: 'ローカルキャッシュ', en: 'Local cache' },
    aiCacheUnknown: {
      'zh-CN': '开启后会检查模型缓存状态',
      ja: '有効化するとモデルのキャッシュ状態を確認します',
      en: 'Cache status will be checked once AI search is enabled',
    },
    aiCachePresent: { 'zh-CN': '模型已缓存', ja: 'モデルはキャッシュ済み', en: 'Model is cached' },
    aiCacheMissing: {
      'zh-CN': '模型未缓存',
      ja: 'モデルは未キャッシュ',
      en: 'Model is not cached',
    },
    aiClearCache: {
      'zh-CN': '清除模型缓存',
      ja: 'モデルキャッシュを削除',
      en: 'Clear model cache',
    },
    aiClearSuccess: {
      'zh-CN': '已清除模型缓存',
      ja: 'モデルキャッシュを削除しました',
      en: 'Model cache cleared',
    },
    aiClearError: {
      'zh-CN': '清除模型缓存失败',
      ja: 'モデルキャッシュの削除に失敗しました',
      en: 'Failed to clear model cache',
    },
    aiSessionFallback: {
      'zh-CN': '本次会话已退回到关键词搜索',
      ja: 'このセッションではキーワード検索にフォールバックしています',
      en: 'This session has fallen back to keyword-only search',
    },
    aiNote: {
      'zh-CN': '默认关闭。开启后会按需加载本地模型做语义解析；关闭或失败时都会退回到关键词搜索。',
      ja: '初期状態はオフです。有効化すると必要な時だけローカルモデルを読み込み、失敗時は常にキーワード検索へ戻ります。',
      en: 'Default off. When enabled, the local model loads on demand for semantic parsing, and every failure falls back to keyword search.',
    },
    history: { 'zh-CN': '历史记录', ja: '履歴', en: 'History' },
    clearHist: { 'zh-CN': '清除历史', ja: '履歴クリア', en: 'Clear History' },
    records: { 'zh-CN': '条记录', ja: '件の記録', en: 'records' },
    visited: { 'zh-CN': '吃过的店', ja: '訪問済みのお店', en: 'Visited Restaurants' },
    clearVisited: { 'zh-CN': '清除记录', ja: '記録をクリア', en: 'Clear All' },
    visitedCount: { 'zh-CN': '家店', ja: '件のお店', en: 'restaurants' },
    visitTimes: { 'zh-CN': '次', ja: '回', en: 'visits' },
    remove: { 'zh-CN': '移除', ja: '削除', en: 'Remove' },
  } as const;

  const l = (key: keyof typeof labels) => labels[key][locale];
  const effectiveSearchRadiusKm = normalizeSearchRadiusKm(searchRadiusKm);
  const searchRadiusIndex = getSearchRadiusPresetIndex(effectiveSearchRadiusKm);
  const llmFeatureAvailable = isLlmFeatureAvailable();
  const aiStatusLabel =
    llmAvailability === 'supported'
      ? locale === 'zh-CN'
        ? '可用'
        : locale === 'ja'
          ? '利用可能'
          : 'Supported'
      : llmAvailability === 'idle'
        ? locale === 'zh-CN'
          ? '待检查'
          : locale === 'ja'
            ? '未確認'
            : 'Pending'
        : llmAvailability === 'checking-support'
          ? locale === 'zh-CN'
            ? '检查中'
            : locale === 'ja'
              ? '確認中'
              : 'Checking'
          : llmAvailability === 'flag-disabled'
            ? locale === 'zh-CN'
              ? '已关闭'
              : locale === 'ja'
                ? '無効'
                : 'Disabled'
            : locale === 'zh-CN'
              ? '不可用'
              : locale === 'ja'
                ? '利用不可'
                : 'Unsupported';
  const aiRuntimeLabel =
    llmRuntimeState === 'loading-model'
      ? locale === 'zh-CN'
        ? '加载模型中'
        : locale === 'ja'
          ? 'モデルを読み込み中'
          : 'Loading model'
      : llmRuntimeState === 'parsing'
        ? locale === 'zh-CN'
          ? '解析中'
          : locale === 'ja'
            ? '解析中'
            : 'Parsing'
        : llmRuntimeState === 'ready'
          ? locale === 'zh-CN'
            ? '已就绪'
            : locale === 'ja'
              ? '準備完了'
              : 'Ready'
          : llmRuntimeState === 'error'
            ? locale === 'zh-CN'
              ? '已回退'
              : locale === 'ja'
                ? 'フォールバック中'
                : 'Fallback'
            : locale === 'zh-CN'
              ? '未启动'
              : locale === 'ja'
                ? '未起動'
                : 'Idle';

  const spicyLabels: Record<number, string> = {
    0: locale === 'zh-CN' ? '不吃辣' : locale === 'ja' ? '辛くない' : 'None',
    1: locale === 'zh-CN' ? '微辣' : locale === 'ja' ? 'ちょい辛' : 'Mild',
    2: locale === 'zh-CN' ? '中辣' : locale === 'ja' ? '中辛' : 'Medium',
    3: locale === 'zh-CN' ? '特辣' : locale === 'ja' ? '激辛' : 'Hot',
  };

  const handleClearCache = async () => {
    setClearingCache(true);

    try {
      await clearLlmModelCache(llmModel);
      notifications.show({
        color: 'green',
        message: l('aiClearSuccess'),
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        message: `${l('aiClearError')}: ${error instanceof Error ? error.message : ''}`.trim(),
      });
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <AppShell>
      <Container py="md" px="md">
        <Stack gap="lg">
          <Title order={2} size="h3">
            {'⚙️'} {l('title')}
          </Title>

          {/* Language */}
          <Card padding="md" radius="md" withBorder>
            <Text fw={600} mb="sm">
              {l('language')}
            </Text>
            <SegmentedControl
              value={locale}
              onChange={handleLocaleChange}
              data={[
                { value: 'zh-CN', label: '中文' },
                { value: 'ja', label: '日本語' },
                { value: 'en', label: 'English' },
              ]}
              fullWidth
              radius="xl"
            />
          </Card>

          {/* Theme */}
          <Card padding="md" radius="md" withBorder>
            <Text fw={600} mb="sm">
              {l('theme')}
            </Text>
            <SegmentedControl
              value={theme}
              onChange={handleThemeChange}
              data={[
                { value: 'light', label: `☀️ ${l('light')}` },
                { value: 'dark', label: `🌙 ${l('dark')}` },
                { value: 'auto', label: `📱 ${l('auto')}` },
              ]}
              fullWidth
              radius="xl"
            />
          </Card>

          {/* Taste preferences */}
          <Card padding="md" radius="md" withBorder>
            <Text fw={600} mb="sm">
              {l('foodPrefs')}
            </Text>
            <Stack gap="sm">
              <Text size="sm">
                {l('spicyMax')}: {spicyLabels[maxSpicy]}
              </Text>
              <Slider
                value={maxSpicy}
                onChange={setMaxSpicy}
                label={(value) => spicyLabels[value]}
                min={0}
                max={3}
                step={1}
                color="red"
              />
              <SliderScaleLabels
                min={0}
                max={3}
                marks={[
                  { value: 0, label: spicyLabels[0] },
                  { value: 1, label: spicyLabels[1] },
                  { value: 2, label: spicyLabels[2] },
                  { value: 3, label: spicyLabels[3] },
                ]}
              />
            </Stack>
          </Card>

          {/* Search Distance */}
          <Card padding="md" radius="md" withBorder>
            <Stack gap="sm">
              <Text fw={600}>
                {l('searchDist')}: {formatSearchRadius(effectiveSearchRadiusKm)}
              </Text>
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
          </Card>

          {/* Min Rating */}
          <Card padding="md" radius="md" withBorder>
            <Stack gap="sm">
              <Text fw={600}>
                {l('minRating')}: {minRating > 0 ? `${minRating}+` : l('minRatingAny')}
              </Text>
              <Slider
                value={minRating}
                onChange={setMinRating}
                label={(value) => (value > 0 ? `${value}+` : l('minRatingAny'))}
                min={0}
                max={4.5}
                step={0.5}
                color="yellow"
              />
              <SliderScaleLabels
                min={0}
                max={4.5}
                marks={[
                  { value: 0, label: l('minRatingAny') },
                  { value: 3, label: '3' },
                  { value: 4, label: '4' },
                  { value: 4.5, label: '4.5' },
                ]}
              />
            </Stack>
          </Card>

          {llmFeatureAvailable && (
            <Card padding="md" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600}>{l('aiSearch')}</Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      {l('aiSearchDesc')}
                    </Text>
                  </Box>
                  <Switch
                    checked={llmEnabled}
                    onChange={(event) => setLlmEnabled(event.currentTarget.checked)}
                    color="orange"
                  />
                </Group>

                <Text size="sm" c="dimmed">
                  {l('aiSearch')}: {llmEnabled ? l('aiOn') : l('aiOff')}
                </Text>
                <Text size="sm" c="dimmed">
                  {l('aiModel')}: {llmModel}
                </Text>
                <Text size="sm" c="dimmed">
                  {l('aiStatus')}: {aiStatusLabel}
                </Text>
                <Text size="sm" c="dimmed">
                  {l('aiRuntime')}: {aiRuntimeLabel}
                </Text>
                <Text size="sm" c="dimmed">
                  {l('aiCache')}:{' '}
                  {llmIsModelCached == null
                    ? l('aiCacheUnknown')
                    : llmIsModelCached
                      ? l('aiCachePresent')
                      : l('aiCacheMissing')}
                </Text>
                {llmProgress != null && llmRuntimeState === 'loading-model' && (
                  <Progress value={llmProgress} color="orange" radius="xl" />
                )}
                {llmSupportMessage && (
                  <Text size="xs" c="dimmed">
                    {llmSupportMessage}
                  </Text>
                )}
                {llmRuntimeMessage && (
                  <Text size="xs" c="dimmed">
                    {llmRuntimeMessage}
                  </Text>
                )}
                {llmSessionDisabled && (
                  <Text size="xs" c="yellow.8">
                    {l('aiSessionFallback')}
                  </Text>
                )}
                {llmLastError && (
                  <Text size="xs" c="red">
                    {llmLastError}
                  </Text>
                )}
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  onClick={handleClearCache}
                  loading={clearingCache}
                  disabled={llmAvailability !== 'supported'}
                >
                  {l('aiClearCache')}
                </Button>
                <Text size="xs" c="dimmed">
                  {l('aiNote')}
                </Text>
              </Stack>
            </Card>
          )}

          {/* History */}
          <Card padding="md" radius="md" withBorder>
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={600}>{l('history')}</Text>
                <Text size="sm" c="dimmed">
                  {history.length} {l('records')}
                </Text>
              </Box>
              <Button
                variant="light"
                color="red"
                size="xs"
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                {l('clearHist')}
              </Button>
            </Group>
          </Card>

          {/* Visited Restaurants */}
          <Card padding="md" radius="md" withBorder>
            <Group justify="space-between" align="center" mb={visitedRecords.length > 0 ? 'sm' : 0}>
              <Box>
                <Text fw={600}>{l('visited')}</Text>
                <Text size="sm" c="dimmed">
                  {visitedRecords.length} {l('visitedCount')}
                </Text>
              </Box>
              <Button
                variant="light"
                color="red"
                size="xs"
                onClick={clearVisited}
                disabled={visitedRecords.length === 0}
              >
                {l('clearVisited')}
              </Button>
            </Group>
            {visitedRecords.length > 0 && (
              <Stack gap="xs">
                {visitedRecords.map((record) => (
                  <Group key={record.id} justify="space-between" align="center">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" lineClamp={1}>
                        {record.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {record.visits.length} {l('visitTimes')}
                      </Text>
                    </Box>
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => removeVisited(record.id)}
                    >
                      {l('remove')}
                    </Button>
                  </Group>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </Container>
    </AppShell>
  );
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
    <Box style={{ position: 'relative', height: 20 }}>
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
