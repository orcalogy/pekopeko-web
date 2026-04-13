'use client';

import { Chip, Group } from '@mantine/core';
import { moods } from '@/data/moods';
import type { Locale, Mood } from '@/types/food';

interface MoodSelectorProps {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
  locale: Locale;
}

export function MoodSelector({ value, onChange, locale }: MoodSelectorProps) {
  return (
    <Group gap="xs" justify="center">
      {moods.map((mood) => (
        <Chip
          key={mood.id}
          checked={value === mood.id}
          onChange={() => onChange(value === mood.id ? null : mood.id)}
          color={mood.color}
          variant="outline"
          size="sm"
          radius="xl"
        >
          {mood.emoji} {mood.label[locale]}
        </Chip>
      ))}
    </Group>
  );
}
