/**
 * Picks built from onboarding answers: which recipes fit a diet, how many you can cook with what you
 * have, and tonight's pick. Plain functions over the recipe list, so they're unit-tested in Node.
 */
import type { Recipe } from '../data/mock';
import type { Goal } from '../data/onboarding';
// The .ts endings let the unit tests (plain Node) load these files too.
import { pantryMatch } from './moods.ts';

const MEAT = /\b(chicken|beef|pork|lamb|mince|bacon|ham|sausages?|turkey|duck|chorizo|prosciutto|salami|pepperoni|veal|pancetta)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|prawns?|shrimps?|anchov\w*|sardines?|mackerel|haddock|crab|mussels?|squid)\b/i;
const PORK = /\b(pork|bacon|ham|chorizo|prosciutto|salami|pepperoni|pancetta|lard)\b/i;
// "Coconut milk", "oat milk" and the like are fine for dairy free.
const DAIRY = /(?<!coconut |oat |almond |soy |rice |peanut )\b(milk|cream|butter|cheese|feta|parmesan|mozzarella|cheddar|yogh?urt|paneer|ghee|halloumi|ricotta|mascarpone|custard)\b/i;

const ingredientText = (r: Recipe) => r.ingredients.map((i) => i.name).join(', ');

/** True when a recipe fits every diet choice. Uses the recipe's tags, and its ingredients where tags can't tell. */
export function fitsDiet(r: Recipe, diets: readonly string[]): boolean {
  const text = ingredientText(r);
  const tags = r.tags as readonly string[];
  return diets.every((d) => {
    switch (d) {
      case 'Vegetarian':
        return tags.includes('Vegetarian') || tags.includes('Vegan') || (!MEAT.test(text) && !FISH.test(text));
      case 'Vegan':
        return tags.includes('Vegan');
      case 'Pescatarian':
        return !MEAT.test(text);
      case 'High protein':
        return tags.includes('High protein') || r.nutrition.protein >= 25;
      case 'Gluten free':
        return tags.includes('Gluten free');
      case 'Dairy free':
        return !DAIRY.test(text);
      case 'No pork':
        return !PORK.test(text);
      default:
        return true; // an older saved choice we don't know: don't filter on it
    }
  });
}

/** Can mostly make it: you have at least half of its ingredients (salt, pepper and water don't count). */
export const canMostlyMake = (r: Recipe, pantry: string[]) => {
  const m = pantryMatch(r, pantry);
  return m.needed > 0 && m.have / m.needed >= 0.5;
};

/** "{n} recipes you can cook right now": recipes (fitting the diet) you have at least half of. */
export const cookableCount = (recipes: Recipe[], pantry: string[], diets: readonly string[] = []) =>
  recipes.filter((r) => fitsDiet(r, diets) && canMostlyMake(r, pantry)).length;

/** Does a recipe suit the goal? Get in shape: high protein. Learn to cook: easy. Eat healthier: lighter. */
function suitsGoal(r: Recipe, goal: Goal | undefined) {
  if (goal === 'muscle') return (r.tags as readonly string[]).includes('High protein') || r.nutrition.protein >= 30;
  if (goal === 'learn') return r.difficulty === 'Easy';
  if (goal === 'healthier') return r.calories <= 600;
  return true;
}

export type Pick = { recipe: Recipe; have: number; needed: number };

/**
 * Tonight's picks, best first: fits the diet, a main (not dessert), 45 minutes or less if any fit;
 * then the goal (Get in shape → high protein, Learn to cook → easy, Eat healthier → lighter,
 * Save money → fewest missing ingredients first), then the best pantry match, then the quickest.
 */
export function rankPicks({ recipes, pantry, diets, goal, maxMinutes = 45 }: { recipes: Recipe[]; pantry: string[]; diets: readonly string[]; goal?: Goal; maxMinutes?: number }): Pick[] {
  const mains = recipes.filter((r) => r.category !== 'Dessert' && fitsDiet(r, diets));
  const quick = mains.filter((r) => r.minutes <= maxMinutes);
  const pool = quick.length ? quick : mains;
  const scored = pool.map((recipe) => {
    const m = pantryMatch(recipe, pantry);
    return { recipe, have: m.have, needed: m.needed, ratio: m.needed ? m.have / m.needed : 0, missing: m.needed - m.have, fit: suitsGoal(recipe, goal) ? 1 : 0 };
  });
  scored.sort(
    (a, b) =>
      b.fit - a.fit ||
      (goal === 'save' ? a.missing - b.missing || b.ratio - a.ratio : b.ratio - a.ratio || a.missing - b.missing) ||
      a.recipe.minutes - b.recipe.minutes ||
      a.recipe.title.localeCompare(b.recipe.title),
  );
  return scored.map(({ recipe, have, needed }) => ({ recipe, have, needed }));
}

/** The pick for a given day: rotates among the top three, so the daily reminder isn't always the same dish. */
export function pickForDay(picks: Pick[], dayNumber: number): Pick | undefined {
  const top = picks.slice(0, Math.min(3, picks.length));
  return top.length ? top[((dayNumber % top.length) + top.length) % top.length] : undefined;
}
