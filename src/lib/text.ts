/**
 * Joins the last two words with a non-breaking space, so a line never ends with one word
 * alone on the next line ("You're on / fire." becomes "You're / on fire."). Works on every
 * platform, unlike CSS-only fixes.
 */
export function noWidow(text: string) {
  const i = text.trimEnd().lastIndexOf(' ');
  if (i <= 0) return text;
  const last = text.slice(i + 1);
  // Long last words can wrap on their own without looking lonely.
  return last.length > 14 ? text : `${text.slice(0, i)} ${last}`;
}

/** A non-breaking space: the two sides always stay on the same line. */
export const NBSP = ' ';

/**
 * A number and its unit that never split across lines: nb(630, 'kcal') → "630 kcal",
 * nb(3, 'days') → "3 days". Use it everywhere a number is printed with a unit.
 */
export const nb = (n: number | string, unit: string) => `${n}${NBSP}${unit}`;
