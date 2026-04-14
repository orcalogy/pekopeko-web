import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Providers } from '@/components/layout/Providers';
import { resolveRequestLocale } from '@/i18n/request';
import { getAppDescription, getAppName, getAppWindowTitle } from '@/lib/app-locale';
import './globals.css';

const MANTINE_COLOR_SCHEME_SCRIPT = `try {
  var _colorScheme = window.localStorage.getItem("mantine-color-scheme-value");
  var colorScheme = _colorScheme === "light" || _colorScheme === "dark" || _colorScheme === "auto" ? _colorScheme : "auto";
  var computedColorScheme = colorScheme !== "auto" ? colorScheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
} catch (e) {}
`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();

  return {
    title: getAppWindowTitle(locale),
    description: getAppDescription(locale),
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: getAppName(locale),
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FF6B35',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning data-mantine-color-scheme="light">
      <head>
        <Script id="mantine-color-scheme" strategy="beforeInteractive">
          {MANTINE_COLOR_SCHEME_SCRIPT}
        </Script>
      </head>
      <body>
        <Providers>
          <div className="app-container">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
