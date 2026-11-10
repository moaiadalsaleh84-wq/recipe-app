/**
 * Chef levels and badges. XP is derived from what you've actually done, so it can
 * never drift or double-count: cook a meal, add a recipe, finish a list, earn a badge.
 */
import type { IconName } from '../components/Icon';
import type { CookedEntry, Recipe, WeekPlan } from '../data/mock';

export const XP = { cooked: 50, ownRecipe: 30, listDone: 20, badge: 25, pet: 2, petCap: 25 } as const;

export const LEVELS = [
  { at: 0, title: 'Kitchen Kitten' },
  { at: 100, title: 'Prep Cook' },
  { at: 250, title: 'Line Cook' },
  { at: 500, title: 'Sous Chef' },
  { at: 900, title: 'Head Chef' },
  { at: 1400, title: 'Master Chef' },
  { at: 2100, title: 'Legendary Chef' },
];

export type ProgressInput = {
  cooked: CookedEntry[];
  customRecipes: Recipe[];
  plan: WeekPlan;
  favorites: string[];
  fun: { pets: number; listsDone: number; badges: string[] };
  streak: number;
};

export type Badge = { id: string; title: string; hint: string; icon: IconName; earned: (p: ProgressInput) => boolean };

export const BADGES: Badge[] = [
  { id: 'first-dish', title: 'First Dish', hint: 'Cook your first meal in Cook Mode', icon: 'pot', earned: (p) => p.cooked.length >= 1 },
  { id: 'on-a-roll', title: 'On a Roll', hint: 'Cook 3 days in a row', icon: 'flame', earned: (p) => p.streak >= 3 },
  { id: 'ten-club', title: 'Ten Meal Club', hint: 'Cook 10 meals', icon: 'crown', earned: (p) => p.cooked.length >= 10 },
  { id: 'explorer', title: 'Explorer', hint: 'Cook 5 different recipes', icon: 'shuffle', earned: (p) => new Set(p.cooked.map((c) => c.recipeId)).size >= 5 },
  { id: 'writer', title: 'Recipe Writer', hint: 'Add a recipe of your own', icon: 'edit', earned: (p) => p.customRecipes.length >= 1 },
  { id: 'planner', title: 'Week Planner', hint: 'Plan 7 meals in one week', icon: 'calendar', earned: (p) => Object.values(p.plan).reduce((n, d) => n + Object.keys(d).length, 0) >= 7 },
  { id: 'shopper', title: 'Shopping Champ', hint: 'Tick off a whole grocery list', icon: 'cart', earned: (p) => p.fun.listsDone >= 1 },
  { id: 'collector', title: 'Collector', hint: 'Save 5 favorite recipes', icon: 'heartFill', earned: (p) => p.favorites.length >= 5 },
  { id: 'best-friends', title: 'Best Friends', hint: 'Pet your buddy 10 times', icon: 'paw', earned: (p) => p.fun.pets >= 10 },
];

export function xpFor(p: ProgressInput) {
  return (
    p.cooked.length * XP.cooked +
    p.customRecipes.length * XP.ownRecipe +
    p.fun.listsDone * XP.listDone +
    p.fun.badges.length * XP.badge +
    Math.min(p.fun.pets, XP.petCap) * XP.pet
  );
}

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].at) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return {
    level: i + 1,
    title: cur.title,
    next: next ?? null,
    /** 0..1 progress to the next level (1 at max level). */
    progress: next ? (xp - cur.at) / (next.at - cur.at) : 1,
    toNext: next ? next.at - xp : 0,
  };
}

const dayKey = (d: Date) => d.toDateString();
/** Consecutive days with at least one cooked meal, ending today or yesterday. */
export function streakOf(dates: string[]) {
  const days = new Set(dates.map((d) => dayKey(new Date(d))));
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}
