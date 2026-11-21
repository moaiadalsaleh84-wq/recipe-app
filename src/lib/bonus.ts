/**
 * The one small surprise after each finished cook (fun, never gambling: nothing is ever taken away,
 * nothing is bought, every outcome is a gift):
 *   70% a chef tip for the recipe's main ingredient,
 *   20% "Lucky pan!" double XP (+25),
 *   10% a new sticker for the Sticker book (if any are left to find; otherwise a tip).
 */
import { chefTips, type TipKey } from '../data/chefTips.ts';
import type { Recipe } from '../data/mock';
import { stickers } from '../data/stickers.ts';

export type Bonus = { kind: 'tip'; tip: string } | { kind: 'lucky'; xp: number } | { kind: 'sticker'; id: string; name: string };

export const LUCKY_XP = 25;

const KEYS: [TipKey, RegExp][] = [
  ['chicken', /chicken/i],
  ['rice', /\brice\b|biryani/i],
  ['pasta', /pasta|penne|spaghetti|noodle|fusilli|linguine/i],
  ['potato', /potato/i],
  ['mushroom', /mushroom/i],
  ['chocolate', /chocolate|cocoa/i],
  ['pastry', /pastry|dough/i],
  ['pepper', /pepper(?!corn)|peppers/i],
  ['tomato', /tomato|passata/i],
  ['cheese', /cheese|feta|mozzarella|parmesan|cheddar/i],
  ['egg', /\begg/i],
];

/** The recipe's main ingredient for tips: the first match in its title, else in its ingredients. */
export function mainIngredient(r: Pick<Recipe, 'title' | 'ingredients'>): TipKey {
  for (const [key, re] of KEYS) if (re.test(r.title)) return key;
  for (const ing of r.ingredients) for (const [key, re] of KEYS) if (key !== 'pepper' && re.test(ing.name)) return key;
  return 'any';
}

/** Picks the bonus. `roll` and `pick` are random numbers in [0, 1) (passed in so it can be tested). */
export function rollBonus(recipe: Pick<Recipe, 'title' | 'ingredients'>, collected: readonly string[], roll: number, pick: number): Bonus {
  if (roll < 0.1) {
    const left = stickers.filter((s) => !collected.includes(s.id));
    if (left.length) {
      const s = left[Math.floor(pick * left.length)];
      return { kind: 'sticker', id: s.id, name: s.name };
    }
  } else if (roll < 0.3) {
    return { kind: 'lucky', xp: LUCKY_XP };
  }
  const key = mainIngredient(recipe);
  const pool = chefTips.filter((t) => t.key === key);
  const tips = pool.length ? pool : chefTips.filter((t) => t.key === 'any');
  return { kind: 'tip', tip: tips[Math.floor(pick * tips.length)].tip };
}
