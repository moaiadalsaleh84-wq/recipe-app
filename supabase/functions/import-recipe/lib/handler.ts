/**
 * POST /import-recipe   { url?: string, text?: string }   header x-install-id: <random id>
 *
 * Runtime-neutral: takes a standard Request and returns a Response, so the same code runs
 * on Supabase (Deno) and in the local Node dev server and tests.
 */
import { AiError, fromAi, fromStructured, nutritionFromAi, type AiCaller, type NutritionCaller } from './extract.ts';
import { LIMITS, sha256, type Limiter, type ResultCache } from './limits.ts';
import { SourceError, gatherSource, previewSource } from './sources.ts';
import { validateRecipe } from './validate.ts';
import type { ImportFailure, ImportResponse, ImportSuccess, ImportedRecipe, MissingField, SourceMaterial } from './types.ts';

export type Deps = {
  /** null when no ANTHROPIC_API_KEY is configured: only structured-data imports work then. */
  ai: AiCaller | null;
  /** Nutrition only, for re-running saved imports with the current rules. null without a key. */
  nutritionAi?: NutritionCaller | null;
  limiter: Limiter;
  cache: ResultCache | null;
  salt: string;
  dailyAiCap?: number;
  fetchImpl?: typeof fetch;
  log?: (event: Record<string, unknown>) => void;
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-install-id, authorization, apikey, x-client-info',
  'access-control-max-age': '86400',
};

const MAX_BODY = 64 * 1024;

const STATUS: Record<ImportFailure['code'], number> = {
  invalid_input: 400,
  rate_limited: 429,
  daily_cap: 503,
  fetch_failed: 502,
  blocked: 502,
  no_text: 422,
  not_a_recipe: 422,
  ai_unavailable: 503,
  server_error: 500,
};

const json = (status: number, body: ImportResponse | { ok: true; pong: true }) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const fail = (f: ImportFailure) => json(STATUS[f.code], f);

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const log = deps.log ?? (() => {});
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method === 'GET') return json(200, { ok: true, pong: true });
  if (req.method !== 'POST') return fail({ ok: false, code: 'invalid_input', message: 'Use POST.' });

  /* ---------- validate ---------- */
  const installId = req.headers.get('x-install-id') ?? '';
  if (!/^[A-Za-z0-9-]{16,64}$/.test(installId)) return fail({ ok: false, code: 'invalid_input', message: 'Please update the app and try again.' });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail({ ok: false, code: 'invalid_input', message: 'That’s too much text to import at once.' });
  let body: { url?: unknown; text?: unknown; preview?: unknown; nutrition?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return fail({ ok: false, code: 'invalid_input', message: 'Paste a link or recipe text.' });
  }
  /* ---------- nutrition only: a saved import, counted again with the current rules ---------- */
  if (body.nutrition && typeof body.nutrition === 'object') return nutritionOnly(body.nutrition as Record<string, unknown>, installId, deps);

  const url = typeof body.url === 'string' ? body.url.slice(0, 2048) : undefined;
  const text = typeof body.text === 'string' ? body.text : undefined;
  if (!url?.trim() && !text?.trim()) return fail({ ok: false, code: 'invalid_input', message: 'Paste a link or recipe text.' });

  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();

  /* ---------- preview: picture + creator right away (no AI, not counted as an import) ---------- */
  if (body.preview === true) {
    try {
      const device = await sha256(`${deps.salt}|device|${installId}`);
      const hit = await deps.limiter.hit(`prev10:${device}`, 600, LIMITS.previewsPer10Min);
      if (!hit.allowed) return fail({ ok: false, code: 'rate_limited', retryAfter: hit.resetIn, message: 'Too many links in a row. Try again in a few minutes.' });
    } catch {
      return fail({ ok: false, code: 'server_error', message: 'Import is temporarily unavailable. Try again soon.' });
    }
    const preview = url ? await previewSource(url, deps.fetchImpl) : null;
    return new Response(JSON.stringify({ ok: true, preview }), { status: 200, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }

  /* ---------- rate limits (before any work) ---------- */
  try {
    const [device, ipKey] = await Promise.all([sha256(`${deps.salt}|device|${installId}`), sha256(`${deps.salt}|ip|${ip}`)]);
    const checks = await Promise.all([
      deps.limiter.hit(`d10:${device}`, 600, LIMITS.devicePer10Min),
      deps.limiter.hit(`dday:${device}`, 86400, LIMITS.devicePerDay),
      deps.limiter.hit(`ipday:${ipKey}`, 86400, LIMITS.ipPerDay),
    ]);
    const blocked = checks.find((c) => !c.allowed);
    if (blocked) {
      log({ event: 'rate_limited' });
      const minutes = Math.max(1, Math.ceil(blocked.resetIn / 60));
      return fail({ ok: false, code: 'rate_limited', retryAfter: blocked.resetIn, message: minutes > 90 ? 'You’ve imported a lot today. Try again tomorrow.' : `Too many imports in a row. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
    }
  } catch (e) {
    // Fail closed: without the limiter we can't protect the bill.
    log({ event: 'limiter_error', error: String(e) });
    return fail({ ok: false, code: 'server_error', message: 'Import is temporarily unavailable. Try again soon.' });
  }

  /* ---------- gather the source ---------- */
  let material: SourceMaterial;
  let warnings: string[];
  try {
    ({ material, warnings } = await gatherSource({ url, text }, deps.fetchImpl));
  } catch (e) {
    if (e instanceof SourceError) {
      log({ event: 'source_error', code: e.code, kind: e.kind });
      return fail({ ok: false, code: e.code, message: e.message, partial: e.partial, source: e.kind ? { kind: e.kind, host: null } : undefined });
    }
    log({ event: 'server_error', error: String(e) });
    return fail({ ok: false, code: 'server_error', message: 'Something went wrong reading that link.' });
  }

  const cacheKey = material.url ? await sha256(`v4|${material.url}|${(text ?? '').trim()}`) : null;
  if (cacheKey && deps.cache) {
    const hit = (await deps.cache.get(cacheKey).catch(() => null)) as ImportSuccess | null;
    if (hit?.ok) {
      log({ event: 'cache_hit', kind: material.kind });
      return json(200, hit);
    }
  }

  /* ---------- extract ---------- */
  const s = material.structured;
  const structuredComplete = !!s && s.ingredients.length > 0 && s.steps.length > 0;
  let recipe: ImportedRecipe | null = null;
  let usedAi = false;

  const fallbackOrFail = (reason: string): ImportedRecipe | ImportFailure => {
    if (structuredComplete) {
      warnings.push(`${reason} The recipe was read from the page’s structured data instead, and nutrition may be missing.`);
      return fromStructured(s!, material);
    }
    return { ok: false, code: 'ai_unavailable', message: `${reason} Try again later, or type the recipe yourself.`, partial: { title: material.title ?? undefined, sourceUrl: material.url ?? undefined, text: material.text.slice(0, 4000), imageUrl: material.imageUrl ?? undefined, credit: material.credit ?? undefined } };
  };

  if (!deps.ai) {
    const r = fallbackOrFail('AI reading isn’t set up on the server yet.');
    if ('ok' in r) return fail(r);
    recipe = r;
  } else {
    const cap = await deps.limiter.hit('global-ai-day', 86400, deps.dailyAiCap ?? LIMITS.globalAiPerDay).catch(() => ({ allowed: false, count: 0, resetIn: 3600 }));
    if (!cap.allowed) {
      log({ event: 'daily_cap' });
      const r = fallbackOrFail('Pantry Pop hit its daily import limit.');
      if ('ok' in r) return fail({ ...r, code: 'daily_cap', retryAfter: cap.resetIn });
      recipe = r;
    } else {
      try {
        const ai = await deps.ai(material);
        const out = fromAi(ai, material);
        if (out.notRecipe) {
          return fail({ ok: false, code: 'not_a_recipe', message: 'That doesn’t look like a recipe. Check the link, or paste the recipe text.', partial: { title: material.title ?? undefined, sourceUrl: material.url ?? undefined } });
        }
        recipe = out.recipe;
        usedAi = true;
        if (out.dropped.length) {
          warnings.push(`Left out ${out.dropped.length === 1 ? 'an ingredient' : `${out.dropped.length} ingredients`} that we couldn’t find in the source: ${out.dropped.join(', ')}.`);
        }
        // If the AI found fewer ingredients than the site lists, trust the site.
        if (structuredComplete && recipe.ingredients.length < s!.ingredients.length * 0.6) {
          const fallback = fromStructured(s!, material);
          recipe = { ...recipe, ingredients: fallback.ingredients, steps: recipe.steps.length ? recipe.steps : fallback.steps };
          warnings.push('Ingredients were taken straight from the page.');
        }
      } catch (e) {
        log({ event: 'ai_error', reason: e instanceof AiError ? e.reason : 'unknown' });
        const r = fallbackOrFail(e instanceof AiError ? e.message : 'The AI couldn’t read this recipe.');
        if ('ok' in r) return fail(r);
        recipe = r;
      }
    }
  }

  // The same checks as the app's built-in recipes: fix what can be fixed, report the rest.
  const checked = validateRecipe(recipe!);
  if (checked.problems.length) log({ event: 'checks', problems: checked.problems.length });
  const result = assemble(checked.recipe, material, warnings, usedAi);
  result.checks = checked.problems;
  log({ event: 'import', kind: material.kind, status: result.status, structured: !!s, usedAi, ingredients: result.recipe.ingredients.length });
  if (cacheKey && deps.cache && result.status === 'complete') await deps.cache.set(cacheKey, result).catch(() => {});
  return json(200, result);
}

/**
 * POST { nutrition: { title, servings, ingredients: string[], steps: string[], source? } }
 * → { ok: true, nutrition }. Cheap (no recipe to write), limited per device, and counted in the
 * daily AI cap like an import.
 */
async function nutritionOnly(raw: Record<string, unknown>, installId: string, deps: Deps): Promise<Response> {
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 300)).slice(0, max) : []);
  const input = {
    title: typeof raw.title === 'string' ? raw.title.slice(0, 200) : '',
    servings: typeof raw.servings === 'number' && raw.servings > 0 && raw.servings < 100 ? Math.round(raw.servings) : null,
    ingredients: strings(raw.ingredients, 60),
    steps: strings(raw.steps, 40),
    source: typeof raw.source === 'string' ? raw.source.slice(0, 300) : '',
  };
  if (!input.ingredients.length) return fail({ ok: false, code: 'invalid_input', message: 'No ingredients to count.' });
  if (!deps.nutritionAi) return fail({ ok: false, code: 'ai_unavailable', message: 'AI reading isn’t set up on the server yet.' });
  try {
    const device = await sha256(`${deps.salt}|device|${installId}`);
    const hit = await deps.limiter.hit(`nutday:${device}`, 86400, LIMITS.nutritionPerDay);
    if (!hit.allowed) return fail({ ok: false, code: 'rate_limited', retryAfter: hit.resetIn, message: 'Try again tomorrow.' });
    const cap = await deps.limiter.hit('global-ai-day', 86400, deps.dailyAiCap ?? LIMITS.globalAiPerDay);
    if (!cap.allowed) return fail({ ok: false, code: 'daily_cap', retryAfter: cap.resetIn, message: 'Try again tomorrow.' });
  } catch {
    return fail({ ok: false, code: 'server_error', message: 'Try again soon.' });
  }
  try {
    const nutrition = nutritionFromAi(await deps.nutritionAi(input));
    deps.log?.({ event: 'nutrition', ok: !!nutrition });
    return reply(200, { ok: true, nutrition });
  } catch (e) {
    deps.log?.({ event: 'ai_error', reason: e instanceof AiError ? e.reason : 'unknown', what: 'nutrition' });
    return fail({ ok: false, code: 'ai_unavailable', message: 'Couldn’t work out the nutrition right now.' });
  }
}

/** Works out what is missing, so the app can say so and open the edit form. */
export function assemble(recipe: ImportedRecipe, material: SourceMaterial, warnings: string[], usedAi: boolean): ImportSuccess {
  const missing: MissingField[] = [];
  if (!recipe.title.trim()) missing.push('title');
  if (!recipe.ingredients.length) missing.push('ingredients');
  if (!recipe.steps.length) missing.push('steps');
  const withoutAmount = recipe.ingredients.filter((i) => i.amount === null && !/to taste|pinch|as needed|optional|for serving|garnish/i.test(i.original)).length;
  if (recipe.ingredients.length && withoutAmount > recipe.ingredients.length / 3) missing.push('amounts');
  if (!recipe.servings) missing.push('servings');
  if (!recipe.minutes) missing.push('minutes');
  // Ingredients and steps are what you need to cook. Servings and times the AI estimates when the
  // source is silent; missing ones (structured data without AI) are filled in by the app.
  const essential = missing.filter((m) => m === 'title' || m === 'ingredients' || m === 'steps');
  if (!recipe.nutrition) warnings.push('Nutrition couldn’t be estimated for this recipe.');
  return {
    ok: true,
    status: essential.length ? 'partial' : 'complete',
    recipe,
    missing,
    warnings,
    source: { kind: material.kind, host: material.host, usedStructuredData: !!material.structured, usedAi, credit: material.credit ?? null },
  };
}
