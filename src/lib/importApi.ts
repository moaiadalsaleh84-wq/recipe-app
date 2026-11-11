/**
 * Talks to the recipe import backend. The AI key lives on the server; the app only sends the
 * link or text, plus a random install id used for rate limiting (see the Privacy screen).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMPORT_URL } from '../config';
import { categories, dietTags, type Category, type DietTag, type Ingredient, type Recipe } from '../data/mock';
import { aisleFor } from './parseIngredient';

/* Same shapes as supabase/functions/import-recipe/lib/types.ts. Keep in sync. */
export type MissingField = 'title' | 'ingredients' | 'steps' | 'amounts' | 'servings' | 'minutes';
export type SourceKind = 'website' | 'tiktok' | 'instagram' | 'youtube' | 'text';
export type ImportedIngredient = { amount: number | null; unit: string; name: string; original: string };
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
};
export type ImportSuccess = {
  ok: true;
  status: 'complete' | 'partial';
  recipe: ImportedRecipe;
  missing: MissingField[];
  warnings: string[];
  source: { kind: SourceKind; host: string | null; usedStructuredData: boolean; usedAi: boolean };
};
export type ImportFailure = {
  ok: false;
  code: 'invalid_input' | 'rate_limited' | 'daily_cap' | 'fetch_failed' | 'blocked' | 'no_text' | 'not_a_recipe' | 'ai_unavailable' | 'server_error' | 'offline' | 'timeout' | 'not_configured' | 'cancelled';
  message: string;
  retryAfter?: number;
  partial?: { title?: string; sourceUrl?: string; text?: string; imageUrl?: string };
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

const TIMEOUT_MS = 75_000;

/** Never throws: every outcome is an ImportResponse the UI can show. */
export async function importRecipe(input: { url?: string; text?: string }, signal?: AbortSignal): Promise<ImportResponse> {
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

/* ---------------- imported → app recipe ---------------- */

const UNIT_MAP: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'g', factor: 1000 },
  l: { unit: 'ml', factor: 1000 },
  dl: { unit: 'ml', factor: 100 },
  cl: { unit: 'ml', factor: 10 },
  cup: { unit: 'cups', factor: 1 },
  clove: { unit: 'cloves', factor: 1 },
  can: { unit: 'cans', factor: 1 },
  slice: { unit: 'slices', factor: 1 },
};

export function toIngredient(i: ImportedIngredient, index: number): Ingredient {
  const m = UNIT_MAP[i.unit] ?? { unit: i.unit, factor: 1 };
  const name = i.name.charAt(0).toUpperCase() + i.name.slice(1);
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}-${index}`,
    name,
    quantity: i.amount ? Math.round(i.amount * m.factor * 100) / 100 : 0,
    unit: i.amount ? m.unit : '',
    aisle: aisleFor(name),
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

export function toRecipe(r: ImportedRecipe): Omit<Recipe, 'id' | 'custom'> {
  return {
    title: r.title.trim() || 'Imported recipe',
    image: r.imageUrl ? { uri: r.imageUrl } : null,
    description: '',
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
};

export function draftFromImport(r: ImportedRecipe, notice: string | null): RecipeDraft {
  return {
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

export function draftFromFailure(f: ImportFailure, input: string): RecipeDraft {
  const link = f.partial?.sourceUrl ?? (/^https?:\/\//i.test(input.trim()) ? input.trim() : '');
  return {
    title: f.partial?.title?.slice(0, 120) ?? '',
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
