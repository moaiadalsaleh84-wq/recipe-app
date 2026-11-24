/**
 * Reusing imports (table shared_recipes), so the same video or page is only read by the AI once.
 *
 * - Keyed by the recipe link in one form (links.ts): short links resolved, tracking parameters gone.
 * - Holds the recipe as read from the public source, and nothing about who imported it: no user,
 *   device, name or IP. Only this function (service key) can read or write the table.
 * - Never shown to anyone: a later import of the same link gets a private copy, as if it had been
 *   read again. Discover is a different table that only the owner fills (discover.ts).
 */
import { serverHeaders, sha256 } from './limits.ts';
import type { ImportSuccess } from './types.ts';

export interface SharedStore {
  get(link: string): Promise<ImportSuccess | null>;
  put(link: string, result: ImportSuccess): Promise<void>;
}

/** The row key: a hash of the link (safe in URLs, same length for every link). */
export const sharedKey = (link: string) => sha256(`shared|${link}`);

/** What may be kept: the recipe and its public source. Nothing from the request. */
export function forSharing(result: ImportSuccess): ImportSuccess {
  const { ok, status, recipe, missing, warnings, source, checks } = result;
  return { ok, status, recipe, missing, warnings, source: { ...source }, ...(checks ? { checks } : {}) };
}

export class MemoryShared implements SharedStore {
  readonly rows = new Map<string, { link: string; result: ImportSuccess; reused: number }>();
  async get(link: string) {
    const row = this.rows.get(await sharedKey(link));
    if (!row) return null;
    row.reused += 1;
    return row.result;
  }
  async put(link: string, result: ImportSuccess) {
    this.rows.set(await sharedKey(link), { link, result: forSharing(result), reused: 0 });
  }
}

export class SupabaseShared implements SharedStore {
  private url: string;
  private serviceKey: string;
  constructor(url: string, serviceKey: string) {
    this.url = url;
    this.serviceKey = serviceKey;
  }
  async get(link: string) {
    const key = await sharedKey(link);
    const res = await fetch(`${this.url}/rest/v1/shared_recipes?select=result&key=eq.${key}`, { headers: serverHeaders(this.serviceKey) });
    if (!res.ok) return null;
    const rows = (await res.json()) as { result: ImportSuccess }[];
    if (!rows[0]) return null;
    // How often it saved an AI call (a number only); failures here don't matter.
    await fetch(`${this.url}/rest/v1/rpc/shared_recipe_reused`, {
      method: 'POST',
      headers: { ...serverHeaders(this.serviceKey), 'content-type': 'application/json' },
      body: JSON.stringify({ p_key: key }),
    }).catch(() => {});
    return rows[0].result;
  }
  async put(link: string, result: ImportSuccess) {
    const key = await sharedKey(link);
    await fetch(`${this.url}/rest/v1/shared_recipes?on_conflict=key`, {
      method: 'POST',
      headers: { ...serverHeaders(this.serviceKey), 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, source_url: link, result: forSharing(result), updated_at: new Date().toISOString() }),
    });
  }
}
