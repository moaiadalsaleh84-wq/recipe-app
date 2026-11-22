/**
 * Talks to the recipe import backend. The AI key lives on the server; the app only sends the
 * link or text, plus a random install id used for rate limiting (see the Privacy screen).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMPORT_URL } from '../config';
import { categories, dietTags, type Category, type DietFlags, type DietTag, type ImportSource, type Ingredient, type Recipe } from '../data/mock';
import { aisleFor } from './parseIngredient';

/* Same shapes as supabase/functions/import-recipe/lib/types.ts. Keep in sync. */
export type MissingField = 'title' | 'ingredients' | 'steps' | 'amounts' | 'servings' | 'minutes';
export type SourceKind = 'website' | 'tiktok' | 'instagram' | 'youtube' | 'text';
/** Who made the recipe (from oEmbed, or the website's name). See supabase/.../types.ts. */
export type SourceCredit = { handle: string | null; profileUrl: string | null; siteName: string | null };
export type ImportedIngredient = {
  amount: number | null;
  unit: string;
  name: string;
  original: string;
  /** "i1", used by stepMeta (import v2). */
  id?: string;
  note?: string;
  /** Amount (or the whole basic) suggested, not in the source. */
  estimated?: boolean;
};
export type ImportedStepMeta = { ingredientIds: string[]; timerSeconds: number | null; estimated: boolean };
export type EstimatedParts = { servings: boolean; time: boolean; steps: boolean; amounts: boolean; ingredients: boolean };
export type ImportedRecipe = {
  title: string;
  servings: number | null;
  minutes: number | null;
  ingredients: ImportedIngredient[];
  steps: string[];
  category: Category | null;
  tags: DietTag[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number; estimated: true; basis: 'source' | 'ai' } | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  /* Import v2 (the server may be older: all optional). */
  description?: string;
  mealType?: string | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  stepMeta?: ImportedStepMeta[];
  diet?: DietFlags | null;
  estimated?: EstimatedParts;
};
export type ImportSuccess = {
  ok: true;
  status: 'complete' | 'partial';
  recipe: ImportedRecipe;
  missing: MissingField[];
  warnings: string[];
  source: { kind: SourceKind; host: string | null; usedStructuredData: boolean; usedAi: boolean; credit?: SourceCredit | null };
};
export type ImportFailure = {
  ok: false;
  code: 'invalid_input' | 'rate_limited' | 'daily_cap' | 'fetch_failed' | 'blocked' | 'no_text' | 'not_a_recipe' | 'ai_unavailable' | 'server_error' | 'offline' | 'timeout' | 'not_configured' | 'cancelled';
  message: string;
  retryAfter?: number;
  partial?: { title?: string; sourceUrl?: string; text?: string; imageUrl?: string; credit?: SourceCredit };
  source?: { kind: SourceKind; host: string | null };
};
export type ImportResponse = ImportSuccess | ImportFailure;

const INSTALL_KEY = 'pantry-pop-install-id';
let installId: string | null = null;

/** A random id for this install. Not linked to the person; only used for rate limits. */
async function getInstallId() {
  if (installId) return installId;
  try {
    installId = await AsyncStorage.getItem(INSTALL_KEY);
  } catch {
    // storage unavailable: a fresh id per launch is fine
  }
  if (!installId) {
    const rand = () => Math.random().toString(36).slice(2, 10);
    installId = `pp-${rand()}${rand()}${rand()}`;
    AsyncStorage.setItem(INSTALL_KEY, installId).catch(() => {});
  }
  return installId;
}

export const importIsConfigured = () => !!IMPORT_URL;

/** The built-in example ("Try an example" on Home): imports in one tap, with no network. */
export const EXAMPLE_URL = 'https://example.com/pantry-pop/garlic-tomato-pasta';
const ing = (amount: number | null, unit: string, name: string): ImportedIngredient => ({ amount, unit, name, original: [amount, unit, name].filter(Boolean).join(' ') });
const EXAMPLE: ImportSuccess = {
  ok: true,
  status: 'complete',
  recipe: {
    title: '15-Minute Garlic Tomato Pasta',
    servings: 2,
    minutes: 15,
    ingredients: [
      ing(200, 'g', 'Spaghetti'),
      ing(3, '', 'Garlic cloves'),
      ing(400, 'g', 'Tomatoes'),
      ing(2, 'tbsp', 'Olive oil'),
      ing(30, 'g', 'Parmesan'),
      ing(1, 'handful', 'Basil'),
    ],
    steps: [
      'Boil the spaghetti in well-salted water until just tender, about 9 minutes. Save a mug of the pasta water.',
      'Meanwhile, warm the olive oil in a big pan and gently fry the sliced garlic for 1 minute.',
      'Add the chopped tomatoes with a pinch of salt and cook for 5 minutes until saucy.',
      'Toss in the spaghetti with a splash of pasta water. Finish with parmesan and torn basil.',
    ],
    category: 'Dinner',
    tags: ['Vegetarian'],
    nutrition: { calories: 560, protein: 19, carbs: 82, fat: 17, estimated: true, basis: 'ai' },
    imageUrl: null,
    sourceUrl: EXAMPLE_URL,
  },
  missing: [],
  warnings: [],
  source: { kind: 'website', host: 'example.com', usedStructuredData: true, usedAi: false, credit: { handle: null, profileUrl: null, siteName: 'Pantry Pop example' } },
};

const TIMEOUT_MS = 75_000;

/** Never throws: every outcome is an ImportResponse the UI can show. */
export async function importRecipe(input: { url?: string; text?: string }, signal?: AbortSignal): Promise<ImportResponse> {
  if (input.url === EXAMPLE_URL) {
    await new Promise((r) => setTimeout(r, 700)); // a short beat, so it feels like it read something
    return EXAMPLE;
  }
  if (!IMPORT_URL) {
    return { ok: false, code: 'not_configured', message: 'Recipe import isn’t connected in this build yet. You can still write the recipe yourself.' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS);
  const onCancel = () => controller.abort('cancelled');
  signal?.addEventListener('abort', onCancel);
  try {
    const res = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-install-id': await getInstallId() },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => null)) as ImportResponse | null;
    if (body && typeof body === 'object' && 'ok' in body) return body;
    return { ok: false, code: 'server_error', message: `The import server answered oddly (${res.status}). Try again in a moment.` };
  } catch {
    if (controller.signal.aborted) {
      return controller.signal.reason === 'cancelled'
        ? { ok: false, code: 'cancelled', message: 'Import cancelled.' }
        : { ok: false, code: 'timeout', message: 'That took too long. Try again, or paste the recipe text instead.' };
    }
    return { ok: false, code: 'offline', message: 'You seem to be offline. Check your connection and try again.' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCancel);
  }
}

/** The picture, creator and full link of a link, right away (no AI, not counted as an import). */
export type ImportPreview = { kind: SourceKind; sourceUrl: string; title: string | null; imageUrl: string | null; credit: SourceCredit | null };

/** Never throws: null when there's no preview (no server, offline, not a link). */
export async function importPreview(url: string, signal?: AbortSignal): Promise<ImportPreview | null> {
  if (!IMPORT_URL || url === EXAMPLE_URL) return null;
  try {
    const res = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-install-id': await getInstallId() },
      body: JSON.stringify({ url, preview: true }),
      signal,
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; preview?: ImportPreview | null } | null;
    return body?.ok && body.preview ? body.preview : null;
  } catch {
    return null;
  }
}

/* ---------------- imported → app recipe ---------------- */

const UNIT_MAP: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'g', factor: 1000 },
  l: { unit: 'ml', factor: 1000 },
  dl: { unit: 'ml', factor: 100 },
  cl: { unit: 'ml', factor: 10 },
  cup: { unit: 'cups', factor: 1 },
  pinch: { unit: 'pinch', factor: 1 },
  clove: { unit: 'cloves', factor: 1 },
  can: { unit: 'cans', factor: 1 },
  slice: { unit: 'slices', factor: 1 },
};

export function toIngredient(i: ImportedIngredient, index: number): Ingredient {
  const m = UNIT_MAP[i.unit] ?? { unit: i.unit, factor: 1 };
  const name = i.name.charAt(0).toUpperCase() + i.name.slice(1);
  return {
    // Steps refer to the server's ids (i1, i2…); older servers send none.
    id: i.id ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}-${index}`,
    name,
    // No amount: "to taste" (null, shown as "pinch") for pinches, else 0 (a plain item).
    quantity: i.amount ? Math.round(i.amount * m.factor * 100) / 100 : i.unit === 'pinch' ? null : 0,
    unit: i.amount ? m.unit : i.unit === 'pinch' ? 'pinch' : '',
    aisle: aisleFor(name),
    ...(i.note ? { note: i.note } : {}),
    ...(i.estimated ? { estimated: true } : {}),
  };
}

/** An ingredient as one editable line ("200 g flour"), for the edit form. */
export function ingredientLine(i: ImportedIngredient) {
  if (!i.amount) return i.name;
  const amount = Number.isInteger(i.amount) ? String(i.amount) : String(Math.round(i.amount * 100) / 100);
  // Same unit words the rest of the app uses ("cloves", "cups"), without converting amounts.
  const unit = i.unit === 'kg' || i.unit === 'l' || i.unit === 'dl' || i.unit === 'cl' ? i.unit : (UNIT_MAP[i.unit]?.unit ?? i.unit);
  return `${amount}${unit ? ` ${unit}` : ''} ${i.name}`;
}

/** Where an import came from, for the recipe's credit. */
export type ImportOrigin = { kind: SourceKind; host: string | null; credit?: SourceCredit | null };

const SOURCE_OF: Partial<Record<SourceKind, ImportSource>> = { tiktok: 'tiktok', youtube: 'youtube', website: 'web', instagram: 'web' };

/**
 * The credit an imported recipe always carries: the creator's @handle (videos) or the site's name,
 * the link back, and the sticker text ("From TikTok" / "From YouTube" / the site name).
 * Pasted text has no source and no credit.
 */
export function creditFields(origin: ImportOrigin | null | undefined, sourceUrl: string | null | undefined): Pick<Recipe, 'source' | 'creatorHandle' | 'creatorUrl' | 'imageCreditText'> {
  const source = origin ? SOURCE_OF[origin.kind] : undefined;
  if (!origin || !source) return {};
  const c = origin.credit;
  const host = (origin.host ?? (sourceUrl ? safeHost(sourceUrl) : null))?.replace(/^www\./, '') ?? null;
  const site = c?.siteName?.trim() || (origin.kind === 'instagram' ? 'Instagram' : host) || undefined;
  const platform = source === 'tiktok' ? 'TikTok' : source === 'youtube' ? 'YouTube' : null;
  // "From @pastaqueen on TikTok"; "From TikTok" when there's no handle; the site's name for websites.
  const sticker = platform ? (c?.handle?.trim() ? `From ${c.handle.trim()} on ${platform}` : `From ${platform}`) : site;
  const handle = source === 'web' ? (c?.handle?.trim() || site) : c?.handle?.trim() || undefined;
  return {
    source,
    ...(handle ? { creatorHandle: handle } : {}),
    ...(c?.profileUrl ? { creatorUrl: c.profileUrl } : {}),
    ...(sticker ? { imageCreditText: sticker } : {}),
  };
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function toRecipe(r: ImportedRecipe, origin?: ImportOrigin | null): Omit<Recipe, 'id' | 'custom'> {
  return {
    ...creditFields(origin, r.sourceUrl),
    title: r.title.trim() || 'Imported recipe',
    image: r.imageUrl ? { uri: r.imageUrl } : null,
    description: r.description ?? '',
    category: r.category && (categories as readonly string[]).includes(r.category) ? r.category : 'Dinner',
    minutes: r.minutes ?? 30,
    servings: r.servings ?? 2,
    calories: r.nutrition?.calories ?? 0,
    nutrition: { protein: r.nutrition?.protein ?? 0, carbs: r.nutrition?.carbs ?? 0, fat: r.nutrition?.fat ?? 0 },
    difficulty: 'Easy',
    tags: r.tags.filter((t) => (dietTags as readonly string[]).includes(t)),
    ingredients: r.ingredients.map(toIngredient),
    steps: r.steps,
    sourceUrl: r.sourceUrl ?? undefined,
    origin: 'import',
    ...(r.description ? { description: r.description } : {}),
    ...(r.mealType ? { mealType: r.mealType } : {}),
    ...(r.prepMinutes ? { prepMinutes: r.prepMinutes } : {}),
    ...(r.cookMinutes ? { cookMinutes: r.cookMinutes } : {}),
    ...(r.diet ? { diet: r.diet } : {}),
    ...(r.stepMeta?.length === r.steps.length ? { stepMeta: r.stepMeta.map((m) => ({ ingredientIds: m.ingredientIds, timerSeconds: m.timerSeconds, ...(m.estimated ? { estimated: true } : {}) })) } : {}),
    ...(r.estimated && (r.estimated.servings || r.estimated.time) ? { estimated: { servings: r.estimated.servings, time: r.estimated.time } } : {}),
  };
}

const MISSING_TEXT: Record<MissingField, string> = {
  title: 'the recipe’s name',
  ingredients: 'the ingredients',
  steps: 'the steps',
  amounts: 'some ingredient amounts',
  servings: 'how many it serves',
  minutes: 'how long it takes',
};

/** "We couldn't find the steps and how many it serves." */
export function missingMessage(missing: MissingField[]) {
  const parts = missing.map((m) => MISSING_TEXT[m]);
  if (!parts.length) return '';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `We couldn’t find ${list} in the source. Please fill ${missing.length === 1 ? 'it' : 'them'} in.`;
}

export const sourceLabel: Record<SourceKind, string> = { website: 'website', tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', text: 'pasted text' };

/** What the edit form is pre-filled with when an import is partial or the user wants to edit first. */
export type RecipeDraft = {
  title: string;
  link: string;
  photoUrl: string | null;
  category: Category;
  minutes: number;
  servings: number;
  calories: string;
  protein: string;
  ingredientsText: string;
  stepsText: string;
  tags: DietTag[];
  /** Shown at the top of the form. */
  notice: string | null;
  fromImport: boolean;
  /** Full nutrition from the import, kept when the user doesn't change calories/protein. */
  importedNutrition: ImportedRecipe['nutrition'];
  /** Where it was imported from, so the saved recipe keeps its credit. */
  origin?: ImportOrigin | null;
};

export function draftFromImport(r: ImportedRecipe, notice: string | null, origin?: ImportOrigin | null): RecipeDraft {
  return {
    origin: origin ?? null,
    title: r.title,
    link: r.sourceUrl ?? '',
    photoUrl: r.imageUrl,
    category: r.category ?? 'Dinner',
    minutes: r.minutes ?? 30,
    servings: r.servings ?? 2,
    calories: r.nutrition ? String(r.nutrition.calories) : '',
    protein: r.nutrition ? String(r.nutrition.protein) : '',
    ingredientsText: r.ingredients.map(ingredientLine).join('\n'),
    stepsText: r.steps.join('\n'),
    tags: r.tags,
    notice,
    fromImport: true,
    importedNutrition: r.nutrition,
  };
}

/** A caption or page title as a recipe title: no hashtags, emojis or trailing punctuation. */
export function cleanTitle(raw: string) {
  return raw
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s:;,.!|-]+$/, '');
}

export function draftFromFailure(f: ImportFailure, input: string): RecipeDraft {
  const link = f.partial?.sourceUrl ?? (/^https?:\/\//i.test(input.trim()) ? input.trim() : '');
  return {
    origin: f.source && link ? { kind: f.source.kind, host: f.source.host, credit: f.partial?.credit ?? null } : null,
    // A caption isn't a title: no hashtags or emojis ("Best burger ever 😍🍔 #foodtok" → "Best burger ever").
    title: cleanTitle(f.partial?.title ?? '').slice(0, 120),
    link,
    photoUrl: f.partial?.imageUrl ?? null,
    category: 'Dinner',
    minutes: 30,
    servings: 2,
    calories: '',
    protein: '',
    ingredientsText: '',
    stepsText: link ? '' : input.trim().slice(0, 4000),
    tags: [],
    notice: `${f.message} Fill in what you know below.`,
    fromImport: true,
    importedNutrition: null,
  };
}
