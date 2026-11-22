/**
 * Runs the import backend on your computer, for developing the app without deploying.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/import-dev-server.ts
 *   EXPO_PUBLIC_IMPORT_URL=http://<your-computer-ip>:8787/functions/v1/import-recipe npx expo start
 *
 * Options (environment variables):
 *   PORT=8787        port to listen on
 *   FAKE_AI=1        no API key needed: a simple line-by-line parser stands in for Claude.
 *                    For UI testing only; it is much worse than the real thing.
 *   FIXTURES=1       serve built-in sample pages for https://recipes.example.com/... links
 *                    (used by the app's automated tests; no internet needed).
 *   NO_LIMITS=1      raise the rate limits (for automated test runs only).
 * Limits and the cache are kept in memory and reset when you restart.
 */
import { createServer } from 'node:http';
import { claudeCaller, type AiCaller } from '../supabase/functions/import-recipe/lib/extract.ts';
import { handle } from '../supabase/functions/import-recipe/lib/handler.ts';
import { parseLine } from '../supabase/functions/import-recipe/lib/ingredients.ts';
import { LIMITS, MemoryCache, MemoryLimiter } from '../supabase/functions/import-recipe/lib/limits.ts';
import { FIXTURE_PAGES, FIXTURE_ROUTES } from './import-fixtures.ts';

const port = Number(process.env.PORT ?? 8787);
if (process.env.NO_LIMITS) Object.assign(LIMITS, { devicePer10Min: 10_000, devicePerDay: 10_000, ipPerDay: 10_000, globalAiPerDay: 10_000, previewsPer10Min: 10_000 });

/**
 * Dev-only stand-in for Claude (FAKE_AI=1): keeps lines that look like ingredients or steps and,
 * like the real prompt, writes simple "estimated" steps when the source has none. For testing the
 * app's screens only: the real model's results are far better.
 */
const fakeAi: AiCaller = async (m) => {
  const VERB = /^(boil|melt|add|toss|bake|fry|mix|stir|cook|soften|simmer|blend|brown|fill|blitz|smash|drizzle|season|serve|whisk|heat|roast|chop|marinate|dredge|place|pour|preheat)\b/i;
  const body = m.text.replace(/^(TikTok caption( by [^:]*)?|YouTube video title:[^\n]*\nDescription):?\s*/i, '');
  const lines = body.split(/\n|(?<=\.)\s+|,\s*/).map((l) => l.replace(/^[-•*]\s*|^\d+[.)]\s*/, '').replace(/#\S+/g, '').trim()).filter(Boolean);
  // Ingredient lines start with an amount; the first line can carry one after the dish name.
  const ingredientLines = lines.map((l) => l.replace(/^[^\d]*?\s(?=\d+\s*(g|kg|ml|tbsp|tsp|cups?|cloves?)?\s+[a-z])/i, '')).filter((l) => /^(\d|[½¼¾])/.test(l) && l.length < 80 && !/\b(min|minutes|hours?|serves)\b/i.test(l) && !VERB.test(l.replace(/^\d+\.\s*/, '')));
  const sourceSteps = m.structured?.steps.length ? m.structured.steps : lines.filter((l) => VERB.test(l));
  const ingredients = ingredientLines.map((l) => {
    const p = parseLine(l);
    return { original: l, quantity: p.amount ?? 0, unit: p.unit.replace(/s$/, ''), name: p.name, note: '', estimated: false, added_basic: false };
  });
  // The dish name: the first line up to its first amount ("Hot honey burger 🍔 4 thighs…" → "Hot honey burger").
  const title = (m.structured?.title ?? m.title ?? lines[0] ?? '').split(/\s\d/)[0].replace(/\s(in|for)$/i, '').slice(0, 60);
  const written = !sourceSteps.length;
  const steps = written
    ? [
        { text: `Get all the ingredients ready: ${ingredients.slice(0, 3).map((i) => i.name).join(', ')}.`, ingredient_indexes: ingredients.map((_, k) => k).slice(0, 3), timer_seconds: 0, estimated: true },
        { text: 'Cook everything together over medium heat for 10 minutes, stirring now and then.', ingredient_indexes: ingredients.map((_, k) => k).slice(3), timer_seconds: 600, estimated: true },
        { text: 'Taste, adjust and serve.', ingredient_indexes: [], timer_seconds: 0, estimated: true },
      ]
    : sourceSteps.map((text) => ({ text, ingredient_indexes: [], timer_seconds: 0, estimated: false }));
  return {
    is_recipe: ingredientLines.length > 0,
    title,
    description: '',
    meal_type: 'dinner',
    category: 'Dinner',
    servings: m.structured?.servings ?? 2,
    servings_estimated: !m.structured?.servings,
    prep_minutes: m.structured?.minutes ? Math.round(m.structured.minutes / 3) : 10,
    cook_minutes: m.structured?.minutes ? m.structured.minutes - Math.round(m.structured.minutes / 3) : 20,
    time_estimated: !m.structured?.minutes,
    tags: [],
    diet: { vegetarian: false, vegan: false, gluten_free: false, dairy_free: false, pork_free: true },
    ingredients,
    steps,
    // Like the real prompt: copy the site's nutrition when it gives some.
    nutrition_per_serving: m.structured?.nutrition?.calories
      ? { available: true, calories: m.structured.nutrition.calories, protein_g: m.structured.nutrition.protein ?? 0, carbs_g: m.structured.nutrition.carbs ?? 0, fat_g: m.structured.nutrition.fat ?? 0, from_source: true }
      : { available: ingredientLines.length >= 3, calories: 450, protein_g: 20, carbs_g: 50, fat_g: 15, from_source: false },
  };
};

const realFetch = globalThis.fetch;
const fixtureFetch: typeof fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  const route = FIXTURE_ROUTES[url] ?? FIXTURE_ROUTES[url.split('?')[0]];
  if (route) return new Response(route.status >= 300 && route.status < 400 ? null : route.body, { status: route.status, headers: route.headers });
  if (/^https:\/\/(www\.|vm\.)?(tiktok|youtube)\.com\/|^https:\/\/falafel\.example\.com\//.test(url)) return new Response('not found', { status: 404 });
  const page = FIXTURE_PAGES[url.split('?')[0]];
  if (page) return new Response(page, { status: 200, headers: { 'content-type': 'text/html' } });
  if (url.startsWith('https://recipes.example.com/')) return new Response('not found', { status: 404 });
  return realFetch(input, init);
};

const key = process.env.ANTHROPIC_API_KEY;
const ai = process.env.FAKE_AI ? fakeAi : key ? claudeCaller(key, process.env.IMPORT_MODEL || undefined) : null;
const deps = {
  ai,
  limiter: new MemoryLimiter(),
  cache: new MemoryCache(),
  salt: 'dev',
  fetchImpl: process.env.FIXTURES ? fixtureFetch : undefined,
  log: (e: Record<string, unknown>) => console.log(new Date().toISOString(), JSON.stringify(e)),
};

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  headers.set('x-forwarded-for', req.socket.remoteAddress ?? 'local');
  const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
  const response = await handle(request, deps);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(port, () => {
  console.log(`Import dev server on http://localhost:${port}/functions/v1/import-recipe`);
  console.log(ai === fakeAi ? 'AI: FAKE (dev parser)' : ai ? `AI: Claude (${process.env.IMPORT_MODEL || 'claude-opus-5-5'})` : 'AI: off (set ANTHROPIC_API_KEY). Only pages with structured data will import.');
});
