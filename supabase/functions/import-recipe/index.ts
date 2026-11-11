/**
 * Supabase Edge Function entry point (Deno).
 *
 * Secrets (set with `supabase secrets set`, never in the app):
 *   ANTHROPIC_API_KEY   required for AI extraction
 *   RATE_LIMIT_SALT     random string used to hash device ids and IPs
 *   IMPORT_DAILY_CAP    optional, default 500 AI imports per day for the whole app
 *   IMPORT_MODEL        optional, default claude-opus-5-5
 * SUPABASE_URL and the server key (SUPABASE_SECRET_KEYS, or the legacy SUPABASE_SERVICE_ROLE_KEY)
 * are provided by Supabase automatically.
 */
import { claudeCaller } from './lib/extract.ts';
import { handle } from './lib/handler.ts';
import { SupabaseCache, SupabaseLimiter, pickServerKey } from './lib/limits.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void };

const env = (k: string) => Deno.env.get(k) ?? '';
const key = env('ANTHROPIC_API_KEY');
const supabaseUrl = env('SUPABASE_URL');
const serviceKey = pickServerKey(env('SUPABASE_SECRET_KEYS'), env('SUPABASE_SERVICE_ROLE_KEY'));
if (!serviceKey) console.error('No Supabase server key found: rate limits will fail closed and imports will be refused.');
const salt = env('RATE_LIMIT_SALT');
if (!salt) console.warn('RATE_LIMIT_SALT is not set; set it so hashed ids cannot be guessed.');

const deps = {
  ai: key ? claudeCaller(key, env('IMPORT_MODEL') || undefined) : null,
  limiter: new SupabaseLimiter(supabaseUrl, serviceKey),
  cache: new SupabaseCache(supabaseUrl, serviceKey),
  salt: salt || 'unset-salt',
  dailyAiCap: Number(env('IMPORT_DAILY_CAP')) || undefined,
  log: (e: Record<string, unknown>) => console.log(JSON.stringify(e)),
};

Deno.serve((req) => handle(req, deps));
