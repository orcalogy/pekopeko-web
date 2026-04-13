import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/layout/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: '今天吃什么 - pekopeko',
  description: '帮你解决每天吃什么的选择困难 - 随机转盘选美食，支持自己做和出去吃',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'pekopeko',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FF6B35',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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
