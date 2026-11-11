/**
 * POST /import-recipe   { url?: string, text?: string }   header x-install-id: <random id>
 *
 * Runtime-neutral: takes a standard Request and returns a Response, so the same code runs
 * on Supabase (Deno) and in the local Node dev server and tests.
 */
import { AiError, fromAi, fromStructured, type AiCaller } from './extract.ts';
import { LIMITS, sha256, type Limiter, type ResultCache } from './limits.ts';
import { SourceError, gatherSource } from './sources.ts';
import type { ImportFailure, ImportResponse, ImportSuccess, ImportedRecipe, MissingField, SourceMaterial } from './types.ts';

export type Deps = {
  /** null when no ANTHROPIC_API_KEY is configured: only structured-data imports work then. */
  ai: AiCaller | null;
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
  let body: { url?: unknown; text?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return fail({ ok: false, code: 'invalid_input', message: 'Paste a link or recipe text.' });
  }
  const url = typeof body.url === 'string' ? body.url.slice(0, 2048) : undefined;
  const text = typeof body.text === 'string' ? body.text : undefined;
  if (!url?.trim() && !text?.trim()) return fail({ ok: false, code: 'invalid_input', message: 'Paste a link or recipe text.' });

  /* ---------- rate limits (before any work) ---------- */
  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();
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

  const cacheKey = material.url ? await sha256(`v1|${material.url}|${(text ?? '').trim()}`) : null;
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
    return { ok: false, code: 'ai_unavailable', message: `${reason} Try again later, or type the recipe yourself.`, partial: { title: material.title ?? undefined, sourceUrl: material.url ?? undefined, text: material.text.slice(0, 4000), imageUrl: material.imageUrl ?? undefined } };
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

  const result = assemble(recipe!, material, warnings, usedAi);
  log({ event: 'import', kind: material.kind, status: result.status, structured: !!s, usedAi, ingredients: result.recipe.ingredients.length });
  if (cacheKey && deps.cache && result.status === 'complete') await deps.cache.set(cacheKey, result).catch(() => {});
  return json(200, result);
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
  if (!recipe.nutrition) warnings.push('Nutrition couldn’t be estimated for this recipe.');
  return {
    ok: true,
    status: missing.length ? 'partial' : 'complete',
    recipe,
    missing,
    warnings,
    source: { kind: material.kind, host: material.host, usedStructuredData: !!material.structured, usedAi },
  };
}
