'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';
import { type AppLocale, detectPreferredLocale, getAppWindowTitle } from '@/lib/app-locale';
import { theme } from '@/lib/theme';
import { usePreferences } from '@/stores/preferences';

const PREFERENCES_STORAGE_KEY = 'pekopeko-preferences';

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(usePreferences.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = usePreferences.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    setHydrated(usePreferences.persist.hasHydrated());

    return unsubscribe;
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-center" />
      <BrowserLocaleSync hydrated={hydrated} />
      {children}
    </MantineProvider>
  );
}

function BrowserLocaleSync({ hydrated }: { hydrated: boolean }) {
  const locale = usePreferences((state) => state.locale);
  const setLocale = usePreferences((state) => state.setLocale);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;

    let nextLocale = locale;

    if (!initializedRef.current) {
      initializedRef.current = true;

      if (!hasStoredLocalePreference()) {
        nextLocale = getBrowserLocale();

        if (nextLocale !== locale) {
          setLocale(nextLocale);
          return;
        }
      }
    }

    document.documentElement.lang = nextLocale;
    document.title = getAppWindowTitle(nextLocale);
    void syncLocaleCookie(nextLocale);
  }, [hydrated, locale, setLocale]);

  return null;
}

function hasStoredLocalePreference(): boolean {
  try {
    return window.localStorage.getItem(PREFERENCES_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

function getBrowserLocale(): AppLocale {
  const navigatorLocales =
    navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language, document.documentElement.lang].filter(Boolean);

  return detectPreferredLocale(navigatorLocales);
}

async function syncLocaleCookie(locale: AppLocale) {
  if (!('cookieStore' in window)) return;

  await (
    window as unknown as {
      cookieStore: { set: (opts: Record<string, unknown>) => Promise<void> };
    }
  ).cookieStore.set({
    name: 'locale',
    value: locale,
    path: '/',
    maxAge: 31536000,
  });
}
