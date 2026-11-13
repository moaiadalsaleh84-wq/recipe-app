/**
 * The single source of design tokens for the app.
 *
 * Look: a cozy kitchen. Warm cream and caramel, cocoa-brown text, terracotta
 * buttons and sage-green success, with chunky outlined cards and buttons that
 * sit on a solid "lip" like a game UI, but laid out the iOS way.
 *
 * - Colors: every token has a light and a dark (night kitchen) value.
 * - Type: Apple's text styles. Headings use SF Pro Rounded ('ui-rounded'), body uses SF Pro.
 * - Spacing, radius, tap targets and motion follow iOS conventions.
 *
 * Read tokens in components with `const t = useTheme()`.
 */
import { Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

// Brand palette
export const brand = {
  cream: '#FFF6E9',
  caramel: '#E9A93A',
  terracotta: '#C25A30',
  sage: '#6E9A5C',
  cocoa: '#4A2E1F',
  berry: '#E0605A',
  lavender: '#7B6CD9',
} as const;

const light = {
  tint: '#B5512C', // links, icons, text buttons (4.7:1 on cream)
  tintFill: brand.terracotta, // filled buttons and selected chips, behind white text
  tintDeep: '#8E3E1F', // the solid lip under filled buttons
  tintSoft: 'rgba(194,90,48,0.13)', // tinted buttons, tags
  onTint: '#FFFFFF',
  success: brand.sage,
  successSoft: 'rgba(110,154,92,0.16)',
  warning: brand.caramel,
  accent: brand.berry, // favorites
  highlight: brand.lavender,
  destructive: '#D9423A',
  // Macro colors
  protein: brand.terracotta,
  carbs: brand.caramel,
  fat: brand.sage,

  label: brand.cocoa,
  secondaryLabel: 'rgba(74,46,31,0.68)',
  tertiaryLabel: 'rgba(74,46,31,0.38)',

  background: brand.cream,
  groupedBackground: '#FBEEDC',
  cell: '#FFFDF8',
  elevated: '#FFFDF8',
  fill: 'rgba(150,95,50,0.10)',
  fillStrong: 'rgba(150,95,50,0.18)',
  separator: 'rgba(120,75,40,0.16)',
  border: 'rgba(110,62,30,0.22)', // chunky card outlines
  lip: 'rgba(110,62,30,0.16)', // solid bottom edge under cards
  imagePlaceholder: '#F3E3CC',
  scrim: 'rgba(40,20,5,0.30)',
  shadow: '#6B3A1F',
};

type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  tint: '#F0905F',
  tintFill: '#B5512C',
  tintDeep: '#6E2E14',
  tintSoft: 'rgba(240,144,95,0.18)',
  onTint: '#FFFFFF',
  success: '#8DB97A',
  successSoft: 'rgba(141,185,122,0.20)',
  warning: '#F2C14E',
  accent: '#FF7A72',
  highlight: '#A08BFF',
  destructive: '#FF5A4F',
  protein: '#F0905F',
  carbs: '#F2C14E',
  fat: '#8DB97A',

  label: '#FFF1E0',
  secondaryLabel: 'rgba(255,241,224,0.66)',
  tertiaryLabel: 'rgba(255,241,224,0.34)',

  background: '#1E1611',
  groupedBackground: '#18110D',
  cell: '#2A2019',
  elevated: '#342820',
  fill: 'rgba(255,214,170,0.10)',
  fillStrong: 'rgba(255,214,170,0.18)',
  separator: 'rgba(255,214,170,0.14)',
  border: 'rgba(255,214,170,0.18)',
  lip: 'rgba(0,0,0,0.55)',
  imagePlaceholder: '#2A2019',
  scrim: 'rgba(0,0,0,0.40)',
  shadow: '#000000',
};

/** SF Pro Rounded on iOS; best available rounded face elsewhere. */
export const fonts = {
  rounded: Platform.select({
    ios: 'ui-rounded',
    web: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif',
    default: undefined,
  }),
};

/** Apple HIG text styles (default "Large" Dynamic Type size). Headings are rounded. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '800', fontFamily: fonts.rounded },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '800', fontFamily: fonts.rounded },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', fontFamily: fonts.rounded },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '700', fontFamily: fonts.rounded },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '700', fontFamily: fonts.rounded },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16, // standard iOS screen margin
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Use with `borderCurve: 'continuous'` for Apple-style squircle corners. */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14, // rows, inputs, buttons
  lg: 18, // images and cards
  xl: 24, // sheets, big cards
  pill: 999,
} as const;

/** Apple's minimum tap target. */
export const hitTarget = 44;

export const motion = {
  /** Press-down feedback on cards and buttons. */
  pressScale: 0.96,
  press: { damping: 18, stiffness: 380, mass: 0.6 },
  /** Bouncy confirmation, e.g. checkmarks. */
  pop: { damping: 12, stiffness: 320, mass: 0.7 },
  toastDuration: 2600,
} as const;

function makeTheme(c: Palette, isDark: boolean) {
  /** Solid bottom edge: the "chunky" game-like look. */
  const lip = (color: string = c.lip, height = 3): ViewStyle => ({
    shadowColor: color,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height },
    elevation: 0,
  });
  return {
    isDark,
    colors: c,
    fonts,
    type,
    spacing,
    radius,
    hitTarget,
    motion,
    chunky: {
      lip: lip(),
      /** Outlined card with a lip. */
      card: { borderWidth: 2, borderColor: c.border, ...lip() } as ViewStyle,
      /** Filled button with a darker lip underneath. */
      button: (color: string = c.tintDeep): ViewStyle => lip(color, 4),
    },
    shadow: {
      card: isDark ? {} : { shadowColor: c.shadow, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      floating: {
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.5 : 0.16,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
    },
  };
}

/**
 * Lock screen and Dynamic Island timer (Live Activity). The Live Activity runs in a separate
 * iOS extension that can't import this file, so the app sends these values along with each timer.
 * Plain hex colors only: the extension draws them with SwiftUI.
 */
export const liveActivity = {
  light: {
    background: brand.cream,
    card: '#FFFDF8',
    label: brand.cocoa,
    secondaryLabel: '#8A6A57',
    accent: brand.terracotta,
    track: '#F1DFC8',
    alarm: '#D9423A',
    border: '#E7CFB3',
  },
  dark: {
    background: '#1E1611',
    card: '#2A2019',
    label: '#FFF1E0',
    secondaryLabel: '#D9BFA6',
    accent: '#F0905F',
    track: '#3A2C22',
    alarm: '#FF5A4F',
    border: '#4A372A',
  },
  /** The Dynamic Island is always black, so it uses the dark accent in both modes. */
  island: { accent: '#F0905F', label: '#FFF1E0', secondaryLabel: '#D9BFA6', alarm: '#FF5A4F' },
  /** The cat looks worried for this long before the timer ends. */
  worriedSeconds: 10,
} as const;

export type LiveActivityPalette = typeof liveActivity;

export const lightTheme = makeTheme(light, false);
export const darkTheme = makeTheme(dark, true);
export type Theme = typeof lightTheme;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
