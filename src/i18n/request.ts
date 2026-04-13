import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['zh-CN', 'ja', 'en'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'zh-CN';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value as AppLocale) || defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
