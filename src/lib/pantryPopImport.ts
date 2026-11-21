/**
 * Turns data/pantry-pop-recipes.json (finished, hand-checked recipes) into the app's Recipe model.
 * Every value is copied as-is: nothing is rewritten, rounded or recalculated. Only the shape changes:
 *   mealType → category (dinner → Dinner, lunch → Lunch, breakfast → Breakfast, side → Snacks;
 *              mealType itself is kept too), totalMinutes → minutes, baseServings → servings,
 *   nutritionPerServing → calories + nutrition, "Comfort" → "Comfort food" (the app's name for it),
 *   steps → step text + stepMeta (ingredientIds, timerSeconds). "_check" is ignored.
 * Aisles aren't in the file; they come from the app's name-based sorting (aisleFor).
 * Pure: no app imports beyond types, so it's unit-tested in Node.
 */
import type { Aisle, Category, DietTag, Recipe } from '../data/mock';

export type PantryPopFile = {
  version: number;
  recipes: {
    id: string;
    title: string;
    description: string;
    mealType: string;
    cuisine: string;
    tags: string[];
    difficulty: Recipe['difficulty'];
    prepMinutes: number;
    cookMinutes: number;
    totalMinutes: number;
    baseServings: number;
    diet: { vegetarian: boolean; vegan: boolean; glutenFree: boolean; dairyFree: boolean; porkFree: boolean };
    nutritionPerServing: { kcal: number; proteinG: number; carbsG: number; fatG: number; estimated: boolean };
    ingredients: { id: string; name: string; quantity: number | null; unit: string; note?: string }[];
    steps: { n: number; text: string; ingredientIds: string[]; timerSeconds: number | null }[];
  }[];
};

const CATEGORY: Record<string, Category> = { dinner: 'Dinner', lunch: 'Lunch', breakfast: 'Breakfast', side: 'Snacks', snack: 'Snacks', dessert: 'Dessert' };
const TAG: Record<string, Recipe['tags'][number]> = { Comfort: 'Comfort food' };

export function fromPantryPop(file: PantryPopFile, aisleFor: (name: string) => Aisle): Recipe[] {
  return file.recipes.map((r) => ({
    id: r.id,
    title: r.title,
    image: null,
    description: r.description,
    category: CATEGORY[r.mealType] ?? 'Dinner',
    mealType: r.mealType,
    cuisine: r.cuisine,
    minutes: r.totalMinutes,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    servings: r.baseServings,
    calories: r.nutritionPerServing.kcal,
    nutrition: { protein: r.nutritionPerServing.proteinG, carbs: r.nutritionPerServing.carbsG, fat: r.nutritionPerServing.fatG },
    difficulty: r.difficulty,
    tags: r.tags.map((t) => TAG[t] ?? (t as DietTag | 'Quick')),
    diet: { ...r.diet },
    ingredients: r.ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      aisle: aisleFor(i.name),
      ...(i.note ? { note: i.note } : {}),
    })),
    steps: [...r.steps].sort((a, b) => a.n - b.n).map((s) => s.text),
    stepMeta: [...r.steps].sort((a, b) => a.n - b.n).map((s) => ({ ingredientIds: [...s.ingredientIds], timerSeconds: s.timerSeconds })),
    source: 'pantry-pop' as const,
  }));
}

/** Drops imported recipes whose title is already used (the existing recipe wins). Returns what was skipped. */
export function withoutDuplicates(imported: Recipe[], existing: Recipe[]) {
  const taken = new Set(existing.map((r) => r.title.trim().toLowerCase()));
  const kept = imported.filter((r) => !taken.has(r.title.trim().toLowerCase()));
  const skipped = imported.filter((r) => taken.has(r.title.trim().toLowerCase())).map((r) => r.title);
  return { kept, skipped };
}
