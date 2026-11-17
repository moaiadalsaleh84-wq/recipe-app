/**
 * Serving math for every built-in recipe: at every serving count from 1 to 12, in metric and US
 * units, the amount shown must be close to the true scaled amount.
 *
 * Run: node --test scripts/qty.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatQty, ingredientText, nameFor, plainFractions, roundQty } from '../src/lib/qty.ts';
import { convertQty } from '../src/lib/units.ts';

// The recipe file loads photos, which plain Node can't do, so read the amounts from its text.
const source = readFileSync(new URL('../src/data/mock.ts', import.meta.url), 'utf8');
const recipes = [...source.matchAll(/id: '([\w-]+)',\s*title: [^\n]+[\s\S]*?servings: (\d+),[\s\S]*?ingredients: \[([\s\S]*?)\n    \],/g)].map((m) => ({
  id: m[1],
  servings: Number(m[2]),
  ingredients: [...m[3].matchAll(/name: (?:'((?:[^'\\]|\\.)*)'|"([^"]*)"), quantity: ([\d.]+), unit: '([^']*)'/g)].map((i) => ({ name: i[1] ?? i[2], quantity: Number(i[3]), unit: i[4] })),
}));

const FRACTION: Record<string, number> = { '⅛': 1 / 8, '¼': 1 / 4, '⅓': 1 / 3, '½': 1 / 2, '⅔': 2 / 3, '¾': 3 / 4 };
/** "1½ cups" → 1.5 */
function shown(text: string) {
  const m = text.match(/^(\d+)?([⅛¼⅓½⅔¾])?/)!;
  return Number(m[1] ?? 0) + (m[2] ? FRACTION[m[2]] : 0);
}

test('the recipe file was read', () => {
  assert.ok(recipes.length >= 10, `found ${recipes.length} recipes`);
  assert.ok(recipes.every((r) => r.ingredients.length > 0));
});

test('amounts shown stay close to the true amount at every serving size', () => {
  const problems: string[] = [];
  for (const r of recipes) {
    for (let servings = 1; servings <= 12; servings++) {
      for (const ing of r.ingredients) {
        if (!ing.quantity) continue;
        for (const units of ['metric', 'us'] as const) {
          const c = convertQty(roundQty((ing.quantity * servings) / r.servings), ing.unit, units);
          const text = formatQty(c.quantity, c.unit);
          const value = shown(text);
          // Allowed: 20% off, or half of the smallest step (⅛, or 1 g/ml).
          const slack = Math.max(c.quantity * 0.2, ['g', 'ml'].includes(c.unit) ? 0.5 : 0.07);
          if (Math.abs(value - c.quantity) > slack) problems.push(`${r.id} ×${servings}/${r.servings} ${units}: ${ing.name} is ${c.quantity.toFixed(3)} ${c.unit}, shown "${text}"`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('the reported bug: 1 of 9 servings of a sponge cake is not a quarter', () => {
  assert.equal(formatQty(roundQty(1 / 9), ''), '⅛');
  assert.equal(formatQty(roundQty(3 / 9), ''), '⅓');
  assert.equal(formatQty(roundQty(9 / 9), ''), '1');
  assert.equal(formatQty(1.5, 'cups'), '1½ cups');
  assert.equal(formatQty(2.95, 'tbsp'), '3 tbsp');
  assert.equal(formatQty(0, 'tsp'), '');
});

test('one of something is singular', () => {
  assert.equal(nameFor(1, '', 'Eggs'), 'Egg');
  assert.equal(nameFor(1, '', 'Tomatoes'), 'Tomato');
  assert.equal(nameFor(1, '', 'Raspberries'), 'Raspberry');
  assert.equal(nameFor(1, '', 'Brioche buns'), 'Brioche bun');
  assert.equal(nameFor(2, '', 'Eggs'), 'Eggs');
  assert.equal(nameFor(1, 'tsp', 'Cumin seeds'), 'Cumin seeds');
  assert.equal(nameFor(1, '', 'Swiss'), 'Swiss');
});

test('ingredients read the way a cook says them', () => {
  assert.deepEqual(ingredientText(0.75, '', 'Red peppers'), { amount: '3/4', text: 'red pepper' });
  assert.deepEqual(ingredientText(0.5, '', 'Garlic cloves'), { amount: '1', text: 'small garlic clove' });
  assert.deepEqual(ingredientText(4, '', 'Garlic cloves'), { amount: '4', text: 'garlic cloves' });
  assert.deepEqual(ingredientText(1.4, '', 'Eggs'), { amount: '1', text: 'egg' });
  assert.deepEqual(ingredientText(350, 'g', 'Chicken thighs'), { amount: '350 g', text: 'chicken thighs' });
  assert.deepEqual(ingredientText(75, 'g', 'Greek yogurt'), { amount: '75 g', text: 'Greek yogurt' });
  assert.deepEqual(ingredientText(1.5, 'tbsp', 'Olive oil'), { amount: '1 1/2 tbsp', text: 'olive oil' });
  assert.deepEqual(ingredientText(0, '', 'Salt'), { amount: '', text: 'Salt' });
  assert.equal(plainFractions('1¾ cups'), '1 3/4 cups');
});
