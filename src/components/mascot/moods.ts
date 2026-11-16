/**
 * Biscuit's moods. These names are the contract between the app and whatever draws Biscuit:
 * today the layered SVG rig (BiscuitRig.tsx), later possibly a Rive file with the same names.
 */
export const MOODS = [
  'idle', // relaxed: breathing, blinking, looking around
  'happy', // two little hops
  'excited', // fast bounces, arms up, sparkly eyes
  'cheering', // big jumps, arms pumping (finished cooking, goals hit)
  'thinking', // paw on chin, eyes up
  'worried', // paws together, leaning back, ears down
  'sleepy', // drooping, nodding off (keeps going)
  'proud', // chest out, chin up, eyes closed
  'oops', // wobble, hat slips, tongue out
  'love', // hearts, a slow sway (also the reaction to being petted)
  'wave', // hello
  'hop', // one big hop with sparkles (a recipe was saved)
  'watch', // looks up at the timer, tail tapping
  'hide', // eyes squeezed shut, ducking (something went wrong)
  'alarm', // the timer is ringing: waves until stopped (keeps going)
] as const;
export type Mood = (typeof MOODS)[number];

export type Eyes = 'open' | 'wide' | 'smile' | 'squeeze';
export type Mouth = 'smile' | 'open' | 'grin' | 'o' | 'wavy' | 'tongue' | 'small';
export type Fx = 'hearts' | 'sparkle' | 'zzz' | 'sweat' | 'dots' | 'ring';

export type MoodSpec = {
  eyes: Eyes;
  mouth: Mouth;
  /** Arm angles in degrees. 0 hangs down, positive lifts outward and up, negative crosses the body. */
  armL: number;
  armR: number;
  /** Where the eyes look, each from -1 to 1 (x: left to right, y: up to down). */
  look?: readonly [number, number];
  /** How closed the eyelids are, 0 to 1. */
  lid?: number;
  brows?: boolean;
  fx: Fx[];
};

export const moodSpecs: Record<Mood, MoodSpec> = {
  idle: { eyes: 'open', mouth: 'smile', armL: 20, armR: 20, fx: [] },
  happy: { eyes: 'smile', mouth: 'open', armL: 62, armR: 62, fx: [] },
  excited: { eyes: 'wide', mouth: 'open', armL: 125, armR: 125, fx: ['sparkle'] },
  cheering: { eyes: 'smile', mouth: 'open', armL: 158, armR: 158, fx: ['sparkle'] },
  thinking: { eyes: 'open', mouth: 'small', armL: 20, armR: -150, look: [0.7, -0.8], fx: ['dots'] },
  worried: { eyes: 'open', mouth: 'wavy', armL: -38, armR: -38, look: [0, 0.3], brows: true, fx: ['sweat'] },
  sleepy: { eyes: 'open', mouth: 'small', armL: 14, armR: 14, lid: 0.72, look: [0, 0.6], fx: ['zzz'] },
  proud: { eyes: 'smile', mouth: 'grin', armL: 48, armR: 48, fx: ['sparkle'] },
  oops: { eyes: 'wide', mouth: 'tongue', armL: 100, armR: 70, look: [0, -0.5], fx: ['sweat'] },
  love: { eyes: 'smile', mouth: 'smile', armL: -44, armR: -44, fx: ['hearts'] },
  wave: { eyes: 'open', mouth: 'open', armL: 20, armR: 150, fx: [] },
  hop: { eyes: 'smile', mouth: 'open', armL: 110, armR: 110, fx: ['sparkle'] },
  watch: { eyes: 'open', mouth: 'small', armL: 20, armR: 20, look: [0, -1], fx: [] },
  hide: { eyes: 'squeeze', mouth: 'wavy', armL: 8, armR: 8, fx: ['sweat'] },
  alarm: { eyes: 'wide', mouth: 'open', armL: 20, armR: 150, fx: ['ring'] },
};

/** How Biscuit stands when it has nothing to say. */
export const restSpec: MoodSpec = moodSpecs.idle;

/** Moods that are a state, not a reaction: they keep going instead of relaxing afterwards. */
export const sustained: Partial<Record<Mood, true>> = { sleepy: true, alarm: true };

/** Roughly how long each mood's act takes (ms), so Biscuit relaxes only after it's done. */
export const actMs: Record<Mood, number> = {
  idle: 0,
  happy: 1400,
  excited: 1700,
  cheering: 2400,
  thinking: 2400,
  worried: 1600,
  sleepy: 0,
  proud: 1500,
  oops: 1100,
  love: 2200,
  wave: 2200,
  hop: 1000,
  watch: 2600,
  hide: 2600,
  alarm: 0,
};
