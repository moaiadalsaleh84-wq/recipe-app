/**
 * Amounts in recipes: scaling for the number of servings and kitchen-friendly display.
 * Kept free of app imports so it can be tested with plain Node (scripts/qty.test.ts).
 */

/** Keeps two decimals, so a scaled amount like 1/9 isn't flattened before it's displayed. */
export const roundQty = (n: number) => Math.round(n * 100) / 100;

const METRIC = ['g', 'ml'];
/** Fractions a cook can measure. Eighths only below 1; nobody measures "2⅛ cups". */
const SMALL: [number, string][] = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '1']];
const PARTS: [number, string][] = [[0, ''], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']];

const nearest = (n: number, list: [number, string][]) => list.reduce((best, f) => (Math.abs(f[0] - n) < Math.abs(best[0] - n) ? f : best));

/**
 * Kitchen-friendly display: grams and millilitres round to a sensible step; everything else
 * (spoons, counts, cups, oz) to the nearest fraction a cook can measure.
 */
export const formatQty = (quantity: number, unit: string) => {
  // 0 means the recipe gives no amount ("salt to taste").
  if (!(quantity > 0)) return '';
  let text: string;
  if (METRIC.includes(unit)) {
    const step = quantity >= 100 ? 5 : 1;
    text = String(Math.max(step, Math.round(quantity / step) * step));
  } else if (quantity < 1) {
    // Never show 0: the smallest amount shown is ⅛.
    text = nearest(quantity, SMALL)[1];
  } else if (quantity >= 10) {
    text = String(Math.round(quantity));
  } else {
    const whole = Math.floor(quantity);
    const [value, symbol] = nearest(quantity - whole, PARTS);
    text = value === 1 ? String(whole + 1) : `${whole}${symbol}`;
  }
  // The number and its unit never split across lines (a non-breaking space).
  return unit ? `${text}\u00A0${unit}` : text;
};

/**
 * "1 Eggs" reads wrong: for a single countable thing, drop the plural ("1 Egg", "1 Tomato").
 * Only used when there is no unit, so "1 tbsp Capers" stays as it is.
 */
export function nameFor(quantity: number, unit: string, name: string) {
  if (unit || formatQty(quantity, unit) !== '1') return name;
  if (/oes$/i.test(name)) return name.slice(0, -2);
  if (/ies$/i.test(name)) return `${name.slice(0, -3)}y`;
  if (/[^s]s$/i.test(name)) return name.slice(0, -1);
  return name;
}

/** "1¾" → "1 3/4": fractions as plain digits, so they have the same size and baseline as the rest. */
export const plainFractions = (s: string) =>
  s.replace(/(\d)?([⅛¼⅓½⅔¾])/g, (_, whole: string | undefined, f: string) => {
    const map: Record<string, string> = { '⅛': '1/8', '¼': '1/4', '⅓': '1/3', '½': '1/2', '⅔': '2/3', '¾': '3/4' };
    // "1 1/2" stays together on one line.
    return whole ? `${whole}\u00A0${map[f]}` : map[f];
  });

/** Things nobody uses half of: round to whole ones ("1 small clove", never "½ garlic clove"). */
const WHOLE_ONLY = /\b(eggs?|cloves?|buns?|slices?|sheets?|balls?|tortillas?|wraps?)\b/i;
/** Names that keep their capital after an amount. */
const PROPER = /^(Greek|Parmesan|Cheddar|Dijon|Worcestershire)\b/;

/**
 * An ingredient as a cook would say it: a practical amount, a unit or a word, and the name.
 *   (0.75, '', 'Red peppers')   → { amount: '3/4', text: 'red pepper' }
 *   (0.5, '', 'Garlic cloves')  → { amount: '1', text: 'small garlic clove' }
 *   (350, 'g', 'Chicken thighs') → { amount: '350 g', text: 'chicken thighs' }
 */
export function ingredientText(quantity: number, unit: string, name: string): { amount: string; text: string } {
  const lower = (n: string) => (PROPER.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1));
  if (!(quantity > 0)) return { amount: '', text: name };
  if (WHOLE_ONLY.test(`${unit} ${name}`) && !['g', 'ml'].includes(unit)) {
    const n = Math.max(1, Math.round(quantity));
    const small = quantity < n * 0.75;
    const base = lower(nameFor(n, unit, name));
    return { amount: unit ? `${n}\u00A0${unit}` : String(n), text: small ? `small ${base}` : base };
  }
  const amount = plainFractions(formatQty(quantity, unit));
  return { amount, text: lower(unit ? name : nameFor(quantity <= 1 ? 1 : quantity, unit, name)) };
}
