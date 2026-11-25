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
import { Easing, FadeIn, FadeInDown, Keyframe, type WithSpringConfig } from 'react-native-reanimated';

export const duration = {
  /** Presses, small checks. */
  fast: 150,
  /** Most transitions. */
  base: 250,
  /** Counting numbers, bigger moments. */
  slow: 400,
} as const;

/** Snappy, settles without overshooting (no bounce anywhere in the app). */
export const spring: WithSpringConfig = { damping: 24, stiffness: 220, mass: 1, overshootClamping: true };
/** Faster, for press-in / release. */
export const pressSpring: WithSpringConfig = { damping: 24, stiffness: 600, mass: 0.6, overshootClamping: true };
/** Kept for older call sites: the same no-overshoot settle as `spring` (there are no pops anymore). */
export const popSpring: WithSpringConfig = spring;

/** The one curve for timed motion: Easing.out(Easing.cubic). */
export const EASE_CUBIC = Easing.out(Easing.cubic);
/** Press: a button, card or chip moves down onto its shadow in 120 ms and back up in 160 ms. */
export const pressIn = { duration: 120, easing: EASE_CUBIC };
export const pressOut = { duration: 160, easing: EASE_CUBIC };

/**
 * The strong ease-out for anything entering, leaving or responding: starts fast, settles softly.
 * (Reanimated's default curve starts slow, which makes arrivals feel sluggish.)
 */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** For fades. */
export const easeOut = EASE_OUT;

/**
 * Gives an entering/exiting animation the strong ease-out on phones. Web layout animations don't
 * support custom curves, so web keeps the default.
 */
export function uiEase<T extends { easing: (e: typeof EASE_OUT) => T }>(builder: T): T {
  return Platform.OS === 'web' ? builder : builder.easing(EASE_OUT);
}

/** Stagger between items appearing one after another. */
export const STAGGER = 30;
/** Only the first few items of a list are staggered; the rest appear with the last one. */
export const MAX_STAGGERED = 6;

/**
 * The standard "arrive" animation for screens, sections, cards and rows: fade in while rising 8pt,
 * 220 ms, staggered with shrinking gaps by index (max 6). Only on first open (it's an entering animation).
 * With Reduce Motion: a plain short fade.
 */
/** Delays for the first 6 items: the gaps shrink (40, 30, 25, 20, 15 ms), so a group reads as one
 * wave instead of a metronome. The rest arrive with the last one. */
const STAGGER_DELAYS = [0, 40, 70, 95, 115, 130] as const;

export function enter(index = 0, reduceMotion = false) {
  const delay = STAGGER_DELAYS[Math.min(index, MAX_STAGGERED - 1)];
  if (reduceMotion) return FadeIn.duration(duration.fast).delay(delay);
  const base = uiEase(FadeInDown.duration(220).delay(delay));
  // Phones: start 8pt lower (FadeInDown's default is 25). On web, custom start values make Reanimated
  // position the element absolutely (sections then overlap), so web keeps the default. Custom easing
  // isn't supported by web layout animations either, so the default ease is used everywhere.
  return Platform.OS === 'web' ? base : base.withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
}

/**
 * A menu or popover opening from its button: fades in while sliding 6pt down into place, 180 ms
 * ease-out. No scaling. Reduce Motion: a fade.
 */
export function popoverIn(reduceMotion = false) {
  if (reduceMotion) return FadeIn.duration(duration.fast);
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -6 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], ...(Platform.OS === 'web' ? {} : { easing: EASE_OUT }) },
  }).duration(180);
}
