'use client';

import { Box } from '@mantine/core';
import { usePreferences } from '@/stores/preferences';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const locale = usePreferences((s) => s.locale);

  return (
    <Box>
      <Box pb={70}>{children}</Box>
      <BottomNav locale={locale} />
    </Box>
  );
}
