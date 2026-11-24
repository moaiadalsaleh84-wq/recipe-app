/**
 * Discover: recipes the owner publishes, and nothing else. The app never searches for or imports
 * recipes on its own; normal users' imports stay private (shared_recipes is never listed).
 *
 * POST { action, ... } to the same function:
 *   discover.home     → { items } for "Most popular this week" (or "New in Discover")
 *   discover.list     { q?, cuisine?, mealType?, ingredient?, diet? } → { items }
 *   discover.get      { id } → { item } with the full recipe
 *   discover.save     { id } → { item }; +1 save (the time only, nobody's name or device)
 *   discover.report   { id, reason } → hides the recipe until the owner looks at it
 *   admin.check / admin.status / admin.publish / admin.unpublish / admin.reports / admin.resolve
 *
 * Admin: every admin.* call must carry the header x-admin-token equal to the DISCOVER_ADMIN_TOKEN
 * secret, which exists only on the server. No secret set → no admin at all. Wrong codes are counted
 * per IP and refused after a few tries.
 */
import { normalizeSourceUrl } from './links.ts';
import { serverHeaders, sha256, type Limiter } from './limits.ts';

/* ---------------- types ---------------- */

/** Which part of the photo shows in the 4:3 card, as fractions of the original (0–1). */
export type Crop = { x: number; y: number; w: number; h: number };
export type DiscoverSource = 'tiktok' | 'youtube' | 'instagram' | 'web';
export const CUISINES = ['American', 'Mexican', 'Italian', 'French', 'Mediterranean', 'Middle Eastern', 'Indian', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Other'] as const;
export const REPORT_REASONS = ['wrong_recipe', 'not_food', 'creator'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** One published recipe, as stored. `recipe` is the app's recipe (ingredients, steps, times…). */
export type DiscoverRow = {
  id: string;
  source_key: string;
  source_url: string;
  source: DiscoverSource;
  title: string;
  image_url: string | null;
  crop: Crop | null;
  creator_handle: string;
  creator_url: string | null;
  tags: string[];
  cuisine: string | null;
  meal_type: string | null;
  diet: string[];
  ingredient_names: string;
  recipe: Record<string, unknown>;
  status: 'published' | 'reported' | 'unpublished' | 'removed';
  save_count: number;
  published_at: string;
};
export type ReportRow = { id: string; discover_id: string; reason: ReportReason; created_at: string; resolved_at: string | null; resolution: string | null };

/** What the app gets for a card (no recipe body). */
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

export interface DiscoverStore {
  /** Every row, any status (the owner's catalog is small). */
  all(): Promise<DiscoverRow[]>;
  byId(id: string): Promise<DiscoverRow | null>;
  bySourceKey(key: string): Promise<DiscoverRow | null>;
  /** Insert or replace by source_key; keeps id, save_count and the first published date. */
  upsert(row: Omit<DiscoverRow, 'id' | 'save_count' | 'published_at'>): Promise<DiscoverRow>;
  setStatus(id: string, status: DiscoverRow['status']): Promise<void>;
  /** +1 save now; returns the new total. */
  addSave(id: string): Promise<number>;
  /** Saves per recipe in the last 7 days. */
  weekSaves(): Promise<Record<string, number>>;
  addReport(discoverId: string, reason: ReportReason): Promise<void>;
  openReports(): Promise<ReportRow[]>;
  resolveReports(discoverId: string, resolution: 'restored' | 'removed'): Promise<void>;
  /** Stores a photo in the public bucket; returns its public link. */
  uploadPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
}

/** Rewrites steps in the app's own words (same number, same meaning). */
export type StepWriter = (steps: string[], ingredients: string[]) => Promise<string[]>;

export type DiscoverDeps = {
  store: DiscoverStore | null;
  limiter: Limiter;
  salt: string;
  /** The DISCOVER_ADMIN_TOKEN secret ("" = admin off). */
  adminToken: string;
  stepWriter: StepWriter | null;
  log?: (e: Record<string, unknown>) => void;
};

/* ---------------- helpers ---------------- */

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strings = (v: unknown, max: number, each = 60) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, each)).filter(Boolean).slice(0, max) : []);
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Constant-time comparison, so the code can't be guessed letter by letter. */
export function sameSecret(a: string, b: string) {
  if (!a || !b) return false;
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function cleanCrop(v: unknown): Crop | null {
  if (!v || typeof v !== 'object') return null;
  const c = v as Record<string, unknown>;
  const n = (k: string) => (typeof c[k] === 'number' && Number.isFinite(c[k]) ? (c[k] as number) : NaN);
  const [x, y, w, h] = [n('x'), n('y'), n('w'), n('h')];
  if ([x, y, w, h].some(Number.isNaN) || w <= 0.05 || h <= 0.05 || x < 0 || y < 0 || x + w > 1.0001 || y + h > 1.0001) return null;
  return { x, y, w, h };
}

export function toCard(r: DiscoverRow, week: Record<string, number> = {}): DiscoverCardData {
  return {
    id: r.id,
    title: r.title,
    imageUrl: r.image_url,
    crop: r.crop,
    creatorHandle: r.creator_handle,
    creatorUrl: r.creator_url,
    sourceUrl: r.source_url,
    source: r.source,
    tags: r.tags,
    cuisine: r.cuisine,
    mealType: r.meal_type,
    diet: r.diet,
    saves: r.save_count,
    weekSaves: week[r.id] ?? 0,
    publishedAt: r.published_at,
  };
}

export type ListQuery = { q?: string; cuisine?: string; mealType?: string; ingredient?: string; diet?: string };

/** Search and filters over the published recipes. Every word of the search must match somewhere. */
export function filterRows(rows: DiscoverRow[], query: ListQuery): DiscoverRow[] {
  const words = fold(query.q ?? '').split(/\s+/).filter((w) => w.length > 1);
  const ingredient = fold(query.ingredient ?? '').trim();
  return rows.filter((r) => {
    if (r.status !== 'published') return false;
    if (query.cuisine && r.cuisine !== query.cuisine) return false;
    if (query.mealType && r.meal_type !== query.mealType) return false;
    if (query.diet && !r.diet.includes(query.diet)) return false;
    const names = fold(r.ingredient_names);
    if (ingredient && !names.includes(ingredient.replace(/s$/, ''))) return false;
    if (words.length) {
      const hay = fold([r.title, r.creator_handle, r.cuisine ?? '', r.meal_type ?? '', r.tags.join(' '), r.ingredient_names].join(' '));
      if (!words.every((w) => hay.includes(w.replace(/s$/, '')))) return false;
    }
    return true;
  });
}

/** "Most popular this week": by saves in the last 7 days; with none, the newest ("New in Discover"). */
export function homeRow(rows: DiscoverRow[], week: Record<string, number>, max = 10): { kind: 'popular' | 'new'; items: DiscoverCardData[] } {
  const live = rows.filter((r) => r.status === 'published');
  const popular = live.filter((r) => (week[r.id] ?? 0) > 0).sort((a, b) => (week[b.id] ?? 0) - (week[a.id] ?? 0) || b.save_count - a.save_count);
  if (popular.length) return { kind: 'popular', items: popular.slice(0, max).map((r) => toCard(r, week)) };
  const newest = [...live].sort((a, b) => b.published_at.localeCompare(a.published_at));
  return { kind: 'new', items: newest.slice(0, max).map((r) => toCard(r, week)) };
}

const reply = (status: number, body: unknown, headers: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/* ---------------- the actions ---------------- */

export async function handleDiscover(action: string, body: Record<string, unknown>, req: Request, installId: string, ip: string, deps: DiscoverDeps, cors: Record<string, string>): Promise<Response> {
  const ok = (b: Record<string, unknown>) => reply(200, { ok: true, ...b }, cors);
  const no = (status: number, code: string, message: string) => reply(status, { ok: false, code, message }, cors);
  const store = deps.store;
  if (!store) return no(503, 'not_configured', 'Discover isn’t set up on the server yet.');
  const device = await sha256(`${deps.salt}|device|${installId}`);
  const limit = async (name: string, windowSeconds: number, max: number) => (await deps.limiter.hit(`${name}:${device}`, windowSeconds, max).catch(() => ({ allowed: false }))).allowed;

  /* ----- admin ----- */
  if (action.startsWith('admin.')) {
    const ipKey = await sha256(`${deps.salt}|ip|${ip}`);
    const given = req.headers.get('x-admin-token') ?? '';
    if (!sameSecret(given, deps.adminToken)) {
      // Wrong or missing code: counted per IP; after 10 a day, every try is refused.
      const tries = await deps.limiter.hit(`adminfail:${ipKey}`, 86400, 10).catch(() => ({ allowed: false }));
      deps.log?.({ event: 'admin_refused' });
      return tries.allowed ? no(403, 'not_admin', 'That code isn’t right.') : no(429, 'rate_limited', 'Too many wrong codes today. Try again tomorrow.');
    }
    return admin(action, body, deps, store, ok, no);
  }

  /* ----- everyone ----- */
  if (!(await limit('disc10', 600, 300))) return no(429, 'rate_limited', 'Slow down a little and try again.');
  if (action === 'discover.home') {
    const [rows, week] = await Promise.all([store.all(), store.weekSaves()]);
    return ok(homeRow(rows, week));
  }
  if (action === 'discover.list') {
    const [rows, week] = await Promise.all([store.all(), store.weekSaves()]);
    const q: ListQuery = { q: str(body.q, 80), cuisine: str(body.cuisine, 40), mealType: str(body.mealType, 20), ingredient: str(body.ingredient, 40), diet: str(body.diet, 30) };
    const items = filterRows(rows, q)
      .sort((a, b) => (week[b.id] ?? 0) - (week[a.id] ?? 0) || b.save_count - a.save_count || b.published_at.localeCompare(a.published_at))
      .slice(0, 200)
      .map((r) => toCard(r, week));
    return ok({ items });
  }
  const id = str(body.id, 64);
  if (action === 'discover.get' || action === 'discover.save') {
    const row = id ? await store.byId(id) : null;
    if (!row || row.status !== 'published') return no(404, 'not_found', 'This recipe isn’t in Discover anymore.');
    if (action === 'discover.save') {
      if (!(await limit('dsave', 86400, 60))) return no(429, 'rate_limited', 'You’ve saved a lot today. Try again tomorrow.');
      row.save_count = await store.addSave(row.id);
    }
    return ok({ item: { ...toCard(row), recipe: row.recipe } });
  }
  if (action === 'discover.report') {
    const reason = str(body.reason, 20) as ReportReason;
    if (!REPORT_REASONS.includes(reason)) return no(400, 'invalid_input', 'Pick a reason.');
    if (!(await limit('drep', 86400, 10))) return no(429, 'rate_limited', 'Try again tomorrow.');
    const row = id ? await store.byId(id) : null;
    if (!row) return no(404, 'not_found', 'This recipe isn’t in Discover anymore.');
    await store.addReport(row.id, reason);
    // Hidden from everyone until the owner looks at it.
    if (row.status === 'published') await store.setStatus(row.id, 'reported');
    deps.log?.({ event: 'discover_report', reason });
    return ok({});
  }
  return no(400, 'invalid_input', 'Unknown request.');
}

async function admin(action: string, body: Record<string, unknown>, deps: DiscoverDeps, store: DiscoverStore, ok: (b: Record<string, unknown>) => Response, no: (s: number, c: string, m: string) => Response) {
  if (action === 'admin.check') return ok({ admin: true });

  if (action === 'admin.status') {
    const link = normalizeSourceUrl(str(body.sourceUrl, 2048));
    const row = link ? await store.bySourceKey(await sha256(`discover|${link}`)) : null;
    return ok({ item: row ? { ...toCard(row), status: row.status } : null });
  }

  if (action === 'admin.publish') {
    const link = normalizeSourceUrl(str(body.sourceUrl, 2048));
    const creator = str(body.creatorHandle, 60);
    const title = str(body.title, 120);
    const recipe = body.recipe && typeof body.recipe === 'object' ? (body.recipe as Record<string, unknown>) : null;
    if (!link) return no(400, 'invalid_input', 'This recipe has no link to its original.');
    if (!creator) return no(400, 'invalid_input', 'Add the creator’s @name first: every Discover recipe shows who made it.');
    if (!title) return no(400, 'invalid_input', 'Add a title.');
    if (!recipe || JSON.stringify(recipe).length > 120_000) return no(400, 'invalid_input', 'The recipe is missing or too long.');
    const steps = strings(recipe.steps, 40, 600);
    const ingredients = Array.isArray(recipe.ingredients) ? (recipe.ingredients as { name?: unknown }[]).map((i) => str(i?.name, 80)).filter(Boolean) : [];
    if (!steps.length || !ingredients.length) return no(400, 'invalid_input', 'The recipe needs ingredients and steps.');
    // Steps in the app's own words, never the caption's.
    if (!deps.stepWriter) return no(503, 'ai_unavailable', 'Steps can’t be rewritten right now (AI not set up), so it wasn’t published.');
    let ownSteps: string[];
    try {
      ownSteps = await deps.stepWriter(steps, ingredients);
    } catch {
      return no(503, 'ai_unavailable', 'Couldn’t rewrite the steps right now. Try again in a minute.');
    }
    if (ownSteps.length !== steps.length || ownSteps.some((s) => !s.trim())) return no(502, 'ai_unavailable', 'The rewritten steps didn’t match. Try again.');

    const key = await sha256(`discover|${link}`);
    // The photo: uploaded by the app (the picture saved on the phone), else the link it sent.
    let imageUrl: string | null = /^https:\/\//.test(str(body.imageUrl, 2048)) ? str(body.imageUrl, 2048) : null;
    const photo = body.photo as { base64?: unknown; contentType?: unknown } | undefined;
    if (photo && typeof photo.base64 === 'string' && photo.base64.length < 6_000_000) {
      const type = photo.contentType === 'image/png' ? 'image/png' : photo.contentType === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
      const bytes = Uint8Array.from(atob(photo.base64), (c) => c.charCodeAt(0));
      imageUrl = await store.uploadPhoto(`${key.slice(0, 32)}-${Date.now().toString(36)}.${type.split('/')[1]}`, bytes, type);
    }
    const source = (['tiktok', 'youtube', 'instagram', 'web'] as const).find((k) => k === body.source) ?? 'web';
    const cuisine = (CUISINES as readonly string[]).includes(str(body.cuisine, 40)) ? str(body.cuisine, 40) : null;
    const row = await store.upsert({
      source_key: key,
      source_url: link,
      source,
      title,
      image_url: imageUrl,
      crop: cleanCrop(body.crop),
      creator_handle: creator.startsWith('@') || source === 'web' ? creator : `@${creator}`,
      creator_url: /^https:\/\//.test(str(body.creatorUrl, 2048)) ? str(body.creatorUrl, 2048) : null,
      tags: strings(body.tags, 12, 30),
      cuisine,
      meal_type: str(recipe.mealType, 20) || null,
      diet: strings(body.diet, 8, 30),
      ingredient_names: ingredients.join(' · '),
      recipe: { ...recipe, title, steps: ownSteps },
      status: 'published',
    });
    deps.log?.({ event: 'discover_publish' });
    return ok({ item: { ...toCard(row), status: row.status } });
  }

  if (action === 'admin.unpublish') {
    const id = str(body.id, 64);
    const row = id ? await store.byId(id) : null;
    if (!row) return no(404, 'not_found', 'Not in Discover.');
    await store.setStatus(row.id, 'unpublished');
    return ok({});
  }

  if (action === 'admin.reports') {
    const [reports, rows] = await Promise.all([store.openReports(), store.all()]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ok({
      reports: reports
        .filter((r) => byId.has(r.discover_id))
        .map((r) => ({ id: r.id, reason: r.reason, createdAt: r.created_at, recipe: toCard(byId.get(r.discover_id)!), status: byId.get(r.discover_id)!.status })),
    });
  }

  if (action === 'admin.resolve') {
    const id = str(body.id, 64);
    const what = body.resolution === 'restore' ? 'restored' : body.resolution === 'remove' ? 'removed' : null;
    const row = id ? await store.byId(id) : null;
    if (!row || !what) return no(400, 'invalid_input', 'Pick restore or remove.');
    await store.setStatus(row.id, what === 'restored' ? 'published' : 'removed');
    await store.resolveReports(row.id, what);
    return ok({});
  }
  return no(400, 'invalid_input', 'Unknown request.');
}

/* ---------------- stores ---------------- */

export class MemoryDiscover implements DiscoverStore {
  rows: DiscoverRow[] = [];
  saves: { id: string; at: number }[] = [];
  reports: ReportRow[] = [];
  photos = new Map<string, Uint8Array>();
  private n = 0;
  async all() {
    return this.rows.map((r) => ({ ...r }));
  }
  async byId(id: string) {
    const r = this.rows.find((x) => x.id === id);
    return r ? { ...r } : null;
  }
  async bySourceKey(key: string) {
    const r = this.rows.find((x) => x.source_key === key);
    return r ? { ...r } : null;
  }
  async upsert(row: Omit<DiscoverRow, 'id' | 'save_count' | 'published_at'>) {
    const old = this.rows.find((x) => x.source_key === row.source_key);
    if (old) {
      Object.assign(old, row);
      return { ...old };
    }
    const fresh: DiscoverRow = { ...row, id: `d${++this.n}-${row.source_key.slice(0, 6)}`, save_count: 0, published_at: new Date().toISOString() };
    this.rows.push(fresh);
    return { ...fresh };
  }
  async setStatus(id: string, status: DiscoverRow['status']) {
    const r = this.rows.find((x) => x.id === id);
    if (r) r.status = status;
  }
  async addSave(id: string) {
    this.saves.push({ id, at: Date.now() });
    const r = this.rows.find((x) => x.id === id)!;
    r.save_count += 1;
    return r.save_count;
  }
  async weekSaves() {
    const since = Date.now() - 7 * 86400_000;
    const out: Record<string, number> = {};
    for (const s of this.saves) if (s.at >= since) out[s.id] = (out[s.id] ?? 0) + 1;
    return out;
  }
  async addReport(discoverId: string, reason: ReportReason) {
    this.reports.push({ id: `r${this.reports.length + 1}`, discover_id: discoverId, reason, created_at: new Date().toISOString(), resolved_at: null, resolution: null });
  }
  async openReports() {
    return this.reports.filter((r) => !r.resolved_at);
  }
  async resolveReports(discoverId: string, resolution: 'restored' | 'removed') {
    for (const r of this.reports) if (r.discover_id === discoverId && !r.resolved_at) Object.assign(r, { resolved_at: new Date().toISOString(), resolution });
  }
  /** Local testing: how an uploaded photo's link is made (default: a pretend storage link). */
  publicUrl: (path: string, bytes: Uint8Array, contentType: string) => string = (path) => `https://storage.example.com/discover-photos/${path}`;
  async uploadPhoto(path: string, bytes: Uint8Array, contentType: string) {
    this.photos.set(path, bytes);
    return this.publicUrl(path, bytes, contentType);
  }
}

/** Postgres + Storage (see supabase/migrations/…_discover.sql). Server key only. */
export class SupabaseDiscover implements DiscoverStore {
  private url: string;
  private key: string;
  constructor(url: string, serviceKey: string) {
    this.url = url;
    this.key = serviceKey;
  }
  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.url}${path}`, { ...init, headers: { ...serverHeaders(this.key), ...(init.headers as Record<string, string>) } });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }
  all() {
    return this.req<DiscoverRow[]>('/rest/v1/discover_recipes?select=*&status=neq.removed&order=published_at.desc&limit=2000');
  }
  async byId(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    return (await this.req<DiscoverRow[]>(`/rest/v1/discover_recipes?select=*&id=eq.${id}`))[0] ?? null;
  }
  async bySourceKey(key: string) {
    return (await this.req<DiscoverRow[]>(`/rest/v1/discover_recipes?select=*&source_key=eq.${key}`))[0] ?? null;
  }
  async upsert(row: Omit<DiscoverRow, 'id' | 'save_count' | 'published_at'>) {
    const rows = await this.req<DiscoverRow[]>('/rest/v1/discover_recipes?on_conflict=source_key', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
    });
    return rows[0];
  }
  async setStatus(id: string, status: DiscoverRow['status']) {
    await this.req(`/rest/v1/discover_recipes?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
  }
  async addSave(id: string) {
    return this.req<number>('/rest/v1/rpc/discover_add_save', { method: 'POST', body: JSON.stringify({ p_id: id }) });
  }
  async weekSaves() {
    const rows = await this.req<{ discover_id: string; saves: number }[]>('/rest/v1/rpc/discover_week_saves', { method: 'POST', body: '{}' });
    return Object.fromEntries(rows.map((r) => [r.discover_id, Number(r.saves)]));
  }
  async addReport(discoverId: string, reason: ReportReason) {
    await this.req('/rest/v1/discover_reports', { method: 'POST', body: JSON.stringify({ discover_id: discoverId, reason }) });
  }
  openReports() {
    return this.req<ReportRow[]>('/rest/v1/discover_reports?select=*&resolved_at=is.null&order=created_at.asc&limit=200');
  }
  async resolveReports(discoverId: string, resolution: 'restored' | 'removed') {
    await this.req(`/rest/v1/discover_reports?discover_id=eq.${discoverId}&resolved_at=is.null`, { method: 'PATCH', body: JSON.stringify({ resolved_at: new Date().toISOString(), resolution }) });
  }
  async uploadPhoto(path: string, bytes: Uint8Array, contentType: string) {
    const res = await fetch(`${this.url}/storage/v1/object/discover-photos/${path}`, {
      method: 'POST',
      headers: { ...serverHeaders(this.key), 'content-type': contentType, 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
      body: new Blob([bytes as BlobPart], { type: contentType }),
    });
    if (!res.ok) throw new Error(`storage ${res.status}`);
    return `${this.url}/storage/v1/object/public/discover-photos/${path}`;
  }
}

