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
    icon: '\u{1F3B0}',
    label: { 'zh-CN': '首页', ja: 'ホーム', en: 'Home' },
  },
  {
    path: '/settings',
    icon: '\u{2699}\u{FE0F}',
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
        borderTop: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-body)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Group justify="space-around" py="xs" px="md">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <UnstyledButton
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{ flex: 1 }}
            >
              <Stack align="center" gap={2}>
                <Text size="xl">{item.icon}</Text>
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
