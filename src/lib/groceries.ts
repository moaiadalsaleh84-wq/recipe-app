/**
 * Grocery list math, kept free of app imports so it can be tested with plain Node
 * (scripts/groceries.test.ts).
 *
 * - The same ingredient from different recipes adds up ("2 onions" + "3 onions" = 5). Items match
 *   by name (each word singular); amounts are converted to one unit of the same kind (g, ml, tsp or
 *   the count) and added at full precision, then rounded once, when shown (src/lib/scale.ts).
 *   Different kinds stay separate lines ("200 g flour" and "2 cups flour"), and a pinch or "to taste"
 *   never adds onto a number.
 * - Adding the week's plan is safe to repeat: each planned meal is added once per week.
 */
import { combine, unitInfo } from './scale.ts';

type Aisle = string;
export type ListItem = { key: string; name: string; quantity: number; unit: string; aisle: Aisle; recipeIds: string[]; checked: boolean };
/** quantity null = a pinch / to taste: goes on the list without a number. */
export type ListIngredient = { id: string; name: string; quantity: number | null; unit: string; aisle: Aisle };

/** An ingredient name for matching on the grocery list: lower case, each word singular. "Red Peppers" → "red pepper". */
export const groceryName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/ies$/, 'y').replace(/(oes|ches|shes|sses)$/, (x) => x.slice(0, -2)).replace(/([^s])s$/, '$1') : w))
    .join(' ');

/** Adds a recipe's ingredients to the list. Existing items keep everything and only grow; nothing is removed. */
export function mergeIngredients<T extends ListItem>(list: T[], recipeId: string, ingredients: ListIngredient[], scale = 1): T[] {
  const next = [...list];
  for (const ing of ingredients) {
    const noAmount = ing.quantity == null || unitInfo(ing.unit).family === 'none';
    // Full precision: no rounding until the amount is shown.
    const qty = noAmount ? 0 : (ing.quantity as number) * scale;
    const unit = noAmount ? (ing.quantity == null ? 'pinch' : ing.unit) : ing.unit;
    const same = groceryName(ing.name);
    const isPinch = (i: ListItem) => !(i.quantity > 0) && unitInfo(i.unit).family === 'none';
    const idx = next.findIndex((i) => groceryName(i.name) === same && (noAmount ? isPinch(i) : !isPinch(i) && combine({ quantity: i.quantity, unit: i.unit }, { quantity: qty, unit }) != null));
    if (idx >= 0) {
      const existing = next[idx];
      const sum = noAmount ? { quantity: 0, unit: existing.unit } : combine({ quantity: existing.quantity, unit: existing.unit }, { quantity: qty, unit })!;
      next[idx] = {
        ...existing,
        quantity: sum.quantity,
        unit: sum.unit,
        // More is needed now, so it's back on the list (a second pinch doesn't change anything).
        checked: noAmount ? existing.checked : false,
        recipeIds: existing.recipeIds.includes(recipeId) ? existing.recipeIds : [...existing.recipeIds, recipeId],
      };
    } else {
      next.push({ key: `${ing.id}|${unit}`, name: ing.name, quantity: qty, unit, aisle: ing.aisle, recipeIds: [recipeId], checked: false } as T);
    }
  }
  return next;
}

/** The Monday of the week `date` is in, as YYYY-MM-DD (local time). */
export function weekId(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One planned meal, as remembered after it was added: "2026-11-16|0|Dinner|butter-chicken". */
export const slotKey = (week: string, day: number | string, meal: string, recipeId: string) => `${week}|${day}|${meal}|${recipeId}`;

/**
 * "Add this week to groceries". Each planned meal is added once per week, so pressing the button
 * again adds nothing new. A meal added to the plan later, or a meal that was changed, is added
 * the next time. Manually added items and amounts already on the list are never touched except to
 * grow. Next week, the plan can be added again.
 */
export function addWeekToList<T extends ListItem>(
  list: T[],
  plan: Record<number | string, Partial<Record<string, string>>>,
  added: string[],
  getIngredients: (recipeId: string) => ListIngredient[] | undefined,
  week: string,
): { list: T[]; added: string[]; meals: number; items: number } {
  // Only this week's record matters; older weeks are dropped so the list stays small.
  const done = new Set(added.filter((k) => k.startsWith(`${week}|`)));
  let next = list;
  let meals = 0;
  let items = 0;
  for (const [day, slots] of Object.entries(plan)) {
    for (const [meal, recipeId] of Object.entries(slots ?? {})) {
      if (!recipeId) continue;
      const key = slotKey(week, day, meal, recipeId);
      if (done.has(key)) continue;
      const ingredients = getIngredients(recipeId);
      if (!ingredients) continue;
      next = mergeIngredients(next, recipeId, ingredients);
      done.add(key);
      meals += 1;
      items += ingredients.length;
    }
  }
  return { list: next, added: [...done], meals, items };
}
