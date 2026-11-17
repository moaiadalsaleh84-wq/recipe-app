/**
 * What Biscuit says. Every line carries the mood Biscuit acts out while saying it, so the
 * animation always matches the words.
 *
 * Biscuit's voice: warm, funny and encouraging. A little clumsy, "taste tests" half the
 * ingredients, loves a nap in a sunny spot, and is your biggest fan. Never preachy about food.
 */
import type { Mood } from './moods';

/**
 * `text` is one short line (about 8 words at most). `more` is the longer version, shown only when
 * the bubble is tapped.
 */
export type Line = { text: string; mood: Mood; more?: string };
type Vars = Record<string, string | number>;

export type Situation =
  | 'intro'
  | 'greetMorning'
  | 'greetAfternoon'
  | 'greetEvening'
  | 'greetLate'
  | 'tip'
  | 'pet'
  | 'recipeHighProtein'
  | 'recipeLight'
  | 'recipeTreat'
  | 'recipeComfort'
  | 'addedToList'
  | 'itemChecked'
  | 'listDone'
  | 'listEmpty'
  | 'favorite'
  | 'noResults'
  | 'cookStart'
  | 'stepStir'
  | 'stepHeat'
  | 'stepChop'
  | 'stepWait'
  | 'stepServe'
  | 'stepOther'
  | 'timerStart'
  | 'timerDone'
  | 'timerStopped'
  | 'cookDone'
  | 'planEmptyDay'
  | 'planDay'
  | 'goalHit'
  | 'savedEmpty'
  | 'recipeSaved'
  | 'newRecipe';

/** A surprise line now and then, so Biscuit doesn't always say the same thing. */
const rare: Partial<Record<Situation, Line[]>> = {
  greetMorning: [{ text: 'I dreamt about pancakes again.', mood: 'sleepy' }],
  greetAfternoon: [{ text: 'I counted the spoons. All here!', mood: 'proud' }],
  greetEvening: [{ text: 'My tummy says it’s dinner time.', mood: 'happy' }],
  itemChecked: [{ text: 'Ooh, can I carry that one?', mood: 'excited' }],
  stepStir: [{ text: 'Stirring is my cardio.', mood: 'cooking' }],
  stepOther: [{ text: 'Look at you go, chef!', mood: 'cooking' }],
  cookDone: [{ text: 'Chef’s kiss! Well, cat’s kiss.', mood: 'celebrating' }],
};

const script: Record<Situation, Line[]> = {
  intro: [{ text: 'Hi! I’m Biscuit, your kitchen buddy.', mood: 'wave' }],
  greetMorning: [
    { text: 'Good morning, {name}!', mood: 'wave' },
    { text: 'Morning, {name}! Breakfast time?', mood: 'happy' },
  ],
  greetAfternoon: [
    { text: 'Hi {name}! It’s snack o’clock.', mood: 'wave' },
    { text: 'Afternoon, {name}! I’m awake, promise.', mood: 'sleepy' },
  ],
  greetLate: [
    { text: 'Still up, {name}? Midnight snack?', mood: 'sleepy' },
    { text: 'Yawn… a late one, {name}!', mood: 'sleepy' },
  ],
  greetEvening: [
    { text: 'Dinner time, {name}!', mood: 'wave' },
    { text: 'Evening, {name}! What’s cooking?', mood: 'happy' },
  ],
  tip: [
    { text: 'Read the recipe first.', more: 'Read the whole recipe before you start. I learned that the hard way. Twice.', mood: 'oops' },
    { text: 'Taste as you go!', more: 'Taste as you go, and add salt a little at a time. It’s my favorite cooking rule.', mood: 'happy' },
    { text: 'Salt your pasta water.', more: 'Salt your pasta water like the sea. But please don’t drink the sea.', mood: 'thinking' },
    { text: 'Let meat rest.', more: 'Let meat rest a few minutes before you slice it, so it stays juicy. Like me after lunch.', mood: 'sleepy' },
    { text: 'Set everything out first.', more: 'Put every ingredient out before you start. Fewer surprises, fewer oopsies!', mood: 'proud' },
    { text: 'Keep your knife sharp.', more: 'A sharp knife is a safe knife. A dull one slips. Ask my whiskers.', mood: 'worried' },
    { text: 'I knead you to know…', more: 'I knead you to know you’re doing great. Get it? Knead? Like bread?', mood: 'love' },
  ],
  pet: [
    { text: 'Purrrr… I’m melting.', mood: 'love' },
    { text: 'Hehe, that tickles!', mood: 'love' },
    { text: 'Best. Day. Ever.', mood: 'love' },
    { text: 'Do the ears next!', mood: 'love' },
  ],
  recipeHighProtein: [
    { text: 'This one keeps you full.', mood: 'hungry' },
    { text: 'A proper hearty one!', mood: 'hungry' },
  ],
  recipeLight: [
    { text: 'Light and fresh!', mood: 'hungry' },
    { text: 'Leaves room for dessert.', mood: 'hungry' },
  ],
  recipeTreat: [
    { text: 'Ooooh, dessert!', mood: 'hungry' },
    { text: 'I’ll lick the spoon.', mood: 'hungry' },
  ],
  recipeComfort: [
    { text: 'A cozy one!', mood: 'hungry' },
    { text: 'Perfect for sock weather.', mood: 'hungry' },
  ],
  addedToList: [{ text: 'It’s on the list!', mood: 'happy' }],
  itemChecked: [
    { text: 'In the basket!', mood: 'happy' },
    { text: 'Got it!', mood: 'proud' },
    { text: 'One more down!', mood: 'excited' },
  ],
  listDone: [{ text: 'All done! Treat time?', mood: 'celebrating' }],
  listEmpty: [{ text: 'Pick a recipe to fill the list.', mood: 'thinking' }],
  favorite: [{ text: 'Saved! Good taste.', mood: 'happy' }],
  noResults: [{ text: 'I looked everywhere! Try fewer filters.', mood: 'oops' }],
  cookStart: [{ text: 'Aprons on! Tick off each ingredient.', mood: 'excited' }],
  stepStir: [{ text: 'Stir, stir, stir!', mood: 'cooking' }],
  stepHeat: [{ text: 'Careful, it’s hot!', mood: 'worried' }],
  stepChop: [{ text: 'Tuck your fingers in!', mood: 'chopping' }],
  stepWait: [{ text: 'Now we wait.', mood: 'cooking' }],
  stepServe: [{ text: 'Plating time! Make it pretty.', mood: 'hungry' }],
  stepOther: [{ text: 'You’re doing great!', mood: 'cooking' }],
  timerStart: [{ text: 'Timer’s on! I’m watching it.', mood: 'watch' }],
  timerDone: [{ text: 'Ding! Take a look, then tap Stop.', mood: 'alarm' }],
  timerStopped: [{ text: 'Right on time!', mood: 'proud' }],
  cookDone: [{ text: 'You did it! It smells amazing.', mood: 'celebrating' }],
  planEmptyDay: [{ text: 'Nothing planned yet. I vote dessert.', mood: 'thinking' }],
  planDay: [{ text: 'About {calories} kcal planned today.', mood: 'happy' }],
  goalHit: [{ text: 'You hit your goal today!', mood: 'celebrating' }],
  savedEmpty: [{ text: 'Tap a heart to save a recipe.', mood: 'love' }],
  recipeSaved: [{ text: 'A new recipe! I love it.', mood: 'happy' }],
  newRecipe: [{ text: 'Your own recipe? Tell me everything!', mood: 'excited' }],
};

const fill = (text: string, vars: Vars) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')).replace(/\s+/g, ' ').trim();

/**
 * Pick a line. `n` cycles through the options so repeated taps show new lines.
 * Pass `surprise` (a number from 0 to 1, e.g. Math.random() made once per visit) and roughly one
 * time in five Biscuit says one of its rarer lines instead.
 */
export function say(situation: Situation, vars: Vars = {}, n = 0, surprise = 1): Line {
  const extras = rare[situation];
  const options = extras && surprise < 0.2 ? extras : script[situation];
  const line = options[Math.abs(n) % options.length];
  const all: Vars = { name: 'friend', ...Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== '' && v !== undefined)) };
  return { mood: line.mood, text: fill(line.text, all), more: line.more ? fill(line.more, all) : undefined };
}

export const greetingSituation = (date = new Date()): Situation => {
  const h = date.getHours();
  return h < 5 ? 'greetLate' : h < 11 ? 'greetMorning' : h < 17 ? 'greetAfternoon' : h < 21 ? 'greetEvening' : 'greetLate';
};

/** Figure out what a cooking step is about, so Biscuit can react to it. */
export function stepSituation(step: string): Situation {
  const s = step.toLowerCase();
  if (/\b(serve|plate|top with|garnish|finish)\b/.test(s)) return 'stepServe';
  if (/\b(stir|whisk|mix|toss|fold|beat|knead|blend)\b/.test(s)) return 'stepStir';
  if (/\b(bake|simmer|rest|chill|marinate|boil|cook for|cover)\b/.test(s)) return 'stepWait';
  if (/\b(fry|sear|hot|heat|oven|grill|roast)\b/.test(s)) return 'stepHeat';
  if (/\b(chop|slice|dice|cut|shred|crush|peel)\b/.test(s)) return 'stepChop';
  return 'stepOther';
}
