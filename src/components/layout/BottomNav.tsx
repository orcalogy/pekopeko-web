'use client';

import { Box, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/types/food';

interface NavItem {
  path: string;
  icon: string;
  label: Record<Locale, string>;
}

const navItems: NavItem[] = [
  {
    path: '/',
    icon: '🎰',
    label: { 'zh-CN': '首页', ja: 'ホーム', en: 'Home' },
  },
  {
    path: '/settings',
    icon: '⚙️',
    label: { 'zh-CN': '设置', ja: '設定', en: 'Settings' },
  },
];

interface BottomNavProps {
  locale: Locale;
}

export function BottomNav({ locale }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 'var(--app-max-width)',
        zIndex: 100,
        padding: '0 8px calc(env(safe-area-inset-bottom) + 8px)',
      }}
    >
      <Group
        justify="space-around"
        py={6}
        px={6}
        className="app-surface"
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          background: 'var(--app-surface-strong)',
          boxShadow: 'var(--app-shadow-sm)',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <UnstyledButton
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                flex: 1,
                borderRadius: 'calc(var(--mantine-radius-md) - 2px)',
                padding: '7px 6px',
                background: isActive ? 'var(--app-surface-muted)' : 'transparent',
                transition: 'background-color 160ms ease',
              }}
            >
              <Stack align="center" gap={2}>
                <Text size="lg">{item.icon}</Text>
                <Text size="xs" fw={isActive ? 700 : 400} c={isActive ? 'orange' : 'dimmed'}>
                  {item.label[locale]}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
}
