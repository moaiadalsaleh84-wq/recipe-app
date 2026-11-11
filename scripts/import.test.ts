/**
 * Offline tests for the import backend: parsing, grounding, limits and the request handler.
 * Run: node --test scripts/import.test.ts
 *
 * Pages here are trimmed copies of the markup patterns real sites use (WordPress Recipe
 * Maker @graph, Dotdash-style arrays, HowToSection, entity-encoded strings). For tests
 * against live sites, use scripts/test-import.ts.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromAi, type AiCaller } from '../supabase/functions/import-recipe/lib/extract.ts';
import { handle, type Deps } from '../supabase/functions/import-recipe/lib/handler.ts';
import { assertPublicUrl } from '../supabase/functions/import-recipe/lib/http.ts';
import { isGrounded, normalize, parseLine } from '../supabase/functions/import-recipe/lib/ingredients.ts';
import { isoMinutes, recipeFromHtml, yieldNumber } from '../supabase/functions/import-recipe/lib/jsonld.ts';
import { MemoryCache, MemoryLimiter } from '../supabase/functions/import-recipe/lib/limits.ts';
import { findUrl, instagramCaption, youTubeDescription } from '../supabase/functions/import-recipe/lib/sources.ts';
import type { ImportResponse, SourceMaterial } from '../supabase/functions/import-recipe/lib/types.ts';

/* ---------------- fixtures ---------------- */

const WPRM = `<!doctype html><html><head><title>Easy Lemon Garlic Pasta | Some Blog</title>
<meta property="og:image" content="https://blog.example.com/pasta.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Some Blog"},
{"@type":"Article","headline":"Easy Lemon Garlic Pasta"},
{"@type":"Recipe","name":"Easy Lemon Garlic Pasta","recipeYield":["4","4 servings"],"prepTime":"PT10M","cookTime":"PT15M","totalTime":"PT25M",
"recipeCategory":["Dinner"],"keywords":"pasta, vegetarian, quick",
"image":["https://blog.example.com/pasta-1x1.jpg"],
"recipeIngredient":["400 g spaghetti","3 tablespoons olive oil","4 cloves garlic, thinly sliced","1 lemon, zest and juice","50 g parmesan, grated","Salt and pepper to taste"],
"recipeInstructions":[{"@type":"HowToStep","text":"Cook the spaghetti in salted water until al dente."},{"@type":"HowToStep","text":"Fry the garlic in olive oil for 1 minute."},{"@type":"HowToStep","text":"Toss the pasta with garlic oil, lemon and parmesan."}],
"nutrition":{"@type":"NutritionInformation","calories":"520 kcal","proteinContent":"17 g","carbohydrateContent":"76 g","fatContent":"16 g"}}]}</script>
</head><body><article><h1>Easy Lemon Garlic Pasta</h1><p>Long story about Italy…</p></article></body></html>`;

const SECTIONS = `<html><head><script type="application/ld+json">[{"@context":"http://schema.org","@type":["Recipe"],"name":"Mac &amp; Cheese",
"recipeYield":"Makes 6","totalTime":"PT1H5M",
"recipeIngredient":["2 &frac12; cups elbow macaroni","&frac14; cup butter","3 cups milk","2 cups shredded cheddar"],
"recipeInstructions":[{"@type":"HowToSection","name":"Pasta","itemListElement":[{"@type":"HowToStep","text":"Boil the macaroni for 8 minutes."}]},
{"@type":"HowToSection","name":"Sauce","itemListElement":[{"@type":"HowToStep","text":"Melt the butter, whisk in the milk."},{"@type":"HowToStep","text":"Stir in cheddar and the pasta."}]}]}]</script></head><body></body></html>`;

const NO_JSONLD = `<html><head><title>Grandma's Pancakes</title></head><body><header>Menu</header><main><h1>Grandma's Pancakes</h1>
<h2>Ingredients</h2><ul><li>200 g flour</li><li>2 eggs</li><li>300 ml milk</li><li>1 tbsp sugar</li></ul>
<h2>Method</h2><ol><li>Whisk everything together.</li><li>Fry ladlefuls in a hot pan, 2 minutes each side.</li></ol></main><footer>© 2026</footer></body></html>`;

const YT_PAGE = `<html><script>var ytInitialPlayerResponse = {"videoDetails":{"videoId":"abc123def45","shortDescription":"My best chili!\\n\\nIngredients:\\n500g beef mince\\n1 onion, diced\\n2 cans kidney beans\\n1 tbsp chili powder\\n\\nBrown the beef, add onion, beans and spices. Simmer 30 minutes."}};</script></html>`;
const YT_PAGE_EMPTY = `<html><script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Subscribe for more!"}};</script></html>`;

const IG_PAGE = `<html><head><title>Instagram</title><meta property="og:description" content="12,345 likes, 210 comments - cook.with.sam on May 1, 2026: &quot;Crispy chickpea bowl 🥗 You need: 1 can chickpeas, 1 tbsp olive oil, 1 tsp paprika, 2 cups spinach. Roast chickpeas with oil and paprika at 200C for 25 min, serve on spinach.&quot;."><meta property="og:image" content="https://cdn.example.com/ig.jpg"></head></html>`;
const IG_LOGIN = `<html><head><title>Login • Instagram</title></head><body>Log in to see photos</body></html>`;

const TIKTOK_OEMBED = JSON.stringify({ title: 'Viral feta pasta! 1 block feta, 500g cherry tomatoes, 3 tbsp olive oil, 2 garlic cloves, 300g pasta. Bake feta and tomatoes 35 min at 200C, stir in pasta #pasta #fyp', author_name: 'chef', thumbnail_url: 'https://p16.example.com/t.jpg' });
const TIKTOK_EMPTY = JSON.stringify({ title: 'wait for it 😂 #food', author_name: 'x' });

function fakeFetch(routes: Record<string, { status?: number; body: string; headers?: Record<string, string> }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) return new Response('not found', { status: 404 });
    const r = routes[key];
    return new Response(r.body, { status: r.status ?? 200, headers: r.headers ?? { 'content-type': 'text/html' } });
  }) as typeof fetch;
}

function deps(over: Partial<Deps> = {}): Deps {
  return { ai: null, limiter: new MemoryLimiter(), cache: new MemoryCache(), salt: 'test', ...over };
}

async function post(d: Deps, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; json: ImportResponse }> {
  const res = await handle(
    new Request('http://localhost/import-recipe', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-install-id': 'test-install-0000000001', ...headers } }),
    d,
  );
  return { status: res.status, json: (await res.json()) as ImportResponse };
}

/* ---------------- parsing ---------------- */

test('JSON-LD in a WordPress @graph is found and normalized', () => {
  const r = recipeFromHtml(WPRM)!;
  assert.equal(r.title, 'Easy Lemon Garlic Pasta');
  assert.equal(r.servings, 4);
  assert.equal(r.minutes, 25);
  assert.equal(r.ingredients.length, 6);
  assert.equal(r.steps.length, 3);
  assert.equal(r.imageUrl, 'https://blog.example.com/pasta-1x1.jpg');
  assert.deepEqual(r.nutrition, { calories: 520, protein: 17, carbs: 76, fat: 16 });
});

test('HowToSection steps, entities and "Makes 6" yield', () => {
  const r = recipeFromHtml(SECTIONS)!;
  assert.equal(r.title, 'Mac & Cheese');
  assert.equal(r.servings, 6);
  assert.equal(r.minutes, 65);
  assert.deepEqual(r.ingredients.slice(0, 2), ['2 ½ cups elbow macaroni', '¼ cup butter']);
  assert.equal(r.steps.length, 3);
});

test('pages without JSON-LD return null', () => assert.equal(recipeFromHtml(NO_JSONLD), null));

test('durations and yields', () => {
  assert.equal(isoMinutes('PT1H30M'), 90);
  assert.equal(isoMinutes('P0DT0H45M'), 45);
  assert.equal(isoMinutes('nonsense'), null);
  assert.equal(yieldNumber(['8', '8 slices']), 8);
  assert.equal(yieldNumber('Serves 2-3'), 2);
});

test('ingredient lines', () => {
  assert.deepEqual(parseLine('1 ½ cups (200 g) flour, sifted'), { amount: 1.5, unit: 'cup', name: 'flour, sifted', original: '1 ½ cups (200 g) flour, sifted' });
  assert.equal(parseLine('2-3 cloves garlic').amount, 2);
  assert.equal(parseLine('2-3 cloves garlic').unit, 'clove');
  assert.equal(parseLine('Salt to taste').amount, null);
  assert.equal(parseLine('3 eggs').unit, '');
  assert.equal(parseLine('1/2 tsp salt').amount, 0.5);
});

test('YouTube description, Instagram caption and URL finding', () => {
  assert.match(youTubeDescription(YT_PAGE)!, /500g beef mince/);
  assert.equal(instagramCaption('5 likes, 1 comments - a on May 1: "Hello there"'), 'Hello there');
  assert.equal(findUrl('Look at this!! https://www.tiktok.com/@a/video/123?lang=en.'), 'https://www.tiktok.com/@a/video/123?lang=en');
  assert.equal(findUrl('www.bbcgoodfood.com/recipes/x'), 'https://www.bbcgoodfood.com/recipes/x');
  assert.equal(findUrl('just some words'), null);
});

test('private and odd URLs are refused (SSRF)', () => {
  for (const u of ['http://localhost/x', 'http://127.0.0.1/', 'http://10.0.0.5/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'ftp://example.com/x', 'http://example.com:8080/', 'http://user:pw@example.com/', 'http://printer.local/']) {
    assert.throws(() => assertPublicUrl(u), Error, u);
  }
  assert.ok(assertPublicUrl('https://www.bbcgoodfood.com/recipes/x'));
});

/* ---------------- grounding ---------------- */

test('grounding keeps source ingredients and drops invented ones', () => {
  const src = normalize('You need: 2 cans kidney beans, 1 onion, diced and 500g beef mince');
  assert.ok(isGrounded({ name: 'kidney beans', original: '2 cans kidney beans' }, src));
  assert.ok(isGrounded({ name: 'onions', original: '1 onion' }, src));
  assert.ok(!isGrounded({ name: 'sour cream', original: '100 ml sour cream' }, src));
  const material: SourceMaterial = { kind: 'text', url: null, host: null, title: null, text: '2 eggs, 100 g flour. Mix and fry.', imageUrl: null, structured: null };
  const out = fromAi(
    {
      is_recipe: true, title: 'Pancakes', servings: 2, total_minutes: 10, category: 'Breakfast', tags: ['Vegetarian'],
      ingredients: [{ original: '2 eggs', amount: 2, unit: '', name: 'eggs' }, { original: '100 g flour', amount: 100, unit: 'g', name: 'flour' }, { original: '50 g butter', amount: 50, unit: 'g', name: 'butter' }],
      steps: ['Mix.', 'Fry.'], nutrition_per_serving: { available: true, calories: 300, protein_g: 12, carbs_g: 38, fat_g: 10, from_source: false },
    },
    material,
  );
  assert.deepEqual(out.recipe.ingredients.map((i) => i.name), ['eggs', 'flour']);
  assert.deepEqual(out.dropped, ['butter']);
  assert.equal(out.recipe.nutrition?.basis, 'ai');
});

/* ---------------- handler ---------------- */

const fakeAi = (over: Record<string, unknown> = {}): AiCaller => async (m) => {
  // A tiny "model": reads ingredient lines from the text, and also invents "secret sauce".
  const lines = m.text.split('\n').filter((l) => /^- /.test(l)).map((l) => l.slice(2));
  return {
    is_recipe: true, title: m.structured?.title ?? 'Something', servings: 4, total_minutes: 25, category: 'Dinner', tags: [],
    ingredients: [...lines.map((l) => ({ original: l, amount: 1, unit: '', name: l.replace(/^[\d½¼¾\s]+(g|tablespoons|cloves|cups?)?\s*/, '') })), { original: '1 tbsp secret sauce', amount: 1, unit: 'tbsp', name: 'secret sauce' }],
    steps: ['Cook.', 'Eat.'],
    nutrition_per_serving: { available: true, calories: 500, protein_g: 20, carbs_g: 60, fat_g: 15, from_source: true },
    ...over,
  };
};

test('website with JSON-LD + AI: complete, invented ingredient dropped with a warning, cached', async () => {
  let calls = 0;
  const ai: AiCaller = async (m) => {
    calls++;
    return fakeAi()(m);
  };
  const d = deps({ ai, fetchImpl: fakeFetch({ 'https://blog.example.com/pasta': { body: WPRM } }) });
  const { status, json } = await post(d, { url: 'https://blog.example.com/pasta' });
  assert.equal(status, 200);
  assert.ok(json.ok);
  if (!json.ok) return;
  assert.equal(json.status, 'complete', JSON.stringify(json.missing));
  assert.equal(json.recipe.ingredients.length, 6);
  assert.ok(json.warnings.some((w) => /secret sauce/.test(w)));
  assert.ok(json.source.usedStructuredData && json.source.usedAi);
  assert.equal(json.recipe.nutrition?.estimated, true);
  await post(d, { url: 'https://blog.example.com/pasta' });
  assert.equal(calls, 1, 'second import should come from the cache');
});

test('no API key: JSON-LD still imports by code, with site nutrition', async () => {
  const d = deps({ fetchImpl: fakeFetch({ 'https://blog.example.com/pasta': { body: WPRM } }) });
  const { json } = await post(d, { url: 'https://blog.example.com/pasta' });
  assert.ok(json.ok);
  if (!json.ok) return;
  assert.equal(json.recipe.ingredients[0].amount, 400);
  assert.equal(json.recipe.ingredients[0].unit, 'g');
  assert.equal(json.recipe.nutrition?.calories, 520);
  assert.ok(json.warnings.some((w) => /isn’t set up/.test(w)));
});

test('no API key and no JSON-LD: honest failure with what we found', async () => {
  const d = deps({ fetchImpl: fakeFetch({ 'https://nojsonld.example.com/': { body: NO_JSONLD } }) });
  const { status, json } = await post(d, { url: 'https://nojsonld.example.com/' });
  assert.equal(status, 503);
  assert.ok(!json.ok && json.code === 'ai_unavailable' && json.partial?.title === "Grandma's Pancakes");
});

test('YouTube with a recipe in the description goes to the AI; without one says so', async () => {
  const seen: SourceMaterial[] = [];
  const ai: AiCaller = async (m) => {
    seen.push(m);
    return fakeAi({ ingredients: [{ original: '500g beef mince', amount: 500, unit: 'g', name: 'beef mince' }], title: 'Chili' })(m);
  };
  const routes = {
    'https://www.youtube.com/oembed': { body: JSON.stringify({ title: 'Best chili', thumbnail_url: 'https://i.ytimg.com/x.jpg' }), headers: { 'content-type': 'application/json' } },
    'https://www.youtube.com/watch?v=abc123def45': { body: YT_PAGE },
    'https://www.youtube.com/watch?v=empty000000': { body: YT_PAGE_EMPTY },
  };
  const d = deps({ ai, fetchImpl: fakeFetch(routes) });
  const ok = await post(d, { url: 'https://youtu.be/abc123def45' });
  assert.ok(ok.json.ok);
  assert.match(seen[0].text, /kidney beans/);
  const none = await post(d, { url: 'https://www.youtube.com/shorts/empty000000' });
  assert.ok(!none.json.ok && none.json.code === 'no_text' && none.json.partial?.title === 'Best chili');
});

test('TikTok captions: recipe vs. no recipe', async () => {
  const d = deps({ ai: fakeAi({ ingredients: [{ original: '1 block feta', amount: 1, unit: '', name: 'feta' }] }), fetchImpl: fakeFetch({ 'https://www.tiktok.com/oembed?url=https%3A%2F%2Fwww.tiktok.com%2F%40a%2Fvideo%2F1': { body: TIKTOK_OEMBED }, 'https://www.tiktok.com/oembed': { body: TIKTOK_EMPTY } }) });
  const ok = await post(d, { url: 'https://www.tiktok.com/@a/video/1' });
  assert.ok(ok.json.ok, JSON.stringify(ok.json));
  const none = await post(d, { url: 'https://www.tiktok.com/@a/video/2' });
  assert.ok(!none.json.ok && none.json.code === 'no_text');
});

test('Instagram: caption read from metadata; login wall reported; pasted caption rescues it', async () => {
  const d = deps({ ai: fakeAi({ ingredients: [{ original: '1 can chickpeas', amount: 1, unit: 'can', name: 'chickpeas' }] }), fetchImpl: fakeFetch({ 'https://www.instagram.com/p/OK/': { body: IG_PAGE }, 'https://www.instagram.com/p/LOGIN/': { body: IG_LOGIN } }) });
  const ok = await post(d, { url: 'https://www.instagram.com/p/OK/' });
  assert.ok(ok.json.ok);
  const wall = await post(d, { url: 'https://www.instagram.com/p/LOGIN/' });
  assert.ok(!wall.json.ok && wall.json.code === 'blocked');
  const rescued = await post(d, { url: 'https://www.instagram.com/p/LOGIN/', text: 'Chickpea bowl: 1 can chickpeas, 1 tbsp oil. Roast 25 min.' });
  assert.ok(rescued.json.ok);
  if (rescued.json.ok) assert.ok(rescued.json.warnings.some((w) => /pasted/.test(w)));
});

test('partial result lists what is missing', async () => {
  const d = deps({ ai: async () => ({ is_recipe: true, title: 'Mystery stew', servings: 0, total_minutes: 0, category: 'Unknown', tags: [], ingredients: [{ original: 'beef', amount: 0, unit: '', name: 'beef' }, { original: 'carrots', amount: 0, unit: '', name: 'carrots' }], steps: [], nutrition_per_serving: { available: false, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, from_source: false } }) });
  const { json } = await post(d, { text: 'Mystery stew. Throw beef and carrots in a pot, my nan never measured anything.' });
  assert.ok(json.ok);
  if (!json.ok) return;
  assert.equal(json.status, 'partial');
  assert.deepEqual(json.missing, ['steps', 'amounts', 'servings', 'minutes']);
  assert.equal(json.recipe.nutrition, null);
});

test('not a recipe', async () => {
  const d = deps({ ai: async () => ({ is_recipe: false, title: '', servings: 0, total_minutes: 0, category: 'Unknown', tags: [], ingredients: [], steps: [], nutrition_per_serving: { available: false, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, from_source: false } }) });
  const { status, json } = await post(d, { text: 'My holiday in Spain was lovely, the beach was great and the hotel too.' });
  assert.equal(status, 422);
  assert.ok(!json.ok && json.code === 'not_a_recipe');
});

test('rate limits per device, then the daily AI cap', async () => {
  const d = deps({ ai: fakeAi(), dailyAiCap: 8 });
  const text = 'Toast: 2 slices bread, 1 tbsp butter. Toast the bread and butter it.';
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) statuses.push((await post(d, { text })).status);
  assert.deepEqual(statuses.slice(0, 6), [200, 200, 200, 200, 200, 200]);
  assert.equal(statuses[6], 429);
  // Other devices still work until the global cap is reached.
  const others: string[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await post(d, { text }, { 'x-install-id': `other-device-00000000${i}` });
    others.push(r.json.ok ? 'ok' : r.json.code);
  }
  assert.deepEqual(others, ['ok', 'ok', 'daily_cap', 'daily_cap']);
});

test('bad requests', async () => {
  const d = deps();
  assert.equal((await post(d, { url: 'http://169.254.169.254/latest' })).status, 400);
  assert.equal((await post(d, {})).status, 400);
  assert.equal((await post(d, { text: 'hi' })).status, 400);
  assert.equal((await post(d, { text: 'x' }, { 'x-install-id': 'bad' })).status, 400);
  const big = await handle(new Request('http://localhost/', { method: 'POST', body: 'x'.repeat(70_000), headers: { 'x-install-id': 'test-install-0000000001' } }), d);
  assert.equal(big.status, 400);
  const pre = await handle(new Request('http://localhost/', { method: 'OPTIONS' }), d);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), '*');
});

test('site errors become friendly messages', async () => {
  const d = deps({ fetchImpl: fakeFetch({ 'https://www.blocked.example.com/': { status: 403, body: 'no' }, 'https://gone.example.com/': { status: 404, body: 'no' } }) });
  const blocked = await post(d, { url: 'https://www.blocked.example.com/' });
  assert.ok(!blocked.json.ok && blocked.json.code === 'blocked');
  const gone = await post(d, { url: 'https://gone.example.com/' });
  assert.ok(!gone.json.ok && gone.json.code === 'fetch_failed');
});
