'use client';

import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import type { KeyboardEvent } from 'react';

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description?: string;
  submitLabel?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  loading?: boolean;
  submitDisabled?: boolean;
  inputTestId?: string;
  submitTestId?: string;
}

export function SmartSearchInput({
  value,
  onChange,
  placeholder,
  description,
  submitLabel,
  onSubmit,
  disabled = false,
  loading = false,
  submitDisabled = false,
  inputTestId,
  submitTestId,
}: SmartSearchInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !onSubmit || submitDisabled) {
      return;
    }

    event.preventDefault();
    onSubmit();
  };

  return (
    <Stack gap={6}>
      <Group align="stretch" gap="xs" wrap="nowrap">
        <TextInput
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          radius="xl"
          size="md"
          style={{ flex: 1, minWidth: 0 }}
          data-testid={inputTestId}
        />
        {onSubmit && submitLabel ? (
          <Button
            onClick={onSubmit}
            disabled={submitDisabled}
            loading={loading}
            radius="xl"
            size="md"
            color="orange"
            variant="filled"
            style={{ flexShrink: 0 }}
            data-testid={submitTestId}
          >
            {submitLabel}
          </Button>
        ) : null}
      </Group>
      {description ? (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}
