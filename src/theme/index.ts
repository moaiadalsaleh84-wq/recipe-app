/**
 * The single source of design tokens for the app: "Pop".
 *
 * Look: bright, playful and friendly, like a sticker book in the kitchen. A white page, thick ink
 * outlines, a solid ink shadow under cards and buttons (no blur), and a box of bright colors:
 *   sunshine = THE main action, the selected tab and the streak
 *   tomato   = timers, badges and energy (and favorites)
 *   leaf     = success and checked items
 *   sky, berry, lilac = categories and cook steps
 * Every color has a soft "tint" for backgrounds.
 *
 * Rules that keep it readable:
 * - Text is ink. Secondary text is inkMuted, and only on white or a light tint.
 * - Text on ANY colored fill is ink, never white. White text only sits on an ink background.
 * - Type: Fredoka (round, friendly) for titles, Nunito for everything else. Each weight is its own
 *   font file, so use the `fonts` names instead of `fontWeight`.
 *
 * Read tokens in components with `const t = useTheme()`. The app is light only.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { popSpring, pressSpring, spring } from '../motion';

/* ------------------------------------------------------------------ */
/* Palette                                                              */
/* ------------------------------------------------------------------ */

export const pop = {
  ink: '#1B1340',
  inkMuted: '#5B5478',
  bg: '#FFFFFF',
  sunshine: '#FFC83D',
  tomato: '#FF5A36',
  leaf: '#2BD67B',
  sky: '#3DB9FF',
  berry: '#FF5FA2',
  lilac: '#C9B8FF',
  sunshineTint: '#FFF4D1',
  tomatoTint: '#FFE6DF',
  leafTint: '#D9F9E7',
  skyTint: '#DDF2FF',
  berryTint: '#FFE3F0',
  lilacTint: '#ECE6FF',
  white: '#FFFFFF',
} as const;

/** Ink at a given opacity (0 to 1): shades over photos and very soft fills. */
export const inkAlpha = (a: number) => `rgba(27,19,64,${a})`;

/** The bright colors in order, for things that cycle (categories, cook steps, confetti). */
export const popCycle = [
  { fill: pop.sky, tint: pop.skyTint },
  { fill: pop.berry, tint: pop.berryTint },
  { fill: pop.leaf, tint: pop.leafTint },
  { fill: pop.lilac, tint: pop.lilacTint },
] as const;

/** Older names, kept so code that still uses them keeps working. */
export const brand = {
  ink: pop.ink,
  linen: pop.bg,
  basil: pop.leaf,
  saffron: pop.sunshine,
  chili: pop.tomato,
  sage: pop.sunshineTint,
  night: pop.ink,
  cream: pop.bg,
  cocoa: pop.ink,
  tomato: pop.tomato,
  green: pop.leaf,
  yellow: pop.sunshine,
  plum: pop.lilac,
  berry: pop.berry,
} as const;

/** Lines between rows inside a card: ink, see-through. */
const hairline = inkAlpha(0.14);

const colors = {
  /* The main action: sunshine with ink text */
  tint: pop.ink, // links and accent text are ink (readable everywhere)
  tintFill: pop.sunshine,
  tintDeep: '#F0B21F',
  tintSoft: pop.sunshineTint,
  onTint: pop.ink,
  /* Success and checked items */
  success: pop.leaf,
  successDeep: '#1FB866',
  successSoft: pop.leafTint,
  successText: pop.ink,
  /* Rewards, streak and highlights */
  reward: pop.sunshine,
  rewardDeep: '#F0B21F',
  rewardSoft: pop.sunshineTint,
  rewardText: pop.ink,
  onReward: pop.ink,
  /* Information */
  info: pop.sky,
  infoDeep: '#1FA3EE',
  infoSoft: pop.skyTint,
  infoText: pop.ink,
  /* Energy: timers, badges, warnings, favorites */
  warning: pop.tomato,
  accent: pop.tomato,
  highlight: pop.lilac,
  /** Delete and other "careful" text: a deep tomato that is readable on white (5:1). */
  destructive: '#C8371A',
  // Nutrition: three bright colors that are easy to tell apart.
  protein: pop.tomato,
  carbs: pop.sunshine,
  fat: pop.leaf,

  label: pop.ink,
  secondaryLabel: pop.inkMuted, // 7:1 on white
  tertiaryLabel: pop.inkMuted, // placeholders and quiet icons

  background: pop.bg,
  groupedBackground: pop.bg,
  cell: pop.white,
  elevated: pop.white,
  fill: pop.lilacTint, // quiet filled areas: tracks, input wells
  fillStrong: pop.lilac,
  separator: hairline,
  /** Every card, button and chip has an ink outline. */
  border: pop.ink,
  lip: pop.ink,
  imagePlaceholder: pop.sunshineTint,
  scrim: inkAlpha(0.5),
  shadow: pop.ink,
  /** Bar behind the clock and battery. */
  bar: 'rgba(255,255,255,0.96)',
};

export type Palette = typeof colors;

/**
 * Older name for the ink-on-dark spots (the only places white text is allowed). Cook Mode itself
 * is light now.
 */
export const cook = {
  background: pop.ink,
  card: '#2A2160',
  cardStrong: '#352B73',
  label: '#FFFFFF',
  secondaryLabel: '#DCD6F2',
  track: '#3A3170',
  done: pop.leaf,
  accent: pop.sunshine,
  onAccent: pop.ink,
} as const;

/* ------------------------------------------------------------------ */
/* Type                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Font families, loaded in the root layout. Each weight is a separate file, so pick the family
 * here and leave `fontWeight` as 'normal'.
 */
export const fonts = {
  /** Fredoka: screen, section and card titles. */
  heading: 'Fredoka_700Bold',
  headingSemi: 'Fredoka_600SemiBold',
  /** Nunito: everything else. Body is 700, small text 800, buttons 900. */
  body: 'Nunito_700Bold',
  black: 'Nunito_900Black',
  /** Older names, mapped onto the two families. */
  serif: 'Fredoka_700Bold',
  serifBold: 'Fredoka_700Bold',
  serifMedium: 'Fredoka_600SemiBold',
  regular: 'Nunito_700Bold',
  medium: 'Nunito_700Bold',
  semibold: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  extrabold: 'Nunito_900Black',
  display: 'Nunito_800ExtraBold',
  displayBold: 'Fredoka_700Bold',
  displayMedium: 'Nunito_700Bold',
  rounded: 'Fredoka_600SemiBold',
};

const face = (fontSize: number, lineHeight: number, fontFamily: string, letterSpacing = 0): TextStyle => ({
  fontSize,
  lineHeight,
  fontFamily,
  fontWeight: 'normal',
  letterSpacing,
});
/** Titles: on the web they wrap into lines of similar length, so no word is left alone. */
const title = (fontSize: number, lineHeight: number, family: string = fonts.heading): TextStyle => ({
  ...face(fontSize, lineHeight, family),
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
  /** Screen title: Fredoka 700, 34. */
  largeTitle: title(34, 40),
  /** Big hero title (Home, Finish). */
  hero: title(36, 42),
  title1: title(28, 34),
  /** Section title: Fredoka 700, 21. */
  title2: title(21, 26),
  /** Card title: Fredoka 700, 20. */
  title3: title(20, 25),
  /** Row labels and small card titles. */
  headline: face(17, 22, fonts.bold),
  /** Button label: Nunito 900, 17. */
  button: face(17, 22, fonts.black),
  buttonLarge: face(19, 24, fonts.black),
  /** Body: Nunito 700, 16. */
  body: face(16, 23, fonts.body),
  callout: face(16, 22, fonts.body),
  subhead: face(15, 20, fonts.body),
  /** Small: Nunito 800, 13–14. */
  footnote: face(14, 19, fonts.bold),
  caption1: face(13, 17, fonts.bold),
  caption2: face(11, 14, fonts.bold),
  /**
   * Text you type into a one-line field. No letterSpacing and no lineHeight on purpose: on iPhone
   * either one can cut off the last letter of the hint text or push the text off center.
   * Multi-line fields use `body`.
   */
  input: { fontSize: 16, fontFamily: fonts.body, fontWeight: 'normal' },
} as const satisfies Record<string, TextStyle>;

/* ------------------------------------------------------------------ */
/* Space, shape, motion                                                 */
/* ------------------------------------------------------------------ */

/** Gaps are 8 / 12 / 16. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** One set of numbers for every screen and card, so the whole app lines up. */
export const layout = {
  /** Left and right margin of every screen. */
  screen: 20,
  gap: 16,
  section: 28,
  cardPadding: 16,
  cardRadius: 22,
  bottom: 32,
} as const;

export const radius = {
  xs: 10,
  /** Chips. */
  sm: 12,
  /** Buttons. */
  md: 18,
  /** Cards. */
  lg: 22,
  xl: 26,
  pill: 999,
} as const;

/** The ink outline on cards and buttons, and the thinner one on chips. */
export const stroke = { thick: 2.5, thin: 2 } as const;

/** Apple's minimum tap target. */
export const hitTarget = 44;

/** Kept for older code: the springs now come from src/motion.ts, so there's one set. */
export const motion = {
  pressScale: 0.97,
  press: pressSpring,
  release: pressSpring,
  /** Bouncy confirmation, e.g. checkmarks. */
  pop: popSpring,
  settle: spring,
  /** Toasts hide on their own after 3 seconds (or a tap). */
  toastDuration: 3000,
} as const;

/** How far the solid ink shadow sits below: 4 for cards and big buttons, 3 for small buttons, chips and pills. */
export const depth = { button: 4, small: 3, card: 4 } as const;

function makeTheme() {
  const c = colors;
  /** Face and label colors for each kind of button. Labels are always ink. */
  const buttons = {
    primary: { face: pop.sunshine, lip: pop.ink, label: pop.ink, border: pop.ink },
    success: { face: pop.leaf, lip: pop.ink, label: pop.ink, border: pop.ink },
    reward: { face: pop.sunshine, lip: pop.ink, label: pop.ink, border: pop.ink },
    info: { face: pop.sky, lip: pop.ink, label: pop.ink, border: pop.ink },
    /** The quiet button: white with an ink outline. */
    secondary: { face: pop.white, lip: pop.ink, label: pop.ink, border: pop.ink },
  } as const;
  return {
    isDark: false as boolean,
    colors: c,
    pop,
    inkAlpha,
    fonts,
    type,
    spacing,
    radius,
    stroke,
    hitTarget,
    motion,
    depth,
    layout,
    noWidows,
    buttons,
    /**
     * Outlines. Shadows are never a style: wrap the element in <Lift> (components/pop/Lift), or use
     * PopCard / PopButton, which draw the one solid ink shadow as a real View.
     */
    chunky: {
      /** Older name: nothing now (a shadow comes from <Lift>). */
      lip: {} as ViewStyle,
      /** The ink outline of cards, inputs and controls. */
      card: { borderWidth: stroke.thick, borderColor: pop.ink } as ViewStyle,
      button: (_color?: string): ViewStyle => ({}),
    },
    /** Older names: nothing now. */
    shadow: { card: {} as ViewStyle, floating: {} as ViewStyle },
  };
}

/**
 * Lock screen and Dynamic Island timer (Live Activity). The Live Activity runs in a separate
 * iOS extension that can't import this file, so the app sends these values along with each timer.
 * Plain hex colors only: the extension draws them with SwiftUI.
 */
export const liveActivity = {
  light: {
    background: pop.tomatoTint,
    card: '#FFFFFF',
    label: pop.ink,
    secondaryLabel: pop.inkMuted,
    accent: pop.tomato,
    track: pop.lilacTint,
    alarm: pop.tomato,
    border: pop.ink,
  },
  dark: {
    background: pop.ink,
    card: '#2A2160',
    label: '#FFFFFF',
    secondaryLabel: '#DCD6F2',
    accent: pop.sunshine,
    track: '#3A3170',
    alarm: pop.tomato,
    border: '#3A3170',
  },
  /** The Dynamic Island is always black, so it uses the bright accent. */
  island: { accent: pop.sunshine, label: '#FFFFFF', secondaryLabel: '#DCD6F2', alarm: pop.tomato },
  worriedSeconds: 10,
} as const;

export type LiveActivityPalette = typeof liveActivity;

export const lightTheme = makeTheme();
/** The app is light only; kept so older imports still resolve. */
export const darkTheme = lightTheme;
export type Theme = typeof lightTheme;
export type ButtonKind = keyof Theme['buttons'];

/** Startup hook kept for the root layout. The app is always light. */
export function loadAppearance() {}

export function useTheme(): Theme {
  return lightTheme;
}
