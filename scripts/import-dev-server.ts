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
import { FIXTURE_PAGES } from './import-fixtures.ts';

const port = Number(process.env.PORT ?? 8787);
if (process.env.NO_LIMITS) Object.assign(LIMITS, { devicePer10Min: 10_000, devicePerDay: 10_000, ipPerDay: 10_000, globalAiPerDay: 10_000 });

/** Dev-only stand-in for Claude: keeps lines that look like ingredients or steps. */
const fakeAi: AiCaller = async (m) => {
  const lines = m.text.split(/\n|(?<=\.)\s+|,\s*/).map((l) => l.replace(/^[-•*]\s*|^\d+[.)]\s*/, '').trim()).filter(Boolean);
  const ingredientLines = lines.filter((l) => /^(\d|[½¼¾])/.test(l) && l.length < 80);
  const steps = lines.filter((l) => l.length > 25 && /[a-z]/.test(l) && !/^(\d|[½¼¾])/.test(l) && !/^(title|servings|total time|category|keywords|ingredients|steps|tiktok|instagram|youtube)/i.test(l));
  const title = m.structured?.title ?? m.title ?? lines[0]?.slice(0, 60) ?? '';
  return {
    is_recipe: ingredientLines.length > 0,
    title,
    servings: m.structured?.servings ?? 0,
    total_minutes: m.structured?.minutes ?? 0,
    category: 'Unknown',
    tags: [],
    ingredients: ingredientLines.map((l) => {
      const p = parseLine(l);
      return { original: l, amount: p.amount ?? 0, unit: p.unit, name: p.name };
    }),
    steps: m.structured?.steps.length ? m.structured.steps : steps,
    // Like the real prompt: copy the site's nutrition when it gives some.
    nutrition_per_serving: m.structured?.nutrition?.calories
      ? { available: true, calories: m.structured.nutrition.calories, protein_g: m.structured.nutrition.protein ?? 0, carbs_g: m.structured.nutrition.carbs ?? 0, fat_g: m.structured.nutrition.fat ?? 0, from_source: true }
      : { available: ingredientLines.length >= 3, calories: 450, protein_g: 20, carbs_g: 50, fat_g: 15, from_source: false },
  };
};

const realFetch = globalThis.fetch;
const fixtureFetch: typeof fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
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
