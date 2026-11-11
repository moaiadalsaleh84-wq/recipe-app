/**
 * schema.org Recipe structured data (JSON-LD).
 *
 * Most recipe sites embed it for Google, so it is the most reliable source: real ingredient
 * lines and steps, written by the site, no guessing.
 */
import { decodeEntities, htmlToText } from './http.ts';
import type { StructuredRecipe } from './types.ts';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Every JSON-LD block on the page, parsed. Broken blocks are skipped. */
export function jsonLdBlocks(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    for (const attempt of [raw, raw.replace(/[\u0000-\u001f]+/g, ' ')]) {
      try {
        out.push(JSON.parse(attempt) as Json);
        break;
      } catch {
        // try the cleaned version, then give up on this block
      }
    }
  }
  return out;
}

const isObj = (v: Json | undefined): v is { [k: string]: Json } => !!v && typeof v === 'object' && !Array.isArray(v);
const types = (o: { [k: string]: Json }) => ([] as Json[]).concat(o['@type'] ?? []).map(String);

/** Depth-first search for an object whose @type includes Recipe. */
export function findRecipeNode(node: Json | undefined, depth = 0): { [k: string]: Json } | null {
  if (!node || depth > 8) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findRecipeNode(n, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!isObj(node)) return null;
  if (types(node).some((t) => t === 'Recipe' || t.endsWith('/Recipe'))) return node;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    const found = findRecipeNode(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

const text = (v: Json | undefined): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return clean(v) || null;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (isObj(v)) return text(v.text ?? v.name ?? v['@value'] ?? null);
  return null;
};

/** Strip HTML some sites leave inside JSON-LD strings, and decode entities. */
const clean = (s: string) => (/[<&]/.test(s) ? htmlToText(decodeEntities(s)) : s).replace(/\s+/g, ' ').trim();

/** ISO 8601 durations like "PT1H15M" → 75. */
export function isoMinutes(v: Json | undefined): number | null {
  const s = text(v);
  if (!s) return null;
  const m = s.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return null;
  const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) + Number(m[4] ?? 0) / 60;
  return mins > 0 ? Math.round(mins) : null;
}

/** "4", "4 servings", ["4", "4 servings"], "Makes 12" → number. */
export function yieldNumber(v: Json | undefined): number | null {
  const values = ([] as Json[]).concat(v ?? []);
  for (const val of values) {
    const s = typeof val === 'number' ? String(val) : text(val);
    const m = s?.match(/(\d+(?:\.\d+)?)/);
    if (m) {
      const n = Math.round(Number(m[1]));
      if (n > 0 && n <= 100) return n;
    }
  }
  return null;
}

/** Instructions come as a string, strings, HowToStep objects or HowToSections of steps. */
export function instructionList(v: Json | undefined): string[] {
  if (!v) return [];
  if (typeof v === 'string') {
    const t = clean(v);
    // Some sites put all steps in one string, numbered or on separate lines.
    return t
      .split(/\n+|(?:^|\s)(?=\d+[.)]\s)/)
      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
      .filter((s) => s.length > 2);
  }
  if (Array.isArray(v)) return v.flatMap((x) => instructionList(x));
  if (isObj(v)) {
    if (types(v).includes('HowToSection') || v.itemListElement) {
      const steps = instructionList(v.itemListElement ?? null);
      return steps;
    }
    const t = text(v.text ?? v.name ?? null);
    return t ? [t] : [];
  }
  return [];
}

const firstImage = (v: Json | undefined): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const u = firstImage(x);
      if (u) return u;
    }
    return null;
  }
  if (isObj(v)) return firstImage(v.url ?? v.contentUrl ?? null);
  return null;
};

const grams = (v: Json | undefined) => {
  const s = text(v);
  const m = s?.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Math.round(Number(m[1].replace(',', '.'))) : null;
};

export function normalizeRecipe(node: { [k: string]: Json }): StructuredRecipe {
  const ingredients = ([] as Json[])
    .concat(node.recipeIngredient ?? node.ingredients ?? [])
    .map((x) => text(x))
    .filter((x): x is string => !!x);
  const total = isoMinutes(node.totalTime);
  const parts = (isoMinutes(node.prepTime) ?? 0) + (isoMinutes(node.cookTime) ?? 0);
  const n = isObj(node.nutrition) ? node.nutrition : null;
  const kw = node.keywords;
  const keywords = (typeof kw === 'string' ? kw.split(',') : Array.isArray(kw) ? kw.map((k) => text(k) ?? '') : []).map((k) => k.trim()).filter(Boolean);
  return {
    title: text(node.name ?? node.headline ?? null),
    servings: yieldNumber(node.recipeYield ?? node.yield ?? null),
    minutes: total ?? (parts || null),
    ingredients,
    steps: instructionList(node.recipeInstructions ?? null),
    imageUrl: firstImage(node.image ?? node.thumbnailUrl ?? null),
    category: text(node.recipeCategory ?? null),
    keywords: keywords.slice(0, 20),
    nutrition: n
      ? { calories: grams(n.calories), protein: grams(n.proteinContent), carbs: grams(n.carbohydrateContent), fat: grams(n.fatContent) }
      : null,
  };
}

/** The page's Recipe, or null when it has none. */
export function recipeFromHtml(html: string): StructuredRecipe | null {
  for (const block of jsonLdBlocks(html)) {
    const node = findRecipeNode(block);
    if (node) {
      const r = normalizeRecipe(node);
      if (r.ingredients.length || r.steps.length) return r;
    }
  }
  return null;
}

/** Structured data as plain text, the way we hand it to the AI. */
export function structuredAsText(r: StructuredRecipe): string {
  return [
    r.title && `Title: ${r.title}`,
    r.servings && `Servings: ${r.servings}`,
    r.minutes && `Total time: ${r.minutes} minutes`,
    r.category && `Category: ${r.category}`,
    r.keywords.length ? `Keywords: ${r.keywords.join(', ')}` : null,
    'Ingredients:',
    ...r.ingredients.map((i) => `- ${i}`),
    'Steps:',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    r.nutrition && `Nutrition per serving (from the site): ${JSON.stringify(r.nutrition)}`,
  ]
    .filter(Boolean)
    .join('\n');
}
