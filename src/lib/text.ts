/**
 * Joins the last two words with a non-breaking space, so a line never ends with one word
 * alone on the next line ("You're on / fire." becomes "You're / on fire."). Works on every
 * platform, unlike CSS-only fixes.
 */
export function noWidow(text: string) {
  const i = text.trimEnd().lastIndexOf(' ');
  if (i <= 0) return text;
  const last = text.slice(i + 1);
  const before = text.slice(0, i).trimEnd();
  const prev = before.slice(before.lastIndexOf(' ') + 1);
  // Long last words can wrap on their own without looking lonely. And a joined pair longer than
  // 16 letters could be wider than a narrow line at large text, which would split a word
  // ("everything unlo / cked"), so it isn't joined.
  return last.length > 14 || prev.length + 1 + last.length > 16 ? text : `${before}\u00A0${last}`;
}

/** A non-breaking space: the two sides always stay on the same line. */
export const NBSP = ' ';

/**
 * A number and its unit that never split across lines: nb(630, 'kcal') → "630 kcal", nb(2200, 'kcal') → "2,200 kcal",
 * nb(3, 'days') → "3 days". Use it everywhere a number is printed with a unit.
 */
export const nb = (n: number | string, unit: string) => `${num(n)}${NBSP}${unit}`;

/** Numbers from 1,000 up get a thousands separator: 2200 → "2,200". Strings pass through. */
export const num = (n: number | string) => (typeof n === 'number' && Math.abs(n) >= 1000 ? n.toLocaleString('en-US') : String(n));

/** A cooking time as words that never split: 30 → "30 min", 60 → "1 h", 65 → "1 h 5 min". */
export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return nb(m, 'min');
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${nb(h, 'h')}${NBSP}${nb(rest, 'min')}` : nb(h, 'h');
}

/** Units that must stay on the same line as the number before them ("1 minute", "200 °C"). */
const UNIT_AFTER_NUMBER = /(\d[\d.,/½¼¾⅓⅔]*) (minutes?|mins?|seconds?|secs?|hours?|hrs?|h|g|kg|ml|l|cm|mm|°[CF]|degrees|tbsp|tsp|cups?|oz|lb|pieces?|cloves?|slices?)(?=[\s.,;:!?)]|$)/g;

/**
 * Sentence text for display: a number never ends a line apart from its unit ("cook for 1 /
 * minute" can't happen), and the last word never sits alone (see noWidow).
 */
export function keepTogether(text: string) {
  return noWidow(text.replace(UNIT_AFTER_NUMBER, `$1${NBSP}$2`));
}
