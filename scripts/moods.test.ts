/**
 * Home's mood tiles: Super quick, Use my pantry, Cozy comfort.
 *
 * Run: node --test scripts/moods.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCozy, isSuperQuick, pantryMatch, recipesForMood } from '../src/lib/moods.ts';

const ing = (name: string) => ({ id: name, name, quantity: 1, unit: '', aisle: 'Other' });
const r = (id: string, minutes: number, category: string, names: string[]) => ({ id, title: id, minutes, category, ingredients: names.map(ing) }) as never;

const toast = r('Cheese toast', 10, 'Breakfast', ['Bread', 'Cheese']);
const salad = r('Green salad', 15, 'Lunch', ['Lettuce', 'Cucumber', 'Olive oil']);
const curry = r('Chicken curry', 45, 'Dinner', ['Chicken', 'Onion', 'Rice']);
const pasta = r('Pesto pasta', 25, 'Dinner', ['Penne', 'Basil', 'Salt']);
const all = [toast, salad, curry, pasta];

test('super quick means under 20 minutes, fastest first', () => {
  assert.ok(isSuperQuick(toast));
  assert.ok(!isSuperQuick(pasta));
  assert.deepEqual(recipesForMood('quick', all, []).map((x: { id: string }) => x.id), ['Cheese toast', 'Green salad']);
});

test('cozy is slow or hearty, never breakfast', () => {
  assert.ok(isCozy(curry)); // 45 min
  assert.ok(isCozy(pasta)); // pasta
  assert.ok(!isCozy(salad));
  assert.ok(!isCozy(toast)); // breakfast, even with cheese
});

test('pantry match ignores salt, pepper and water', () => {
  assert.deepEqual(pantryMatch(pasta, ['Penne']), { have: 1, needed: 2 });
});

test('use my pantry puts the recipes you can most nearly make first and keeps every recipe', () => {
  const list = recipesForMood('pantry', all, ['Chicken', 'Onion', 'Rice', 'Bread']);
  assert.equal(list[0].id, 'Chicken curry');
  assert.equal(list.length, all.length);
});
