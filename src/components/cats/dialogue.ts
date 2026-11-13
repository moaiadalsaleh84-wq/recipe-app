/**
 * What the buddies say. Every line carries the mood the cat acts out while saying it,
 * so the animation always matches the words.
 *
 * TANK, the coach: tough but kind. Short, direct sentences, calls you "champ".
 * Counts everything in reps, cares about protein, but never shames food and always
 * respects rest days. Secretly soft: gets flustered when petted and has a weakness for cookies.
 *
 * BISCUIT, the chef: funny, sweet and very clumsy. Drops things, "taste tests" half
 * the ingredients, makes terrible puns, naps in sunny spots, and is your biggest fan.
 */
import type { BuddyId, Mood } from './types';

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

const tank: Record<Situation, Line[]> = {
  intro: [
    { text: "I'm Tank. I'll help you eat well and get strong. No crash diets, no excuses. Deal?", mood: 'flex' },
  ],
  greetMorning: [
    { text: 'Morning, {name}. Breakfast is rep one of the day. Let’s get it.', mood: 'wave' },
    { text: 'Up early? Good. Protein in the first meal keeps you strong till lunch.', mood: 'flex' },
  ],
  greetAfternoon: [
    { text: 'Afternoon check-in, {name}. Hydrated? Drink some water. I’ll wait.', mood: 'drink' },
    { text: 'Halfway through the day. Fuel up right and finish strong.', mood: 'lift' },
  ],
  greetEvening: [
    { text: 'Evening, {name}. Good dinner, good sleep, good gains. That’s the program.', mood: 'proud' },
    { text: 'Long day? Cook something simple. Consistency beats perfect.', mood: 'nod' },
  ],
  tip: [
    { text: 'Aim for protein in every meal. Your muscles say thank you.', mood: 'flex' },
    { text: 'Rest days are part of training. Recovery is where you grow.', mood: 'sleepy' },
    { text: 'No food is “bad”. Some are everyday food, some are sometimes food.', mood: 'shrug' },
    { text: 'Prep two lunches tonight and future you gets a day off. Smart.', mood: 'proud' },
    { text: 'A walk after dinner counts. Every rep counts.', mood: 'lift' },
    { text: 'Plan your week on Sunday. Champions plan.', mood: 'think' },
  ],
  pet: [
    { text: 'H-hey. We’re training here… …okay, one more pat.', mood: 'love' },
    { text: 'That’s… not in the workout plan. Do it again.', mood: 'love' },
  ],
  recipeHighProtein: [
    { text: '{protein} g protein per serving. Now that’s a recipe with muscles.', mood: 'flex' },
    { text: 'High protein, real food. This one’s on my team.', mood: 'lift' },
  ],
  recipeLight: [
    { text: 'Light and smart. Pair it with some protein and you’re golden.', mood: 'proud' },
  ],
  recipeTreat: [
    { text: 'A treat? Sure. Enjoy it, no guilt. Then back to work tomorrow.', mood: 'shrug' },
    { text: '…save me a slice. For research. Don’t tell anyone.', mood: 'love' },
  ],
  recipeComfort: [
    { text: 'Solid meal. Watch the portion and you’ve got a winner.', mood: 'nod' },
  ],
  addedToList: [{ text: 'Ingredients loaded. Shopping is cardio too.', mood: 'lift' }],
  itemChecked: [
    { text: 'One down. Keep moving.', mood: 'proud' },
    { text: 'Good rep.', mood: 'flex' },
  ],
  listDone: [{ text: 'Full basket. Mission complete, champ!', mood: 'celebrate' }],
  listEmpty: [{ text: 'Empty list. Pick a recipe and we’ll stock up.', mood: 'point' }],
  favorite: [{ text: 'Saved. Good choice.', mood: 'proud' }],
  noResults: [{ text: 'Nothing matches. Loosen a filter, champ.', mood: 'shrug' }],
  cookStart: [{ text: 'Apron on. Read every step, then attack. Let’s cook!', mood: 'flex' }],
  stepStir: [{ text: 'Stir it like you mean it. That’s arm day.', mood: 'stir' }],
  stepHeat: [{ text: 'Hot pan. Focus. Keep your fingers safe.', mood: 'worried' }],
  stepChop: [{ text: 'Knife skills. Slow is smooth, smooth is fast.', mood: 'nod' }],
  stepWait: [{ text: 'Waiting time. Perfect for ten squats. Just saying.', mood: 'lift' }],
  stepServe: [{ text: 'Plate it up. You earned this.', mood: 'proud' }],
  stepOther: [{ text: 'Next rep. You’ve got this.', mood: 'nod' }],
  timerStart: [{ text: 'Timer’s running. I’ll keep watch.', mood: 'wait' }],
  timerDone: [{ text: 'Time’s up, champ. Go check it, then tap Stop.', mood: 'alarm' }],
  timerStopped: [{ text: 'Good timing. That’s discipline. Next rep.', mood: 'proud' }],
  cookDone: [{ text: 'Meal complete! Proud of you. Now eat and recover.', mood: 'celebrate' }],
  planEmptyDay: [{ text: 'Empty day? Plan it now and you won’t panic-order later.', mood: 'point' }],
  planDay: [{ text: 'About {calories} kcal and {protein} g protein planned today. {goalNote}', mood: 'proud' }],
  goalHit: [{ text: 'Protein goal hit! That’s how champions eat.', mood: 'celebrate' }],
  savedEmpty: [{ text: 'No saved recipes yet. Tap a heart and build your playbook.', mood: 'point' }],
  recipeSaved: [{ text: 'New recipe in the playbook. Let’s train it.', mood: 'flex' }],
  newRecipe: [{ text: 'Your own recipe? Respect. Write it down clearly.', mood: 'nod' }],
};

const biscuit: Record<Situation, Line[]> = {
  intro: [
    { text: 'Hiii! I’m Biscuit, your chef! I’m great at cooking and only a little bit at dropping things. Mostly great!', mood: 'wave' },
  ],
  greetMorning: [
    { text: 'Good morning, {name}! I already taste-tested breakfast. For safety reasons.', mood: 'eat' },
    { text: 'Morning! I made coffee! …I think I made coffee. Something is bubbling.', mood: 'worried' },
  ],
  greetAfternoon: [
    { text: 'Hi {name}! It’s afternoon snack o’clock. That’s a real time. I checked.', mood: 'happy' },
    { text: 'I was napping in the sunny spot. I’m awake! I’m awake.', mood: 'sleepy' },
  ],
  greetEvening: [
    { text: 'Dinner time, {name}! Let’s make something cozy. I’ll hold the spoon!', mood: 'stir' },
    { text: 'Evening! I only dropped two things today. New record!', mood: 'proud' },
  ],
  tip: [
    { text: 'Read the whole recipe first. I learned that the hard way. Twice.', mood: 'oops' },
    { text: 'Taste as you go! That’s my favorite cooking rule. Mmm.', mood: 'eat' },
    { text: 'Salt your pasta water like the sea! But don’t drink the sea.', mood: 'point' },
    { text: 'Let your meat rest before slicing. Like me after lunch.', mood: 'sleepy' },
    { text: 'Put everything out before you start. Fewer surprises, fewer oopsies!', mood: 'happy' },
    { text: 'I knead you to know you’re doing great. Get it? Knead? Bread? Hehe.', mood: 'love' },
  ],
  pet: [
    { text: 'Purrrr… okay I’m melting. This is fine.', mood: 'love' },
    { text: 'Hehe that tickles! Do the ears next!', mood: 'love' },
  ],
  recipeHighProtein: [{ text: '{protein} g of protein! Tank would do a little flex about this.', mood: 'happy' }],
  recipeLight: [{ text: 'Light and fresh! Leaves room for dessert. Just saying!', mood: 'happy' }],
  recipeTreat: [
    { text: 'Ooooh dessert! I volunteer to lick the spoon. Very important job.', mood: 'eat' },
    { text: 'This one smells like happiness. I can smell through the screen.', mood: 'love' },
  ],
  recipeComfort: [
    { text: 'This is a cozy one! Perfect for blanket and sock weather.', mood: 'happy' },
    { text: 'I made this once and only spilled half! It was still delicious.', mood: 'oops' },
  ],
  addedToList: [{ text: 'On the list! I wrote it with my paw. Very neat. Mostly.', mood: 'happy' }],
  itemChecked: [
    { text: 'In the basket! Wheee!', mood: 'happy' },
    { text: 'Got it! I didn’t even drop it!', mood: 'proud' },
  ],
  listDone: [{ text: 'All done! Shopping champions! Can we get a treat?', mood: 'celebrate' }],
  listEmpty: [{ text: 'The list is empty… like my snack bowl. Let’s fix both!', mood: 'worried' }],
  favorite: [{ text: 'Saved! I’ll remember it. I’ll try to remember it.', mood: 'happy' }],
  noResults: [{ text: 'Hmm, I looked everywhere. Even under the fridge!', mood: 'shrug' }],
  cookStart: [{ text: 'Let’s cook! Aprons on! I put mine on backwards. It’s fine!', mood: 'oops' }],
  stepStir: [{ text: 'Stir stir stir! Round and round! I’m getting dizzy!', mood: 'stir' }],
  stepHeat: [{ text: 'Careful, it’s hot! My whiskers know. Ask me how.', mood: 'worried' }],
  stepChop: [{ text: 'Chop chop! Tuck your fingers like little cat paws!', mood: 'point' }],
  stepWait: [{ text: 'Now we wait… perfect time for a tiny nap.', mood: 'sleepy' }],
  stepServe: [{ text: 'Plating time! Make it pretty! I’ll do the taste test.', mood: 'eat' }],
  stepOther: [{ text: 'You’re doing amazing! I believe in you!', mood: 'happy' }],
  timerStart: [{ text: 'Timer on! I’ll watch it! …I’ll try not to fall asleep.', mood: 'wait' }],
  timerDone: [{ text: 'Ding! The timer’s done. Come take a look, then tap Stop.', mood: 'alarm' }],
  timerStopped: [{ text: 'Phew! Saved it! I didn’t even drop anything!', mood: 'happy' }],
  cookDone: [{ text: 'You did it! It smells AMAZING. Can I have a little bite? Pleeease?', mood: 'celebrate' }],
  planEmptyDay: [{ text: 'Nothing planned yet! Want me to pick? I always pick dessert.', mood: 'point' }],
  planDay: [{ text: 'About {calories} kcal of yummy planned today! {goalNote}', mood: 'happy' }],
  goalHit: [{ text: 'You hit your goal! Tank is probably crying happy tears.', mood: 'celebrate' }],
  savedEmpty: [{ text: 'No favorites yet! Tap a heart, it’s like a little hug for a recipe.', mood: 'love' }],
  recipeSaved: [{ text: 'A new recipe! I already love it. Can we make it now?', mood: 'happy' }],
  newRecipe: [{ text: 'Ooh, your own recipe! Tell me everything!', mood: 'happy' }],
};

const scripts: Record<BuddyId, Record<Situation, Line[]>> = { tank, biscuit };

export const buddyInfo: Record<BuddyId, { name: string; title: string; tagline: string; traits: string[] }> = {
  tank: {
    name: 'Tank',
    title: 'Coach Tank',
    tagline: 'Tough love, high protein. Helps you eat well and get in shape.',
    traits: ['Protein & goals', 'No-guilt coaching', 'Secretly soft'],
  },
  biscuit: {
    name: 'Biscuit',
    title: 'Chef Biscuit',
    tagline: 'Clumsy, funny and always hungry. Makes cooking cozy and fun.',
    traits: ['Kitchen tips & puns', 'Taste tester', 'Professional napper'],
  },
};

/** Pick a line. `n` cycles through the options so repeated taps show new lines. */
export function say(buddy: BuddyId, situation: Situation, vars: Vars = {}, n = 0): Line {
  const options = scripts[buddy][situation];
  const line = options[Math.abs(n) % options.length];
  const defaults: Vars = { name: buddy === 'tank' ? 'champ' : 'friend' };
  const all = { ...defaults, ...Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== '' && v !== undefined)) };
  return { mood: line.mood, text: line.text.replace(/\{(\w+)\}/g, (_, k: string) => String(all[k] ?? '')).replace(/\s+/g, ' ').trim() };
}

export const greetingSituation = (date = new Date()): Situation => {
  const h = date.getHours();
  return h < 11 ? 'greetMorning' : h < 17 ? 'greetAfternoon' : 'greetEvening';
};

/** Figure out what a cooking step is about, so the cat can act it out. */
export function stepSituation(step: string): Situation {
  const s = step.toLowerCase();
  if (/\b(serve|plate|top with|garnish|finish)\b/.test(s)) return 'stepServe';
  if (/\b(stir|whisk|mix|toss|fold|beat|knead|blend)\b/.test(s)) return 'stepStir';
  if (/\b(bake|simmer|rest|chill|marinate|boil|cook for|cover)\b/.test(s)) return 'stepWait';
  if (/\b(fry|sear|hot|heat|oven|grill|roast)\b/.test(s)) return 'stepHeat';
  if (/\b(chop|slice|dice|cut|shred|crush|peel)\b/.test(s)) return 'stepChop';
  return 'stepOther';
}
