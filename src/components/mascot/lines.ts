/**
 * What Biscuit says. Every line carries the mood Biscuit acts out while saying it, so the
 * animation always matches the words.
 *
 * Biscuit's voice: warm, funny and encouraging. A little clumsy, "taste tests" half the
 * ingredients, loves a nap in a sunny spot, and is your biggest fan. Never preachy about food.
 */
import type { Mood } from './moods';

export type Line = { text: string; mood: Mood };
type Vars = Record<string, string | number>;

export type Situation =
  | 'intro'
  | 'greetMorning'
  | 'greetAfternoon'
  | 'greetEvening'
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

const script: Record<Situation, Line[]> = {
  intro: [{ text: 'Hi! I’m Biscuit, your kitchen buddy. I’m great at cooking and only a little bit at dropping things.', mood: 'wave' }],
  greetMorning: [
    { text: 'Good morning, {name}! I already taste-tested breakfast. For safety reasons.', mood: 'wave' },
    { text: 'Morning, {name}! Something smells good. Oh wait, nothing’s cooking yet. Let’s fix that!', mood: 'happy' },
  ],
  greetAfternoon: [
    { text: 'Hi {name}! It’s snack o’clock. That’s a real time. I checked.', mood: 'wave' },
    { text: 'Afternoon, {name}! I was napping in the sunny spot. I’m awake! I’m awake.', mood: 'sleepy' },
  ],
  greetEvening: [
    { text: 'Dinner time, {name}! Let’s make something cozy.', mood: 'wave' },
    { text: 'Evening, {name}! I only dropped two things today. New record!', mood: 'proud' },
  ],
  tip: [
    { text: 'Read the whole recipe before you start. I learned that the hard way. Twice.', mood: 'oops' },
    { text: 'Taste as you go! It’s my favorite cooking rule.', mood: 'happy' },
    { text: 'Salt your pasta water like the sea. But don’t drink the sea.', mood: 'thinking' },
    { text: 'Let meat rest before you slice it. Like me after lunch.', mood: 'sleepy' },
    { text: 'Put everything out before you start. Fewer surprises, fewer oopsies!', mood: 'proud' },
    { text: 'A sharp knife is a safe knife. A dull one slips. Ask my whiskers.', mood: 'worried' },
    { text: 'I knead you to know you’re doing great. Get it? Knead? Like bread?', mood: 'love' },
  ],
  pet: [
    { text: 'Purrrr… okay, I’m melting. This is fine.', mood: 'love' },
    { text: 'Hehe, that tickles! Do the ears next!', mood: 'love' },
    { text: 'Best. Day. Ever.', mood: 'love' },
  ],
  recipeHighProtein: [
    { text: 'This one keeps you full for ages. I’d still want seconds.', mood: 'happy' },
    { text: 'A proper hearty one! Good for busy days.', mood: 'proud' },
  ],
  recipeLight: [
    { text: 'Light and fresh! Leaves room for dessert. Just saying.', mood: 'happy' },
    { text: 'Fresh and bright, like a sunny windowsill.', mood: 'love' },
  ],
  recipeTreat: [
    { text: 'Ooooh, dessert! I volunteer to lick the spoon. Very important job.', mood: 'excited' },
    { text: 'This one smells like happiness. I can smell through the screen.', mood: 'love' },
  ],
  recipeComfort: [
    { text: 'A cozy one! Perfect for blanket and sock weather.', mood: 'happy' },
    { text: 'I made this once and only spilled half. Still delicious!', mood: 'oops' },
  ],
  addedToList: [{ text: 'On the list! I wrote it with my paw. Very neat. Mostly.', mood: 'happy' }],
  itemChecked: [
    { text: 'In the basket!', mood: 'happy' },
    { text: 'Got it! I didn’t even drop it!', mood: 'proud' },
    { text: 'One more down. You’re quick!', mood: 'excited' },
  ],
  listDone: [{ text: 'Everything’s in the basket! Can we get a treat too?', mood: 'cheering' }],
  listEmpty: [{ text: 'The list is empty, like my snack bowl. Pick a recipe and we’ll fill both.', mood: 'thinking' }],
  favorite: [{ text: 'Saved! Good taste, by the way.', mood: 'hop' }],
  noResults: [{ text: 'I looked everywhere. Even under the fridge! Try fewer filters?', mood: 'thinking' }],
  cookStart: [{ text: 'Aprons on! Set out your ingredients and tap each one as you go.', mood: 'excited' }],
  stepStir: [{ text: 'Stir, stir, stir! Round and round. I’m getting dizzy just watching.', mood: 'happy' }],
  stepHeat: [{ text: 'Careful, it’s hot! My whiskers know. Don’t ask me how.', mood: 'worried' }],
  stepChop: [{ text: 'Chop chop! Tuck your fingers in like little cat paws.', mood: 'proud' }],
  stepWait: [{ text: 'Now we wait. I’ll keep an eye on it. Both eyes, even.', mood: 'watch' }],
  stepServe: [{ text: 'Plating time! Make it pretty. I’ll handle the taste test.', mood: 'excited' }],
  stepOther: [{ text: 'You’re doing great! On to the next one.', mood: 'happy' }],
  timerStart: [{ text: 'Timer’s on! I’m watching it. I won’t blink. Okay, I blinked.', mood: 'watch' }],
  timerDone: [{ text: 'Ding! The timer’s done. Go take a look, then tap Stop.', mood: 'alarm' }],
  timerStopped: [{ text: 'Right on time! Nothing burnt, nothing dropped.', mood: 'proud' }],
  cookDone: [{ text: 'You did it! It smells amazing. Can I have a little bite? Please?', mood: 'cheering' }],
  planEmptyDay: [{ text: 'Nothing planned yet. Want to add a meal? I always vote dessert.', mood: 'thinking' }],
  planDay: [{ text: 'About {calories} kcal of yummy planned today. {goalNote}', mood: 'happy' }],
  goalHit: [{ text: 'You hit your goal today! I’m doing a little dance.', mood: 'cheering' }],
  savedEmpty: [{ text: 'No favorites yet. Tap a heart on any recipe. It’s like a little hug for it.', mood: 'love' }],
  recipeSaved: [{ text: 'A new recipe! I already love it. Can we make it now?', mood: 'hop' }],
  newRecipe: [{ text: 'Ooh, your own recipe! Tell me everything.', mood: 'excited' }],
};

/** Pick a line. `n` cycles through the options so repeated taps show new lines. */
export function say(situation: Situation, vars: Vars = {}, n = 0): Line {
  const options = script[situation];
  const line = options[Math.abs(n) % options.length];
  const all: Vars = { name: 'friend', ...Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== '' && v !== undefined)) };
  return { mood: line.mood, text: line.text.replace(/\{(\w+)\}/g, (_, k: string) => String(all[k] ?? '')).replace(/\s+/g, ' ').trim() };
}

export const greetingSituation = (date = new Date()): Situation => {
  const h = date.getHours();
  return h < 11 ? 'greetMorning' : h < 17 ? 'greetAfternoon' : 'greetEvening';
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
