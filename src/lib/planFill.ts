import type { Meal, Recipe, WeekPlan } from '../data/mock';

/** One meal to plan: which day (0 = Monday), which meal, which recipe. */
export type PlanPick = { day: number; meal: Meal; recipeId: string };

/**
 * Picks a dinner for every day from `fromDay` to Sunday that has none yet.
 * - Never touches a meal you already planned.
 * - Prefers recipes made for dinner, then any main dish (never dessert).
 * - Avoids repeating a recipe already in this week's plan, until it runs out of new ones.
 * - Same plan in, same picks out (no randomness), so it is easy to test and undo.
 */
export function fillDinners(plan: WeekPlan, recipes: Recipe[], fromDay: number): PlanPick[] {
  const mains = recipes.filter((r) => r.category !== 'Dessert');
  const pool = [...mains.filter((r) => r.category === 'Dinner'), ...mains.filter((r) => r.category !== 'Dinner')];
  if (!pool.length) return [];
  const used = new Set(Object.values(plan).flatMap((p) => Object.values(p ?? {})).filter(Boolean) as string[]);
  const picks: PlanPick[] = [];
  for (let day = Math.max(0, fromDay); day <= 6; day++) {
    if (plan[day]?.Dinner) continue;
    const fresh = pool.find((r) => !used.has(r.id));
    // Out of new recipes: reuse, but not the one planned the day before.
    const prev = picks[picks.length - 1]?.recipeId ?? plan[day - 1]?.Dinner;
    const pick = fresh ?? pool.find((r) => r.id !== prev) ?? pool[0];
    used.add(pick.id);
    picks.push({ day, meal: 'Dinner', recipeId: pick.id });
  }
  return picks;
}
