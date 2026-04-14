'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type AppLocale, detectPreferredLocale, getAppWindowTitle } from '@/lib/app-locale';
import {
  isLlmFeatureAvailable,
  isSemanticSearchEnabled,
  normalizeConfiguredLlmModel,
} from '@/lib/llm/availability';
import { detectLlmSupport, refreshLlmModelCacheStatus, shutdownLlmEngine } from '@/lib/llm/engine';
import { theme } from '@/lib/theme';
import { useLlmStore } from '@/stores/llm';
import { usePreferences } from '@/stores/preferences';

const PREFERENCES_STORAGE_KEY = 'pekopeko-preferences';

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = usePreferences.persist;

    if (!persistApi) {
      setHydrated(true);
      return;
    }

    const unsubscribe = persistApi.onFinishHydration(() => {
      setHydrated(true);
    });

    setHydrated(persistApi.hasHydrated());

    return unsubscribe;
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-center" />
      <BrowserLocaleSync hydrated={hydrated} />
      <LlmRuntimeController hydrated={hydrated} />
      {children}
    </MantineProvider>
  );
}

function LlmRuntimeController({ hydrated }: { hydrated: boolean }) {
  const pathname = usePathname();
  const llmEnabled = usePreferences((state) => state.llmEnabled);
  const llmModel = usePreferences((state) => state.llmModel);
  const setAvailability = useLlmStore((state) => state.setAvailability);
  const setRuntimeDisabled = useLlmStore((state) => state.setRuntimeDisabled);
  const restoreSession = useLlmStore((state) => state.restoreSession);

  useEffect(() => {
    if (!hydrated) return;

    if (!isLlmFeatureAvailable()) {
      setAvailability('flag-disabled', 'LLM feature flag is turned off.');
      setRuntimeDisabled();
      return;
    }

    if (!llmEnabled && pathname !== '/settings') {
      return;
    }

    let cancelled = false;

    setAvailability('checking-support', 'Checking WebGPU support…');

    void detectLlmSupport()
      .then((result) => {
        if (cancelled) return;

        setAvailability(result.supported ? 'supported' : 'unsupported', result.message);
        if (!result.supported) {
          setRuntimeDisabled();
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setAvailability(
          'unsupported',
          error instanceof Error ? error.message : 'Failed to check WebGPU support.',
        );
        setRuntimeDisabled();
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, llmEnabled, pathname, setAvailability, setRuntimeDisabled]);

  useEffect(() => {
    if (!hydrated) return;

    if (!isSemanticSearchEnabled(llmEnabled)) {
      setRuntimeDisabled();
      void shutdownLlmEngine();
      return;
    }

    restoreSession();
    void refreshLlmModelCacheStatus(normalizeConfiguredLlmModel(llmModel)).catch(() => {
      // Cache visibility is best effort and should not block semantic search.
    });
  }, [hydrated, llmEnabled, llmModel, restoreSession, setRuntimeDisabled]);

  return null;
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
