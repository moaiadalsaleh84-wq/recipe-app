/**
 * The single source of design tokens for the app.
 *
 * - Colors come from the brand palette (indigo, green, yellow, coral, purple, navy)
 *   mapped onto iOS semantic roles (label, background, fill, separator...).
 *   Every color has a light and a dark value.
 * - Type uses the iOS system font (SF Pro) via Apple's Human Interface Guidelines
 *   text styles. No fontFamily is set, so iOS renders SF Pro and Android Roboto.
 * - Spacing, radius, hit targets and motion are tuned to iOS conventions.
 *
 * Read tokens in components with `const t = useTheme()`.
 */
import { useColorScheme, type TextStyle } from 'react-native';

// Brand palette from the design inspiration.
const brand = {
  indigo: '#4B3FE4',
  green: '#3DB55A',
  yellow: '#FFD23F',
  coral: '#F25C54',
  purple: '#7B5CF0',
  navy: '#16124A',
} as const;

const light = {
  tint: brand.indigo, // links, icons, text buttons
  tintFill: brand.indigo, // filled buttons and selected chips (behind white text)
  onTint: '#FFFFFF',
  tintSoft: 'rgba(75,63,228,0.12)', // tinted (secondary) buttons and selected chips
  success: brand.green,
  successSoft: 'rgba(61,181,90,0.14)',
  warning: brand.yellow,
  accent: brand.coral, // favorites
  highlight: brand.purple,
  destructive: '#FF3B30',

  label: brand.navy,
  secondaryLabel: 'rgba(22,18,74,0.62)',
  tertiaryLabel: 'rgba(22,18,74,0.34)',

  background: '#FFFFFF', // plain screens (recipes, detail)
  groupedBackground: '#F2F2F7', // list screens (groceries, plan, saved)
  cell: '#FFFFFF', // rows and cards on grouped backgrounds
  elevated: '#FFFFFF', // toasts, floating bars
  fill: 'rgba(120,120,128,0.12)', // unselected chips, steppers, skeletons
  fillStrong: 'rgba(120,120,128,0.20)',
  separator: 'rgba(60,60,67,0.18)',
  imagePlaceholder: '#ECEBF5',
  scrim: 'rgba(0,0,0,0.28)', // behind buttons floating on photos
  shadow: '#16124A',
};

type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  tint: '#8A80FF', // lifted indigo, keeps contrast on black
  tintFill: '#5A4EEB', // deeper, so white text on it stays readable (~6:1)
  onTint: '#FFFFFF',
  tintSoft: 'rgba(138,128,255,0.22)',
  success: '#4CC46A',
  successSoft: 'rgba(76,196,106,0.22)',
  warning: '#FFD60A',
  accent: '#FF6B63',
  highlight: '#A08BFF',
  destructive: '#FF453A',

  label: '#FFFFFF',
  secondaryLabel: 'rgba(235,235,245,0.64)',
  tertiaryLabel: 'rgba(235,235,245,0.32)',

  background: '#000000',
  groupedBackground: '#000000',
  cell: '#1C1C1E',
  elevated: '#2C2C2E',
  fill: 'rgba(120,120,128,0.24)',
  fillStrong: 'rgba(120,120,128,0.36)',
  separator: 'rgba(84,84,88,0.6)',
  imagePlaceholder: '#1C1C1E',
  scrim: 'rgba(0,0,0,0.38)',
  shadow: '#000000',
};

/** Apple HIG text styles (default "Large" Dynamic Type size). */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
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
  md: 12, // rows, inputs, buttons
  lg: 16, // images and cards
  xl: 22, // sheets, grouped sections
  pill: 999,
} as const;

/** Apple's minimum tap target. */
export const hitTarget = 44;

export const motion = {
  /** Press-down feedback on cards and buttons. */
  pressScale: 0.97,
  press: { damping: 20, stiffness: 400, mass: 0.6 },
  /** Bouncy confirmation, e.g. checkmarks. */
  pop: { damping: 12, stiffness: 320, mass: 0.7 },
  toastDuration: 2600,
} as const;

function makeTheme(c: Palette, isDark: boolean) {
  return {
    isDark,
    colors: c,
    type,
    spacing,
    radius,
    hitTarget,
    motion,
    /** Very soft elevation; flat in dark mode, like iOS. */
    shadow: {
      card: isDark
        ? {}
        : { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      floating: {
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.5 : 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
    },
  };
}

export const lightTheme = makeTheme(light, false);
export const darkTheme = makeTheme(dark, true);
export type Theme = typeof lightTheme;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
