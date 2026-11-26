/**
 * The single source of design tokens for the app: "Pop".
 *
 * Look: bright, playful and clean (Duolingo-level polish). A white page; cards, photos, chips and
 * rows are flat with a 2px light border (#E7E5EE) and no shadow. Only BUTTONS are 3D: a 4px bottom
 * edge in a darker shade of the button's own color (see `edge`), and they press down onto it.
 * Ink is for text and the selected state only. A box of bright colors:
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
  inkMuted: '#77738A',
  bg: '#FFFFFF',
  /** Soft surface: inputs, quiet fills, photo placeholders. */
  surface: '#F7F7FA',
  /** The light border of cards, chips, rows and secondary buttons. */
  line: '#E7E5EE',
  /** Progress bar tracks. */
  track: '#EDEBF3',
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

/**
 * The darker "edge" under a 3D button, per face color (Duolingo style). White and light faces get
 * the light border color; any other color is darkened.
 */
const EDGES: Record<string, string> = {
  [pop.sunshine]: '#E2A400',
  [pop.tomato]: '#D9401F',
  [pop.leaf]: '#1FA960',
  [pop.sky]: '#1E94D6',
  [pop.berry]: '#D9407F',
  [pop.lilac]: '#9F8AE6',
  [pop.white]: pop.line,
  [pop.ink]: '#0B0726',
};
export function edge(color: string): string {
  const known = EDGES[color.toUpperCase()] ?? EDGES[color];
  if (known) return known;
  // Unknown color: 18% darker.
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!m) return pop.line;
  const n = parseInt(m[1], 16);
  const dark = (v: number) => Math.max(0, Math.round(v * 0.82));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => dark(v).toString(16).padStart(2, '0')).join('')}`;
}

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

/** Lines between rows inside a card: the light border color. */
const hairline = '#EDEBF3';

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
  secondaryLabel: pop.inkMuted, // 4.6:1 on white
  tertiaryLabel: pop.inkMuted, // placeholders and quiet icons

  background: pop.bg,
  groupedBackground: pop.bg,
  cell: pop.white,
  elevated: pop.white,
  fill: pop.surface, // quiet filled areas: input wells
  fillStrong: pop.lilac,
  track: pop.track,
  separator: hairline,
  /** The light 2px border of cards, chips, rows and secondary buttons. */
  border: pop.line,
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
  /** Fredoka 700: only screen titles, big numbers and hero moments. */
  heading: 'Fredoka_700Bold',
  headingSemi: 'Fredoka_600SemiBold',
  /** Nunito: everything else. Body is 600, meta 700, titles 800, buttons 900. */
  body: 'Nunito_600SemiBold',
  black: 'Nunito_900Black',
  /** Older names, mapped onto the two families. */
  serif: 'Fredoka_700Bold',
  serifBold: 'Fredoka_700Bold',
  serifMedium: 'Fredoka_600SemiBold',
  regular: 'Nunito_600SemiBold',
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
  /** For short titles in narrow places (recipe cards): lines of even length, so the last word isn't alone. */
  balanced: (Platform.OS === 'web' ? { textWrap: 'balance' } : {}) as TextStyle,
};

export const type = {
  /** Screen title: Fredoka 700, 28. */
  largeTitle: title(28, 34),
  /** Hero moments (Home greeting, Finish): Fredoka 700. */
  hero: title(32, 38),
  /** Big Fredoka title (a screen title in a card or sheet). */
  title1: title(28, 34),
  /** Section title: Nunito 800, 20. */
  title2: title(20, 26, fonts.bold),
  /** Card title: Nunito 800, 16 (max 2 lines where it sits on a card). */
  title3: title(16, 21, fonts.bold),
  /** Row labels: Nunito 800, 16. */
  headline: face(16, 21, fonts.bold),
  /** Button label: Nunito 900, 16 (large 18). */
  button: face(16, 21, fonts.black),
  buttonLarge: face(18, 23, fonts.black),
  /** Body: Nunito 600, 15. */
  body: face(15, 21, fonts.body),
  callout: face(15, 21, fonts.body),
  subhead: face(15, 20, fonts.body),
  /** Meta: Nunito 700, 13 (muted). */
  footnote: face(13, 18, fonts.medium),
  caption1: face(13, 17, fonts.medium),
  caption2: face(11, 14, fonts.medium),
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

/** An 8pt grid: gaps are 8 / 12 / 16, sections 28. */
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
  screen: 16,
  /** Between cards. */
  gap: 12,
  /** Between sections. */
  section: 28,
  cardPadding: 16,
  cardRadius: 16,
  bottom: 32,
} as const;

export const radius = {
  xs: 10,
  sm: 12,
  /** Buttons. */
  md: 16,
  /** Cards and photos. */
  lg: 16,
  xl: 20,
  /** Chips (36 tall). */
  chip: 18,
  pill: 999,
} as const;

/** Borders are 2px everywhere (light #E7E5EE; ink only on a selected item). */
export const stroke = { thick: 2, thin: 2 } as const;

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
  toastDuration: 4000,
} as const;

/** The 3D edge under buttons (4px, Duolingo style). Cards, chips and pills are flat: no shadow. */
export const depth = { button: 4, small: 4, card: 0 } as const;

function makeTheme() {
  const c = colors;
  /** Face and label colors for each kind of button. Labels are always ink. */
  const buttons = {
    primary: { face: pop.sunshine, lip: edge(pop.sunshine), label: pop.ink, border: pop.sunshine },
    success: { face: pop.leaf, lip: edge(pop.leaf), label: pop.ink, border: pop.leaf },
    reward: { face: pop.sunshine, lip: edge(pop.sunshine), label: pop.ink, border: pop.sunshine },
    info: { face: pop.sky, lip: edge(pop.sky), label: pop.ink, border: pop.sky },
    /** The quiet button: white, a 2px light border and a light edge. */
    secondary: { face: pop.white, lip: pop.line, label: pop.ink, border: pop.line },
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
    edge,
    /**
     * Outlines. Shadows are never a style: wrap the element in <Lift> (components/pop/Lift), or use
     * PopCard / PopButton, which draw the one solid ink shadow as a real View.
     */
    chunky: {
      /** Older name: nothing now (a shadow comes from <Lift>). */
      lip: {} as ViewStyle,
      /** The light 2px border of cards and controls (no shadow). */
      card: { borderWidth: 2, borderColor: pop.line } as ViewStyle,
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
