import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chefTips } from '../src/data/chefTips.ts';
import { stickers } from '../src/data/stickers.ts';
import { LUCKY_XP, mainIngredient, rollBonus } from '../src/lib/bonus.ts';

const rice = { title: 'Chicken Fried Rice', ingredients: [{ name: 'Cooked rice' }, { name: 'Eggs' }] } as never;
const cake = { title: 'Chocolate Raspberry Cake', ingredients: [{ name: 'Plain flour' }] } as never;

test('30 tips and 12 stickers', () => {
  assert.equal(chefTips.length, 30);
  assert.equal(stickers.length, 12);
  assert.equal(new Set(stickers.map((s) => s.id)).size, 12);
});

test('main ingredient comes from the title first', () => {
  assert.equal(mainIngredient(rice), 'chicken');
  assert.equal(mainIngredient(cake), 'chocolate');
  assert.equal(mainIngredient({ title: 'Toast', ingredients: [{ name: 'Bread' }] } as never), 'any');
});

test('70 / 20 / 10 split', () => {
  assert.equal(rollBonus(rice, [], 0.05, 0).kind, 'sticker');
  assert.deepEqual(rollBonus(rice, [], 0.2, 0), { kind: 'lucky', xp: LUCKY_XP });
  const tip = rollBonus(rice, [], 0.5, 0);
  assert.equal(tip.kind, 'tip');
  assert.ok(chefTips.some((t) => t.key === 'chicken' && tip.kind === 'tip' && t.tip === tip.tip));
});

test('a new sticker is never one you already have; all collected falls back to a tip', () => {
  const have = stickers.slice(0, 11).map((s) => s.id);
  const s = rollBonus(rice, have, 0.01, 0.99);
  assert.equal(s.kind, 'sticker');
  assert.equal(s.kind === 'sticker' && s.id, stickers[11].id);
  assert.equal(rollBonus(rice, stickers.map((x) => x.id), 0.01, 0.5).kind, 'tip');
});
