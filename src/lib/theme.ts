import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'orange',
  colors: {
    orange: [
      '#fff4e6',
      '#ffe8cc',
      '#ffd8a8',
      '#ffc078',
      '#ffa94d',
      '#FF6B35',
      '#f76707',
      '#e8590c',
      '#d9480f',
      '#bf4000',
    ],
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "Noto Sans JP", sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "Noto Sans JP", sans-serif',
  },
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
});
