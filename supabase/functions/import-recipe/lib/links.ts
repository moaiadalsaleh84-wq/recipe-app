/**
 * Recipe links in one form, the key for reusing imports (shared_recipes) and for Discover.
 * Same rules as the app (src/lib/sourceLink.ts); scripts/links.test.ts keeps the two in step.
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

/** Share links that must be followed (fetched) before they can be compared. */
export const isShortLink = (url: string) => /^https?:\/\/(vm|vt)\.tiktok\.com\/|^https?:\/\/(www\.)?tiktok\.com\/t\/|^https?:\/\/(pin\.it|bit\.ly|tinyurl\.com|t\.co)\//i.test(url.trim());
