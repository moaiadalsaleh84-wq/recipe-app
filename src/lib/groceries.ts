/**
 * Grocery list math, kept free of app imports so it can be tested with plain Node
 * (scripts/groceries.test.ts).
 *
 * - The same ingredient from different recipes adds up ("2 onions" + "3 onions" = 5). Items match
 *   by name (each word singular) and unit. Units are never converted, so "200 g flour" and
 *   "2 cups flour" stay separate lines.
 * - Adding the week's plan is safe to repeat: each planned meal is added once per week.
 */
/** Same as roundQty in qty.ts: two decimals. Repeated here so this file has no imports. */
const roundQty = (n: number) => Math.round(n * 100) / 100;

type Aisle = string;
export type ListItem = { key: string; name: string; quantity: number; unit: string; aisle: Aisle; recipeIds: string[]; checked: boolean };
export type ListIngredient = { id: string; name: string; quantity: number; unit: string; aisle: Aisle };

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
    const key = `${ing.id}|${ing.unit}`;
    const qty = roundQty(ing.quantity * scale);
    const same = groceryName(ing.name);
    const idx = next.findIndex((i) => i.key === key || (i.unit === ing.unit && groceryName(i.name) === same));
    if (idx >= 0) {
      const existing = next[idx];
      next[idx] = {
        ...existing,
        quantity: roundQty(existing.quantity + qty),
        // More is needed now, so it's back on the list.
        checked: false,
        recipeIds: existing.recipeIds.includes(recipeId) ? existing.recipeIds : [...existing.recipeIds, recipeId],
      };
    } else {
      next.push({ key, name: ing.name, quantity: qty, unit: ing.unit, aisle: ing.aisle, recipeIds: [recipeId], checked: false } as T);
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
