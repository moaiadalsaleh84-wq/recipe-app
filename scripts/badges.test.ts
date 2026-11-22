// The "Recipe Writer" badge: only for a recipe you wrote yourself, never for an import.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BADGES, type ProgressInput } from '../src/lib/progress.ts';

// earned() is count reaching its target.
const writer = BADGES.find((b) => b.id === 'writer')!;
const input = (origins: ('import' | 'manual' | undefined)[]): ProgressInput =>
  ({ cooked: [], customRecipes: origins.map((origin, i) => ({ id: `r${i}`, origin })), plan: {}, favorites: [], fun: { pets: 0, listsDone: 0, badges: [], lastLevel: 1 }, streak: 0 }) as unknown as ProgressInput;

test('Recipe Writer: imports never count; a written recipe does (older ones without an origin too)', () => {
  assert.deepEqual(writer.count(input(['import', 'import'])), [0, 1]);
  assert.deepEqual(writer.count(input(['import', 'manual'])), [1, 1]);
  assert.deepEqual(writer.count(input([undefined])), [1, 1]);
});

test('Recipe Writer: not earned by imports alone', () => {
  assert.equal(writer.earned(input(['import', 'import', 'import'])), false);
  assert.equal(writer.earned(input(['import', 'manual'])), true);
});
