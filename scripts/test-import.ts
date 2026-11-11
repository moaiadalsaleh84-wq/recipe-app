/**
 * Imports 10 real recipe links and prints a pass/fail table.
 *
 * Against your deployed function (recommended, tests the real setup):
 *   node scripts/test-import.ts --endpoint https://<project>.supabase.co/functions/v1/import-recipe
 *
 * Or in-process on your computer (needs internet; uses Claude if ANTHROPIC_API_KEY is set):
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/test-import.ts
 *
 * Each import costs one AI call. Replace the list with links your users actually share.
 * "expect" says what an honest result is: some videos simply don't have the recipe in text.
 */
import { claudeCaller } from '../supabase/functions/import-recipe/lib/extract.ts';
import { handle } from '../supabase/functions/import-recipe/lib/handler.ts';
import { MemoryCache, MemoryLimiter } from '../supabase/functions/import-recipe/lib/limits.ts';
import type { ImportResponse } from '../supabase/functions/import-recipe/lib/types.ts';

type Case = { url: string; expect: 'recipe' | 'no-recipe' | 'either'; note: string };

const CASES: Case[] = [
  { url: 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/', expect: 'recipe', note: 'Dotdash site, JSON-LD' },
  { url: 'https://www.bbcgoodfood.com/recipes/easy-pancakes', expect: 'recipe', note: 'UK site, JSON-LD' },
  { url: 'https://www.seriouseats.com/the-best-slow-cooked-bolognese-sauce-recipe', expect: 'recipe', note: 'long article + JSON-LD' },
  { url: 'https://www.budgetbytes.com/one-pot-creamy-cajun-chicken-pasta/', expect: 'recipe', note: 'WordPress Recipe Maker' },
  { url: 'https://www.simplyrecipes.com/recipes/homemade_pizza/', expect: 'recipe', note: 'Dotdash site' },
  { url: 'https://www.recipetineats.com/spaghetti-bolognese/', expect: 'recipe', note: 'WordPress Recipe Maker, @graph' },
  { url: 'https://cooking.nytimes.com/recipes/1015819-chocolate-chip-cookies', expect: 'either', note: 'paywalled; JSON-LD usually still present' },
  { url: 'https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies', expect: 'recipe', note: 'Condé Nast, often blocks bots' },
  { url: 'https://www.youtube.com/watch?v=PUP7U5vTMM0', expect: 'either', note: 'YouTube: recipe only if in the description' },
  { url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173', expect: 'no-recipe', note: 'TikTok docs example, not a recipe' },
];

const args = process.argv.slice(2);
const endpoint = args.includes('--endpoint') ? args[args.indexOf('--endpoint') + 1] : null;

const key = process.env.ANTHROPIC_API_KEY;
const deps = { ai: key ? claudeCaller(key, process.env.IMPORT_MODEL || undefined) : null, limiter: new MemoryLimiter(), cache: new MemoryCache(), salt: 'test', dailyAiCap: 100 };
const installId = `test-script-${Math.random().toString(36).slice(2, 14)}`;

async function run(url: string): Promise<ImportResponse> {
  const init = { method: 'POST', headers: { 'content-type': 'application/json', 'x-install-id': installId }, body: JSON.stringify({ url }) };
  if (endpoint) return (await (await fetch(endpoint, init)).json()) as ImportResponse;
  // In-process: give each case its own limiter window so 10 links don't trip the per-device limit.
  deps.limiter = new MemoryLimiter();
  return (await (await handle(new Request('http://local/import-recipe', init), deps)).json()) as ImportResponse;
}

const rows: string[][] = [];
let passed = 0;
console.log(endpoint ? `Testing ${endpoint}` : `Testing in-process, AI: ${key ? 'Claude' : 'OFF (structured data only)'}`);
for (const c of CASES) {
  const t0 = Date.now();
  let r: ImportResponse;
  try {
    r = await run(c.url);
  } catch (e) {
    r = { ok: false, code: 'server_error', message: String(e) };
  }
  const ms = Date.now() - t0;
  const gotRecipe = r.ok && r.recipe.ingredients.length >= 3 && r.recipe.steps.length >= 1;
  // An honest "there's no recipe in this text" counts; a crash, timeout or network error never does.
  const honestNo = !r.ok && ['no_text', 'not_a_recipe', 'blocked'].includes(r.code);
  const pass = c.expect === 'recipe' ? gotRecipe : c.expect === 'no-recipe' ? honestNo : gotRecipe || honestNo;
  if (pass) passed++;
  rows.push([
    pass ? 'PASS' : 'FAIL',
    new URL(c.url).hostname.replace(/^www\./, ''),
    r.ok ? r.status : r.code,
    r.ok ? r.recipe.title.slice(0, 34) : r.message.slice(0, 34),
    r.ok ? String(r.recipe.ingredients.length) : '-',
    r.ok ? String(r.recipe.steps.length) : '-',
    r.ok ? (r.source.usedStructuredData ? 'json-ld' : 'text') + (r.source.usedAi ? '+ai' : '') : '-',
    r.ok && r.missing.length ? r.missing.join(',') : '',
    `${(ms / 1000).toFixed(1)}s`,
    c.note,
  ]);
}

const head = ['', 'site', 'result', 'title / message', 'ingr', 'steps', 'via', 'missing', 'time', 'note'];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
console.log(`\n${line(head)}\n${widths.map((w) => '-'.repeat(w)).join('  ')}`);
for (const r of rows) console.log(line(r));
console.log(`\n${passed}/${CASES.length} passed`);
process.exit(passed === CASES.length ? 0 : 1);
