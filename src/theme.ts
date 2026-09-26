import { DarkTheme, type Theme } from 'expo-router';

// The app is dark-only (app.json sets userInterfaceStyle: "dark").
export const colors = {
  background: '#09090b',
  card: '#18181b',
  cardRaised: '#202024',
  border: '#27272a',
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  accent: '#3b82f6',
  up: '#22c55e',
  down: '#ef4444',
  white: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

export function changeColor(change: number | null | undefined): string {
  if (change == null || change === 0) return colors.textSecondary;
  return change > 0 ? colors.up : colors.down;
}
