/**
 * Biscuit's moods. These names are the contract between the app and whatever draws Biscuit:
 * today the layered SVG rig (BiscuitRig.tsx), later possibly a Rive file with the same names.
 *
 * The 15 expressions each change the eyes, brows, mouth AND the paws and body. The 3 actions at
 * the end reuse an expression's face and add a movement (waving, looking up, ringing).
 */
export const EXPRESSIONS = [
  'idle', // calm, gentle smile
  'happy', // closed ^ ^ eyes, open mouth, little hops
  'excited', // sparkly eyes, paws up
  'love', // heart eyes, paws on cheeks, little hearts
  'thinking', // paw on chin, eyes up
  'hungry', // big eyes, drooling, staring at a bowl
  'eating', // cheeks full, holding a cookie
  'cooking', // stirring a pot
  'chopping', // focused, a knife over a cutting board
  'worried', // sweat drop, paws together
  'shocked', // wide white-ringed eyes, paws up
  'sleepy', // half-closed eyes, a small z
  'proud', // eyes closed, chin up, paws on hips
  'celebrating', // jumping, arms up, confetti
  'oops', // sweat drop, sheepish grin, flour on the face
] as const;
export const ACTIONS = [
  'wave', // hello
  'watch', // looks up at the timer
  'alarm', // the timer is ringing: waves until stopped (keeps going)
] as const;
export const MOODS = [...EXPRESSIONS, ...ACTIONS] as const;
export type Mood = (typeof MOODS)[number];

export type Eyes = 'oval' | 'sparkle' | 'heart' | 'arc' | 'closed' | 'ring' | 'half' | 'focus';
export type Mouth = 'w' | 'open' | 'big' | 'small' | 'wavy' | 'chew' | 'drool' | 'grin' | 'smile' | 'o';
export type Brows = 'calm' | 'up' | 'down' | 'raised' | 'high';
export type Prop = 'pot' | 'board' | 'bowl' | 'cookie';
export type Fx = 'hearts' | 'sparkle' | 'zzz' | 'sweat' | 'dots' | 'ring' | 'confetti' | 'steam' | 'crumbs' | 'flour';

export type MoodSpec = {
  eyes: Eyes;
  mouth: Mouth;
  brows: Brows;
  /** Arm angles in degrees. 0 hangs down, positive lifts outward and up, negative crosses the body. */
  armL: number;
  armR: number;
  /** Paws on hips: bent arms instead of straight ones. */
  akimbo?: boolean;
  /** Show the pink toe beans (paws raised, facing you). */
  palms?: boolean;
  /** What Biscuit holds or stands behind. */
  prop?: Prop;
  /** Where the eyes look, each from -1 to 1 (x: left to right, y: up to down). */
  look?: readonly [number, number];
  /** Puffed cheeks (eating). */
  puff?: boolean;
  fx: Fx[];
};

export const moodSpecs: Record<Mood, MoodSpec> = {
  idle: { eyes: 'oval', mouth: 'w', brows: 'calm', armL: 14, armR: 14, fx: [] },
  happy: { eyes: 'arc', mouth: 'open', brows: 'high', armL: 48, armR: 48, fx: [] },
  excited: { eyes: 'sparkle', mouth: 'open', brows: 'high', armL: 132, armR: 132, palms: true, fx: ['sparkle'] },
  love: { eyes: 'heart', mouth: 'w', brows: 'high', armL: 150, armR: 150, palms: true, fx: ['hearts'] },
  thinking: { eyes: 'oval', mouth: 'small', brows: 'raised', armL: 12, armR: -131, look: [-0.6, -1], fx: ['dots'] },
  hungry: { eyes: 'sparkle', mouth: 'drool', brows: 'high', armL: -32, armR: -32, prop: 'bowl', look: [0, 1], fx: ['steam'] },
  eating: { eyes: 'arc', mouth: 'chew', brows: 'calm', armL: -42, armR: -42, prop: 'cookie', puff: true, fx: ['crumbs'] },
  cooking: { eyes: 'oval', mouth: 'w', brows: 'calm', armL: -20, armR: -22, prop: 'pot', look: [0.2, 0.9], fx: ['steam'] },
  chopping: { eyes: 'focus', mouth: 'small', brows: 'down', armL: -30, armR: -6, prop: 'board', look: [0.3, 1], fx: [] },
  worried: { eyes: 'oval', mouth: 'wavy', brows: 'up', armL: -40, armR: -40, look: [0, 0.2], fx: ['sweat'] },
  shocked: { eyes: 'ring', mouth: 'o', brows: 'high', armL: 158, armR: 158, palms: true, fx: [] },
  sleepy: { eyes: 'half', mouth: 'small', brows: 'calm', armL: 6, armR: 6, fx: ['zzz'] },
  proud: { eyes: 'closed', mouth: 'smile', brows: 'calm', armL: 0, armR: 0, akimbo: true, fx: ['sparkle'] },
  celebrating: { eyes: 'arc', mouth: 'open', brows: 'high', armL: 165, armR: 165, palms: true, fx: ['confetti'] },
  oops: { eyes: 'arc', mouth: 'grin', brows: 'up', armL: 10, armR: 138, palms: true, fx: ['sweat', 'flour'] },
  wave: { eyes: 'oval', mouth: 'open', brows: 'high', armL: 10, armR: 150, palms: true, fx: [] },
  watch: { eyes: 'oval', mouth: 'small', brows: 'calm', armL: 10, armR: 10, look: [0, -1], fx: [] },
  alarm: { eyes: 'sparkle', mouth: 'open', brows: 'high', armL: 10, armR: 150, palms: true, fx: ['ring'] },
};

/** How Biscuit stands when it has nothing to say. */
export const restSpec: MoodSpec = moodSpecs.idle;

/** Moods that are a state, not a reaction: they keep going instead of relaxing afterwards. */
export const sustained: Partial<Record<Mood, true>> = { sleepy: true, alarm: true, cooking: true, chopping: true, eating: true, hungry: true };

/** Roughly how long each mood's act takes (ms), so Biscuit relaxes only after it's done. */
export const actMs: Record<Mood, number> = {
  idle: 0,
  happy: 1400,
  excited: 1700,
  love: 2200,
  thinking: 2400,
  hungry: 0,
  eating: 0,
  cooking: 0,
  chopping: 0,
  worried: 1600,
  shocked: 1200,
  sleepy: 0,
  proud: 1500,
  celebrating: 2400,
  oops: 1400,
  wave: 2200,
  watch: 2600,
  alarm: 0,
};
