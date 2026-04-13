export const locales = ['zh-CN', 'ja', 'en'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'zh-CN';

const APP_LOCALE_META: Record<AppLocale, { name: string; description: string }> = {
  'zh-CN': {
    name: '饿死啦',
    description: '帮你解决每天吃什么的选择困难 - 随机转盘选美食，支持自己做和出去吃',
  },
  ja: {
    name: 'ぺこぺこ！',
    description: '毎日何を食べるかの迷いを解消。自炊も外食もすぐ決められる',
  },
  en: {
    name: 'pekopeko',
    description: 'Solve the daily food decision with quick picks for cooking or eating out',
  },
};

export function isAppLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function detectPreferredLocale(
  input: readonly string[] | string | null | undefined,
): AppLocale {
  const candidates = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',').map((part) => part.split(';')[0]?.trim())
      : [];

  for (const candidate of candidates) {
    const locale = candidate.toLowerCase();

    if (locale === 'zh-cn' || locale.startsWith('zh-') || locale === 'zh') {
      return 'zh-CN';
    }

    if (locale === 'ja' || locale.startsWith('ja-')) {
      return 'ja';
    }

    if (locale === 'en' || locale.startsWith('en-')) {
      return 'en';
    }
  }

  return defaultLocale;
}

export function getAppName(locale: AppLocale): string {
  return APP_LOCALE_META[locale].name;
}

export function getAppDescription(locale: AppLocale): string {
  return APP_LOCALE_META[locale].description;
}

export function getAppWindowTitle(locale: AppLocale): string {
  const appName = getAppName(locale);
  return appName === 'pekopeko' ? appName : `${appName} - pekopeko`;
}
