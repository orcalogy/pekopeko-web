import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/layout/Providers';
import { resolveRequestLocale } from '@/i18n/request';
import { getAppDescription, getAppName, getAppWindowTitle } from '@/lib/app-locale';
import './globals.css';

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>
          <div className="app-container">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
