// Part 3: Quick, Cozy, My pantry, onboarding diet preferences and Tonight's pick work with the 20
// checked recipes, using the JSON's own tags and diet flags (never recalculated).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fromPantryPop, type PantryPopFile } from '../src/lib/pantryPopImport.ts';
import { recipesForMood } from '../src/lib/moods.ts';
import { fitsDiet, rankPicks } from '../src/lib/onboardingPicks.ts';

(globalThis as { require?: unknown }).require = () => 0;
const { recipes: old, matchesFilter } = await import('../src/data/mock.ts');
const file: PantryPopFile = JSON.parse(readFileSync(new URL('../data/pantry-pop-recipes.json', import.meta.url), 'utf8'));
const fresh = fromPantryPop(file, () => 'Other');
const all = [...old, ...fresh];
const src = (id: string) => file.recipes.find((r) => r.id === id)!;
const ids = (list: { id: string }[]) => new Set(list.map((r) => r.id));

test('Quick = exactly the new recipes tagged "Quick" (plus old ones by time)', () => {
  const quick = ids(recipesForMood('quick', all, []));
  for (const r of file.recipes) assert.equal(quick.has(r.id), r.tags.includes('Quick'), r.title);
  for (const r of fresh) assert.equal(matchesFilter(r, 'Under 30 min'), src(r.id).tags.includes('Quick'), r.title);
});

test('Cozy = exactly the new recipes tagged "Comfort"', () => {
  const cozy = ids(recipesForMood('cozy', all, []));
  for (const r of file.recipes) assert.equal(cozy.has(r.id), r.tags.includes('Comfort'), r.title);
});

test('My pantry finds new recipes from what you have', () => {
  const mine = recipesForMood('pantry', all, ['Chicken', 'Garlic', 'Butter']).map((r) => r.id);
  assert.ok(mine.includes('marry-me-chicken'), 'Marry Me Chicken uses chicken, garlic and butter');
  assert.ok(mine.some((id) => fresh.some((r) => r.id === id)));
});

test('diet preferences use the JSON diet flags as given', () => {
  const pairs: [string, keyof PantryPopFile['recipes'][number]['diet']][] = [['Vegetarian', 'vegetarian'], ['Vegan', 'vegan'], ['Gluten free', 'glutenFree'], ['Dairy free', 'dairyFree'], ['No pork', 'porkFree']];
  for (const r of fresh) for (const [pref, flag] of pairs) assert.equal(fitsDiet(r, [pref]), src(r.id).diet[flag], `${r.title} / ${pref}`);
  for (const r of fresh) assert.equal(fitsDiet(r, ['High protein']), src(r.id).tags.includes('High protein'), `${r.title} / High protein`);
  // The dumpling bake has pork dumplings: "No pork" leaves it out.
  assert.equal(fitsDiet(fresh.find((r) => r.id === 'red-curry-dumpling-bake')!, ['No pork']), false);
});

test("Tonight's pick: 45 minutes or less, and new recipes can be picked", () => {
  for (const goal of ['muscle', 'save', 'healthier', 'home', 'learn'] as const) {
    const picks = rankPicks({ recipes: all, pantry: [], diets: [], goal });
    assert.ok(picks.length > 0);
    for (const p of picks) assert.ok(p.recipe.minutes <= 45, `${p.recipe.title} is ${p.recipe.minutes} min`);
  }
  const top = rankPicks({ recipes: all, pantry: ['Chicken', 'Garlic', 'Butter', 'Cream'], diets: [], goal: 'muscle' }).slice(0, 3).map((p) => p.recipe.id);
  assert.ok(top.some((id) => fresh.some((r) => r.id === id)), `top picks ${top}`);
  // Samosas (60 min) only when nothing else fits.
  assert.ok(!rankPicks({ recipes: all, pantry: [], diets: [] }).some((p) => p.recipe.id === 'crispy-samosas'));
});
