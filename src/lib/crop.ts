/**
 * Centered crop rectangles for imported pictures. Pure (no app imports), so it's tested in plain Node.
 */
export type Rect = { originX: number; originY: number; width: number; height: number };

/** The largest rectangle with this aspect ratio (width / height) that fits the image, centered. */
export function centerCrop(width: number, height: number, aspect: number): Rect {
  let w = width;
  let h = Math.round(width / aspect);
  if (h > height) {
    h = height;
    w = Math.round(height * aspect);
  }
  return { originX: Math.floor((width - w) / 2), originY: Math.floor((height - h) / 2), width: w, height: h };
}

/** Compression levels tried in turn until a WebP is under the size limit. */
export const WEBP_QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4] as const;
/** Imported pictures are kept under 300 KB each. */
export const MAX_PICTURE_BYTES = 300 * 1024;

/** A crop as fractions of the photo (0–1): which part a 4:3 card shows. */
export type CropFrac = { x: number; y: number; w: number; h: number };

/**
 * The 4:3 part of a photo with aspect `aspect` (width / height), zoomed in `zoom` times (1 = as big
 * as fits), centered on (cx, cy) as fractions. Always inside the photo.
 */
export function cardCrop(aspect: number, zoom: number, cx = 0.5, cy = 0.5, frame = 4 / 3): CropFrac {
  const z = Math.max(1, zoom);
  let w = aspect > frame ? frame / aspect : 1;
  let h = aspect > frame ? 1 : aspect / frame;
  w /= z;
  h /= z;
  const clamp = (v: number, size: number) => Math.min(1 - size, Math.max(0, v - size / 2));
  const r = (v: number) => Math.round(v * 10000) / 10000;
  return { x: r(clamp(cx, w)), y: r(clamp(cy, h)), w: r(w), h: r(h) };
}

/** The crop moved by a drag of (dx, dy) points on a frame `frameWidth` wide (the photo follows the finger). */
export function dragCrop(c: CropFrac, dx: number, dy: number, frameWidth: number, frame = 4 / 3): CropFrac {
  const frameHeight = frameWidth / frame;
  const cx = c.x + c.w / 2 - (dx / frameWidth) * c.w;
  const cy = c.y + c.h / 2 - (dy / frameHeight) * c.h;
  const x = Math.min(1 - c.w, Math.max(0, cx - c.w / 2));
  const y = Math.min(1 - c.h, Math.max(0, cy - c.h / 2));
  return { ...c, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 };
}
