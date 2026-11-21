/**
 * Onboarding: diet filtering, the "recipes you can cook" counter and tonight's pick.
 * Run: node --test scripts/onboardingPicks.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cookableCount, fitsDiet, pickForDay, rankPicks } from '../src/lib/onboardingPicks.ts';
import { pantryHas } from '../src/lib/pantry.ts';

(globalThis as { require?: unknown }).require = () => 0;
const { recipes } = await import('../src/data/mock.ts');
const byId = (id: string) => recipes.find((r: { id: string }) => r.id === id)!;
const ONBOARDING_ITEMS = ['Eggs', 'Pasta', 'Rice', 'Garlic', 'Onions', 'Olive oil', 'Butter', 'Milk', 'Cheese', 'Tomatoes', 'Chicken', 'Potatoes', 'Bread', 'Flour', 'Peppers'];

test('the 15 quick-add items match the names used in recipes', () => {
  assert.ok(pantryHas(['Cheese'], 'Parmesan'));
  assert.ok(pantryHas(['Pasta'], 'Spaghetti'));
  assert.ok(pantryHas(['Pasta'], 'Penne'));
  assert.ok(pantryHas(['Onions'], 'Red onion'));
  assert.ok(pantryHas(['Peppers'], 'Red peppers'));
  assert.ok(pantryHas(['Chicken'], 'Chicken thighs'));
  assert.ok(pantryHas(['Bread'], 'Brioche buns'));
  assert.ok(pantryHas(['Tomatoes'], 'Passata'));
  assert.ok(!pantryHas(['Cheese'], 'Chicken breast'));
  // Every item finds at least one recipe ingredient (no bundled recipe uses milk yet).
  for (const item of ONBOARDING_ITEMS.filter((i) => i !== 'Milk')) assert.ok(recipes.some((r: { ingredients: { name: string }[] }) => r.ingredients.some((i) => pantryHas([item], i.name))), item);
});

test('diets filter by tags and ingredients', () => {
  assert.ok(fitsDiet(byId('mushroom-spaghetti'), ['Vegetarian']));
  assert.ok(!fitsDiet(byId('butter-chicken'), ['Vegetarian']));
  assert.ok(!fitsDiet(byId('butter-chicken'), ['Pescatarian']));
  assert.ok(!fitsDiet(byId('mushroom-spaghetti'), ['Dairy free']));
  assert.ok(fitsDiet(byId('masala-dosa'), ['Vegan', 'Dairy free']));
  assert.ok(fitsDiet(byId('butter-chicken'), ['No pork']));
});

test('the counter: recipes you have at least half of; nothing with an empty pantry', () => {
  assert.equal(cookableCount(recipes, []), 0);
  const some = cookableCount(recipes, ['Pasta', 'Cheese', 'Garlic', 'Olive oil']);
  assert.ok(some >= 1);
  assert.ok(cookableCount(recipes, ONBOARDING_ITEMS) >= some);
  // Never counts a recipe outside the diet.
  assert.ok(cookableCount(recipes, ONBOARDING_ITEMS, ['Vegan']) <= cookableCount(recipes, ONBOARDING_ITEMS));
});

test('tonight: fits the diet, 45 minutes or less, prefers the goal and the best match', () => {
  const picks = rankPicks({ recipes, pantry: ['Pasta', 'Cheese', 'Garlic', 'Olive oil'], diets: ['Vegetarian'], goal: 'home' });
  assert.ok(picks.length > 0);
  for (const p of picks) {
    assert.ok(fitsDiet(p.recipe, ['Vegetarian']));
    assert.ok(p.recipe.minutes <= 45);
    assert.notEqual(p.recipe.category, 'Dessert');
  }
  const shape = rankPicks({ recipes, pantry: [], diets: [], goal: 'muscle' });
  assert.ok(shape[0].recipe.tags.includes('High protein') || shape[0].recipe.nutrition.protein >= 30);
  const learn = rankPicks({ recipes, pantry: [], diets: [], goal: 'learn' });
  assert.equal(learn[0].recipe.difficulty, 'Easy');
  assert.ok(pickForDay(picks, 12345));
});

test('ratings: loved comes up, meh goes down, and the pick says why', async () => {
  const { tasteScore } = await import('../src/lib/onboardingPicks.ts');
  const plain = rankPicks({ recipes, pantry: [], diets: [] });
  const first = plain[0].recipe;
  const meh = rankPicks({ recipes, pantry: [], diets: [], ratings: { [first.id]: 'meh' } });
  assert.notEqual(meh[0].recipe.id, first.id);
  const last = plain[plain.length - 1].recipe;
  const loved = rankPicks({ recipes, pantry: [], diets: [], ratings: { [last.id]: 'amazing' } });
  assert.equal(loved[0].recipe.id, last.id);
  assert.equal(loved[0].because, 'you loved it');
  const chicken = recipes.filter((r: { title: string }) => /chicken/i.test(r.title));
  const s = tasteScore(chicken[1], { [chicken[0].id]: 'amazing' }, recipes);
  assert.equal(s.score, 1);
  assert.equal(s.loved?.id, chicken[0].id);
});
