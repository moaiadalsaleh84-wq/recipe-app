/**
 * Turns a link (or pasted text) into SourceMaterial: what we actually know about the recipe.
 *
 * - Recipe websites: schema.org JSON-LD first, page text as a fallback.
 * - TikTok / YouTube: the public oEmbed endpoint (caption / title) plus public page metadata.
 * - Instagram: public page metadata only. Instagram often hides it behind a login.
 *
 * Videos themselves are never watched: if the caption or description doesn't contain the
 * recipe, there is nothing honest to import, and we say so.
 */
import { FetchError, assertPublicUrl, mainText, metaContent, pageTitle, safeFetch } from './http.ts';
import { recipeFromHtml, structuredAsText } from './jsonld.ts';
import type { SourceKind, SourceMaterial } from './types.ts';

export const MAX_TEXT_CHARS = 24_000;
export const MAX_PASTED_CHARS = 20_000;

export class SourceError extends Error {
  readonly code: 'invalid_input' | 'fetch_failed' | 'blocked' | 'no_text';
  readonly partial?: { title?: string; sourceUrl?: string; imageUrl?: string };
  readonly kind?: SourceKind;
  constructor(message: string, code: SourceError['code'], partial?: SourceError['partial'], kind?: SourceKind) {
    super(message);
    this.code = code;
    this.partial = partial;
    this.kind = kind;
  }
}

export function kindOf(host: string): SourceKind {
  const h = host.toLowerCase().replace(/^www\.|^m\./, '');
  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return 'tiktok';
  if (h === 'instagram.com' || h.endsWith('.instagram.com') || h === 'instagr.am') return 'instagram';
  if (h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be') return 'youtube';
  return 'website';
}

/** Pull the first http(s) link out of whatever was pasted ("Check this out! https://…"). */
export function findUrl(input: string): string | null {
  const m = input.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0].replace(/[),.;!?]+$/, '');
  const bare = input.trim().match(/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*$/i);
  return bare ? `https://${bare[0]}` : null;
}

type Fetcher = typeof fetch;

export async function gatherSource(input: { url?: string; text?: string }, fetchImpl?: Fetcher): Promise<{ material: SourceMaterial; warnings: string[] }> {
  const warnings: string[] = [];
  const rawUrl = input.url?.trim() ? findUrl(input.url) : null;

  if (!rawUrl) {
    const text = (input.text ?? input.url ?? '').trim();
    if (text.length < 20) throw new SourceError('Paste a link to a recipe, or the recipe text itself.', 'invalid_input');
    if (text.length > MAX_PASTED_CHARS) throw new SourceError(`That text is too long. Paste up to ${MAX_PASTED_CHARS.toLocaleString('en-US')} characters.`, 'invalid_input');
    return { material: { kind: 'text', url: null, host: null, title: null, text, imageUrl: null, structured: null }, warnings };
  }

  let url: URL;
  try {
    url = assertPublicUrl(rawUrl);
  } catch (e) {
    throw new SourceError((e as Error).message, 'invalid_input');
  }
  const kind = kindOf(url.hostname);
  const extra = input.text?.trim() ? `\n\nText the user pasted with the link:\n${input.text.trim().slice(0, MAX_PASTED_CHARS)}` : '';

  try {
    if (kind === 'tiktok') return withExtra(await fromTikTok(url, fetchImpl), extra, warnings);
    if (kind === 'youtube') return withExtra(await fromYouTube(url, fetchImpl), extra, warnings);
    if (kind === 'instagram') return withExtra(await fromInstagram(url, fetchImpl), extra, warnings);
    return withExtra(await fromWebsite(url, fetchImpl, warnings), extra, warnings);
  } catch (e) {
    if (e instanceof SourceError) {
      // If the user pasted a caption along with the link, we can still work from that.
      if (extra && e.code !== 'invalid_input') {
        warnings.push(`${e.message} Using the text you pasted instead.`);
        return {
          material: { kind, url: url.toString(), host: url.hostname, title: e.partial?.title ?? null, text: input.text!.trim(), imageUrl: e.partial?.imageUrl ?? null, structured: null },
          warnings,
        };
      }
      throw e;
    }
    if (e instanceof FetchError) {
      const blocked = e.kind === 'http' && (e.status === 401 || e.status === 403 || e.status === 429);
      throw new SourceError(
        blocked ? `${url.hostname} didn’t let us read that page. Try pasting the recipe text instead.` : `${e.message} Check the link and try again.`,
        blocked ? 'blocked' : e.kind === 'invalid_url' || e.kind === 'blocked_host' ? 'invalid_input' : 'fetch_failed',
        { sourceUrl: url.toString() },
        kind,
      );
    }
    throw e;
  }
}

function withExtra(m: SourceMaterial, extra: string, warnings: string[]) {
  return { material: extra ? { ...m, text: m.text + extra } : m, warnings };
}

/* ---------------- websites ---------------- */

async function fromWebsite(url: URL, fetchImpl: Fetcher | undefined, warnings: string[]): Promise<SourceMaterial> {
  const page = await safeFetch(url.toString(), { fetchImpl });
  const host = new URL(page.url).hostname;
  const structured = recipeFromHtml(page.body);
  const imageUrl = structured?.imageUrl ?? metaContent(page.body, ['og:image', 'twitter:image']);
  const title = structured?.title ?? metaContent(page.body, ['og:title']) ?? pageTitle(page.body);
  if (structured && structured.ingredients.length && structured.steps.length) {
    return { kind: 'website', url: page.url, host, title, text: structuredAsText(structured), imageUrl, structured };
  }
  // No (complete) structured data: read the page itself.
  let text = mainText(page.body);
  if (text.length > MAX_TEXT_CHARS) {
    const at = text.search(/\bingredients\b/i);
    const start = at > 2000 ? at - 2000 : 0;
    text = text.slice(start, start + MAX_TEXT_CHARS);
    warnings.push('This page is very long, so only the part around the ingredients was read.');
  }
  if (structured) text = `${structuredAsText(structured)}\n\nPage text:\n${text}`;
  if (text.replace(/\s/g, '').length < 80) {
    throw new SourceError('That page has almost no readable text. It may need a login or load the recipe with scripts.', 'no_text', { title: title ?? undefined, sourceUrl: page.url, imageUrl: imageUrl ?? undefined }, 'website');
  }
  return { kind: 'website', url: page.url, host, title, text, imageUrl, structured };
}

/* ---------------- TikTok ---------------- */

async function fromTikTok(url: URL, fetchImpl: Fetcher | undefined): Promise<SourceMaterial> {
  const oembed = await getJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`, fetchImpl);
  const caption = typeof oembed?.title === 'string' ? oembed.title.trim() : '';
  const author = typeof oembed?.author_name === 'string' ? oembed.author_name : null;
  const imageUrl = typeof oembed?.thumbnail_url === 'string' ? oembed.thumbnail_url : null;
  if (!oembed) throw new SourceError('TikTok didn’t share this video’s details. It may be private or deleted.', 'fetch_failed', { sourceUrl: url.toString() }, 'tiktok');
  if (caption.length < 40) {
    throw new SourceError(
      'This TikTok’s caption doesn’t include the recipe, and we can’t watch videos. Paste the recipe text if the creator shared it elsewhere.',
      'no_text',
      { title: caption || undefined, sourceUrl: url.toString(), imageUrl: imageUrl ?? undefined },
      'tiktok',
    );
  }
  return { kind: 'tiktok', url: url.toString(), host: 'tiktok.com', title: null, text: `TikTok caption${author ? ` by ${author}` : ''}:\n${caption}`, imageUrl, structured: null };
}

/* ---------------- YouTube ---------------- */

export function youTubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  const v = url.searchParams.get('v');
  if (v) return v;
  const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
  return m ? m[1] : null;
}

/** The full video description from the watch page's embedded player data. */
export function youTubeDescription(html: string): string | null {
  const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  if (!m) return null;
  try {
    return (JSON.parse(`"${m[1]}"`) as string).trim() || null;
  } catch {
    return null;
  }
}

async function fromYouTube(url: URL, fetchImpl: Fetcher | undefined): Promise<SourceMaterial> {
  const id = youTubeId(url);
  if (!id) throw new SourceError('That YouTube link doesn’t point to a video.', 'invalid_input', undefined, 'youtube');
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const oembed = await getJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, fetchImpl);
  const title = typeof oembed?.title === 'string' ? oembed.title : null;
  const imageUrl = typeof oembed?.thumbnail_url === 'string' ? oembed.thumbnail_url : null;
  let description: string | null = null;
  try {
    const page = await safeFetch(watch, { fetchImpl });
    description = youTubeDescription(page.body) ?? metaContent(page.body, ['og:description', 'description']);
  } catch {
    // fall through: oEmbed alone has no recipe
  }
  if (!oembed && !description) throw new SourceError('YouTube didn’t share this video’s details. It may be private or removed.', 'fetch_failed', { sourceUrl: watch }, 'youtube');
  if (!description || description.length < 60) {
    throw new SourceError(
      'This video’s description doesn’t include the recipe, and we can’t watch videos. If the creator links a recipe page, import that link instead.',
      'no_text',
      { title: title ?? undefined, sourceUrl: watch, imageUrl: imageUrl ?? undefined },
      'youtube',
    );
  }
  return { kind: 'youtube', url: watch, host: 'youtube.com', title, text: `YouTube video title: ${title ?? 'unknown'}\nDescription:\n${description}`, imageUrl, structured: null };
}

/* ---------------- Instagram ---------------- */

/** og:description looks like: 1,234 likes, 56 comments - user on May 1, 2025: "caption". */
export function instagramCaption(desc: string): string {
  const m = desc.match(/^[\d.,\s]+\w*\s*likes?,[\s\S]*?:\s*["“]([\s\S]*)["”]\.?\s*$/i);
  return (m ? m[1] : desc).trim();
}

async function fromInstagram(url: URL, fetchImpl: Fetcher | undefined): Promise<SourceMaterial> {
  const page = await safeFetch(url.toString(), { fetchImpl });
  const desc = metaContent(page.body, ['og:description', 'description']);
  const imageUrl = metaContent(page.body, ['og:image']);
  const title = metaContent(page.body, ['og:title']);
  const caption = desc ? instagramCaption(desc) : '';
  if (!desc || (/log ?in|sign up/i.test(pageTitle(page.body) ?? '') && caption.length < 40)) {
    throw new SourceError('Instagram didn’t show us this post without a login. Copy the caption in Instagram and paste it here instead.', 'blocked', { sourceUrl: url.toString(), imageUrl: imageUrl ?? undefined }, 'instagram');
  }
  if (caption.length < 40) {
    throw new SourceError('This post’s caption doesn’t include the recipe, and we can’t watch videos.', 'no_text', { title: title ?? undefined, sourceUrl: url.toString(), imageUrl: imageUrl ?? undefined }, 'instagram');
  }
  return { kind: 'instagram', url: url.toString(), host: 'instagram.com', title: null, text: `Instagram caption:\n${caption}`, imageUrl, structured: null };
}

async function getJson(url: string, fetchImpl: Fetcher | undefined): Promise<Record<string, unknown> | null> {
  try {
    const res = await safeFetch(url, { fetchImpl, accept: 'application/json' });
    return JSON.parse(res.body) as Record<string, unknown>;
  } catch {
    return null;
  }
}
