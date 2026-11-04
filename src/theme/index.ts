/**
 * Shared design tokens. Change values here and every screen updates.
 *
 * Palette, type and shape are inspired by a bold, playful "wrapped" style:
 * saturated flat backgrounds, chunky geometric type, pill-shaped controls.
 */

export const colors = {
  // Brand
  primary: '#4B3FE4', // electric indigo
  primaryDark: '#3A2FC4',
  primarySoft: '#6F64F0', // lighter indigo for pills on indigo backgrounds
  secondary: '#3DB55A', // grass green
  secondarySoft: '#7CCF6B',
  accent: '#FFD23F', // sunshine yellow
  coral: '#F25C54',
  purple: '#7B5CF0',
  sky: '#4FA3F7',

  // Neutrals
  ink: '#16124A', // deep navy, used for text and dark buttons
  inkMuted: '#5D5A80',
  white: '#FFFFFF',
  background: '#F4F2FF', // pale lilac app background
  surface: '#FFFFFF',
  border: '#E4E0FA',
  overlayLight: 'rgba(255,255,255,0.22)', // translucent pills on colored bg
  overlayLighter: 'rgba(255,255,255,0.14)',
  overlayDark: 'rgba(22,18,74,0.10)', // translucent pills on light bg
  textOnColor: '#FFFFFF',
  textOnColorMuted: 'rgba(255,255,255,0.85)',
} as const;

/** Background colors a recipe card/detail screen can use. */
export const recipeColors = {
  indigo: colors.primary,
  green: colors.secondary,
  yellow: colors.accent,
  coral: colors.coral,
  purple: colors.purple,
  sky: colors.sky,
} as const;
export type RecipeColor = keyof typeof recipeColors;

/** Text color that stays readable on each recipe color. */
export const onRecipeColor: Record<RecipeColor, string> = {
  indigo: colors.white,
  green: colors.white,
  yellow: colors.ink,
  coral: colors.white,
  purple: colors.white,
  sky: colors.white,
};

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 40,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#16124A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  button: {
    shadowColor: '#16124A',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

const theme = { colors, recipeColors, onRecipeColor, fonts, fontSizes, spacing, radius, shadow };
export default theme;
