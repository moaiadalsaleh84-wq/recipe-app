/**
 * The single source of design tokens for the app.
 *
 * Look: "Aubergine & Saffron". A calm, cookbook-like iPhone app where the food photos lead.
 *   paper      a cool, light page (never cream), with plain white cards on it
 *   aubergine  the one main action on a screen, and links
 *   saffron    rewards (streaks, badges, levels), used sparingly
 *   herb green done and success
 *   berry      favorites
 * Surfaces are flat: no 3D edges, no outlines on cards, shadows only on things that float.
 * Corners get rounder as things get bigger: photos 24, cards 20, buttons 14, chips are pills.
 *
 * - Colors: every token has a light and a dark value (see `setAppearance`).
 * - Type: Bricolage Grotesque (an expressive grotesque, like a food magazine) for titles and
 *   numbers; the system font (SF Pro on iPhone) for everything you read and every button.
 * - Spacing, radius, tap targets and motion live here too.
 *
 * Read tokens in components with `const t = useTheme()`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

// Brand palette
export const brand = {
  paper: '#F3F2F5',
  ink: '#1F1724',
  aubergine: '#5A2D61',
  saffron: '#EDB031',
  herb: '#2E7A4C',
  berry: '#D23F5B',
  slate: '#3F6280',
  /** Older names, kept so screens keep working. */
  cream: '#F3F2F5',
  cocoa: '#1F1724',
  tomato: '#5A2D61',
  green: '#2E7A4C',
  yellow: '#EDB031',
  plum: '#3F6280',
} as const;

const light = {
  /* Primary (aubergine): the one main action */
  tint: brand.aubergine, // text and icons (9.5:1 on paper)
  tintFill: brand.aubergine, // the primary button (white text 10.6:1)
  tintDeep: '#3F1F44',
  tintSoft: '#EEE6F0', // quiet aubergine: secondary buttons, selected tab
  onTint: '#FFFFFF',
  /* Success and progress (herb green) */
  success: brand.herb, // white text on it 5.2:1
  successDeep: '#205836',
  successSoft: '#E1F0E6',
  successText: '#256B40',
  /* Rewards (saffron) */
  reward: brand.saffron,
  rewardDeep: '#C98E14',
  rewardSoft: '#FBF0D4',
  rewardText: '#7A5200',
  onReward: brand.ink,
  /* Information (slate). Used sparingly. */
  info: brand.slate,
  infoDeep: '#2E4A62',
  infoSoft: '#E4ECF3',
  infoText: '#35587A',
  /* Older names, kept so screens keep working */
  warning: '#C98E14',
  accent: brand.berry, // favorites (hearts)
  highlight: brand.slate,
  destructive: '#C2352B',
  // Nutrition: three calm colors that are easy to tell apart.
  protein: '#C8604E',
  carbs: '#D9A23A',
  fat: '#5F947A',

  label: brand.ink,
  secondaryLabel: '#5E5566',
  tertiaryLabel: '#6C6373', // placeholders and quiet icons (5:1 on paper)

  background: brand.paper,
  groupedBackground: brand.paper,
  cell: '#FFFFFF',
  elevated: '#FFFFFF',
  fill: '#ECEAEF', // quiet filled areas: inputs, tracks, neutral buttons
  fillStrong: '#E2DFE6',
  separator: '#E6E3EA',
  border: '#E6E3EA',
  lip: '#E6E3EA',
  imagePlaceholder: '#ECEAEF',
  scrim: 'rgba(31,23,36,0.4)',
  shadow: '#1F1724',
  /** Bar behind the clock and battery, and the tab bar. */
  bar: 'rgba(243,242,245,0.88)',
};

type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  tint: '#D7AEDC',
  tintFill: '#7B4583', // white text 7:1
  tintDeep: '#5A2D61',
  tintSoft: '#3A2640',
  onTint: '#FFFFFF',
  success: brand.herb,
  successDeep: '#205836',
  successSoft: '#1E3527',
  successText: '#7CCF9A',
  reward: brand.saffron,
  rewardDeep: '#B07C10',
  rewardSoft: '#3D3016',
  rewardText: '#F2C766',
  onReward: brand.ink,
  info: '#8FB0CC',
  infoDeep: brand.slate,
  infoSoft: '#22303C',
  infoText: '#A9C4DA',
  warning: brand.saffron,
  accent: '#F07A90',
  highlight: '#A9C4DA',
  destructive: '#FF6B5E',
  protein: '#E08A78',
  carbs: '#E8BE62',
  fat: '#82B89D',

  label: '#F3EFF5',
  secondaryLabel: '#B3AABA',
  tertiaryLabel: '#A097A8',

  // Cards are clearly lighter than the page.
  background: '#141117',
  groupedBackground: '#141117',
  cell: '#1F1B23',
  elevated: '#29242E',
  fill: '#25202A',
  fillStrong: '#332D39',
  separator: '#332D39',
  border: '#332D39',
  lip: '#0B090D',
  imagePlaceholder: '#25202A',
  scrim: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  bar: 'rgba(20,17,23,0.88)',
};

/**
 * Font families. Bricolage Grotesque is loaded in the root layout; until it loads the system font
 * is used. Reading text and buttons use the system font (SF Pro on iPhone).
 */
export const fonts = {
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_500Medium',
  /** Old name: the display face. */
  rounded: 'BricolageGrotesque_600SemiBold',
};

/**
 * Type scale. Titles use Bricolage (its weights are separate font files, so `fontWeight` stays
 * 'normal' to stop the system from faking a bolder one). Tight tracking on big sizes.
 */
const display = (fontSize: number, lineHeight: number, family: string = fonts.display, letterSpacing = 0): TextStyle => ({
  fontSize,
  lineHeight,
  fontFamily: family,
  fontWeight: 'normal',
  letterSpacing,
  // On the web, titles wrap into lines of similar length, so no word is left alone.
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
  largeTitle: display(34, 40, fonts.displayHeavy, -0.8),
  title1: display(28, 33, fonts.displayBold, -0.5),
  title2: display(22, 27, fonts.displayBold, -0.3),
  title3: display(19, 24, fonts.display, -0.2),
  headline: display(17, 22, fonts.display, -0.1),
  /** Button labels: the system font, semibold, like native iPhone buttons. */
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400', letterSpacing: -0.15 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.1 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '500' },
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
  section: 24,
  /** Inside every card. */
  cardPadding: 16,
  cardRadius: 20,
  photoRadius: 24,
  /** Bottom padding of scrolling screens (room for Biscuit, who sits on the tab bar). */
  bottom: 56,
} as const;

/** Use with `borderCurve: 'continuous'` for Apple-style squircle corners. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 14, // buttons and inputs
  lg: 20, // cards
  xl: 24, // photos and sheets
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

/** The old 3D edge under buttons and cards. The design is flat now: no edge. */
export const depth = { button: 0, small: 0, card: 0 } as const;

function makeTheme(c: Palette, isDark: boolean) {
  /** Face and label colors for each kind of button (see <Button>). Flat: no edges. */
  const buttons = {
    primary: { face: c.tintFill, lip: c.tintFill, label: c.onTint, border: undefined },
    success: { face: c.success, lip: c.success, label: '#FFFFFF', border: undefined },
    reward: { face: c.reward, lip: c.reward, label: c.onReward, border: undefined },
    info: { face: c.info, lip: c.info, label: '#FFFFFF', border: undefined },
    /** The quiet button: a soft aubergine wash. Use for every action that isn't the main one. */
    secondary: { face: c.tintSoft, lip: c.tintSoft, label: c.tint, border: undefined },
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
    /** Kept under the old name so screens keep working: everything is flat now. */
    chunky: {
      lip: {} as ViewStyle,
      /** A plain white card on the paper page: no outline, no edge. */
      card: {} as ViewStyle,
      button: (_color?: string): ViewStyle => ({}),
    },
    shadow: {
      card: isDark ? {} : { shadowColor: c.shadow, shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
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

/**
 * Biscuit, the mascot. Flat colors, one shade tone and one highlight; nothing else.
 * The same palette is used in light and dark mode so Biscuit always looks like Biscuit.
 */
export const biscuit = {
  /** The one outline color (aubergine-ink): the outer silhouette, and thinner inner lines (60%). */
  outline: '#3B2440',
  /** Golden dough. */
  fur: '#F7C978',
  /** The one shade tone: dough settling at the bottom, and the feet. */
  furShade: '#ECB45F',
  stripe: '#D9963F',
  cream: '#FFF3DE',
  /** The one shine, top left. */
  highlight: '#FFF7E6',
  earPink: '#F6ADA4',
  blush: '#F7928C',
  nose: '#E7716C',
  eye: '#2A1A2E',
  eyeShine: '#FFFFFF',
  mouth: '#8E3A4E',
  tongue: '#F27F7A',
  /** Paw pads, shown only when a paw is raised. */
  beans: '#F2A07E',
  hat: '#FFFFFF',
  hatShade: '#EFE8F0',
  /** The hat band: the brand's aubergine, so Biscuit belongs to the app. */
  scarf: '#74407C',
  /** The sprig of herbs in the hat band: Biscuit's signature. */
  herb: '#6FA35E',
  heart: '#F05D6C',
  sweat: '#6DB6EA',
  flour: '#FFFFFF',
  sparkle: '#FFC233',
  steam: '#D9CFC4',
  pot: '#7F8C99',
  potShade: '#66727E',
  wood: '#C98A52',
  woodShade: '#A96F3E',
  steel: '#CBD4DC',
  carrot: '#F28A2E',
  confetti: ['#F05D6C', '#FFC233', '#6DB6EA', '#7CC68D', '#B48AD9'],
} as const;
export type BiscuitPalette = typeof biscuit;

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
