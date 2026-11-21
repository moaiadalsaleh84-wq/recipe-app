/**
 * Chef tips for the after-cook bonus, matched to a recipe's main ingredient (see mainIngredient in
 * lib/bonus.ts). 'any' tips fit every recipe. Short, practical, true.
 */
export type TipKey = 'chicken' | 'rice' | 'pasta' | 'egg' | 'potato' | 'tomato' | 'mushroom' | 'cheese' | 'pastry' | 'chocolate' | 'pepper' | 'any';

export const chefTips: { key: TipKey; tip: string }[] = [
  { key: 'chicken', tip: 'Pat chicken dry before it hits the pan: dry meat browns, wet meat steams.' },
  { key: 'chicken', tip: 'Let cooked chicken rest for 5 minutes before slicing. The juices stay inside.' },
  { key: 'chicken', tip: 'Chicken thighs forgive overcooking far more than breasts. Great for busy nights.' },
  { key: 'rice', tip: 'Day-old rice fries best: it’s drier, so the grains stay separate instead of turning mushy.' },
  { key: 'rice', tip: 'Rinse rice until the water runs almost clear for fluffier grains.' },
  { key: 'rice', tip: 'Leave rice lid-on for 10 minutes after cooking. The steam finishes the job.' },
  { key: 'pasta', tip: 'Salt pasta water until it tastes like a mild soup. It’s your only chance to season the pasta itself.' },
  { key: 'pasta', tip: 'Save a mug of pasta water. Its starch turns any sauce silky.' },
  { key: 'pasta', tip: 'Finish pasta in the pan with the sauce for the last minute, so it soaks up the flavor.' },
  { key: 'egg', tip: 'Eggs keep cooking off the heat. Take them off when they look a touch underdone.' },
  { key: 'egg', tip: 'Room-temperature eggs mix more evenly into batters and doughs.' },
  { key: 'potato', tip: 'Start potatoes in cold salted water so they cook evenly to the middle.' },
  { key: 'potato', tip: 'For crispy roast potatoes, shake them in the pan after boiling to rough up the edges.' },
  { key: 'tomato', tip: 'A pinch of sugar takes the sharp edge off a tomato sauce that tastes too acidic.' },
  { key: 'tomato', tip: 'Cook tomato paste for a minute in the oil before adding liquid. It turns sweeter and deeper.' },
  { key: 'mushroom', tip: 'Don’t crowd mushrooms in the pan. Give them room and they’ll brown instead of sweat.' },
  { key: 'mushroom', tip: 'Wipe mushrooms with a damp cloth rather than soaking them: they drink up water.' },
  { key: 'cheese', tip: 'Take cheese off the heat before stirring it into sauce, or it can turn grainy.' },
  { key: 'cheese', tip: 'Grate hard cheese finely and it melts into a sauce in seconds.' },
  { key: 'pastry', tip: 'Keep pastry cold until it goes in the oven. Cold butter makes the flaky layers.' },
  { key: 'pastry', tip: 'Brush pastry with beaten egg for a deep golden shine.' },
  { key: 'chocolate', tip: 'Melt chocolate gently in short bursts and stir between them. It scorches easily.' },
  { key: 'chocolate', tip: 'A tiny pinch of salt makes chocolate taste more chocolatey.' },
  { key: 'pepper', tip: 'Charring peppers until black, then covering them for 10 minutes, makes the skins slip off.' },
  { key: 'any', tip: 'Read the whole recipe once before you start. You just did it the pro way in Get ready!' },
  { key: 'any', tip: 'Taste as you go and season in small amounts: you can always add, never take away.' },
  { key: 'any', tip: 'A squeeze of lemon at the end wakes up almost any savory dish.' },
  { key: 'any', tip: 'Heat the pan before the oil, and the oil before the food, for less sticking.' },
  { key: 'any', tip: 'A sharp knife is safer than a blunt one: it goes where you aim it.' },
  { key: 'any', tip: 'Clean as you cook and the washing up is half done by the time you eat.' },
];
