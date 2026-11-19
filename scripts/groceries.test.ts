/**
 * Grocery list math: combining ingredients, and "Add this week to groceries" being safe to repeat.
 *
 * Run: node --test scripts/groceries.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addWeekToList, groceryName, mergeIngredients, weekId, type ListIngredient, type ListItem } from '../src/lib/groceries.ts';

const recipes: Record<string, ListIngredient[]> = {
  curry: [
    { id: 'onion', name: 'Onion', quantity: 2, unit: '', aisle: 'Produce' },
    { id: 'rice', name: 'Rice', quantity: 300, unit: 'g', aisle: 'Pantry' },
  ],
  // An imported recipe: ids are numbered, names are plural.
  stew: [
    { id: 'onions-0', name: 'Onions', quantity: 3, unit: '', aisle: 'Produce' },
    { id: 'rice-1', name: 'Rice', quantity: 1, unit: 'cup', aisle: 'Pantry' },
  ],
  salad: [{ id: 'lettuce', name: 'Lettuce', quantity: 1, unit: '', aisle: 'Produce' }],
};
const get = (id: string) => recipes[id];
const WEEK = '2026-11-16';
const manual: ListItem = { key: 'item-1|', name: 'Coffee beans', quantity: 1, unit: '', aisle: 'Other', recipeIds: [], checked: false };

test('the same ingredient from two recipes adds up; different units stay separate', () => {
  let list = mergeIngredients([] as ListItem[], 'curry', recipes.curry);
  list = mergeIngredients(list, 'stew', recipes.stew);
  const onions = list.filter((i) => groceryName(i.name) === 'onion');
  assert.equal(onions.length, 1);
  assert.equal(onions[0].quantity, 5);
  assert.deepEqual(onions[0].recipeIds, ['curry', 'stew']);
  const rice = list.filter((i) => groceryName(i.name) === 'rice');
  assert.equal(rice.length, 2, '300 g rice and 1 cup rice are not converted into each other');
});

test('pressing "Add this week" twice adds nothing the second time', () => {
  const plan = { 0: { Dinner: 'curry' }, 2: { Lunch: 'stew' } };
  const first = addWeekToList([manual], plan, [], get, WEEK);
  assert.equal(first.meals, 2);
  const second = addWeekToList(first.list, plan, first.added, get, WEEK);
  assert.equal(second.meals, 0);
  assert.deepEqual(second.list, first.list);
});

test('manual items and the user\'s changes are kept', () => {
  const plan = { 0: { Dinner: 'curry' } };
  const first = addWeekToList([manual], plan, [], get, WEEK);
  // The user ticks the onions off, raises the rice and deletes nothing else.
  const edited = first.list.map((i) => (i.name === 'Onion' ? { ...i, checked: true } : i.name === 'Rice' ? { ...i, quantity: 500 } : i));
  const again = addWeekToList(edited, plan, first.added, get, WEEK);
  assert.deepEqual(again.list, edited, 'nothing is overwritten');
  assert.ok(again.list.some((i) => i.name === 'Coffee beans'), 'the manual item is still there');
});

test('a deleted item is not added back by pressing again', () => {
  const plan = { 0: { Dinner: 'salad' } };
  const first = addWeekToList([] as ListItem[], plan, [], get, WEEK);
  const afterDelete = first.list.filter((i) => i.name !== 'Lettuce');
  const again = addWeekToList(afterDelete, plan, first.added, get, WEEK);
  assert.equal(again.list.length, 0);
});

test('a meal planned later, or a changed meal, is added; the rest is not', () => {
  const first = addWeekToList([] as ListItem[], { 0: { Dinner: 'curry' } }, [], get, WEEK);
  const more = addWeekToList(first.list, { 0: { Dinner: 'curry' }, 1: { Lunch: 'salad' } }, first.added, get, WEEK);
  assert.equal(more.meals, 1);
  assert.equal(more.list.find((i) => i.name === 'Onion')?.quantity, 2, 'curry is not added twice');
  const changed = addWeekToList(more.list, { 0: { Dinner: 'stew' }, 1: { Lunch: 'salad' } }, more.added, get, WEEK);
  assert.equal(changed.meals, 1, 'the new dinner is added');
});

test('the same recipe on two days counts twice, the first time only', () => {
  const plan = { 0: { Dinner: 'salad' }, 3: { Dinner: 'salad' } };
  const first = addWeekToList([] as ListItem[], plan, [], get, WEEK);
  assert.equal(first.list[0].quantity, 2);
  const again = addWeekToList(first.list, plan, first.added, get, WEEK);
  assert.equal(again.list[0].quantity, 2);
});

test('next week the plan can be added again, and last week\'s record is dropped', () => {
  const plan = { 0: { Dinner: 'salad' } };
  const first = addWeekToList([] as ListItem[], plan, [], get, WEEK);
  const nextWeek = addWeekToList([] as ListItem[], plan, first.added, get, '2026-11-23');
  assert.equal(nextWeek.meals, 1);
  assert.ok(nextWeek.added.every((k) => k.startsWith('2026-11-23|')));
});

test('weekId is the Monday of the week', () => {
  assert.equal(weekId(new Date(2026, 10, 19)), '2026-11-16'); // Thursday
  assert.equal(weekId(new Date(2026, 10, 16)), '2026-11-16'); // Monday
  assert.equal(weekId(new Date(2026, 10, 22)), '2026-11-16'); // Sunday
});
