/**
 * The four mood tiles on Home: "Super quick", "Use my pantry", "Cozy comfort", "Surprise me".
 * Plain functions over the recipe list, so they are easy to test.
 */
import type { Recipe } from '../data/mock';
// The .ts ending lets the unit tests (plain Node) load this file too.
import { isStaple, pantryHas } from './pantry.ts';

export type Mood = 'quick' | 'pantry' | 'cozy';

/** "Super quick": ready in under 20 minutes. */
export const QUICK_MINUTES = 20;
export const isSuperQuick = (r: Recipe) => r.minutes < QUICK_MINUTES;

/** Hearty words that make a dish "comfort food". */
const COZY_WORDS = /\b(pasta|spaghetti|penne|noodles?|rice|risotto|potato(es)?|curry|stew|soup|pizza|biryani|butter|cheese|cream|mac|pie|bake|lasagne|lasagna|dumplings?|chili)\b/i;

/**
 * "Cozy comfort": warm, filling dishes. Not breakfast, and either a slower cook (35 min or more)
 * or something hearty: pasta, rice, potatoes, curry, cheese, cream and the like.
 */
export function isCozy(r: Recipe) {
  if (r.category === 'Breakfast') return false;
  if (r.minutes >= 35) return true;
  const text = [r.title, ...r.ingredients.map((i) => i.name)].join(' ');
  return COZY_WORDS.test(text);
}

/** How much of a recipe you already have at home (salt, pepper and water are assumed). */
export function pantryMatch(r: Recipe, pantry: string[]) {
  const needed = r.ingredients.filter((i) => !isStaple(i.name));
  const have = needed.filter((i) => pantryHas(pantry, i.name)).length;
  return { have, needed: needed.length };
}

/** "Use my pantry": every recipe, the ones you can most nearly make first. */
export function byPantryMatch(recipes: Recipe[], pantry: string[]) {
  return recipes
    .map((r) => ({ r, m: pantryMatch(r, pantry) }))
    .sort((a, b) => b.m.have / Math.max(1, b.m.needed) - a.m.have / Math.max(1, a.m.needed) || a.m.needed - a.m.have - (b.m.needed - b.m.have) || a.r.title.localeCompare(b.r.title))
    .map((x) => x.r);
}

/** The recipes for a mood, in the order to show them. */
export function recipesForMood(mood: Mood, recipes: Recipe[], pantry: string[]): Recipe[] {
  if (mood === 'quick') return recipes.filter(isSuperQuick).sort((a, b) => a.minutes - b.minutes);
  if (mood === 'cozy') return recipes.filter(isCozy);
  return byPantryMatch(recipes, pantry);
}
