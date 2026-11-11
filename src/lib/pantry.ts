/**
 * "What can I cook?" Matching what you have against recipe ingredients.
 *
 * Matching is by words, so "Chicken" in your pantry covers "Chicken thighs" in a recipe and
 * "Tomatoes" matches "tomato". Salt, pepper and water are assumed: everyone has them.
 */
import type { Ingredient, Recipe } from '../data/mock';

export const COMMON_ITEMS = [
  'Eggs', 'Milk', 'Butter', 'Onions', 'Garlic', 'Olive oil', 'Rice', 'Pasta', 'Flour', 'Sugar',
  'Chicken', 'Tomatoes', 'Cheese', 'Potatoes', 'Carrots', 'Lemon', 'Bread', 'Yogurt', 'Spinach', 'Beef mince',
];

const STAPLES = new Set(['salt', 'pepper', 'black pepper', 'ground black pepper', 'salt and pepper', 'sea salt', 'water', 'cold water', 'warm water', 'ice', 'salt pepper']);

const IGNORE = new Set(['fresh', 'large', 'small', 'medium', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'shredded', 'ground', 'whole', 'dried', 'frozen', 'raw', 'cooked', 'boneless', 'skinless', 'ripe', 'organic', 'of', 'and', 'or', 'the', 'a', 'to', 'taste', 'optional', 'for', 'serving', 'cloves', 'clove', 'bunch', 'can', 'cans', 'tin', 'pinch', 'leaves', 'piece', 'pieces']);

const stem = (w: string) => w.replace(/ies$/, 'y').replace(/(oes|ches|shes|sses)$/, (x) => x.slice(0, -2)).replace(/([^s])s$/, '$1');

/** Meaningful words of an ingredient name, singular. "Garlic cloves, minced" → ["garlic"]. */
export function words(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !IGNORE.has(w))
    .map(stem);
}

export const isStaple = (name: string) => STAPLES.has(name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim());

/** True when something in the pantry covers this ingredient. */
export function pantryHas(pantry: string[], ingredientName: string): boolean {
  const need = words(ingredientName);
  if (!need.length) return false;
  return pantry.some((item) => {
    const have = words(item);
    if (!have.length) return false;
    // Pantry "chicken" covers "chicken thigh"; pantry "chicken breast" covers "chicken".
    return have.every((w) => need.includes(w)) || need.every((w) => have.includes(w));
  });
}

export type PantryMatch = { recipe: Recipe; have: Ingredient[]; missing: Ingredient[]; needed: number };

/** Recipes ranked by how much of them you can already make. Only recipes you have something for. */
export function whatCanICook(recipes: Recipe[], pantry: string[]): PantryMatch[] {
  if (!pantry.length) return [];
  return recipes
    .map((recipe) => {
      const needed = recipe.ingredients.filter((i) => !isStaple(i.name));
      const have = needed.filter((i) => pantryHas(pantry, i.name));
      const missing = needed.filter((i) => !pantryHas(pantry, i.name));
      return { recipe, have, missing, needed: needed.length };
    })
    .filter((m) => m.have.length > 0)
    .sort((a, b) => b.have.length / b.needed - a.have.length / a.needed || a.missing.length - b.missing.length || a.recipe.title.localeCompare(b.recipe.title));
}

export type Suggestion = { name: string; completes: Recipe[] };

/**
 * Pro: the single purchases that unlock the most complete recipes, e.g.
 * "Buy feta: you could cook 2 more recipes".
 */
export function smartSuggestions(matches: PantryMatch[]): Suggestion[] {
  const byItem = new Map<string, { name: string; completes: Recipe[] }>();
  for (const m of matches) {
    if (m.missing.length !== 1) continue;
    const item = m.missing[0];
    const key = words(item.name).join(' ');
    const entry = byItem.get(key) ?? { name: item.name, completes: [] };
    entry.completes.push(m.recipe);
    byItem.set(key, entry);
  }
  return [...byItem.values()].sort((a, b) => b.completes.length - a.completes.length || a.name.localeCompare(b.name)).slice(0, 3);
}

/** Pantry quick-add suggestions for what's being typed: common items first, then recipe ingredients. */
export function suggestionsFor(query: string, recipes: Recipe[], pantry: string[]): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const pool = new Map<string, string>();
  for (const name of COMMON_ITEMS) pool.set(name.toLowerCase(), name);
  for (const r of recipes) for (const i of r.ingredients) if (!isStaple(i.name)) pool.set(i.name.toLowerCase(), i.name);
  const inPantry = new Set(pantry.map((p) => p.toLowerCase()));
  return [...pool.values()]
    .filter((n) => !inPantry.has(n.toLowerCase()) && n.toLowerCase().includes(q))
    .sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)) || a.length - b.length)
    .slice(0, 6);
}
