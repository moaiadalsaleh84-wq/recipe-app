/**
 * The four mood tiles on Home: "Quick", "My pantry", "Cozy", "Surprise me" (a random recipe).
 * Plain functions over the recipe list, so they are easy to test.
 */
import type { Recipe } from '../data/mock';
// The .ts ending lets the unit tests (plain Node) load this file too.
import { isStaple, pantryHas } from './pantry.ts';

export type Mood = 'quick' | 'pantry' | 'cozy';

/** "Quick": ready in 30 minutes or less, in total. */
export const QUICK_MINUTES = 30;
/** Quick: checked recipe data marks it with a "Quick" tag; older recipes by their time. */
export const isQuick = (r: Recipe) => (r.source === 'pantry-pop' ? r.tags.includes('Quick') : r.minutes <= QUICK_MINUTES);

/** "Cozy": only recipes tagged as comfort food (or "cozy", for imported tags). */
export const isCozy = (r: Recipe) => r.tags.some((tag) => /comfort|cozy|cosy/i.test(tag));

/** How much of a recipe you already have at home (salt, pepper and water are assumed). */
export function pantryMatch(r: Recipe, pantry: string[]) {
  const needed = r.ingredients.filter((i) => !isStaple(i.name));
  const have = needed.filter((i) => pantryHas(pantry, i.name)).length;
  return { have, needed: needed.length };
}

/** "My pantry": recipes you have at least one ingredient for, the ones you can most nearly make first. */
export function byPantryMatch(recipes: Recipe[], pantry: string[]) {
  return recipes
    .map((r) => ({ r, m: pantryMatch(r, pantry) }))
    .filter((x) => x.m.have >= 1)
    .sort((a, b) => b.m.have / Math.max(1, b.m.needed) - a.m.have / Math.max(1, a.m.needed) || a.m.needed - a.m.have - (b.m.needed - b.m.have) || a.r.title.localeCompare(b.r.title))
    .map((x) => x.r);
}

/** The recipes for a mood, in the order to show them. */
export function recipesForMood(mood: Mood, recipes: Recipe[], pantry: string[]): Recipe[] {
  if (mood === 'quick') return recipes.filter(isQuick).sort((a, b) => a.minutes - b.minutes);
  if (mood === 'cozy') return recipes.filter(isCozy);
  return byPantryMatch(recipes, pantry);
}
