// The import copies every value from data/pantry-pop-recipes.json unchanged (only the shape changes).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fromPantryPop, withoutDuplicates, type PantryPopFile } from '../src/lib/pantryPopImport.ts';

const file: PantryPopFile = JSON.parse(readFileSync(new URL('../data/pantry-pop-recipes.json', import.meta.url), 'utf8'));
const recipes = fromPantryPop(file, () => 'Other');

test('all 20 recipes come in', () => {
  assert.equal(recipes.length, 20);
  assert.equal(new Set(recipes.map((r) => r.id)).size, 20);
});

test('every value is copied exactly', () => {
  file.recipes.forEach((src, k) => {
    const r = recipes[k];
    assert.equal(r.id, src.id);
    assert.equal(r.title, src.title);
    assert.equal(r.description, src.description);
    assert.equal(r.mealType, src.mealType);
    assert.equal(r.cuisine, src.cuisine);
    assert.equal(r.difficulty, src.difficulty);
    assert.equal(r.prepMinutes, src.prepMinutes);
    assert.equal(r.cookMinutes, src.cookMinutes);
    assert.equal(r.minutes, src.totalMinutes);
    assert.equal(r.servings, src.baseServings);
    assert.deepEqual(r.diet, src.diet);
    assert.equal(r.calories, src.nutritionPerServing.kcal);
    assert.deepEqual(r.nutrition, { protein: src.nutritionPerServing.proteinG, carbs: src.nutritionPerServing.carbsG, fat: src.nutritionPerServing.fatG });
    assert.deepEqual(r.tags, src.tags.map((t) => (t === 'Comfort' ? 'Comfort food' : t)));
    assert.equal(r.ingredients.length, src.ingredients.length);
    src.ingredients.forEach((i, j) => {
      const got = r.ingredients[j];
      assert.equal(got.id, i.id);
      assert.equal(got.name, i.name);
      assert.equal(got.quantity, i.quantity); // null stays null
      assert.equal(got.unit, i.unit);
      assert.equal(got.note, i.note);
    });
    const steps = [...src.steps].sort((a, b) => a.n - b.n);
    assert.deepEqual(r.steps, steps.map((s) => s.text));
    assert.deepEqual(r.stepMeta, steps.map((s) => ({ ingredientIds: s.ingredientIds, timerSeconds: s.timerSeconds })));
    assert.ok(!('_check' in r));
  });
});

test('every step ingredient id exists in its recipe', () => {
  for (const r of recipes) for (const m of r.stepMeta ?? []) for (const id of m.ingredientIds) assert.ok(r.ingredients.some((i) => i.id === id), `${r.title}: ${id}`);
});

test('same title as an existing recipe: the existing one wins', () => {
  const { kept, skipped } = withoutDuplicates(recipes, [{ ...recipes[0], id: 'mine', title: ' crispy beef TACOS ' }]);
  assert.equal(kept.length, 19);
  assert.deepEqual(skipped, ['Crispy Beef Tacos']);
});
