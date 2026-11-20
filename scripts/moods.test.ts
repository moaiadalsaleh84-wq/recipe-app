/**
 * Home's mood tiles: Super quick, Use my pantry, Cozy comfort.
 *
 * Run: node --test scripts/moods.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCozy, isQuick, pantryMatch, recipesForMood } from '../src/lib/moods.ts';

const ing = (name: string) => ({ id: name, name, quantity: 1, unit: '', aisle: 'Other' });
const r = (id: string, minutes: number, category: string, names: string[], tags: string[] = []) => ({ id, title: id, minutes, category, tags, ingredients: names.map(ing) }) as never;

const toast = r('Cheese toast', 10, 'Breakfast', ['Bread', 'Cheese']);
const salad = r('Green salad', 15, 'Lunch', ['Lettuce', 'Cucumber', 'Olive oil']);
const curry = r('Chicken curry', 45, 'Dinner', ['Chicken', 'Onion', 'Rice'], ['Comfort food']);
const pasta = r('Pesto pasta', 25, 'Dinner', ['Penne', 'Basil', 'Salt']);
const stew = r('Lamb stew', 120, 'Dinner', ['Lamb'], ['cozy']);
const all = [toast, salad, curry, pasta];

test('quick means 30 minutes or less in total, fastest first', () => {
  assert.ok(isQuick(pasta)); // 25 min
  assert.ok(!isQuick(curry)); // 45 min
  assert.deepEqual(recipesForMood('quick', all, []).map((x: { id: string }) => x.id), ['Cheese toast', 'Green salad', 'Pesto pasta']);
});

test('cozy only matches recipes tagged comfort food or cozy', () => {
  assert.ok(isCozy(curry));
  assert.ok(isCozy(stew));
  assert.ok(!isCozy(pasta)); // hearty, but not tagged
  assert.ok(!isCozy(toast));
});

test('pantry match ignores salt, pepper and water', () => {
  assert.deepEqual(pantryMatch(pasta, ['Penne']), { have: 1, needed: 2 });
});

test('my pantry: only recipes with at least one thing you have, best match first', () => {
  const list = recipesForMood('pantry', all, ['Chicken', 'Onion', 'Rice', 'Bread']);
  assert.equal(list[0].id, 'Chicken curry');
  assert.deepEqual(list.map((x: { id: string }) => x.id).sort(), ['Cheese toast', 'Chicken curry']);
  assert.deepEqual(recipesForMood('pantry', all, []), []);
});
