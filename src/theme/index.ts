/**
 * The single source of design tokens for the app.
 *
 * Look: a bright, playful kitchen. Warm cream page, white cards, dark brown text, and four
 * colors that each have one job:
 *   tomato  = the main action on a screen (only ONE filled tomato button per screen)
 *   green   = success and progress
 *   yellow  = rewards (streaks, badges, levels)
 *   blue    = information
 * Buttons are thick and rounded and sit on a darker "lip" that presses down when tapped.
 *
 * - Colors: every token has a light and a dark value. Light is the default; dark is a choice
 *   (see `setAppearance`).
 * - Type: Fredoka (round, chunky) for titles and buttons, the system font for reading text.
 * - Spacing, radius, tap targets and motion live here too.
 *
 * Read tokens in components with `const t = useTheme()`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

// Brand palette
export const brand = {
  cream: '#FFF8EE',
  cocoa: '#3D2314',
  tomato: '#F2431F',
  green: '#1F9A45',
  yellow: '#FFC933',
  blue: '#1E88E5',
  berry: '#F0546B',
} as const;

const light = {
  /* Primary (tomato): the one main action */
  tint: '#C9330F', // tomato as text and icons (5:1 on cream)
  tintFill: brand.tomato, // the primary button's face, behind white text
  tintDeep: '#B92C0E', // the lip under the primary button
  tintSoft: '#FFE6DC', // quiet tomato background: secondary buttons, selected tab
  onTint: '#FFFFFF',
  /* Success and progress (green) */
  success: brand.green,
  successDeep: '#14702F',
  successSoft: '#DDF4E3',
  successText: '#1B7F3A',
  /* Rewards (yellow) */
  reward: brand.yellow,
  rewardDeep: '#E0A100',
  rewardSoft: '#FFF2C7',
  rewardText: '#8A5A00',
  onReward: brand.cocoa,
  /* Information (blue) */
  info: brand.blue,
  infoDeep: '#1565B0',
  infoSoft: '#DDEEFC',
  infoText: '#1769B8',
  /* Older names, kept so screens keep working */
  warning: '#E0A100',
  accent: brand.berry, // favorites (hearts)
  highlight: brand.blue,
  destructive: '#E5342B',
  // Macro colors
  protein: brand.tomato,
  carbs: '#E0A100',
  fat: brand.green,

  label: brand.cocoa,
  secondaryLabel: '#7A5E4D',
  tertiaryLabel: '#A08A7B',

  background: brand.cream,
  groupedBackground: brand.cream,
  cell: '#FFFFFF',
  elevated: '#FFFFFF',
  fill: '#F8ECDB', // quiet filled areas: inputs, tracks, neutral buttons
  fillStrong: '#F1E2CC',
  separator: '#F4E7D5',
  border: '#F1E2CC', // the soft edge of cards
  lip: '#EAD7BC', // the bottom edge under cards and neutral buttons
  imagePlaceholder: '#F8ECDB',
  scrim: 'rgba(61,35,20,0.38)',
  shadow: '#6B3A1F',
  /** Bar behind the clock and battery, and the tab bar. */
  bar: 'rgba(255,248,238,0.92)',
};

type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  tint: '#FF8A66',
  tintFill: '#E8451F',
  tintDeep: '#9E2A0C',
  tintSoft: '#4A261B',
  onTint: '#FFFFFF',
  success: '#2DB257',
  successDeep: '#17722F',
  successSoft: '#22402B',
  successText: '#6FD98C',
  reward: '#FFC933',
  rewardDeep: '#B98400',
  rewardSoft: '#4A3A12',
  rewardText: '#FFD666',
  onReward: brand.cocoa,
  info: '#3D9BEF',
  infoDeep: '#1B5E9E',
  infoSoft: '#1F3549',
  infoText: '#7DBEF7',
  warning: '#FFC933',
  accent: '#FF7F92',
  highlight: '#7DBEF7',
  destructive: '#FF6A5E',
  protein: '#FF8A66',
  carbs: '#FFC933',
  fat: '#6FD98C',

  label: '#FFF3E4',
  secondaryLabel: '#C9AE98',
  tertiaryLabel: '#94796A',

  // Warm darks. Cards are clearly lighter than the page.
  background: '#211713',
  groupedBackground: '#211713',
  cell: '#38281F',
  elevated: '#423026',
  fill: '#2E2019',
  fillStrong: '#4A372B',
  separator: '#4A372B',
  border: '#4A372B',
  lip: '#140D0A',
  imagePlaceholder: '#38281F',
  scrim: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  bar: 'rgba(33,23,19,0.92)',
};

/**
 * Font families. Fredoka is loaded in the root layout (see `fontAssets`); until it loads, and for
 * reading text, the system font is used.
 */
export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  displayMedium: 'Fredoka_500Medium',
  /** Old name: the display face. */
  rounded: 'Fredoka_600SemiBold',
};

/**
 * Type scale. Titles and buttons are Fredoka (its weights are separate font files, so
 * `fontWeight` stays 'normal' to stop the system from faking a bolder one).
 */
const display = (fontSize: number, lineHeight: number, family: string = fonts.display): TextStyle => ({ fontSize, lineHeight, fontFamily: family, fontWeight: 'normal' });
export const type = {
  largeTitle: display(34, 40, fonts.displayBold),
  title1: display(28, 34, fonts.displayBold),
  title2: display(23, 28),
  title3: display(20, 25),
  headline: display(18, 23),
  /** Button labels. */
  button: display(18, 22),
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20, // screen margin
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Use with `borderCurve: 'continuous'` for Apple-style squircle corners. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16, // buttons, inputs, rows
  lg: 20, // cards and photos
  xl: 24, // sheets and big cards
  pill: 999,
} as const;

/** Apple's minimum tap target. */
export const hitTarget = 44;

export const motion = {
  /** Press-down feedback on cards. */
  pressScale: 0.97,
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  /** A lip button springing back up after a tap: quick, with a tiny bounce. */
  release: { damping: 11, stiffness: 520, mass: 0.5 },
  /** Bouncy confirmation, e.g. checkmarks. */
  pop: { damping: 12, stiffness: 320, mass: 0.7 },
  /** Things sliding or settling into place. */
  settle: { damping: 16, stiffness: 180, mass: 0.9 },
  toastDuration: 2600,
} as const;

/** How thick the lip under a pressable is. */
export const depth = { button: 5, small: 4, card: 4 } as const;

function makeTheme(c: Palette, isDark: boolean) {
  /** A solid bottom edge drawn as a hard shadow, for things that don't press down. */
  const lip = (color: string = c.lip, height: number = depth.card): ViewStyle => ({
    shadowColor: color,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height },
    elevation: 0,
  });
  /** Face and lip colors for each kind of button (see <Button>). */
  const buttons = {
    primary: { face: c.tintFill, lip: c.tintDeep, label: c.onTint, border: undefined },
    success: { face: c.success, lip: c.successDeep, label: '#FFFFFF', border: undefined },
    reward: { face: c.reward, lip: c.rewardDeep, label: c.onReward, border: undefined },
    info: { face: c.info, lip: c.infoDeep, label: '#FFFFFF', border: undefined },
    /** The quiet button: white with a soft edge. Use for every action that isn't the main one. */
    secondary: { face: c.cell, lip: c.lip, label: c.tint, border: c.border },
  } as const;
  return {
    isDark,
    colors: c,
    fonts,
    type,
    spacing,
    radius,
    hitTarget,
    motion,
    depth,
    buttons,
    chunky: {
      lip: lip(),
      /** White card with a soft edge and a lip. */
      card: { borderWidth: 2, borderColor: c.border, ...lip() } as ViewStyle,
      /** A hard lip under a filled shape that doesn't move. */
      button: (color: string = c.tintDeep): ViewStyle => lip(color, depth.small),
    },
    shadow: {
      card: isDark ? {} : { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      floating: {
        shadowColor: isDark ? '#000' : c.shadow,
        shadowOpacity: isDark ? 0.5 : 0.18,
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
    card: '#FFFFFF',
    label: brand.cocoa,
    secondaryLabel: '#7A5E4D',
    accent: brand.tomato,
    track: '#F6E7D2',
    alarm: '#E5342B',
    border: '#F1E2CC',
  },
  dark: {
    background: '#211713',
    card: '#38281F',
    label: '#FFF3E4',
    secondaryLabel: '#C9AE98',
    accent: '#FF8A66',
    track: '#4A372B',
    alarm: '#FF6A5E',
    border: '#4A372B',
  },
  /** The Dynamic Island is always black, so it uses the dark accent in both modes. */
  island: { accent: '#FF8A66', label: '#FFF3E4', secondaryLabel: '#C9AE98', alarm: '#FF6A5E' },
  /** The cat looks worried for this long before the timer ends. */
  worriedSeconds: 10,
} as const;

export type LiveActivityPalette = typeof liveActivity;

export const lightTheme = makeTheme(light, false);
export const darkTheme = makeTheme(dark, true);
export type Theme = typeof lightTheme;
export type ButtonKind = keyof Theme['buttons'];

/* ------------------------------------------------------------------ */
/* Light or dark                                                        */
/* ------------------------------------------------------------------ */

/** 'light' is the default. 'system' follows the phone's setting. */
export type AppearanceChoice = 'light' | 'dark' | 'system';
const APPEARANCE_KEY = 'pantry-pop-appearance';
let choice: AppearanceChoice = 'light';
const listeners = new Set<() => void>();

function apply(next: AppearanceChoice) {
  choice = next;
  // Native parts (keyboard, system sheets) follow along. Not available on the web.
  if (Platform.OS !== 'web') Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  listeners.forEach((l) => l());
}

export function setAppearance(next: AppearanceChoice) {
  apply(next);
  AsyncStorage.setItem(APPEARANCE_KEY, next).catch(() => {});
}

/** Call once at startup: restores the saved choice. */
export function loadAppearance() {
  apply(choice);
  AsyncStorage.getItem(APPEARANCE_KEY)
    .then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') apply(saved);
    })
    .catch(() => {});
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAppearance(): AppearanceChoice {
  return useSyncExternalStore(subscribe, () => choice, () => choice);
}

export function useTheme(): Theme {
  const picked = useAppearance();
  const system = useColorScheme();
  const isDark = picked === 'system' ? system === 'dark' : picked === 'dark';
  return isDark ? darkTheme : lightTheme;
}
