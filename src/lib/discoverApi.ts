/**
 * Discover, from the app's side: recipes the owner published (see the server's discover.ts).
 * The app only reads them, saves copies and sends reports; it never searches for or imports
 * recipes by itself.
 *
 * Admin mode: the owner types the admin code once (Settings). It's kept on this phone and sent
 * with admin requests; the SERVER decides (the code must equal its DISCOVER_ADMIN_TOKEN secret).
 * Nothing in the app unlocks anything on its own.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { IMPORT_URL } from '../config';
import type { Recipe } from '../data/mock';
import { getInstallId } from './importApi';

export type Crop = { x: number; y: number; w: number; h: number };
export type DiscoverSource = 'tiktok' | 'youtube' | 'instagram' | 'web';
export type DiscoverCardData = {
  id: string;
  title: string;
  imageUrl: string | null;
  crop: Crop | null;
  creatorHandle: string;
  creatorUrl: string | null;
  sourceUrl: string;
  source: DiscoverSource;
  tags: string[];
  cuisine: string | null;
  mealType: string | null;
  diet: string[];
  saves: number;
  weekSaves: number;
  publishedAt: string;
};
export type DiscoverItem = DiscoverCardData & { recipe: Partial<Recipe> & Record<string, unknown> };
export type ReportReason = 'wrong_recipe' | 'not_food' | 'creator';
export type DiscoverFilters = { q?: string; cuisine?: string; mealType?: string; ingredient?: string; diet?: string };

export const CUISINES = ['American', 'Mexican', 'Italian', 'French', 'Mediterranean', 'Middle Eastern', 'Indian', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Other'] as const;
export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
] as const;
export const DIETS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'] as const;
export const INGREDIENT_CHIPS = ['Chicken', 'Beef', 'Pork', 'Fish', 'Shrimp', 'Tofu', 'Eggs', 'Pasta', 'Rice', 'Potato'] as const;

type Result<T> = ({ ok: true } & T) | { ok: false; code: string; message: string };

async function call<T>(action: string, body: Record<string, unknown> = {}, admin = false): Promise<Result<T>> {
  if (!IMPORT_URL) return { ok: false, code: 'not_configured', message: 'Discover isn’t set up yet.' };
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-install-id': await getInstallId() };
    if (admin) {
      const code = adminCode();
      if (!code) return { ok: false, code: 'not_admin', message: 'Admin mode is off.' };
      headers['x-admin-token'] = code;
    }
    const res = await fetch(IMPORT_URL, { method: 'POST', headers, body: JSON.stringify({ action, ...body }) });
    const json = (await res.json().catch(() => null)) as Result<T> | null;
    return json ?? { ok: false, code: 'server_error', message: 'Something went wrong. Try again.' };
  } catch {
    return { ok: false, code: 'offline', message: 'You’re offline. Try again when you’re connected.' };
  }
}

/* ---------------- everyone ---------------- */

export const discoverHome = () => call<{ kind: 'popular' | 'new'; items: DiscoverCardData[] }>('discover.home');
export const discoverList = (f: DiscoverFilters) => call<{ items: DiscoverCardData[] }>('discover.list', f);
export const discoverGet = (id: string) => call<{ item: DiscoverItem }>('discover.get', { id });
export const discoverSave = (id: string) => call<{ item: DiscoverItem }>('discover.save', { id });
export const discoverReport = (id: string, reason: ReportReason) => call<object>('discover.report', { id, reason });

/** A Discover recipe as an app recipe (not saved yet: id "discover-<id>"). */
export function discoverToRecipe(item: DiscoverItem): Recipe {
  const r = item.recipe;
  return {
    ...(r as Partial<Recipe>),
    id: `discover-${item.id}`,
    custom: false,
    title: item.title,
    image: item.imageUrl ? { uri: item.imageUrl } : null,
    ...(item.crop ? { photoCrop: item.crop } : {}),
    description: (r.description as string) ?? '',
    category: (r.category as Recipe['category']) ?? 'Dinner',
    minutes: Number(r.minutes) || 30,
    servings: Number(r.servings) || 2,
    calories: Number(r.calories) || 0,
    nutrition: (r.nutrition as Recipe['nutrition']) ?? { protein: 0, carbs: 0, fat: 0 },
    difficulty: (r.difficulty as Recipe['difficulty']) ?? 'Easy',
    tags: (r.tags as Recipe['tags']) ?? [],
    ingredients: (r.ingredients as Recipe['ingredients']) ?? [],
    steps: (r.steps as string[]) ?? [],
    source: item.source,
    sourceUrl: item.sourceUrl,
    creatorHandle: item.creatorHandle,
    ...(item.creatorUrl ? { creatorUrl: item.creatorUrl } : {}),
    imageCreditText: item.source === 'web' ? item.creatorHandle : `From ${item.creatorHandle} on ${item.source === 'tiktok' ? 'TikTok' : item.source === 'youtube' ? 'YouTube' : 'Instagram'}`,
    discover: { id: item.id, saves: item.saves },
  };
}

/** The user's own copy of a Discover recipe (private, like an import). */
export function savedCopy(item: DiscoverItem): Omit<Recipe, 'id' | 'custom'> {
  const { id: _id, custom: _custom, discover: _d, ...rest } = discoverToRecipe(item);
  return { ...rest, origin: 'import', discoverId: item.id };
}

/* ---------------- admin (checked on the server) ---------------- */

const ADMIN_KEY = 'pantry-pop-admin-code';
let code: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(ADMIN_KEY)
  .then((v) => {
    code = v;
    loaded = true;
    emit();
  })
  .catch(() => {
    loaded = true;
  });

const adminCode = () => code;

/** True once the server has accepted the code saved on this phone. */
export function useAdminMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => loaded && !!code,
  );
}

/** Checks the code with the server; only a code the server accepts is kept. */
export async function turnOnAdmin(candidate: string): Promise<{ ok: boolean; message?: string }> {
  const prev = code;
  code = candidate.trim();
  const res = await call<object>('admin.check', {}, true);
  if (!res.ok) {
    code = prev;
    return { ok: false, message: res.message };
  }
  await AsyncStorage.setItem(ADMIN_KEY, code).catch(() => {});
  emit();
  return { ok: true };
}

export async function turnOffAdmin() {
  code = null;
  await AsyncStorage.removeItem(ADMIN_KEY).catch(() => {});
  emit();
}

export type PublishInput = {
  sourceUrl: string;
  source: DiscoverSource;
  title: string;
  creatorHandle: string;
  creatorUrl?: string;
  tags: string[];
  cuisine: string | null;
  diet: string[];
  crop: Crop | null;
  recipe: Record<string, unknown>;
  photo?: { base64: string; contentType: string };
  imageUrl?: string;
};
export const adminStatus = (sourceUrl: string) => call<{ item: (DiscoverCardData & { status: string }) | null }>('admin.status', { sourceUrl }, true);
export const adminPublish = (input: PublishInput) => call<{ item: DiscoverCardData & { status: string } }>('admin.publish', input, true);
export const adminUnpublish = (id: string) => call<object>('admin.unpublish', { id }, true);
export type AdminReport = { id: string; reason: ReportReason; createdAt: string; recipe: DiscoverCardData; status: string };
export const adminReports = () => call<{ reports: AdminReport[] }>('admin.reports', {}, true);
export const adminResolve = (id: string, resolution: 'restore' | 'remove') => call<object>('admin.resolve', { id, resolution }, true);

export const REPORT_LABELS: Record<ReportReason, string> = {
  wrong_recipe: 'Wrong recipe',
  not_food: 'Not food',
  creator: 'I’m the creator and want this removed',
};
