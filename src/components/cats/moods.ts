import type { Effect, Eyes, Mood, Mouth, Prop } from './types';

/** Arm angles in degrees: [shoulder, elbow]. Positive swings the arm outward, negative across the body. */
export type ArmPose = readonly [number, number];

export type MoodSpec = {
  eyes: Eyes;
  mouth: Mouth;
  L: ArmPose;
  R: ArmPose;
  prop?: Prop; // held in the right paw
  fx: Effect[];
};

export const moodSpecs: Record<Mood, MoodSpec> = {
  idle: { eyes: 'default', mouth: 'cat', L: [10, 0], R: [10, 0], fx: [] },
  wave: { eyes: 'happy', mouth: 'smile', L: [10, 0], R: [150, 25], fx: [] },
  happy: { eyes: 'happy', mouth: 'smile', L: [45, 20], R: [45, 20], fx: ['sparkle'] },
  love: { eyes: 'happy', mouth: 'cat', L: [-25, -70], R: [-25, -70], fx: ['hearts'] },
  think: { eyes: 'normal', mouth: 'flat', L: [10, 0], R: [-35, -135], fx: ['dots'] },
  worried: { eyes: 'wide', mouth: 'cat', L: [-30, -125], R: [-30, -125], fx: ['sweat'] },
  celebrate: { eyes: 'happy', mouth: 'smile', L: [160, 15], R: [160, 15], fx: ['confetti', 'sparkle'] },
  sleepy: { eyes: 'closed', mouth: 'cat', L: [4, 0], R: [4, 0], fx: ['zzz'] },
  stir: { eyes: 'default', mouth: 'cat', L: [-20, -55], R: [-12, -70], prop: 'spoon', fx: ['bowl', 'steam'] },
  eat: { eyes: 'happy', mouth: 'chew', L: [-150, -15], R: [-150, -15], prop: 'cookie', fx: ['crumbs'] },
  flex: { eyes: 'determined', mouth: 'smile', L: [85, 105], R: [85, 105], fx: ['sparkle'] },
  lift: { eyes: 'determined', mouth: 'flat', L: [10, 0], R: [8, -20], prop: 'dumbbell', fx: ['sweat'] },
  oops: { eyes: 'wide', mouth: 'tongue', L: [120, 30], R: [60, -20], fx: ['poof', 'sweat'] },
  proud: { eyes: 'closed', mouth: 'smile', L: [-40, -105], R: [-40, -105], fx: ['sparkle'] },
  wait: { eyes: 'normal', mouth: 'cat', L: [-30, -120], R: [10, 0], fx: [] },
  content: { eyes: 'happy', mouth: 'cat', L: [10, 0], R: [10, 0], fx: [] },
  // Time's up: a friendly wave and a soft chime, not panic.
  alarm: { eyes: 'wide', mouth: 'smile', L: [10, 0], R: [150, 25], fx: ['ring'] },
  nod: { eyes: 'normal', mouth: 'smile', L: [8, 0], R: [8, 0], fx: [] },
  point: { eyes: 'normal', mouth: 'smile', L: [8, 0], R: [125, 45], fx: [] },
  drink: { eyes: 'closed', mouth: 'cat', L: [8, 0], R: [-80, -90], prop: 'bottle', fx: [] },
  shrug: { eyes: 'normal', mouth: 'smile', L: [5, 50], R: [5, 50], fx: [] },
};

/** How a cat stands when it isn't saying anything: relaxed, arms loose. */
export const restSpec: MoodSpec = { eyes: 'default', mouth: 'cat', L: [7, 0], R: [7, 0], fx: [] };

/**
 * Moods that are a state, not a line to act out: they keep going instead of relaxing.
 * Everything else acts while the bubble types, holds for a beat, then rests.
 */
export const sustained: Partial<Record<Mood, true>> = { sleepy: true, alarm: true };


/** Roughly how long each mood's act takes (ms), so the cat relaxes only after it's done. */
export const actMs: Record<Mood, number> = {
  idle: 0,
  content: 0,
  wave: 2600,
  happy: 1400,
  celebrate: 2300,
  love: 2200,
  think: 2600,
  worried: 1600,
  sleepy: 0,
  stir: 3200,
  eat: 2400,
  flex: 1600,
  lift: 2700,
  oops: 900,
  proud: 1300,
  wait: 3000,
  alarm: 0,
  nod: 900,
  point: 1100,
  drink: 2400,
  shrug: 1300,
};
