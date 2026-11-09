export type BuddyId = 'tank' | 'biscuit';

/** What the cat is doing. Each mood has its own face, pose and animation. */
export type Mood =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'love' // being petted or praised
  | 'think'
  | 'worried'
  | 'celebrate'
  | 'sleepy'
  | 'stir' // cooking
  | 'eat' // taste testing
  | 'flex' // Tank: double biceps
  | 'lift' // Tank: dumbbell curls
  | 'oops' // Biscuit: clumsy wobble
  | 'proud'
  | 'wait'; // timers

export type Eyes = 'default' | 'normal' | 'happy' | 'closed' | 'wide' | 'determined' | 'wink';
export type Mouth = 'cat' | 'open' | 'smile' | 'flat' | 'o' | 'chew' | 'tongue';
export type Prop = 'none' | 'spoon' | 'dumbbell' | 'cookie';
export type Effect = 'sweat' | 'sparkle' | 'hearts' | 'zzz' | 'dots' | 'crumbs' | 'poof' | 'steam' | 'confetti' | 'bowl';
