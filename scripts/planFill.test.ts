/**
 * "Plan my dinners": fills only empty dinners, avoids repeats, never picks dessert.
 *
 * Run: node --test scripts/planFill.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillDinners } from '../src/lib/planFill.ts';

const r = (id: string, category: string) => ({ id, category }) as never;
const recipes = [r('curry', 'Dinner'), r('pasta', 'Dinner'), r('pizza', 'Dinner'), r('salad', 'Lunch'), r('cake', 'Dessert')];

test('fills every empty dinner from the given day to Sunday', () => {
  const picks = fillDinners({}, recipes, 3);
  assert.deepEqual(picks.map((p) => p.day), [3, 4, 5, 6]);
  assert.ok(picks.every((p) => p.meal === 'Dinner'));
});

test('keeps dinners you already planned and skips past days', () => {
  const picks = fillDinners({ 4: { Dinner: 'pasta' }, 1: {} }, recipes, 2);
  assert.deepEqual(picks.map((p) => p.day), [2, 3, 5, 6]);
});

test('prefers dinner recipes, never dessert, and avoids recipes already in the week', () => {
  const picks = fillDinners({ 0: { Lunch: 'curry' } }, recipes, 0);
  assert.equal(picks[0].recipeId, 'pasta');
  assert.equal(picks[1].recipeId, 'pizza');
  assert.equal(picks[2].recipeId, 'salad');
  assert.ok(!picks.some((p) => p.recipeId === 'cake'));
});

test('when new recipes run out, never repeats the dinner from the day before', () => {
  const picks = fillDinners({}, recipes, 0);
  for (let i = 1; i < picks.length; i++) assert.notEqual(picks[i].recipeId, picks[i - 1].recipeId);
});

test('nothing to do when every dinner is planned', () => {
  const full = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { Dinner: 'curry' }]));
  assert.deepEqual(fillDinners(full, recipes, 0), []);
});
