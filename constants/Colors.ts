/**
 * MediStock BD Color Scheme
 * Modern healthcare-focused colors with light and dark theme support
 */

import { Theme } from './Theme';

const tintColorLight = Theme.colors.primary;
const tintColorDark = Theme.colors.primaryLight;

export const Colors = {
  light: {
    text: Theme.colors.text,
    background: Theme.colors.background,
    tint: tintColorLight,
    icon: Theme.colors.textSecondary,
    tabIconDefault: Theme.colors.textTertiary,
    tabIconSelected: tintColorLight,
    surface: Theme.colors.surface,
    border: Theme.colors.border,
    primary: Theme.colors.primary,
    secondary: Theme.colors.secondary,
    success: Theme.colors.success,
    error: Theme.colors.error,
    warning: Theme.colors.warning,
  },
  dark: {
    text: Theme.colors.dark.text,
    background: Theme.colors.dark.background,
    tint: tintColorDark,
    icon: Theme.colors.dark.textSecondary,
    tabIconDefault: Theme.colors.textTertiary,
    tabIconSelected: tintColorDark,
    surface: Theme.colors.dark.surface,
    border: Theme.colors.dark.border,
    primary: Theme.colors.primary,
    secondary: Theme.colors.secondary,
    success: Theme.colors.success,
    error: Theme.colors.error,
    warning: Theme.colors.warning,
  },
};
