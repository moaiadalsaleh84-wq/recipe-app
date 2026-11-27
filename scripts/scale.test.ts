// The shared scaling rules (src/lib/scale.ts), checked against the owner's review values for
// Crispy Beef Tacos (base 4 servings). These must match exactly.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { amountFor, combine, halfUp, kitchenFraction, scaleQuantity, showAmount } from '../src/lib/scale.ts';

const file = JSON.parse(readFileSync(new URL('../data/pantry-pop-recipes.json', import.meta.url), 'utf8'));
const tacos = file.recipes.find((r: { id: string }) => r.id === 'crispy-beef-tacos');
const ing = (id: string) => tacos.ingredients.find((i: { id: string }) => i.id === id);
const at = (id: string, servings: number, units: 'metric' | 'us' = 'metric') => amountFor(ing(id), servings, tacos.baseServings, units).text;
const NB = ' ';
const t = (s: string) => s.replace(/ /g, NB); // expected values use a normal space; the app joins with a non-breaking one

const EXPECTED: Record<number, Record<string, string>> = {
  1: { sc: '30 g', cil: '4 g', beef: '125 g', on: '20 g', chp: '½ tsp', cum: '¼ tsp', pep: '¼ tsp', tp: '¾ tsp', wat: '15 ml', tor: '2', ched: '40 g', oil: '¾ tsp', gc: '1 clove' },
  2: { sc: '60 g', cil: '8 g', beef: '250 g', chp: '1 tsp', tp: '1½ tsp', tor: '4', ched: '75 g', oil: '1½ tsp' },
  6: { sc: '180 g', cil: '25 g', beef: '750 g', on: '120 g', chp: '1 tbsp', cum: '1½ tsp', pep: '¾ tsp', tp: '1½ tbsp', wat: '90 ml', tor: '12', ched: '225 g', oil: '1½ tbsp', lw: '1½', gc: '2 cloves', gb: '3 cloves' },
};

for (const [servings, rows] of Object.entries(EXPECTED)) {
  test(`Crispy Beef Tacos at ${servings} serving(s)`, () => {
    for (const [id, want] of Object.entries(rows)) assert.equal(at(id, Number(servings)), t(want), `${ing(id).name} (${id})`);
  });
}

test('"pinch" stays "pinch" at every size', () => {
  for (const s of [1, 2, 4, 6, 8]) assert.equal(at('scs', s), 'pinch');
});

test('nutrition per serving is the same at 1, 2, 4 and 8 servings', () => {
  // Nutrition is per serving and never goes through the scaling function: the app reads it as stored.
  const per = tacos.nutritionPerServing;
  for (const s of [1, 2, 4, 8]) assert.deepEqual({ ...per }, { kcal: 670, proteinG: 41, carbsG: 38, fatG: 39, estimated: true }, `at ${s}`);
  assert.equal(scaleQuantity(null, 8, 4), null);
});

test('full precision until shown; half-up rounding', () => {
  assert.equal(scaleQuantity(15, 1, 4), 3.75);
  assert.equal(halfUp(2.5), 3);
  assert.equal(halfUp(0.5), 1);
  assert.equal(showAmount(22.5, 'g', 'x').text, t('25 g')); // 22.5 → nearest 5, tie goes up
  assert.equal(showAmount(1050, 'g', 'x').text, t('1.05 kg'));
  assert.equal(showAmount(1, 'kg', 'x').text, t('1 kg'));
  assert.equal(showAmount(0.2, 'g', 'x').text, t('1 g'), 'never 0');
  assert.equal(kitchenFraction(0.05).text, '¼', 'never 0, minimum ¼');
  assert.equal(showAmount(0.25, '', 'Eggs').text, '½', 'eggs: minimum ½');
  assert.equal(showAmount(0.3, 'piece', 'Green onions').text, '1', 'green onions: whole, minimum 1');
});

test('US units come from the precise value', () => {
  assert.equal(at('beef', 4, 'us'), t('1 lb')); // 500 g = 1.10 lb
  assert.equal(at('sc', 4, 'us'), t('4¼ oz')); // 120 g = 4.23 oz
  assert.equal(at('wat', 4, 'us'), t('¼ cup')); // 60 ml = ¼ cup
  assert.equal(at('wat', 1, 'us'), t('1 tbsp')); // 15 ml = 3 tsp = 1 tbsp
  assert.equal(at('chp', 6, 'us'), t('1 tbsp')); // spoons stay spoons
});

test('shopping list: same name adds up in one unit; a pinch never joins a number', () => {
  assert.deepEqual(combine({ quantity: 1, unit: 'clove' }, { quantity: 2, unit: 'clove' }), { quantity: 3, unit: 'clove' });
  assert.deepEqual(combine({ quantity: 1, unit: 'tbsp' }, { quantity: 1, unit: 'tsp' }), { quantity: 4, unit: 'tsp' });
  assert.deepEqual(combine({ quantity: 1, unit: 'kg' }, { quantity: 250, unit: 'g' }), { quantity: 1250, unit: 'g' });
  assert.deepEqual(combine({ quantity: 1, unit: 'tbsp' }, { quantity: 60, unit: 'ml' }), { quantity: 75, unit: 'ml' });
  assert.equal(combine({ quantity: null, unit: 'pinch' }, { quantity: 1, unit: 'tsp' }), null);
  assert.equal(combine({ quantity: 100, unit: 'g' }, { quantity: 1, unit: 'tsp' }), null);
});

test('US mode: produce under 2 oz stays in grams, bigger produce and other food turn into oz', () => {
  assert.equal(showAmount(20, 'g', 'Onion', 'us', 'Produce').text, '20 g');
  assert.equal(showAmount(10, 'g', 'Fresh parsley', 'us', 'Produce').text, '10 g');
  assert.equal(showAmount(80, 'g', 'Onion', 'us', 'Produce').text, '2¾ oz');
  assert.equal(showAmount(20, 'g', 'Grated parmesan', 'us', 'Dairy & Eggs').text, '⅔ oz');
  assert.equal(amountFor({ quantity: 40, unit: 'g', name: 'Onion', aisle: 'Produce' }, 1, 2, 'us').text, '20 g');
});

test('spoons: tbsp to the nearest ½, tsp to the nearest ¼, cups keep thirds', () => {
  assert.equal(showAmount(8, 'tsp', 'Sugar').qty, '2½');
  assert.equal(showAmount(1.3, 'tsp', 'Salt').qty, '1¼');
  assert.equal(showAmount(1.4, 'tbsp', 'Olive oil').qty, '1½');
  assert.equal(showAmount(0.1, 'tsp', 'Salt').qty, '¼');
  assert.equal(showAmount(2.9, 'tsp', 'Salt').unit, 'tbsp');
  assert.equal(showAmount(2.9, 'tsp', 'Salt').qty, '1');
  assert.equal(showAmount(160, 'ml', 'Flour', 'us').qty, '⅔');
  assert.equal(showAmount(160, 'ml', 'Flour', 'us').unit, 'cup');
});

test('small weighed salt, sugar, yeast and spices show in spoons (both units)', () => {
  assert.equal(showAmount(6, 'g', 'salt').text, '1\u00A0tsp');
  assert.equal(showAmount(3, 'g', 'Kosher salt').text, '1\u00A0tsp');
  assert.equal(showAmount(7, 'g', 'instant yeast', 'us').text, '2¼\u00A0tsp');
  assert.equal(showAmount(25, 'g', 'sugar').text, '2\u00A0tbsp');
  assert.equal(showAmount(5, 'g', 'smoked paprika').text, '2\u00A0tsp');
  assert.equal(showAmount(2, 'g', 'ground black pepper').text, '¾\u00A0tsp');
  // Not spices, fresh herbs, or bigger amounts: still grams.
  assert.equal(showAmount(10, 'g', 'Fresh basil').text, '10\u00A0g');
  assert.equal(showAmount(15, 'g', 'Butter').text, '15\u00A0g');
  assert.equal(showAmount(100, 'g', 'sugar').text, '100\u00A0g');
  assert.equal(showAmount(20, 'g', 'red bell pepper').text, '20\u00A0g');
});
