/**
 * Every imported recipe passes the same checks as the app's built-in recipes before it's sent:
 * amounts are numbers, units come from the app's list, every ingredient is used in a step, step
 * ingredient ids exist, timers are whole seconds. Small problems are fixed here; what can't be
 * fixed is reported (and the recipe is still returned).
 */
import type { ImportedIngredient, ImportedRecipe, ImportedStepMeta } from './types.ts';

/** The units the app understands (src/lib/scale.ts), written singular; "" = a plain count. */
export const UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'clove', 'slice', 'can', 'bunch', 'sheet', 'ball', 'piece', ''] as const;
const UNIT_ALIASES: Record<string, string> = {
  gram: 'g', grams: 'g', gr: 'g', kilogram: 'kg', kilograms: 'kg', kgs: 'kg', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  litre: 'l', liter: 'l', litres: 'l', liters: 'l', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp',
  cups: 'cup', ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb', pinches: 'pinch', cloves: 'clove', slices: 'slice', cans: 'can', tin: 'can', tins: 'can',
  bunches: 'bunch', sheets: 'sheet', balls: 'ball', pieces: 'piece', pcs: 'piece', pc: 'piece', whole: '',
};

/** A unit from the app's list, or null when it isn't one ("handful", "splash"). */
export function normalizeUnit(unit: string): string | null {
  const u = unit.trim().toLowerCase().replace(/\.$/, '');
  if ((UNITS as readonly string[]).includes(u)) return u;
  return UNIT_ALIASES[u] ?? null;
}

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'from', 'into']);

/** "hot honey crispy chicken burger 🍔 #fyp" → "Hot Honey Crispy Chicken Burger". */
export function titleCase(raw: string): string {
  const cleaned = raw
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s:;,.!|-]+$/, '');
  return cleaned
    .split(' ')
    .map((w, i) => {
      if (!w) return w;
      // Keep short acronyms (BBQ, BLT) and words with inner capitals (McDonald's, iPhone);
      // shouted words ("EASY") are written normally.
      const allCaps = w === w.toUpperCase() && /\p{L}/u.test(w);
      if ((allCaps && w.replace(/[^\p{L}]/gu, '').length <= 3) || (!allCaps && /[A-Z]/.test(w.slice(1)))) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.replace(/^(\p{L})/u, (c) => c.toUpperCase()).replace(/-(\p{L})/gu, (_, c: string) => `-${c.toUpperCase()}`);
    })
    .join(' ');
}

/** Seconds named in a step ("bake 25 minutes", "1 hour", "30 sec"), for a timer. null if none. */
export function timerFromText(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h\b|minutes?|mins?|seconds?|secs?)/i);
  if (!m) return null;
  // A range ("8–10 minutes") uses the upper end: the timer is the "check by" moment.
  const n = Number((m[2] ?? m[1]).replace(',', '.'));
  const unit = m[3].toLowerCase();
  const secs = unit.startsWith('h') ? n * 3600 : unit.startsWith('s') ? n : n * 60;
  return secs > 0 ? Math.round(secs) : null;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length > 2 && !['fresh', 'large', 'small', 'medium', 'chopped', 'sliced', 'ground', 'dried', 'whole'].includes(w));

/** Does a step's text mention this ingredient (any significant word, singular or plural)? */
function mentions(stepText: string, ing: ImportedIngredient) {
  const text = ` ${stepText.toLowerCase()} `;
  return words(ing.name).some((w) => {
    const stem = w.replace(/(es|s)$/, '');
    return text.includes(w) || (stem.length > 2 && text.includes(stem));
  });
}

/** "salt, black pepper" or "salt and pepper" without an amount → two ingredients. */
export function splitCombined(list: ImportedIngredient[]): ImportedIngredient[] {
  const out: ImportedIngredient[] = [];
  for (const ing of list) {
    const parts = ing.name.split(/\s*,\s*|\s+(?:and|&)\s+/i).map((p) => p.trim()).filter(Boolean);
    const allShort = parts.length > 1 && parts.every((p) => p.split(' ').length <= 3);
    if ((ing.amount === null || ing.unit === 'pinch') && allShort && !ing.note) {
      for (const p of parts) out.push({ ...ing, name: p.charAt(0).toUpperCase() + p.slice(1) });
    } else out.push(ing);
  }
  return out;
}

export type Checked = { recipe: ImportedRecipe; problems: string[] };

/**
 * Fixes what it can and lists what it couldn't. Ingredients get ids i1, i2…; steps get stepMeta
 * (one per step) whose ingredient ids all exist; every ingredient ends up in at least one step.
 */
export function validateRecipe(input: ImportedRecipe): Checked {
  const problems: string[] = [];
  const recipe: ImportedRecipe = { ...input };

  recipe.title = titleCase(recipe.title || '') || 'Imported Recipe';

  // Ingredients: numbers, units from the app's list, ids.
  recipe.ingredients = splitCombined(recipe.ingredients).map((raw, i) => {
    const ing = { ...raw, id: `i${i + 1}` };
    if (ing.amount !== null && !(typeof ing.amount === 'number' && Number.isFinite(ing.amount) && ing.amount > 0)) {
      const n = Number(String(ing.amount).replace(',', '.'));
      ing.amount = Number.isFinite(n) && n > 0 ? n : null;
    }
    const unit = normalizeUnit(ing.unit ?? '');
    if (unit === null) {
      // "1 handful basil": keep the words in the note, count it as 1.
      problems.push(`“${ing.unit}” isn’t a unit the app knows (${ing.name}): shown as a count.`);
      ing.note = [ing.unit, ing.note].filter(Boolean).join(', ');
      ing.unit = '';
    } else ing.unit = unit;
    if (ing.amount === null && ing.unit !== 'pinch') ing.unit = '';
    ing.name = ing.name.trim().replace(/^(\p{L})/u, (c) => c.toUpperCase());
    // Amounts in a note don't scale with servings: drop them ("drained (1 can)" → "drained",
    // "about 4 thighs" → ""). Sizes stay ("cut into 2.5 cm cubes").
    if (ing.note) {
      ing.note =
        ing.note
          .replace(/\s*\([^)]*\d[^)]*\)/g, '')
          .replace(/\b(about|approx\.?|roughly|around)\s+\d+(?:[.,]\d+)?[^,;]*/gi, '')
          .replace(/^\d+(?:[.,]\d+)?\s*\p{L}*\s*$/u, '')
          .replace(/^[\s,;]+|[\s,;]+$/g, '')
          .trim() || undefined;
    }
    return ing;
  });

  // Steps: one meta per step; ids that exist; timers in whole seconds.
  const ids = new Set(recipe.ingredients.map((i) => i.id));
  const metaIn = recipe.stepMeta ?? [];
  recipe.stepMeta = recipe.steps.map((text, k): ImportedStepMeta => {
    const m = metaIn[k];
    const ingredientIds = [...new Set((m?.ingredientIds ?? []).filter((id) => ids.has(id)))];
    let timerSeconds = m?.timerSeconds && Number.isFinite(m.timerSeconds) && m.timerSeconds > 0 ? Math.round(m.timerSeconds) : null;
    if (timerSeconds === null) timerSeconds = timerFromText(text);
    return { ingredientIds, timerSeconds, estimated: !!m?.estimated };
  });

  // Every ingredient used somewhere: link by name where the step mentions it, else the first step.
  if (recipe.steps.length) {
    for (const ing of recipe.ingredients) {
      if (recipe.stepMeta.some((m) => m.ingredientIds.includes(ing.id!))) continue;
      const k = recipe.steps.findIndex((t) => mentions(t, ing));
      recipe.stepMeta[k >= 0 ? k : 0].ingredientIds.push(ing.id!);
      if (k < 0) problems.push(`${ing.name} wasn’t named in any step: added to step 1.`);
    }
  } else if (recipe.ingredients.length) {
    problems.push('The recipe has no steps.');
  }

  // Times and servings are whole, positive numbers.
  for (const key of ['servings', 'minutes', 'prepMinutes', 'cookMinutes'] as const) {
    const v = recipe[key];
    if (v !== null && v !== undefined && !(Number.isInteger(v) && v > 0)) recipe[key] = Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  }
  if (!recipe.minutes && (recipe.prepMinutes || recipe.cookMinutes)) recipe.minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  return { recipe, problems };
}
