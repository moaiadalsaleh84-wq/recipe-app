/**
 * Every spring Biscuit uses, in one place. Nothing in the rig uses linear easing.
 *
 * Two kinds of config:
 * - Physical springs (damping / stiffness / mass) for poses and reactions, so they overshoot and settle.
 * - Duration springs (duration / dampingRatio) for the calm loops (breathing, tail sway, blinks).
 *   In Reanimated 4, `duration` is the perceptual duration; the real one is about 1.5x longer.
 */
import type { WithSpringConfig } from 'react-native-reanimated';

export const springs = {
  /** Blending the body into a new mood: quick, a little overshoot. */
  pose: { damping: 14, stiffness: 170, mass: 0.8 },
  /** Settling back after a reaction. */
  settle: { damping: 18, stiffness: 110, mass: 1 },
  /** Reaction moves: the jump, the arms flying up. */
  snappy: { damping: 11, stiffness: 280, mass: 0.6 },
  /** Landing: squash, then a wobble. */
  land: { damping: 7, stiffness: 320, mass: 0.6 },
  /** Hat and tail lagging behind the head and body (follow-through). */
  lag: { damping: 8, stiffness: 80, mass: 0.9 },
  /** Eyes turning. */
  glance: { damping: 18, stiffness: 170, mass: 0.6 },
  /** Ear flick: fast out, springs back. */
  flick: { damping: 9, stiffness: 420, mass: 0.4 },

  /** One blink is about 120 ms: 60 down, 60 up. */
  blink: { duration: 40, dampingRatio: 1 },
  /** Breathing: 1.00 to 1.02 and back, about 3.2 s per breath. */
  breath: { duration: 1070, dampingRatio: 1 },
  /** Tail sway, about 2.4 s per swing. */
  sway: { duration: 800, dampingRatio: 1 },
  /** The mouth opening and closing while a line types out. */
  talk: { duration: 90, dampingRatio: 1 },
  /** Busy loops: stirring, chopping, chewing, waving. */
  busy: { duration: 220, dampingRatio: 0.9 },
  /** Effects drifting (hearts, steam, zzz, confetti): slow and soft. */
  drift: { duration: 900, dampingRatio: 1 },
  /** Reduce Motion: a gentle change with no bounce. */
  gentle: { duration: 220, dampingRatio: 1 },
  /** Expressions cross-fading. */
  fade: { duration: 120, dampingRatio: 1 },
} satisfies Record<string, WithSpringConfig>;

/** Breathing: how far the body grows on each breath. */
export const BREATH_SCALE = 1.02;
/** The head follows the body's breath this much later (ms). */
export const HEAD_LAG_MS = 180;
/** Blinks come every 2-6 s; sometimes two in a row. */
export const BLINK_MS: readonly [number, number] = [2000, 6000];
export const DOUBLE_BLINK_CHANCE = 0.2;
/** Ear flick every 6-12 s. */
export const EAR_MS: readonly [number, number] = [6000, 12000];
/** Small glances left and right every 3-7 s. */
export const GLANCE_MS: readonly [number, number] = [3000, 7000];
/** Tail sway in degrees, and how much later the tip follows (ms). */
export const TAIL_SWAY = 7;
export const TAIL_TIP_LAG_MS = 260;
/** A reaction plays this long, then Biscuit goes back to the mood it came from. */
export const REACTION_MS = 1700;
/** Eyes follow your finger for this long after a touch. */
export const FOLLOW_MS = 1800;
