/**
 * Abuse protection and cost control.
 *
 * Every request is counted per device and per IP address (both hashed, never stored raw).
 * Requests that would call the AI also count against a server-wide daily cap, so a bug or
 * an attack can never cost more than (cap × price of one import) per day.
 * Successful imports of the same link are cached for a week, so a viral recipe is only paid for once.
 */

export type HitResult = { allowed: boolean; count: number; resetIn: number };

export interface Limiter {
  /** Counts one hit for `key` in a fixed window and says whether it is within `max`. */
  hit(key: string, windowSeconds: number, max: number): Promise<HitResult>;
}

export interface ResultCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
}

export const LIMITS = {
  devicePer10Min: 6,
  devicePerDay: 30,
  ipPerDay: 60,
  /** Override with the IMPORT_DAILY_CAP secret. */
  globalAiPerDay: 500,
  cacheDays: 7,
};

export async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** In-memory version for local development and tests. */
export class MemoryLimiter implements Limiter {
  private windows = new Map<string, { start: number; count: number }>();
  private now: () => number;
  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }
  async hit(key: string, windowSeconds: number, max: number): Promise<HitResult> {
    const t = this.now();
    const start = Math.floor(t / (windowSeconds * 1000)) * windowSeconds * 1000;
    const id = `${key}|${windowSeconds}`;
    const w = this.windows.get(id);
    const entry = w && w.start === start ? w : { start, count: 0 };
    entry.count += 1;
    this.windows.set(id, entry);
    return { allowed: entry.count <= max, count: entry.count, resetIn: Math.ceil((start + windowSeconds * 1000 - t) / 1000) };
  }
}

export class MemoryCache implements ResultCache {
  private map = new Map<string, { at: number; value: unknown }>();
  async get(key: string) {
    const e = this.map.get(key);
    return e && Date.now() - e.at < LIMITS.cacheDays * 86400_000 ? e.value : null;
  }
  async set(key: string, value: unknown) {
    this.map.set(key, { at: Date.now(), value });
  }
}

/**
 * Headers for Supabase's REST API. New-style secret keys (sb_secret_...) go in `apikey` only;
 * legacy service-role keys are JWTs and also go in Authorization.
 */
export function serverHeaders(key: string): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'content-type': 'application/json' };
  if (key.startsWith('eyJ')) h.authorization = `Bearer ${key}`;
  return h;
}

/**
 * Picks the server key Supabase gives Edge Functions: the new SUPABASE_SECRET_KEYS
 * (a JSON object of named keys) when present, else the legacy SUPABASE_SERVICE_ROLE_KEY.
 */
export function pickServerKey(secretKeysJson: string, legacyServiceRole: string): string {
  try {
    const keys = JSON.parse(secretKeysJson || '{}') as Record<string, string>;
    const key = keys.default ?? Object.values(keys).find((v) => typeof v === 'string' && v);
    if (key) return key;
  } catch {
    // not JSON: fall through to the legacy key
  }
  return legacyServiceRole;
}

/**
 * Postgres-backed versions (see supabase/migrations). Uses the project's server key, which
 * Supabase provides to Edge Functions automatically. It never leaves the server.
 */
export class SupabaseLimiter implements Limiter {
  private url: string;
  private serviceKey: string;
  constructor(url: string, serviceKey: string) {
    this.url = url;
    this.serviceKey = serviceKey;
  }
  async hit(key: string, windowSeconds: number, max: number): Promise<HitResult> {
    const res = await fetch(`${this.url}/rest/v1/rpc/import_hit`, {
      method: 'POST',
      headers: serverHeaders(this.serviceKey),
      body: JSON.stringify({ p_key: key, p_window_seconds: windowSeconds, p_max: max }),
    });
    if (!res.ok) throw new Error(`rate limit store error ${res.status}`);
    const row = (await res.json()) as { allowed: boolean; count: number; reset_in: number };
    return { allowed: row.allowed, count: row.count, resetIn: row.reset_in };
  }
}

export class SupabaseCache implements ResultCache {
  private url: string;
  private serviceKey: string;
  constructor(url: string, serviceKey: string) {
    this.url = url;
    this.serviceKey = serviceKey;
  }
  private headers() {
    return serverHeaders(this.serviceKey);
  }
  async get(key: string) {
    const since = new Date(Date.now() - LIMITS.cacheDays * 86400_000).toISOString();
    const res = await fetch(`${this.url}/rest/v1/import_cache?select=result&key=eq.${key}&created_at=gte.${since}`, { headers: this.headers() });
    if (!res.ok) return null;
    const rows = (await res.json()) as { result: unknown }[];
    return rows[0]?.result ?? null;
  }
  async set(key: string, value: unknown) {
    await fetch(`${this.url}/rest/v1/import_cache?on_conflict=key`, {
      method: 'POST',
      headers: { ...this.headers(), prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, result: value, created_at: new Date().toISOString() }),
    });
  }
}
