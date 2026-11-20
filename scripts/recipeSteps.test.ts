/**
 * Recipe data checks for Cook Mode:
 * - each step lists every ingredient it uses (Cook Mode shows them as chips on the step), and
 * - every ingredient is used in at least one step.
 * Also unit tests for the step matcher and the "Pro move" tip splitter.
 *
 * Run: node --test scripts/recipeSteps.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingredientsInStep, splitTip, unclearMentions, unusedIngredients } from '../src/lib/steps.ts';

// The recipe file loads its photos with require(); photos don't matter here.
(globalThis as { require?: unknown }).require = () => 0;
const { recipes } = await import('../src/data/mock.ts');

const ing = (name: string) => ({ id: name, name, quantity: 1, unit: '', aisle: 'Other' }) as never;

test('a step finds ingredients by their main word, a family word, or every word', () => {
  const list = [ing('Olive oil'), ing('Red peppers'), ing('Parmesan'), ing('Chestnut mushrooms'), ing('Salt')];
  const names = (s: string) => ingredientsInStep(s, list).map((i: { name: string }) => i.name);
  assert.deepEqual(names('Mix with oil.'), ['Olive oil']);
  assert.deepEqual(names('Add the peppers.'), ['Red peppers']);
  assert.deepEqual(names('Stir in the cheese.'), ['Parmesan']);
  assert.deepEqual(names('Fry the mushrooms with a pinch of salt.'), ['Chestnut mushrooms']);
});

test('a word two ingredients share never matches on its own', () => {
  const list = [ing('Soy sauce'), ing('Chilli sauce')];
  assert.deepEqual(ingredientsInStep('Add the sauce.', list), []);
});

test('a tip sentence is split out as a pro move; one-sentence steps stay whole', () => {
  assert.deepEqual(splitTip('Boil the pasta for 8 minutes. Keep a cup of the water.'), { main: 'Boil the pasta for 8 minutes.', tip: 'Keep a cup of the water.' });
  assert.deepEqual(splitTip('Keep stirring for 2 minutes.'), { main: 'Keep stirring for 2 minutes.', tip: null });
});

for (const r of recipes) {
  test(`${r.title}: every ingredient is used in a step`, () => {
    const unused = unusedIngredients(r.steps, r.ingredients).map((i: { name: string }) => i.name);
    assert.deepEqual(unused, [], `Not mentioned in any step: ${unused.join(', ')}`);
  });
  test(`${r.title}: every ingredient a step mentions is linked to that step`, () => {
    r.steps.forEach((s: string, i: number) => {
      const unclear = unclearMentions(s, r.ingredients);
      assert.deepEqual(unclear, [], `Step ${i + 1} mentions "${unclear.join('", "')}" but it isn't linked to an ingredient`);
    });
  });
}
