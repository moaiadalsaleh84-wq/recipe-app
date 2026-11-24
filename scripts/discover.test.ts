import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryDiscover, cleanCrop, filterRows, homeRow, sameSecret } from '../supabase/functions/import-recipe/lib/discover.ts';
import { handle, type Deps } from '../supabase/functions/import-recipe/lib/handler.ts';
import { MemoryCache, MemoryLimiter } from '../supabase/functions/import-recipe/lib/limits.ts';

const ADMIN = 'owner-secret-0123456789abcdef';
const recipe = {
  title: 'Cornflake tenders',
  mealType: 'dinner',
  servings: 4,
  minutes: 30,
  ingredients: [{ id: 'i1', name: 'Chicken tenders', quantity: 600, unit: 'g' }, { id: 'i2', name: 'Cornflakes', quantity: 100, unit: 'g' }],
  steps: ['Soak the chicken in buttermilk for 20 minutes.', 'Coat and fry for 6 minutes.'],
};

function setup(over: Partial<Deps> = {}) {
  const discover = new MemoryDiscover();
  const deps: Deps = {
    ai: null,
    limiter: new MemoryLimiter(),
    cache: new MemoryCache(),
    salt: 'test',
    discover,
    adminToken: ADMIN,
    stepWriter: async (steps) => steps.map((s) => `In your own words: ${s}`),
    ...over,
  };
  const call = async (body: Record<string, unknown>, headers: Record<string, string> = {}, device = 'device-aaaaaaaaaaaaaaaa') => {
    const res = await handle(new Request('http://localhost/import-recipe', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-install-id': device, ...headers } }), deps);
    return { status: res.status, json: (await res.json()) as Record<string, any> };
  };
  return { discover, deps, call };
}

const publish = (call: ReturnType<typeof setup>['call'], extra: Record<string, unknown> = {}) =>
  call(
    { action: 'admin.publish', sourceUrl: 'https://www.tiktok.com/@crispykitchen/video/7400000000000000201?_r=1', source: 'tiktok', title: 'Cornflake Hot Honey Tenders', creatorHandle: '@crispykitchen', creatorUrl: 'https://www.tiktok.com/@crispykitchen', cuisine: 'American', tags: ['Crispy'], diet: [], crop: { x: 0, y: 0.1, w: 1, h: 0.75 }, imageUrl: 'https://img.example.com/t.jpg', recipe, ...extra },
    { 'x-admin-token': ADMIN },
  );

test('admin is checked on the server: no code, a wrong code, or no secret set → refused', async () => {
  const { call } = setup();
  assert.equal((await call({ action: 'admin.check' })).status, 403);
  assert.equal((await call({ action: 'admin.check' }, { 'x-admin-token': 'guess' })).status, 403);
  assert.equal((await call({ action: 'admin.check' }, { 'x-admin-token': ADMIN })).json.ok, true);
  const off = setup({ adminToken: '' });
  assert.equal((await off.call({ action: 'admin.check' }, { 'x-admin-token': '' })).status, 403);
  // Publishing without the code does nothing.
  assert.equal((await call({ action: 'admin.publish', sourceUrl: 'https://x.com/a', title: 'x', creatorHandle: '@x', recipe })).status, 403);
  // After 10 wrong codes in a day, refused even faster.
  for (let i = 0; i < 10; i++) await call({ action: 'admin.check' }, { 'x-admin-token': `bad${i}` });
  assert.equal((await call({ action: 'admin.check' }, { 'x-admin-token': 'bad' })).status, 429);
  assert.ok(sameSecret('abc', 'abc') && !sameSecret('abc', 'abd') && !sameSecret('', ''));
});

test('publish: steps rewritten, creator required, link in one form; status, unpublish', async () => {
  const { call, discover } = setup();
  assert.equal((await publish(call, { creatorHandle: '' })).status, 400);
  const res = await publish(call);
  assert.equal(res.json.ok, true, JSON.stringify(res.json));
  const row = discover.rows[0];
  assert.equal(row.source_url, 'https://tiktok.com/@crispykitchen/video/7400000000000000201');
  assert.deepEqual((row.recipe as { steps: string[] }).steps, recipe.steps.map((s) => `In your own words: ${s}`));
  assert.equal(row.creator_handle, '@crispykitchen');
  assert.equal(row.ingredient_names, 'Chicken tenders · Cornflakes');
  // Publishing the same link again updates the same row.
  await publish(call, { title: 'Better title' });
  assert.equal(discover.rows.length, 1);
  assert.equal(discover.rows[0].title, 'Better title');
  const status = await call({ action: 'admin.status', sourceUrl: 'https://tiktok.com/@CrispyKitchen/video/7400000000000000201' }, { 'x-admin-token': ADMIN });
  assert.equal(status.json.item.status, 'published');
  // No AI to rewrite the steps: not published.
  const noAi = setup({ stepWriter: null });
  assert.equal((await publish(noAi.call)).status, 503);
  // Unpublish hides it.
  await call({ action: 'admin.unpublish', id: row.id }, { 'x-admin-token': ADMIN });
  assert.equal((await call({ action: 'discover.home' })).json.items.length, 0);
});

test('a photo sent by the app is stored in the photo bucket', async () => {
  const { call, discover } = setup();
  const res = await publish(call, { photo: { base64: Buffer.from('fake-webp').toString('base64'), contentType: 'image/webp' } });
  assert.match(res.json.item.imageUrl, /^https:\/\/storage\.example\.com\/discover-photos\/.+\.webp$/);
  assert.equal([...discover.photos.values()][0].length, 9);
});

test('saves: +1, the week row, the full recipe to copy; search and filters', async () => {
  const { call, discover } = setup();
  await publish(call);
  const id = discover.rows[0].id;
  let home = await call({ action: 'discover.home' });
  assert.equal(home.json.kind, 'new');
  const saved = await call({ action: 'discover.save', id });
  assert.equal(saved.json.item.saves, 1);
  assert.equal(saved.json.item.recipe.ingredients.length, 2);
  home = await call({ action: 'discover.home' });
  assert.equal(home.json.kind, 'popular');
  assert.equal(home.json.items[0].weekSaves, 1);
  const hit = (q: Record<string, unknown>) => call({ action: 'discover.list', ...q }).then((r) => r.json.items.length);
  assert.equal(await hit({ q: 'tenders' }), 1);
  assert.equal(await hit({ q: 'crispykitchen' }), 1);
  assert.equal(await hit({ q: 'pasta' }), 0);
  assert.equal(await hit({ cuisine: 'American' }), 1);
  assert.equal(await hit({ cuisine: 'Italian' }), 0);
  assert.equal(await hit({ mealType: 'dinner' }), 1);
  assert.equal(await hit({ ingredient: 'cornflake' }), 1);
  assert.equal(await hit({ ingredient: 'tofu' }), 0);
  assert.equal(await hit({ diet: 'Vegan' }), 0);
});

test('reports hide a recipe until the owner restores or removes it', async () => {
  const { call, discover } = setup();
  await publish(call);
  const id = discover.rows[0].id;
  assert.equal((await call({ action: 'discover.report', id, reason: 'spam' })).status, 400);
  await call({ action: 'discover.report', id, reason: 'creator' }, {}, 'device-bbbbbbbbbbbbbbbb');
  assert.equal((await call({ action: 'discover.list' })).json.items.length, 0);
  assert.equal((await call({ action: 'discover.get', id })).status, 404);
  const reports = await call({ action: 'admin.reports' }, { 'x-admin-token': ADMIN });
  assert.equal(reports.json.reports.length, 1);
  assert.equal(reports.json.reports[0].reason, 'creator');
  // Reports store the reason only.
  assert.deepEqual(Object.keys(discover.reports[0]).sort(), ['created_at', 'discover_id', 'id', 'reason', 'resolution', 'resolved_at']);
  await call({ action: 'admin.resolve', id, resolution: 'restore' }, { 'x-admin-token': ADMIN });
  assert.equal((await call({ action: 'discover.list' })).json.items.length, 1);
  assert.equal((await call({ action: 'admin.reports' }, { 'x-admin-token': ADMIN })).json.reports.length, 0);
  await call({ action: 'discover.report', id, reason: 'not_food' });
  await call({ action: 'admin.resolve', id, resolution: 'remove' }, { 'x-admin-token': ADMIN });
  assert.equal(discover.rows[0].status, 'removed');
});

test('helpers: crop limits, filters, empty Discover', () => {
  assert.deepEqual(cleanCrop({ x: 0, y: 0.1, w: 1, h: 0.75 }), { x: 0, y: 0.1, w: 1, h: 0.75 });
  assert.equal(cleanCrop({ x: 0.5, y: 0, w: 0.8, h: 1 }), null);
  assert.equal(cleanCrop('nope'), null);
  assert.deepEqual(filterRows([], { q: 'x' }), []);
  assert.deepEqual(homeRow([], {}).items, []);
});
