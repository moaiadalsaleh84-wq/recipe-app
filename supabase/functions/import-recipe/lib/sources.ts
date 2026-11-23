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
import type { SourceCredit, SourceKind, SourceMaterial } from './types.ts';

export const MAX_TEXT_CHARS = 24_000;
export const MAX_PASTED_CHARS = 20_000;

export class SourceError extends Error {
  readonly code: 'invalid_input' | 'fetch_failed' | 'blocked' | 'no_text';
  readonly partial?: { title?: string; sourceUrl?: string; imageUrl?: string; credit?: SourceCredit };
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

/**
 * A video creator's credit from oEmbed: the handle from the profile link ("/@pastaqueen" →
 * "@pastaqueen"), else the author name as given. Only public oEmbed fields: no profile pictures.
 */
export function videoCredit(oembed: Record<string, unknown> | null): SourceCredit | undefined {
  const name = typeof oembed?.author_name === 'string' ? oembed.author_name.trim() : '';
  const raw = typeof oembed?.author_url === 'string' ? oembed.author_url.trim() : '';
  let profileUrl: string | null = null;
  let handle: string | null = null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      profileUrl = u.toString();
      const m = u.pathname.match(/^\/(@[\w.-]+)/);
      if (m) handle = decodeURIComponent(m[1]);
    }
  } catch {
    // no profile link
  }
  handle = handle ?? (name || null);
  return handle || profileUrl ? { handle, profileUrl, siteName: null } : undefined;
}

/** A website's credit: its og:site_name, else the host without "www.". */
export function siteCredit(html: string, host: string): SourceCredit {
  const name = metaContent(html, ['og:site_name', 'application-name'])?.trim();
  return { handle: null, profileUrl: null, siteName: name || host.replace(/^www\./, '') };
}

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
  const credit = siteCredit(page.body, host);
  if (structured && structured.ingredients.length && structured.steps.length) {
    return { kind: 'website', url: page.url, host, title, text: structuredAsText(structured), imageUrl, structured, credit };
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
    throw new SourceError('That page has almost no readable text. It may need a login or load the recipe with scripts.', 'no_text', { title: title ?? undefined, sourceUrl: page.url, imageUrl: imageUrl ?? undefined, credit }, 'website');
  }
  return { kind: 'website', url: page.url, host, title, text, imageUrl, structured, credit };
}

/* ---------------- TikTok ---------------- */

/**
 * The video's description from a TikTok page. The page embeds its data as JSON
 * (__UNIVERSAL_DATA_FOR_REHYDRATION__, older pages SIGI_STATE). The video's own "desc" comes
 * after "itemStruct" / "ItemModule"; other "desc" fields on the page belong to music or other videos.
 */
export function tikTokDescription(html: string): string | null {
  const read = (from: number) => {
    const m = html.slice(from).match(/"desc":"((?:[^"\\]|\\.)*)"/);
    if (!m) return null;
    try {
      return (JSON.parse(`"${m[1]}"`) as string).trim() || null;
    } catch {
      return null;
    }
  };
  for (const anchor of ['"itemStruct"', '"ItemModule"']) {
    const at = html.indexOf(anchor);
    if (at >= 0) {
      const d = read(at);
      if (d) return d;
    }
  }
  return null;
}

/**
 * When TikTok refuses oEmbed to the server: the creator from the video link itself
 * (tiktok.com/@handle/video/…) or the page's data ("uniqueId"), and the cover picture from the
 * page's data. Either may be missing; the app then asks TikTok from the phone.
 */
export function tikTokFallback(videoUrl: string, html: string | null): { credit?: SourceCredit; imageUrl: string | null } {
  const str = (key: string, from: number) => {
    if (!html || from < 0) return null;
    const m = html.slice(from).match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`));
    if (!m) return null;
    try {
      return (JSON.parse(`"${m[1]}"`) as string).trim() || null;
    } catch {
      return null;
    }
  };
  const item = html ? Math.max(html.indexOf('"itemStruct"'), html.indexOf('"ItemModule"')) : -1;
  let handle: string | null = null;
  try {
    const m = new URL(videoUrl).pathname.match(/^\/(@[\w.-]+)\//);
    if (m) handle = decodeURIComponent(m[1]);
  } catch {
    // not a full video link
  }
  if (!handle) {
    const id = str('uniqueId', item);
    if (id && /^[\w.-]+$/.test(id)) handle = `@${id}`;
  }
  let imageUrl = str('cover', item) ?? str('originCover', item) ?? str('dynamicCover', item);
  if (imageUrl && !/^https:\/\//.test(imageUrl)) imageUrl = null;
  return { credit: handle ? { handle, profileUrl: `https://www.tiktok.com/${handle}`, siteName: null } : undefined, imageUrl };
}

async function fromTikTok(url: URL, fetchImpl: Fetcher | undefined): Promise<SourceMaterial> {
  // Open the page too: it resolves share links (tiktok.com/t/…, vm.tiktok.com/…) to the real
  // video address, and usually carries the full description, which oEmbed may shorten.
  let page: { url: string; body: string } | null = null;
  let landed = url.toString();
  try {
    page = await safeFetch(url.toString(), { fetchImpl });
    landed = page.url;
  } catch (e) {
    // TikTok sometimes refuses servers; the redirect still tells us the full video link, and
    // oEmbed alone may still work.
    if (e instanceof FetchError && e.finalUrl) landed = e.finalUrl;
  }
  // oEmbed needs the full video link (tiktok.com/@user/video/123), not a vm.tiktok.com share link.
  const videoUrl = /\/video\/|\/photo\//.test(landed) ? landed.split('?')[0] : url.toString();
  const oembed = await getJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, fetchImpl);
  const fromOembed = typeof oembed?.title === 'string' ? oembed.title.trim() : '';
  const fromPage = page ? (tikTokDescription(page.body) ?? metaContent(page.body, ['og:description', 'description']) ?? '') : '';
  // Whichever source has more of the caption.
  const caption = fromPage.length > fromOembed.length ? fromPage : fromOembed;
  const author = typeof oembed?.author_name === 'string' ? oembed.author_name : null;
  // TikTok often refuses oEmbed to servers: fall back to the link and the page's own data.
  const fallback = tikTokFallback(videoUrl, page?.body ?? null);
  const credit = videoCredit(oembed) ?? fallback.credit;
  const imageUrl = (typeof oembed?.thumbnail_url === 'string' ? oembed.thumbnail_url : null) ?? (page ? metaContent(page.body, ['og:image']) : null) ?? fallback.imageUrl;
  if (!oembed && !caption) throw new SourceError('TikTok didn’t share this video’s details. It may be private or deleted.', 'fetch_failed', { sourceUrl: videoUrl }, 'tiktok');
  if (caption.length < 40) {
    throw new SourceError(
      'We couldn’t read a recipe in this TikTok’s caption, and we can’t watch videos. If the recipe is in the caption, copy it in TikTok and paste it here.',
      'no_text',
      { title: caption || undefined, sourceUrl: videoUrl, imageUrl: imageUrl ?? undefined, credit },
      'tiktok',
    );
  }
  return { kind: 'tiktok', url: videoUrl, host: 'tiktok.com', title: null, text: `TikTok caption${author ? ` by ${author}` : ''}:\n${caption}`, imageUrl, structured: null, credit };
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
  const credit = videoCredit(oembed);
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
      { title: title ?? undefined, sourceUrl: watch, imageUrl: imageUrl ?? undefined, credit },
      'youtube',
    );
  }
  return { kind: 'youtube', url: watch, host: 'youtube.com', title, text: `YouTube video title: ${title ?? 'unknown'}\nDescription:\n${description}`, imageUrl, structured: null, credit };
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

/* ---------------- preview (no AI) ---------------- */

export type SourcePreview = { kind: SourceKind; sourceUrl: string; title: string | null; imageUrl: string | null; credit: SourceCredit | null };

/**
 * What the loading screen shows right away, before the recipe is read: the picture, the creator
 * and the full link. Public metadata only (oEmbed, og: tags); no AI, no video.
 */
export async function previewSource(input: string, fetchImpl?: Fetcher): Promise<SourcePreview | null> {
  const raw = findUrl(input);
  if (!raw) return null;
  let url: URL;
  try {
    url = assertPublicUrl(raw);
  } catch {
    return null;
  }
  const kind = kindOf(url.hostname);
  try {
    if (kind === 'tiktok') {
      let landed = url.toString();
      let body: string | null = null;
      try {
        const page = await safeFetch(url.toString(), { fetchImpl });
        landed = page.url;
        body = page.body;
      } catch (e) {
        if (e instanceof FetchError && e.finalUrl) landed = e.finalUrl;
      }
      const videoUrl = /\/video\/|\/photo\//.test(landed) ? landed.split('?')[0] : url.toString();
      const o = await getJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, fetchImpl);
      const fallback = tikTokFallback(videoUrl, body);
      return {
        kind,
        sourceUrl: videoUrl,
        title: typeof o?.title === 'string' ? o.title : null,
        imageUrl: (typeof o?.thumbnail_url === 'string' ? o.thumbnail_url : null) ?? (body ? metaContent(body, ['og:image']) : null) ?? fallback.imageUrl,
        credit: videoCredit(o) ?? fallback.credit ?? null,
      };
    }
    if (kind === 'youtube') {
      const id = youTubeId(url);
      if (!id) return null;
      const watch = `https://www.youtube.com/watch?v=${id}`;
      const o = await getJson(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, fetchImpl);
      return { kind, sourceUrl: watch, title: typeof o?.title === 'string' ? o.title : null, imageUrl: typeof o?.thumbnail_url === 'string' ? o.thumbnail_url : null, credit: videoCredit(o) ?? null };
    }
    const page = await safeFetch(url.toString(), { fetchImpl });
    const host = new URL(page.url).hostname;
    const structured = recipeFromHtml(page.body);
    return {
      kind,
      sourceUrl: page.url,
      title: structured?.title ?? metaContent(page.body, ['og:title']) ?? pageTitle(page.body),
      imageUrl: structured?.imageUrl ?? metaContent(page.body, ['og:image', 'twitter:image']),
      credit: siteCredit(page.body, host),
    };
  } catch {
    return null;
  }
}
