/**
 * Biscuit's moods: the contract between the app and whatever draws Biscuit.
 * Today that is the layered SVG rig (BiscuitRig.tsx). Later a Rive file can replace it without
 * code changes, because every name here maps 1:1 to the Rive state machine (see RIVE below).
 *
 * Three layers run at the same time:
 * - Base layer (always): breathing, blinks, tail sway, ear flicks, glances, eyes following touch.
 * - Emotion layer: the current mood. The face and body blend into it and stay there.
 * - Reaction layer: one-shot moods (REACTIONS). They play once, then blend back to the mood
 *   Biscuit was in before. Flow: idle → reaction → idle.
 */
export const EXPRESSIONS = [
  'idle', // calm, small ω smile
  'happy', // ^ ^ eyes, open smile, arms out, a small hop
  'excited', // sparkly eyes, paws up, two quick hops
  'love', // heart eyes, paws at the cheeks, hearts (reaction)
  'thinking', // eyes up, one brow raised, paw on the chin
  'hungry', // sparkly eyes, tongue out, paws together (no drool)
  'eating', // full cheeks, holding a spoon, chewing
  'cooking', // stirring a pot
  'chopping', // focused, knife held safely over a board
  'worried', // one small blue sweat drop, paws together
  'shocked', // tiny pupils, round mouth, jumps back (reaction)
  'sleepy', // heavy lids, head droops, a small z
  'proud', // eyes closed, chin up, chest out
  'celebrating', // jumping, arms up, confetti (reaction)
  'oops', // sheepish grin, paw behind the head, flour on the cheek (reaction)
] as const;

/** Extra moods the app uses for the cooking timer. They reuse an expression's face. */
export const ACTIONS = [
  'wave', // hello
  'watch', // looks up at the timer
  'alarm', // the timer is ringing: waves until stopped
] as const;

export const MOODS = [...EXPRESSIONS, ...ACTIONS] as const;
export type Mood = (typeof MOODS)[number];

/** One-shot moods: they play once and return to the mood before. */
export const REACTIONS = ['celebrating', 'love', 'oops', 'shocked'] as const satisfies readonly Mood[];
export type Reaction = (typeof REACTIONS)[number];
export const isReaction = (m: Mood): m is Reaction => (REACTIONS as readonly Mood[]).includes(m);

/**
 * The Rive contract. A Rive file built for Biscuit uses:
 *   state machine  "Biscuit"
 *   number  input  "mood"         the index of the mood in MOODS (0 = idle)
 *   boolean input  "talking"      mouth moves while a line types out
 *   number  inputs "lookX","lookY" -1..1, where the eyes look
 *   boolean input  "reduceMotion" only fades and blinks
 *   triggers       "celebrating", "love", "oops", "shocked" (the reactions) and "pet"
 * State names in the file are the mood names above.
 */
export const RIVE = {
  stateMachine: 'Biscuit',
  inputs: { mood: 'mood', talking: 'talking', lookX: 'lookX', lookY: 'lookY', reduceMotion: 'reduceMotion' },
  triggers: [...REACTIONS, 'pet'] as const,
  moodIndex: (m: Mood) => MOODS.indexOf(m),
} as const;

/* ------------------------------------------------------------------ */
/* What each mood looks like                                            */
/* ------------------------------------------------------------------ */

export type Eyes = 'oval' | 'sparkle' | 'heart' | 'arc' | 'closed' | 'tiny' | 'half' | 'focus' | 'squeeze';
export type Mouth = 'w' | 'open' | 'big' | 'small' | 'tongue' | 'chew' | 'wavy' | 'o' | 'grin' | 'smile' | 'flat';
export type Brows = 'none' | 'raised' | 'worried' | 'determined' | 'high';
export type Prop = 'spoon' | 'pot' | 'board';
export type Fx = 'hearts' | 'sparkle' | 'zzz' | 'sweat' | 'dots' | 'confetti' | 'steam' | 'flour' | 'ring' | 'note';
/** Where an arm is drawn: behind the body, in front of the body, or in front of the face. */
export type ArmLayer = 'back' | 'front' | 'over';

export type MoodSpec = {
  eyes: Eyes;
  mouth: Mouth;
  brows: Brows;
  /** Arm angles in degrees. 0 hangs straight down; positive swings outward and up; negative crosses in front. */
  armL: number;
  armR: number;
  layerL: ArmLayer;
  layerR: ArmLayer;
  /** Pink toe beans: only when a paw is raised and facing you. */
  palmL?: boolean;
  palmR?: boolean;
  /** Head tilt (degrees, + leans right), and how far it moves (in 200-unit art space). */
  headTilt: number;
  headY: number;
  /** Whole-body lean (degrees). */
  lean: number;
  /** Where the eyes rest, -1..1. */
  look: readonly [number, number];
  /** Full cheeks (eating). */
  puff?: boolean;
  /** Stronger blush (love, oops). */
  blush?: boolean;
  /** What Biscuit holds or stands behind. */
  props: readonly Prop[];
  fx: readonly Fx[];
  /** Entry move when the mood starts: hops, a shiver, a jump back, or nothing. */
  entry: 'none' | 'hop' | 'hop2' | 'shiver' | 'jumpBack' | 'puff' | 'nod';
  /** A loop while the mood lasts. */
  loop?: 'stir' | 'chop' | 'chew' | 'wave' | 'sway';
  /** Tail sway speed multiplier (sleepy is slow, excited is quick). */
  tailSpeed?: number;
};

const rest = { layerL: 'front', layerR: 'front', headTilt: 0, headY: 0, lean: 0, look: [0, 0], props: [], fx: [], entry: 'none' } as const;

export const moodSpecs: Record<Mood, MoodSpec> = {
  idle: { ...rest, eyes: 'oval', mouth: 'w', brows: 'none', armL: 32, armR: 32, layerL: 'back', layerR: 'back' },
  happy: { ...rest, eyes: 'arc', mouth: 'open', brows: 'none', armL: 72, armR: 72, layerL: 'back', layerR: 'back', headTilt: 4, entry: 'hop', tailSpeed: 1.4 },
  excited: { ...rest, eyes: 'sparkle', mouth: 'big', brows: 'high', armL: 124, armR: 124, layerL: 'front', layerR: 'front', palmL: true, palmR: true, headY: -2, fx: ['sparkle'], entry: 'hop2', tailSpeed: 2 },
  love: { ...rest, eyes: 'heart', mouth: 'w', brows: 'none', armL: -96, armR: -96, layerL: 'over', layerR: 'over', headTilt: 6, blush: true, fx: ['hearts'], entry: 'puff' },
  thinking: { ...rest, eyes: 'oval', mouth: 'small', brows: 'raised', armL: 30, armR: -88, layerL: 'back', layerR: 'over', headTilt: -6, look: [-0.7, -0.9], fx: ['dots'], entry: 'nod' },
  hungry: { ...rest, eyes: 'sparkle', mouth: 'tongue', brows: 'high', armL: -62, armR: -62, headY: 3, look: [0, 0.3], entry: 'hop', tailSpeed: 1.6 },
  eating: { ...rest, eyes: 'arc', mouth: 'chew', brows: 'none', armL: 30, armR: -104, layerL: 'back', layerR: 'over', puff: true, props: ['spoon'], entry: 'nod', loop: 'chew' },
  cooking: { ...rest, eyes: 'oval', mouth: 'w', brows: 'none', armL: -34, armR: -38, look: [0.2, 0.9], headY: 2, props: ['pot'], fx: ['steam'], loop: 'stir' },
  chopping: { ...rest, eyes: 'focus', mouth: 'flat', brows: 'determined', armL: -22, armR: -12, look: [0.3, 1], headY: 3, props: ['board'], loop: 'chop' },
  worried: { ...rest, eyes: 'oval', mouth: 'wavy', brows: 'worried', armL: -62, armR: -62, look: [0.2, 0.2], fx: ['sweat'], entry: 'shiver', tailSpeed: 0.7 },
  shocked: { ...rest, eyes: 'tiny', mouth: 'o', brows: 'high', armL: -96, armR: -96, layerL: 'over', layerR: 'over', headY: -2, entry: 'jumpBack' },
  sleepy: { ...rest, eyes: 'half', mouth: 'small', brows: 'none', armL: 16, armR: 16, layerL: 'back', layerR: 'back', headTilt: 9, headY: 3, fx: ['zzz'], tailSpeed: 0.5 },
  proud: { ...rest, eyes: 'closed', mouth: 'smile', brows: 'none', armL: 54, armR: 54, layerL: 'back', layerR: 'back', headTilt: -3, headY: -3, fx: ['sparkle'], entry: 'puff' },
  celebrating: { ...rest, eyes: 'arc', mouth: 'big', brows: 'none', armL: 130, armR: 130, layerL: 'front', layerR: 'front', palmL: true, palmR: true, headY: -2, fx: ['confetti'], entry: 'hop2', tailSpeed: 2 },
  oops: { ...rest, eyes: 'squeeze', mouth: 'grin', brows: 'worried', armL: 30, armR: 140, layerL: 'back', layerR: 'front', headTilt: -7, blush: true, fx: ['flour'], entry: 'nod' },
  wave: { ...rest, eyes: 'oval', mouth: 'open', brows: 'none', armL: 30, armR: 140, layerL: 'back', layerR: 'back', palmR: true, headTilt: 4, loop: 'wave' },
  watch: { ...rest, eyes: 'oval', mouth: 'small', brows: 'none', armL: 30, armR: 30, layerL: 'back', layerR: 'back', look: [0, -1], headTilt: -3 },
  alarm: { ...rest, eyes: 'sparkle', mouth: 'open', brows: 'high', armL: 30, armR: 140, layerL: 'back', layerR: 'back', palmR: true, fx: ['ring'], loop: 'wave', tailSpeed: 2 },
};

/** Moods whose eyes can wander and follow your finger (not closed, heart or squeezed eyes). */
export const canLook = (e: Eyes) => e === 'oval' || e === 'sparkle' || e === 'focus' || e === 'tiny';
