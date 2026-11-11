/**
 * Fetching pages people paste into the app, safely.
 *
 * The server fetches URLs chosen by users, so it must not be usable to reach private
 * networks (SSRF): only http(s) on standard ports, no IP literals in private ranges, no
 * internal host names, redirects re-checked on every hop, a timeout and a size cap.
 */

export const MAX_PAGE_BYTES = 3_000_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 4;

/** A browser-like user agent: many recipe sites serve an empty shell to unknown bots. */
export const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export class FetchError extends Error {
  readonly kind: 'invalid_url' | 'blocked_host' | 'timeout' | 'http' | 'too_large' | 'network';
  readonly status?: number;
  constructor(message: string, kind: FetchError['kind'], status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^22[4-9]\./, /^2[3-5]\d\./];

/** Throws unless the URL is a public http(s) address. */
export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError('That doesn’t look like a link.', 'invalid_url');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new FetchError('Only web links (http or https) can be imported.', 'invalid_url');
  if (url.username || url.password) throw new FetchError('Links with a username or password can’t be imported.', 'invalid_url');
  if (url.port && url.port !== '80' && url.port !== '443') throw new FetchError('That link uses an unusual port.', 'blocked_host');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host.includes('.') || host === 'localhost' || /\.(local|localhost|internal|lan|home|corp|intranet)$/.test(host)) {
    throw new FetchError('That link points to a private address.', 'blocked_host');
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && PRIVATE_V4.some((re) => re.test(host))) throw new FetchError('That link points to a private address.', 'blocked_host');
  if (host.includes(':')) {
    // Any IPv6 literal: public recipe sites don't need them, and private ranges are many.
    throw new FetchError('That link points to a raw IP address.', 'blocked_host');
  }
  return url;
}

export type FetchedPage = { url: string; status: number; contentType: string; body: string };

/** GET a public page as text, following redirects safely. */
export async function safeFetch(raw: string, init: { accept?: string; fetchImpl?: typeof fetch } = {}): Promise<FetchedPage> {
  const doFetch = init.fetchImpl ?? fetch;
  let url = assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await doFetch(url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': BROWSER_UA,
          accept: init.accept ?? 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        },
      });
    } catch (e) {
      clearTimeout(timer);
      if ((e as Error).name === 'AbortError') throw new FetchError('The site took too long to answer.', 'timeout');
      throw new FetchError('Couldn’t reach that site.', 'network');
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      clearTimeout(timer);
      url = assertPublicUrl(new URL(res.headers.get('location')!, url).toString());
      continue;
    }
    try {
      if (!res.ok) throw new FetchError(`The site answered with an error (${res.status}).`, 'http', res.status);
      const declared = Number(res.headers.get('content-length') ?? 0);
      if (declared > MAX_PAGE_BYTES) throw new FetchError('That page is too large to import.', 'too_large');
      const body = await readCapped(res, MAX_PAGE_BYTES);
      return { url: url.toString(), status: res.status, contentType: res.headers.get('content-type') ?? '', body };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new FetchError('That link redirects too many times.', 'http');
}

async function readCapped(res: Response, cap: number): Promise<string> {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel();
      break; // keep what we have: JSON-LD is usually near the top
    }
    chunks.push(value);
  }
  const all = new Uint8Array(Math.min(total, cap));
  let offset = 0;
  for (const c of chunks) {
    all.set(c.subarray(0, all.length - offset), offset);
    offset += c.byteLength;
    if (offset >= all.length) break;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(all);
}

/* ---------------- small HTML helpers (no DOM in edge runtimes) ---------------- */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', eacute: 'é', egrave: 'è', ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Text of an HTML fragment: tags removed, entities decoded, whitespace collapsed. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** <meta property|name="key" content="..."> values, first match wins. */
export function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const a = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${k}["'][^>]*content=["']([^"']*)["']`, 'i'));
    const b = a ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${k}["']`, 'i'));
    if (b?.[1]) return decodeEntities(b[1]).trim();
  }
  return null;
}

export function pageTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() || null : null;
}

/** Main readable text of a page, without headers, footers, navigation and comments. */
export function mainText(html: string): string {
  const article = html.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i)?.[2];
  const body = article ?? html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const trimmed = body.replace(/<(header|footer|nav|aside|form)[\s\S]*?<\/\1>/gi, ' ').replace(/<(div|section)[^>]+(?:comment|share|newsletter|related|sidebar)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  return htmlToText(trimmed);
}
