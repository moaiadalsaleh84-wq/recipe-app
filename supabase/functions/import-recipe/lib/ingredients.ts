/**
 * Ingredient lines without AI, and the "nothing invented" check for AI output.
 */
import type { ImportedIngredient } from './types.ts';

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅕': 0.2 };

const UNIT_WORDS: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gr: 'g', kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml', l: 'l', litre: 'l', liter: 'l', litres: 'l', liters: 'l', dl: 'dl', cl: 'cl',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp', tbsp: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbl: 'tbsp',
  cup: 'cup', cups: 'cup', oz: 'oz', ounce: 'oz', ounces: 'oz', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  pinch: 'pinch', pinches: 'pinch', dash: 'dash', clove: 'clove', cloves: 'clove', can: 'can', cans: 'can', tin: 'can', tins: 'can',
  slice: 'slice', slices: 'slice', bunch: 'bunch', bunches: 'bunch', handful: 'handful', handfuls: 'handful', sprig: 'sprig', sprigs: 'sprig', stick: 'stick', sticks: 'stick', sheet: 'sheet', sheets: 'sheet',
};

const num = (s: string): number => {
  if (UNICODE_FRACTIONS[s] !== undefined) return UNICODE_FRACTIONS[s];
  if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : NaN;
  }
  return Number(s.replace(',', '.'));
};

/** "1 ½ cups (200 g) flour, sifted" → { amount: 1.5, unit: 'cup', name: 'flour, sifted' } */
export function parseLine(line: string): ImportedIngredient {
  const original = line.replace(/\s+/g, ' ').trim();
  let text = original.replace(/^[-•*▢☐□]\s*/, '').replace(/(\d)([½¼¾⅓⅔⅛])/g, '$1 $2');
  const amountRe = /^((?:\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞⅕])(?:\s+(?:\d+\/\d+|[½¼¾⅓⅔⅛⅜⅝⅞⅕]))?)(?:\s*(?:-|–|to)\s*(?:\d+\/\d+|\d+(?:[.,]\d+)?))?\s*/;
  const m = text.match(amountRe);
  let amount: number | null = null;
  if (m) {
    amount = m[1].split(/\s+/).reduce((s, p) => s + num(p), 0);
    if (!Number.isFinite(amount) || amount <= 0) amount = null;
    text = text.slice(m[0].length);
  }
  let unit = '';
  const u = text.match(/^([a-zA-Z]+)\.?\s+(?:of\s+)?/);
  if (amount !== null && u && UNIT_WORDS[u[1].toLowerCase()]) {
    unit = UNIT_WORDS[u[1].toLowerCase()];
    text = text.slice(u[0].length);
  }
  const name = text.replace(/^\(.*?\)\s*/, '').trim() || original;
  return { amount: amount === null ? null : Math.round(amount * 1000) / 1000, unit, name, original };
}

/* ---------------- grounding ---------------- */

/** Lowercase, no accents, fractions spelled as digits, punctuation as spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞⅕]/g, (c) => ` ${UNICODE_FRACTIONS[c]} `)
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['and', 'the', 'for', 'with', 'fresh', 'large', 'small', 'medium', 'chopped', 'diced', 'sliced', 'minced', 'finely', 'roughly', 'optional', 'taste', 'about', 'some', 'into', 'cut', 'pieces', 'whole', 'ground', 'plus', 'more', 'extra', 'divided']);

/** Simple English singular so "tomatoes" in the AI output matches "tomato" in the source. */
const stem = (w: string) => w.replace(/(ies)$/, 'y').replace(/(oes|ches|shes|ses)$/, (x) => x.slice(0, -2)).replace(/s$/, '');

/**
 * True when the ingredient is backed by the source text: the line itself appears in it, or
 * every meaningful word of the name does.
 */
export function isGrounded(ing: { name: string; original: string }, sourceNorm: string): boolean {
  const original = normalize(ing.original);
  if (original.length >= 3 && sourceNorm.includes(original)) return true;
  const sourceStems = new Set(sourceNorm.split(' ').map(stem));
  const words = normalize(ing.name)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w));
  if (!words.length) return false;
  return words.every((w) => sourceStems.has(stem(w)) || sourceNorm.includes(w));
}
