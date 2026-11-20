/**
 * Size of the 7 week circles on the You tab: 32pt with at least 8pt between them. If that doesn't
 * fit the width, the circles shrink so they still never touch: size × 7 + 6 × 8 ≤ width.
 */
export const DOT_GAP = 8;
export function weekDotSize(available: number, preferred = 32) {
  return Math.max(16, Math.min(preferred, Math.floor((available - 6 * DOT_GAP) / 7)));
}
