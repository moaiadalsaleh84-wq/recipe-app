/**
 * One recipe link, one recipe. The same TikTok, YouTube or web page can be shared in many forms
 * ("?_r=1&is_from_webapp=1", "m.", "www.", "youtu.be/…", a trailing "/"). `normalizeSourceUrl`
 * turns them into one form, so a link that's already in your recipes opens that recipe instead of
 * importing it again.
 *
 * The server has the same rules (supabase/functions/import-recipe/lib/links.ts); a test keeps the
 * two in step. Short share links (vm.tiktok.com/…) can only be matched once they're resolved.
 *
 * Pure (no app imports), so scripts/links.test.ts runs it in plain Node.
 */

/** Query parameters that only say who shared the link and how: never part of the recipe's address. */
const TRACKING = /^(utm_.*|_r|_t|_d|is_from_webapp|is_copy_url|sender_device|sender_web_id|share_.*|social_sharing|source|refer|referer|referrer|ref|ref_src|igsh|igshid|si|feature|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|checksum|tt_from|u_code|user_id|sec_user_id|timestamp|web_id|lang|app|enter_from|enter_method|embed_source|from|pp)$/i;

/** The canonical form of a recipe link, or null when it isn't a web link. */
export function normalizeSourceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const found = raw.trim().match(/https?:\/\/[^\s<>"']+/i);
  if (!found) return null;
  let u: URL;
  try {
    u = new URL(found[0].replace(/[).,;!?]+$/, ''));
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  let path = u.pathname.replace(/\/+$/, '') || '';

  // YouTube: every form → youtube.com/watch?v=ID
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com') {
    const id = host === 'youtu.be' ? path.slice(1).split('/')[0] : (u.searchParams.get('v') ?? path.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1]);
    if (id) return `https://youtube.com/watch?v=${id}`;
  }
  // TikTok: the video's own address, handle in lower case, no parameters.
  if (host === 'tiktok.com') {
    const m = path.match(/^\/(@[\w.-]+)\/(video|photo)\/(\d+)/i);
    if (m) return `https://tiktok.com/${m[1].toLowerCase()}/${m[2].toLowerCase()}/${m[3]}`;
  }
  // Instagram: posts and reels, no parameters.
  if (host === 'instagram.com') {
    const m = path.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i);
    if (m) return `https://instagram.com/${m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase()}/${m[2]}`;
  }
  // Everything else: same path, tracking parameters removed, the rest sorted.
  const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const query = keep.length ? `?${new URLSearchParams(keep).toString()}` : '';
  if (host.endsWith('tiktok.com')) path = path.toLowerCase();
  return `https://${host}${path}${query}`;
}

/** Do two links point to the same recipe? */
export const sameSource = (a: string | null | undefined, b: string | null | undefined) => {
  const x = normalizeSourceUrl(a);
  return !!x && x === normalizeSourceUrl(b);
};

/* ---------------- removing duplicates already saved ---------------- */

type R = { id: string; sourceUrl?: string; origin?: string; source?: string; addedAt?: string; custom?: boolean };

const isImport = (r: R) => !!r.custom && (r.origin === 'import' || r.source === 'tiktok' || r.source === 'youtube' || r.source === 'web');

/** When a saved recipe was added: its addedAt, or the time in its id ("my-<base36 time>-xxxx"). */
function added(r: R): number {
  if (r.addedAt) return Date.parse(r.addedAt) || 0;
  const m = r.id.match(/^my-([0-9a-z]+)-/);
  return m ? parseInt(m[1], 36) || 0 : 0;
}

/**
 * Imported recipes saved more than once from the same link: the newest copy is kept, the older
 * ones go. Everything that pointed at an older copy (favorites, cookbooks, the plan, cooking
 * history, notes, the shopping list) now points at the kept one, so nothing is lost.
 */
export function removeDuplicateImports<S extends {
  customRecipes: T[];
  favorites: string[];
  cookbooks: { recipeIds: string[] }[];
  plan: Record<number | string, Partial<Record<string, string>>>;
  cooked: { recipeId: string }[];
  notes: Record<string, string>;
  groceries: { recipeIds: string[] }[];
}, T extends R>(s: S): { saved: S; removed: number } {
  const keepFor = new Map<string, T>();
  for (const r of s.customRecipes) {
    const key = isImport(r) ? normalizeSourceUrl(r.sourceUrl) : null;
    if (!key) continue;
    const best = keepFor.get(key);
    if (!best || added(r) > added(best)) keepFor.set(key, r);
  }
  // Older copy id → the kept copy's id.
  const to = new Map<string, string>();
  for (const r of s.customRecipes) {
    const key = isImport(r) ? normalizeSourceUrl(r.sourceUrl) : null;
    const best = key ? keepFor.get(key) : undefined;
    if (best && best.id !== r.id) to.set(r.id, best.id);
  }
  if (!to.size) return { saved: s, removed: 0 };
  const map = (id: string) => to.get(id) ?? id;
  const uniq = (ids: string[]) => [...new Set(ids.map(map))];
  const notes = { ...s.notes };
  for (const [from, into] of to) {
    if (notes[from] && !notes[into]) notes[into] = notes[from];
    delete notes[from];
  }
  return {
    removed: to.size,
    saved: {
      ...s,
      customRecipes: s.customRecipes.filter((r) => !to.has(r.id)),
      favorites: uniq(s.favorites),
      cookbooks: s.cookbooks.map((c) => ({ ...c, recipeIds: uniq(c.recipeIds) })),
      plan: Object.fromEntries(Object.entries(s.plan).map(([day, meals]) => [day, Object.fromEntries(Object.entries(meals).map(([m, id]) => [m, id ? map(id) : id]))])),
      cooked: s.cooked.map((c) => (to.has(c.recipeId) ? { ...c, recipeId: map(c.recipeId) } : c)),
      notes,
      groceries: s.groceries.map((g) => ({ ...g, recipeIds: uniq(g.recipeIds) })),
    },
  };
}
