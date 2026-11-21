/**
 * Motion tokens: one set of timings and springs for the whole app, so everything moves alike.
 *
 * Rules:
 * - Animate transform and opacity only (they run at 60fps on the UI thread). Progress bars are the
 *   one exception (their width springs).
 * - No layout animations on lists longer than 20 items.
 * - Reduce Motion: movement is replaced by a short fade, or nothing. Every helper here checks it.
 * - Worklets (useAnimatedStyle, gesture callbacks) only do math on plain numbers: no JS helper calls.
 */
import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, type WithSpringConfig } from 'react-native-reanimated';

export const duration = {
  /** Presses, small checks. */
  fast: 150,
  /** Most transitions. */
  base: 250,
  /** Counting numbers, bigger moments. */
  slow: 400,
} as const;

/** Snappy, with a slight bounce. */
export const spring: WithSpringConfig = { damping: 15, stiffness: 180, mass: 1 };
/** Faster, for press-in / release. */
export const pressSpring: WithSpringConfig = { damping: 20, stiffness: 600, mass: 0.6 };
/** A bouncy pop for checks and badges (overshoots a little). */
export const popSpring: WithSpringConfig = { damping: 9, stiffness: 320, mass: 0.6 };

/** For fades. */
export const easeOut = Easing.out(Easing.cubic);

/** Stagger between items appearing one after another. */
export const STAGGER = 40;
/** Only the first few items of a list are staggered; the rest appear with the last one. */
export const MAX_STAGGERED = 8;

/**
 * The standard "arrive" animation for cards and rows: fade in while rising 12pt, staggered by index
 * (40ms each, capped at 8). With Reduce Motion: a plain short fade.
 */
export function enter(index = 0, reduceMotion = false) {
  const delay = Math.min(index, MAX_STAGGERED - 1) * STAGGER;
  if (reduceMotion) return FadeIn.duration(duration.fast).delay(delay);
  const base = FadeInDown.duration(duration.base).delay(delay);
  // Phones: start 12pt lower (FadeInDown's default is 25). On web, custom start values make Reanimated
  // position the element absolutely (sections then overlap), so web keeps the default. Custom easing
  // isn't supported by web layout animations either, so the default ease is used everywhere.
  return Platform.OS === 'web' ? base : base.withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
}
