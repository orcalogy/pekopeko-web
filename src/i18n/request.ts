import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { type AppLocale, detectPreferredLocale, isAppLocale } from '@/lib/app-locale';

export { type AppLocale, defaultLocale, locales } from '@/lib/app-locale';

export async function resolveRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;

  if (cookieLocale && isAppLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return detectPreferredLocale(headerStore.get('accept-language'));
}

export default getRequestConfig(async () => {
  const locale = await resolveRequestLocale();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
