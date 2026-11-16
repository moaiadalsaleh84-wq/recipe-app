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

export type Badge = {
  id: string;
  title: string;
  hint: string;
  icon: IconName;
  /** How far along: [done so far, needed]. Earned when done reaches needed. */
  count: (p: ProgressInput) => readonly [number, number];
  earned: (p: ProgressInput) => boolean;
};

const badge = (id: string, title: string, hint: string, icon: IconName, count: Badge['count']): Badge => ({
  id,
  title,
  hint,
  icon,
  count,
  earned: (p) => {
    const [done, needed] = count(p);
    return done >= needed;
  },
});

export const BADGES: Badge[] = [
  badge('first-dish', 'First Dish', 'Cook your first meal in Cook Mode', 'pot', (p) => [p.cooked.length, 1]),
  badge('on-a-roll', 'On a Roll', 'Cook 3 days in a row', 'flame', (p) => [p.streak, 3]),
  badge('ten-club', 'Ten Meal Club', 'Cook 10 meals', 'crown', (p) => [p.cooked.length, 10]),
  badge('explorer', 'Explorer', 'Cook 5 different recipes', 'shuffle', (p) => [new Set(p.cooked.map((c) => c.recipeId)).size, 5]),
  badge('writer', 'Recipe Writer', 'Add a recipe of your own', 'edit', (p) => [p.customRecipes.length, 1]),
  badge('planner', 'Week Planner', 'Plan 7 meals in one week', 'calendar', (p) => [Object.values(p.plan).reduce((n, d) => n + Object.keys(d).length, 0), 7]),
  badge('shopper', 'Shopping Champ', 'Tick off a whole grocery list', 'cart', (p) => [p.fun.listsDone, 1]),
  badge('collector', 'Collector', 'Save 5 favorite recipes', 'heartFill', (p) => [p.favorites.length, 5]),
  badge('best-friends', 'Best Friends', 'Pet Biscuit 10 times', 'paw', (p) => [p.fun.pets, 10]),
];

/**
* The badge to aim for next: "First Dish" until you've cooked, then the unearned one you're
 * closest to.
 */
export function nextBadge(p: ProgressInput, earnedIds: string[]) {
  // The first badge is always about cooking: nothing else comes before "First Dish".
  const first = BADGES[0];
  if (!earnedIds.includes(first.id) && !first.earned(p)) {
    const [done, needed] = first.count(p);
    return { badge: first, done, needed };
  }
  let best: { badge: Badge; done: number; needed: number } | null = null;
  for (const b of BADGES) {
    if (earnedIds.includes(b.id)) continue;
    const [done, needed] = b.count(p);
    if (done >= needed) continue;
    if (!best || done / needed > best.done / best.needed) best = { badge: b, done, needed };
  }
  return best;
}

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
