/** Every pose the fox has, and when each one is used. */
export const FOX_POSES = [
  'idle', // standing by: headers, quiet empty states
  'happy', // something nice happened: a step done, a heart, a saved recipe
  'wave', // hello: the welcome screen, a new user's first visit
  'reading', // working on it: importing, setting up
  'oops', // something went wrong: an import error, no search results
  'chef', // let's cook: Get ready, Cook mode
  'alert', // look!: a timer just finished
  'cheer', // big moments: finishing a recipe, streaks, level ups, badges
  'sleepy', // nothing here yet: empty lists and plans
] as const;

export type FoxPose = (typeof FOX_POSES)[number];
