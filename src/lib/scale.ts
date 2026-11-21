/**
 * THE scaling and display rules for ingredient amounts, used everywhere amounts appear: the recipe
 * page, Get ready, cook steps, the shopping list and the meal plan.
 *
 *   scaled = quantity × servings / baseServings   (full precision; rounding happens only when shown)
 *
 * Rounding is always half-up: Math.floor(x + 0.5). Never banker's rounding.
 *
 * Metric display
 *   g / ml:  under 10 → nearest 1 · 10–250 → nearest 5 · over 250 → nearest 10 ·
 *            1000+ → kg / l with up to 2 decimals ("1.05 kg"). kg / l in data are converted first.
 *   tsp / tbsp: worked out in teaspoons (1 tbsp = 3 tsp). Under 3 tsp → tsp, else tbsp, as the
 *            nearest kitchen fraction (¼ ⅓ ½ ⅔ ¾). Never 0 (minimum ¼).
 *   counts:  eggs, avocado, lime, tomato, onion → nearest ½ (minimum ½). Everything else
 *            (tortillas, buns, wraps, pita, slices, cloves, green onions…) → whole, minimum 1.
 *            Units read "1 clove", "2 cloves"; "piece" isn't shown.
 *   pinch / to taste (quantity null, or unit "pinch"): never scaled, no number.
 * US display (from the precise metric value, then rounded)
 *   1 cup = 240 ml · 1 tbsp = 15 ml · 1 tsp = 5 ml · 1 oz = 28.35 g · 1 lb = 453.6 g.
 *   Under 60 ml → spoons (the tsp/tbsp rule) · 60 ml and up → cups. Under 1 lb → oz · else lb.
 *   oz, lb and cups show the nearest kitchen fraction.
 * Times, temperatures, timers and nutrition per serving never change with servings.
 *
 * Pure (no app imports), so scripts/scale.test.ts runs it in plain Node.
 */

export type Units = 'metric' | 'us';
type Amount = { quantity: number | null; unit: string; name: string };

/** Half-up rounding: 2.5 → 3, 0.125 × 2 → … always up on a tie. */
export const halfUp = (x: number) => Math.floor(x + 0.5);
const roundTo = (x: number, step: number) => halfUp(x / step) * step;

/** quantity × servings / baseServings, unrounded. null (pinch / to taste) stays null. */
export function scaleQuantity(quantity: number | null, servings: number, baseServings: number): number | null {
  if (quantity == null) return null;
  if (!(baseServings > 0)) return quantity;
  return (quantity * servings) / baseServings;
}

/* ---------------- units ---------------- */

const unitKey = (u: string) => u.trim().toLowerCase().replace(/\.$/, '');
const MASS: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, oz: 28.35, lb: 453.6, lbs: 453.6 };
const VOLUME: Record<string, number> = { ml: 1, l: 1000, litre: 1000, liter: 1000, cup: 240, cups: 240 };
const SPOON: Record<string, number> = { tsp: 1, teaspoon: 1, teaspoons: 1, tbsp: 3, tablespoon: 3, tablespoons: 3 };
/** Count units shown as a word, singular → plural. "piece" is understood but never shown. */
const COUNT_WORDS: Record<string, [string, string]> = {
  clove: ['clove', 'cloves'],
  cloves: ['clove', 'cloves'],
  slice: ['slice', 'slices'],
  slices: ['slice', 'slices'],
  sheet: ['sheet', 'sheets'],
  sheets: ['sheet', 'sheets'],
  ball: ['ball', 'balls'],
  balls: ['ball', 'balls'],
  bunch: ['bunch', 'bunches'],
  bunches: ['bunch', 'bunches'],
  can: ['can', 'cans'],
  cans: ['can', 'cans'],
};
const HIDDEN_COUNT = new Set(['', 'piece', 'pieces', 'pc', 'pcs', 'whole']);
const NO_AMOUNT = new Set(['pinch', 'to taste', 'dash']);

export type Family = 'mass' | 'volume' | 'spoon' | 'count' | 'none';

/** Which kind of amount a unit is, and its size in the family's base unit (g, ml, tsp, or 1 for counts). */
export function unitInfo(unit: string): { family: Family; factor: number; base: string } {
  const u = unitKey(unit);
  if (NO_AMOUNT.has(u)) return { family: 'none', factor: 1, base: u };
  if (u in MASS) return { family: 'mass', factor: MASS[u], base: 'g' };
  if (u in VOLUME) return { family: 'volume', factor: VOLUME[u], base: 'ml' };
  if (u in SPOON) return { family: 'spoon', factor: SPOON[u], base: 'tsp' };
  return { family: 'count', factor: 1, base: HIDDEN_COUNT.has(u) ? '' : (COUNT_WORDS[u]?.[0] ?? u) };
}

/* ---------------- fractions ---------------- */

const FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [1, ''],
];

/** The nearest kitchen fraction ("1½", "¾"), never 0: the smallest shown is ¼. Ties go up. */
export function kitchenFraction(v: number): { value: number; text: string } {
  let whole = Math.floor(v);
  const rest = v - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - rest) <= Math.abs(best[0] - rest) + 1e-9) best = f;
  if (best[0] === 1) {
    whole += 1;
    best = FRACTIONS[0];
  }
  if (whole === 0 && best[0] === 0) best = FRACTIONS[1]; // never 0
  const value = whole + best[0];
  return { value, text: whole === 0 ? best[1] : `${whole}${best[1]}` };
}

/** Halves for counts: "1½", minimum ½. */
function halves(v: number): string {
  const h = Math.max(0.5, halfUp(v * 2) / 2);
  const whole = Math.floor(h);
  return h - whole ? (whole ? `${whole}½` : '½') : String(whole);
}

/* ---------------- display ---------------- */

/** Things you can use half of. "Green onions" are whole (a bunch of stems), so they're excluded. */
const HALVES = /\b(eggs?|avocados?|limes?|tomato(es)?|onions?)\b/i;
const isHalvable = (name: string) => HALVES.test(name) && !/\b(green|spring)\s+onions?\b/i.test(name);

/** "30 g", "1.05 kg", "15 ml". value in g or ml. */
function metricMass(g: number, small: string, big: string): { qty: string; unit: string } {
  let r = g < 10 ? Math.max(1, halfUp(g)) : g <= 250 ? roundTo(g, 5) : roundTo(g, 10);
  if (g >= 1000 || r >= 1000) {
    r = halfUp((g / 1000) * 100) / 100;
    return { qty: String(r), unit: big };
  }
  return { qty: String(r), unit: small };
}

/** tsp under 3, tbsp from 3 tsp up, as a kitchen fraction. value in tsp. */
function spoons(tsp: number): { qty: string; unit: string } {
  const asTsp = kitchenFraction(tsp);
  if (asTsp.value < 3) return { qty: asTsp.text, unit: 'tsp' };
  return { qty: kitchenFraction(tsp / 3).text, unit: 'tbsp' };
}

export type Shown = {
  /** "30", "½", "1½", or "" when there's no number (pinch / to taste). */
  qty: string;
  /** "g", "tbsp", "cloves", "pinch", or "" for plain counts. */
  unit: string;
  /** Number and unit together, joined by a non-breaking space: "30 g", "1½", "pinch". */
  text: string;
};

const join = (qty: string, unit: string): Shown => ({ qty, unit, text: qty && unit ? `${qty} ${unit}` : qty || unit });

/**
 * How an (already scaled, unrounded) amount is shown. This is the only place amounts are rounded.
 */
export function showAmount(value: number | null, unit: string, name: string, units: Units = 'metric'): Shown {
  const info = unitInfo(unit);
  if (value == null || info.family === 'none' || !(value > 0)) return join('', info.family === 'none' ? unitKey(unit) : value == null ? 'pinch' : '');
  const base = value * info.factor;
  if (info.family === 'mass') {
    if (units === 'us') return base < 453.6 ? join(kitchenFraction(base / 28.35).text, 'oz') : join(kitchenFraction(base / 453.6).text, 'lb');
    const m = metricMass(base, 'g', 'kg');
    return join(m.qty, m.unit);
  }
  if (info.family === 'volume') {
    if (units === 'us') {
      if (base < 60) {
        const s = spoons(base / 5);
        return join(s.qty, s.unit);
      }
      const c = kitchenFraction(base / 240);
      return join(c.text, c.value > 1 ? 'cups' : 'cup');
    }
    const m = metricMass(base, 'ml', 'l');
    return join(m.qty, m.unit);
  }
  if (info.family === 'spoon') {
    const s = spoons(base);
    return join(s.qty, s.unit);
  }
  // Counts
  const qty = isHalvable(name) ? halves(base) : String(Math.max(1, halfUp(base)));
  const words = COUNT_WORDS[unitKey(unit)];
  const n = Number(qty.replace('½', '.5')) || 0.5;
  const word = words ? (n > 1 ? words[1] : words[0]) : '';
  return join(qty, word);
}

/** One ingredient, scaled for `servings` and shown in `units`. */
export function amountFor(ing: Amount, servings: number, baseServings: number, units: Units = 'metric'): Shown {
  return showAmount(scaleQuantity(ing.quantity, servings, baseServings), ing.unit, ing.name, units);
}

/* ---------------- shopping list ---------------- */

/**
 * Adds an amount onto another of the same ingredient: both are converted to the family's base unit
 * (g, ml, tsp, or the count unit), added at full precision, and rounded once, when shown.
 * Returns null when they can't be combined (different kinds, or a pinch with a number).
 */
export function combine(a: { quantity: number | null; unit: string }, b: { quantity: number | null; unit: string }): { quantity: number; unit: string } | null {
  if (a.quantity == null || b.quantity == null) return null;
  const ia = unitInfo(a.unit);
  const ib = unitInfo(b.unit);
  if (ia.family === 'none' || ib.family === 'none') return null;
  // Spoons and ml are both volume: tsp go into ml (1 tsp = 5 ml) when mixed.
  const vol = (i: ReturnType<typeof unitInfo>) => (i.family === 'spoon' ? { family: 'volume' as Family, factor: i.factor * 5, base: 'ml' } : i);
  const [x, y] = ia.family !== ib.family && (ia.family === 'spoon' || ib.family === 'spoon') ? [vol(ia), vol(ib)] : [ia, ib];
  if (x.family !== y.family || x.base !== y.base) return null;
  return { quantity: a.quantity * x.factor + b.quantity * y.factor, unit: x.base };
}

/* ---------------- names ---------------- */

/** Names that keep their capital after an amount. */
const PROPER = /^(Greek|Parmesan|Cheddar|Dijon|Worcestershire|Thai|Italian)\b/;

/**
 * The ingredient's name next to its amount: singular for one plain countable thing ("1 Lime",
 * not "1 Limes"); lower-case inside a sentence-style row unless it's a proper name ("120 g sour
 * cream", "40 g Grated parmesan" stays "grated parmesan", "Greek yogurt" keeps its capital).
 */
export function ingredientLabel(name: string, shown: Shown, opts: { lowercase?: boolean } = {}) {
  let n = name;
  if (!shown.unit && (shown.qty === '1' || shown.qty === '½')) {
    if (/oes$/i.test(n)) n = n.slice(0, -2);
    else if (/ies$/i.test(n)) n = `${n.slice(0, -3)}y`;
    else if (/[^s]s$/i.test(n)) n = n.slice(0, -1);
  }
  return opts.lowercase && !PROPER.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
}
