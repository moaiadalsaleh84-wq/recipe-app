import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSourceUrl, removeDuplicateImports, sameSource } from '../src/lib/sourceLink.ts';

test('the same TikTok, YouTube, Instagram or web link in any form is one link', () => {
  const tt = 'https://tiktok.com/@crispykitchen/video/7400000000000000201';
  assert.equal(normalizeSourceUrl('https://www.tiktok.com/@CrispyKitchen/video/7400000000000000201?_r=1&is_from_webapp=1&sender_device=pc'), tt);
  assert.equal(normalizeSourceUrl('Look! https://m.tiktok.com/@crispykitchen/video/7400000000000000201/ yum'), tt);
  assert.equal(normalizeSourceUrl('https://youtu.be/abc123XYZ_-?si=xyz'), 'https://youtube.com/watch?v=abc123XYZ_-');
  assert.equal(normalizeSourceUrl('https://www.youtube.com/shorts/abc123XYZ_-?feature=share'), 'https://youtube.com/watch?v=abc123XYZ_-');
  assert.equal(normalizeSourceUrl('https://www.instagram.com/reels/C1abc/?igsh=xx'), 'https://instagram.com/reel/C1abc');
  assert.equal(normalizeSourceUrl('https://www.site.com/recipes/pie/?utm_source=x&page=2#comments'), 'https://site.com/recipes/pie?page=2');
  assert.ok(sameSource('https://site.com/pie', 'http://www.site.com/pie/?fbclid=1'));
  assert.ok(!sameSource('https://site.com/pie', 'https://site.com/cake'));
  assert.equal(normalizeSourceUrl('no link here'), null);
});

test('duplicates already saved: newest kept, everything pointing at the old copy moved over', () => {
  const imp = (id: string, url: string, addedAt: string) => ({ id, sourceUrl: url, origin: 'import', source: 'tiktok', custom: true, addedAt, title: id });
  const s = {
    customRecipes: [
      imp('my-new', 'https://www.tiktok.com/@a/video/1?_r=1', '2026-11-23T10:00:00Z'),
      imp('my-old', 'https://www.tiktok.com/@a/video/1', '2026-11-22T10:00:00Z'),
      imp('my-other', 'https://www.tiktok.com/@a/video/2', '2026-11-20T10:00:00Z'),
      { id: 'my-hand', custom: true, origin: 'manual', sourceUrl: 'https://www.tiktok.com/@a/video/1', title: 'mine' },
    ],
    favorites: ['my-old', 'my-new'],
    cookbooks: [{ id: 'c', name: 'C', recipeIds: ['my-old'] }],
    plan: { 0: { Dinner: 'my-old' } },
    cooked: [{ recipeId: 'my-old', date: 'x' }],
    notes: { 'my-old': 'less salt' },
    groceries: [{ key: 'k', recipeIds: ['my-old', 'my-new'] }],
  };
  const { saved, removed } = removeDuplicateImports(s);
  assert.equal(removed, 1);
  assert.deepEqual(saved.customRecipes.map((r) => r.id), ['my-new', 'my-other', 'my-hand']);
  assert.deepEqual(saved.favorites, ['my-new']);
  assert.deepEqual(saved.cookbooks[0].recipeIds, ['my-new']);
  assert.equal(saved.plan[0].Dinner, 'my-new');
  assert.equal(saved.cooked[0].recipeId, 'my-new');
  assert.deepEqual(saved.notes, { 'my-new': 'less salt' });
  assert.deepEqual(saved.groceries[0].recipeIds, ['my-new']);
  // Nothing to do: the same object comes back.
  assert.equal(removeDuplicateImports(saved).removed, 0);
});

test('server and app write links the same way', async () => {
  const server = await import('../supabase/functions/import-recipe/lib/links.ts');
  for (const u of [
    'https://www.tiktok.com/@CrispyKitchen/video/7400000000000000201?_r=1&is_from_webapp=1',
    'https://youtu.be/abc123XYZ_-?si=xyz',
    'https://www.instagram.com/reels/C1abc/?igsh=xx',
    'https://www.site.com/recipes/pie/?utm_source=x&page=2#comments',
    'https://vm.tiktok.com/ZMcorn/',
  ]) assert.equal(server.normalizeSourceUrl(u), normalizeSourceUrl(u), u);
  assert.ok(server.isShortLink('https://vm.tiktok.com/ZMcorn/'));
  assert.ok(!server.isShortLink('https://www.tiktok.com/@a/video/1'));
});
