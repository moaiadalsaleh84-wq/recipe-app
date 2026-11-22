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

test('XP: a written recipe 30; an import 5, for at most 3 imports a day', async () => {
  const { recipeXp } = await import('../src/lib/progress.ts');
  const day = (d: number, h: number) => new Date(2026, 10, d, h).toISOString();
  const imp = (d: number, h: number) => ({ id: `my-x${d}${h}-a`, origin: 'import', addedAt: day(d, h) });
  // 5 imports on one day: only 3 count.
  assert.equal(recipeXp([imp(20, 9), imp(20, 10), imp(20, 11), imp(20, 12), imp(20, 13)]), 15);
  // Another day starts a new count.
  assert.equal(recipeXp([imp(20, 9), imp(20, 10), imp(20, 11), imp(21, 9)]), 20);
  // Written recipes keep 30 each, and don't use up the import allowance.
  assert.equal(recipeXp([{ id: 'my-a-b', origin: 'manual' }, { id: 'old-recipe' }, imp(20, 9)]), 65);
  // Older imports without addedAt: the time in the id.
  const t = new Date(2026, 10, 22, 12).getTime().toString(36);
  assert.equal(recipeXp([1, 2, 3, 4].map((k) => ({ id: `my-${t}-${k}`, origin: 'import' }))), 15);
});
