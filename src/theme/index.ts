/**
 * The single source of design tokens for the app: "Market Garden".
 *
 * Look: fresh herbs on a pantry shelf. A fresh green-tinted white page, white cards with a subtle
 * border and a soft shadow, pine-ink text, big food photography, and three colors with one job each:
 *   basil   = the main action and the selected tab (one filled basil button per screen)
 *   saffron = highlights: rewards, timers, "tonight"
 *   chili   = favorites (hearts) and warnings only
 * Buttons are flat pills that shrink a little when pressed. Cook Mode has its own dark palette.
 *
 * - Colors: every token has a light and a dark value. Light is the default; dark is a choice
 *   (see `setAppearance`).
 * - Type: Fraunces (a warm serif) for titles and recipe names, Manrope for everything else.
 *   Each weight is its own font file, so use the `fonts` names instead of `fontWeight`.
 * - Spacing, radius, tap targets and motion live here too.
 *
 * Read tokens in components with `const t = useTheme()`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

// Brand palette (Market Garden)
export const brand = {
  linen: '#F5F7F3',
  ink: '#142019',
  basil: '#1F5C3E',
  saffron: '#F4B42A',
  chili: '#E2553A',
  sage: '#E9EEE7',
  night: '#0F1712',
  /** Older names, kept so code that still uses them keeps working. */
  cream: '#F5F7F3',
  cocoa: '#142019',
  tomato: '#1F5C3E',
  green: '#1F5C3E',
  yellow: '#F4B42A',
  plum: '#4F6B7A',
  berry: '#E2553A',
} as const;

const light = {
  /* Primary (basil): the one main action */
  tint: brand.basil, // basil as text and icons (8:1 on white)
  tintFill: brand.basil, // the main button (white text 8:1)
  tintDeep: '#174730', // pressed
  tintSoft: '#E3EFE7', // quiet basil backgrounds: selected rows, soft icon circles
  onTint: '#FFFFFF',
  /* Success and progress */
  success: '#2E7D55', // white text on it passes AA (5:1)
  successDeep: brand.basil,
  successSoft: '#E3EFE7',
  successText: '#1F6B45',
  /* Highlights and rewards (saffron) */
  reward: brand.saffron,
  rewardDeep: '#D99A12',
  rewardSoft: '#FCF0D2',
  rewardText: '#7A5300',
  onReward: brand.ink,
  /* Information: a calm slate, used sparingly */
  info: '#4F6B7A',
  infoDeep: '#3B5361',
  infoSoft: '#E6EEF1',
  infoText: '#3F5A68',
  warning: '#D99A12',
  /** Favorites (hearts). */
  accent: brand.chili,
  highlight: '#4F6B7A',
  destructive: '#C2412A', // 5:1 on white
  // Nutrition: three calm colors that are easy to tell apart.
  protein: '#D9694F',
  carbs: '#E3A93A',
  fat: '#5E9C7E',

  label: brand.ink,
  secondaryLabel: '#53625A', // 6:1 on the page
  tertiaryLabel: '#66756C', // placeholders and quiet icons (4.6:1)

  background: brand.linen,
  groupedBackground: brand.linen,
  cell: '#FFFFFF',
  elevated: '#FFFFFF',
  fill: '#EEF2EC', // quiet filled areas: inputs, tracks
  fillStrong: '#E2E9E0',
  separator: '#E6ECE4',
  border: '#E1E8DF', // the subtle edge of cards
  lip: '#DCE4DA', // older name: the soft edge under small controls
  imagePlaceholder: brand.sage,
  scrim: 'rgba(15,23,18,0.45)',
  shadow: '#142019',
  /** Bar behind the clock and battery. */
  bar: 'rgba(245,247,243,0.92)',
};

type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  tint: '#7ED1A2',
  tintFill: '#2E7D55', // white text on it passes AA
  tintDeep: '#246445',
  tintSoft: '#1E3328',
  onTint: '#FFFFFF',
  success: '#2E7D55',
  successDeep: '#246445',
  successSoft: '#1E3328',
  successText: '#7ED1A2',
  reward: brand.saffron,
  rewardDeep: '#C98E14',
  rewardSoft: '#3A3018',
  rewardText: '#F7C95E',
  onReward: brand.ink,
  info: '#8FB0C0',
  infoDeep: '#5E7F8F',
  infoSoft: '#1F2C33',
  infoText: '#A9C6D4',
  warning: brand.saffron,
  accent: '#F07A60',
  highlight: '#A9C6D4',
  destructive: '#F07A60',
  protein: '#E88A74',
  carbs: '#EDBE5E',
  fat: '#7FBF9E',

  label: '#EEF3EC',
  secondaryLabel: '#A8B9AE',
  tertiaryLabel: '#8FA297',

  background: brand.night,
  groupedBackground: brand.night,
  cell: '#18231C',
  elevated: '#1F2C24',
  fill: '#1C2821',
  fillStrong: '#26342B',
  separator: '#26342B',
  border: '#2A3830',
  lip: '#0A100C',
  imagePlaceholder: '#1F2C24',
  scrim: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  bar: 'rgba(15,23,18,0.92)',
};

/**
 * Cook Mode's own dark kitchen palette, used in both light and dark mode so the cooking screen is
 * calm and readable from across the counter.
 */
export const cook = {
  background: brand.night,
  card: '#18231C',
  cardStrong: '#22302A',
  label: '#EEF3EC',
  secondaryLabel: '#A8B9AE',
  track: '#2A3830',
  done: '#6CC293',
  accent: brand.saffron,
  onAccent: brand.ink,
} as const;

/**
 * Font families, loaded in the root layout. Each weight is a separate file, so pick the family
 * here and leave `fontWeight` as 'normal'.
 */
export const fonts = {
  /** Fraunces: titles, recipe names, Cook Mode steps. */
  serif: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  serifMedium: 'Fraunces_500Medium',
  /** Manrope: everything else. */
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  /** Older names: the emphasis face for labels, chips and buttons. */
  display: 'Manrope_700Bold',
  displayBold: 'Fraunces_700Bold',
  displayMedium: 'Manrope_600SemiBold',
  rounded: 'Manrope_700Bold',
};

const face = (fontSize: number, lineHeight: number, fontFamily: string, letterSpacing = 0): TextStyle => ({
  fontSize,
  lineHeight,
  fontFamily,
  fontWeight: 'normal',
  letterSpacing,
});
/** Titles: on the web they wrap into lines of similar length, so no word is left alone. */
const title = (fontSize: number, lineHeight: number, family: string = fonts.serif, letterSpacing = -0.3): TextStyle => ({
  ...face(fontSize, lineHeight, family, letterSpacing),
  ...(Platform.OS === 'web' ? ({ textWrap: 'balance' } as object) : null),
});

/**
 * Stops a single word from sitting alone on the last line. Spread both onto a <Text>:
 *   <Text style={[..., t.noWidows.style]} {...t.noWidows.props}>
 */
export const noWidows = {
  style: (Platform.OS === 'web' ? { textWrap: 'pretty' } : {}) as TextStyle,
  props: { lineBreakStrategyIOS: 'push-out', textBreakStrategy: 'balanced' } as const,
};
export const type = {
  largeTitle: title(34, 40, fonts.serif, -0.8),
  title1: title(28, 34, fonts.serif, -0.6),
  title2: title(22, 28, fonts.serif, -0.3),
  title3: title(19, 25, fonts.serif, -0.2),
  /** Card titles and row labels. */
  headline: face(17, 23, fonts.bold, -0.1),
  /** Button labels. */
  button: face(17, 22, fonts.bold, -0.1),
  body: face(17, 25, fonts.regular),
  callout: face(16, 22, fonts.regular),
  subhead: face(15, 20, fonts.medium),
  footnote: face(13, 18, fonts.medium),
  caption1: face(12, 16, fonts.semibold),
  caption2: face(11, 13, fonts.semibold),
} as const satisfies Record<string, TextStyle>;

/** An 8pt grid (4 and 12 are the only half steps). */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 16, // kept for older code; same as md
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** One set of numbers for every screen and card, so the whole app lines up. */
export const layout = {
  /** Left and right margin of every screen. */
  screen: 16,
  /** Space between cards and between sections. */
  gap: 16,
  section: 28,
  /** Inside every card. */
  cardPadding: 16,
  cardRadius: 22,
  /** Bottom padding of scrolling screens (the floating tab bar adds its own height). */
  bottom: 32,
} as const;

/** Use with `borderCurve: 'continuous'` for Apple-style squircle corners. */
export const radius = {
  xs: 8,
  sm: 14,
  md: 18, // inputs, rows, small cards
  lg: 22, // cards and photos
  xl: 28, // sheets and big cards
  pill: 999, // buttons, chips, search
} as const;

/** Apple's minimum tap target. */
export const hitTarget = 44;

export const motion = {
  /** Press feedback: buttons and cards shrink a little. */
  pressScale: 0.97,
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  release: { damping: 14, stiffness: 380, mass: 0.6 },
  /** Bouncy confirmation, e.g. checkmarks. */
  pop: { damping: 12, stiffness: 320, mass: 0.7 },
  /** Things sliding or settling into place. */
  settle: { damping: 16, stiffness: 180, mass: 0.9 },
  toastDuration: 2600,
} as const;

/** Older name: buttons used to sit on a lip. Kept at 0 so nothing moves down when pressed. */
export const depth = { button: 0, small: 0, card: 0 } as const;

function makeTheme(c: Palette, isDark: boolean) {
  /** A soft, layered shadow: cards look lifted off the page without looking heavy. */
  const soft = (strength = 1): ViewStyle =>
    isDark
      ? { shadowColor: '#000', shadowOpacity: 0.35 * strength, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }
      : { shadowColor: c.shadow, shadowOpacity: 0.07 * strength, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 };
  /** Face and border colors for each kind of button (see <Button>). Flat pills. */
  const buttons = {
    primary: { face: c.tintFill, lip: c.tintDeep, label: c.onTint, border: undefined },
    success: { face: c.success, lip: c.successDeep, label: '#FFFFFF', border: undefined },
    reward: { face: c.reward, lip: c.rewardDeep, label: c.onReward, border: undefined },
    info: { face: c.info, lip: c.infoDeep, label: '#FFFFFF', border: undefined },
    /** The quiet button: white with a subtle outline. Use for every action that isn't the main one. */
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
    layout,
    noWidows,
    buttons,
    /** Card and control surfaces. ("chunky" is the older name; the look is now border + soft shadow.) */
    chunky: {
      lip: soft(0.6),
      /** White card: a subtle border and a soft shadow. */
      card: { borderWidth: 1, borderColor: c.border, ...soft() } as ViewStyle,
      /** A soft shadow under a filled shape. */
      button: (_color?: string): ViewStyle => soft(0.8),
    },
    shadow: {
      card: soft(),
      floating: isDark
        ? { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 }
        : { shadowColor: c.shadow, shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
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
    background: brand.linen,
    card: '#FFFFFF',
    label: brand.ink,
    secondaryLabel: '#53625A',
    accent: brand.basil,
    track: '#E2E9E0',
    alarm: '#C2412A',
    border: '#E1E8DF',
  },
  dark: {
    background: brand.night,
    card: '#18231C',
    label: '#EEF3EC',
    secondaryLabel: '#A8B9AE',
    accent: brand.saffron,
    track: '#2A3830',
    alarm: '#F07A60',
    border: '#2A3830',
  },
  /** The Dynamic Island is always black, so it uses the bright accent in both modes. */
  island: { accent: brand.saffron, label: '#EEF3EC', secondaryLabel: '#A8B9AE', alarm: '#F07A60' },
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
