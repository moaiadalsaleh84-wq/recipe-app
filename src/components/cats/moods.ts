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
};

/**
 * Energetic moods play their big motion a few times, then settle into a calm pose
 * instead of looping forever. `after` is how long the big motion plays (ms).
 */
export const settle: Partial<Record<Mood, { after: number; to: Mood }>> = {
  celebrate: { after: 1950, to: 'content' }, // 4 jumps
  happy: { after: 2700, to: 'content' }, // 3 hops
  wave: { after: 2300, to: 'content' }, // a few waves
  flex: { after: 2500, to: 'proud' }, // 4 pumps
  lift: { after: 5300, to: 'proud' }, // 4 curls
  oops: { after: 1800, to: 'idle' },
  worried: { after: 1800, to: 'idle' },
  eat: { after: 3000, to: 'content' },
  love: { after: 2600, to: 'content' },
};
