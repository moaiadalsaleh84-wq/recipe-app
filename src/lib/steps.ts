/**
 * Cook Mode helpers for one step: which ingredients it uses, and its "Pro move" tip.
 *
 * Steps are plain sentences, so ingredients are found by their words:
 * - every word of the name ("chestnut mushrooms"), or
 * - its main word ("peppers" for "Red peppers", "oil" for "Olive oil", "garlic" for "Garlic cloves")
 *   when no other ingredient in the recipe shares it, or
 * - a common cooking word for it ("cheese" for Parmesan, "pasta" for Penne, "chicken" for
 *   "Chicken breast").
 * Salt, pepper and water are left out: everyone has them.
 */
import type { Ingredient } from '../data/mock';
// The .ts endings let the unit tests (plain Node) load this file too.
import { isStaple, words } from './pantry.ts';

/** Everyday words a step uses for a more specific ingredient. */
const FAMILIES: Record<string, string[]> = {
  cheese: ['parmesan', 'mozzarella', 'feta', 'cheddar', 'paneer', 'halloumi', 'ricotta', 'gruyere', 'pecorino', 'cheese'],
  pasta: ['spaghetti', 'penne', 'fusilli', 'linguine', 'tagliatelle', 'macaroni', 'rigatoni', 'pasta', 'noodle'],
  herb: ['basil', 'parsley', 'coriander', 'cilantro', 'mint', 'dill', 'thyme', 'rosemary', 'chive', 'oregano'],
  herbs: ['basil', 'parsley', 'coriander', 'cilantro', 'mint', 'dill', 'thyme', 'rosemary', 'chive', 'oregano'],
  veg: ['pea', 'carrot', 'pepper', 'onion', 'broccoli', 'courgette', 'zucchini', 'spinach'],
  vegetable: ['pea', 'carrot', 'pepper', 'onion', 'broccoli', 'courgette', 'zucchini', 'spinach'],
  meat: ['chicken', 'beef', 'pork', 'lamb', 'mince'],
  sauce: ['passata', 'sauce', 'pesto'],
  fruit: ['apple', 'banana', 'berry', 'raspberry', 'strawberry', 'lemon', 'lime', 'mango'],
  berry: ['raspberry', 'strawberry', 'blueberry', 'berry'],
  mayo: ['mayonnaise', 'mayo'],
};

const isWordStaple = (ing: Ingredient) => isStaple(ing.name);

/** Words in the step (singular, lowercase). "Pasta water" is water, not the pasta. */
const stepWords = (text: string) => new Set(words(text.replace(/\b(pasta|cooking|rice)\s+water\b/gi, 'water')));

/** The ingredients one step uses, in recipe order. */
export function ingredientsInStep(text: string, ingredients: Ingredient[]): Ingredient[] {
  if (!text.trim()) return [];
  const said = stepWords(text);
  const usable = ingredients.filter((i) => !isWordStaple(i));
  // How many ingredients share each word, so a shared word ("sauce", "powder") never matches alone.
  const share = new Map<string, number>();
  for (const ing of usable) for (const w of new Set(words(ing.name))) share.set(w, (share.get(w) ?? 0) + 1);
  return usable.filter((ing) => {
    const w = words(ing.name);
    if (!w.length) return false;
    if (w.every((x) => said.has(x))) return true;
    // The main word (last) or the first word, when only this ingredient has it.
    const main = w[w.length - 1];
    const first = w[0];
    if (said.has(main) && share.get(main) === 1) return true;
    if (said.has(first) && share.get(first) === 1 && first.length > 2) return true;
    // A family word: "cheese" → Parmesan, when only one ingredient belongs to that family.
    for (const [family, members] of Object.entries(FAMILIES)) {
      if (!said.has(family) || !w.some((x) => members.includes(x))) continue;
      const inFamily = usable.filter((other) => words(other.name).some((x) => members.includes(x)));
      if (inFamily.length === 1) return true;
    }
    return false;
  });
}

/** Ingredients a recipe never mentions in any step (a data problem worth fixing). */
export function unusedIngredients(steps: string[], ingredients: Ingredient[]): Ingredient[] {
  const used = new Set(steps.flatMap((s) => ingredientsInStep(s, ingredients)));
  return ingredients.filter((i) => !isWordStaple(i) && !used.has(i));
}

/** Words too general to point at one ingredient on their own. */
const GENERIC = new Set(['sauce', 'powder', 'seed', 'oil', 'paste', 'juice', 'leaf', 'stock', 'green', 'red', 'white', 'black', 'sweet', 'hot', 'mix', 'spice', 'dough', 'batter']);

/**
 * Ingredient words a step mentions that didn't match any ingredient for sure: "add the sauce"
 * when there are two sauces. Used by the dev warning and the data test.
 */
export function unclearMentions(text: string, ingredients: Ingredient[]): string[] {
  const said = stepWords(text);
  const found = new Set(ingredientsInStep(text, ingredients));
  const out = new Set<string>();
  for (const ing of ingredients) {
    if (found.has(ing) || isWordStaple(ing)) continue;
    for (const w of words(ing.name)) if (w.length > 3 && !GENERIC.has(w) && said.has(w)) out.add(w);
  }
  return [...out];
}

/** In development: warns in the console about recipe text Cook Mode can't link to its ingredients. */
export function warnStepProblems(title: string, steps: string[], ingredients: Ingredient[]) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const unused = unusedIngredients(steps, ingredients);
  if (unused.length) console.warn(`[recipe] ${title}: no step mentions ${unused.map((i) => i.name).join(', ')}`);
  steps.forEach((s, i) => {
    const unclear = unclearMentions(s, ingredients);
    if (unclear.length) console.warn(`[recipe] ${title}, step ${i + 1}: unclear which ingredient "${unclear.join('", "')}" means`);
  });
}

/** Words that mark a tip: "keep some pasta water", "save the pan juices", "reserve a cup". */
const TIP = /\b(keep|save|reserve|set aside|tip:|don['’]t|do not)\b/i;

/**
 * Splits a step into the main instruction and an optional tip, so Cook Mode can show the tip in
 * its own "Pro move" box. A one-sentence step never loses its only sentence to the tip.
 */
export function splitTip(text: string): { main: string; tip: string | null } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length < 2) return { main: text, tip: null };
  const i = sentences.findIndex((s, n) => n > 0 && TIP.test(s));
  if (i < 0) return { main: text, tip: null };
  const tip = sentences[i].replace(/^tip:\s*/i, '');
  const main = sentences.filter((_, n) => n !== i).join(' ');
  return { main, tip: tip.charAt(0).toUpperCase() + tip.slice(1) };
}
