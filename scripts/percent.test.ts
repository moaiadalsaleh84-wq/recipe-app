/**
 * Nutrition percentages always add up to 100.
 *
 * Run: node --test scripts/percent.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { macroPercents, roundPercents } from '../src/lib/percent.ts';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

test('largest remainder: always exactly 100', () => {
  assert.deepEqual(roundPercents([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(roundPercents([25, 25, 50]), [25, 25, 50]);
  assert.deepEqual(roundPercents([0, 0, 0]), [0, 0, 0]);
  for (let p = 0; p < 60; p += 7) for (let c = 0; c < 90; c += 11) for (let f = 1; f < 50; f += 5) assert.equal(sum(macroPercents(p, c, f)), 100);
});

test('macros use 4, 4 and 9 kcal per gram', () => {
  // Creamy mushroom spaghetti: 25 g protein, 75 g carbs, 38 g fat → 100 + 300 + 342 = 742 kcal,
  // exactly 13.48 / 40.43 / 46.09 %. Rounded down that's 99; the extra point goes to protein.
  assert.deepEqual(macroPercents(25, 75, 38), [14, 40, 46]);
});
