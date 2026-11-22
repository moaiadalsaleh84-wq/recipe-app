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
