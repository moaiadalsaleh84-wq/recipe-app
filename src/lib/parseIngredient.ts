import type { Aisle, Ingredient } from '../data/mock';

const UNITS: Record<string, { unit: string; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  gram: { unit: 'g', factor: 1 },
  grams: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  ml: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
  litre: { unit: 'ml', factor: 1000 },
  liter: { unit: 'ml', factor: 1000 },
  tbsp: { unit: 'tbsp', factor: 1 },
  tablespoon: { unit: 'tbsp', factor: 1 },
  tablespoons: { unit: 'tbsp', factor: 1 },
  tsp: { unit: 'tsp', factor: 1 },
  teaspoon: { unit: 'tsp', factor: 1 },
  teaspoons: { unit: 'tsp', factor: 1 },
  cup: { unit: 'cups', factor: 1 },
  cups: { unit: 'cups', factor: 1 },
  oz: { unit: 'oz', factor: 1 },
  lb: { unit: 'lb', factor: 1 },
  pinch: { unit: 'pinch', factor: 1 },
  bunch: { unit: 'bunch', factor: 1 },
  can: { unit: 'cans', factor: 1 },
  cans: { unit: 'cans', factor: 1 },
  clove: { unit: 'cloves', factor: 1 },
  cloves: { unit: 'cloves', factor: 1 },
  slice: { unit: 'slices', factor: 1 },
  slices: { unit: 'slices', factor: 1 },
};

const AISLES: [Aisle, RegExp][] = [
  ['Pantry', /coconut milk|coconut cream/i],
  ['Meat & Fish', /chicken|beef|pork|lamb|mince|bacon|sausage|salmon|tuna|fish|prawn|shrimp|turkey/i],
  ['Dairy & Eggs', /milk|cheese|butter|cream|yog(h)?urt|egg|feta|parmesan|mozzarella|cheddar/i],
  ['Bakery', /bread|bun|bagel|tortilla|wrap|pita|flatbread|pastry|dough|croissant/i],
  ['Produce', /onion|garlic|tomato|pepper|carrot|potato|lettuce|spinach|basil|parsley|coriander|cilantro|lemon|lime|apple|banana|berr|mushroom|courgette|zucchini|cucumber|avocado|ginger|herb|kale|broccoli|pea|bean sprout/i],
  ['Pantry', /flour|sugar|salt|oil|rice|pasta|spaghetti|penne|noodle|stock|sauce|vinegar|spice|cumin|paprika|cinnamon|honey|oats|lentil|chickpea|bean|tin|can|cocoa|chocolate|vanilla|baking/i],
];

const fraction = (s: string) => {
  const map: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  if (map[s] !== undefined) return map[s];
  if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : NaN;
  }
  return Number(s.replace(',', '.'));
};

/** "200 g flour" → { quantity: 200, unit: 'g', name: 'Flour' }. Lines without a number get quantity 0 (no amount, e.g. "salt to taste"). */
export function parseIngredient(line: string, index: number): Ingredient | null {
  const text = line.trim().replace(/^[-•*]\s*/, '');
  if (!text) return null;
  // Mixed and plain fractions first, so "1/2" isn't read as "1".
  const m = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])\s*([a-zA-Z]+\.?)?\s*(?:of\s+)?(.*)$/);
  let quantity = 0;
  let unit = '';
  let name = text;
  if (m) {
    const parts = m[1].split(/\s+/);
    quantity = parts.reduce((sum, p) => sum + fraction(p), 0);
    const maybeUnit = (m[2] ?? '').toLowerCase().replace('.', '');
    const known = UNITS[maybeUnit];
    if (known) {
      unit = known.unit;
      quantity *= known.factor;
      name = m[3];
    } else {
      name = `${m[2] ?? ''} ${m[3]}`.trim();
    }
  }
  if (m && (!Number.isFinite(quantity) || quantity <= 0)) quantity = 1;
  name = name.trim() || text;
  name = name.charAt(0).toUpperCase() + name.slice(1);
  const aisle = aisleFor(name);
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}-${index}`;
  return { id, name, quantity, unit, aisle };
}

/** Which grocery aisle an ingredient belongs in. */
export const aisleFor = (name: string): Aisle => AISLES.find(([, re]) => re.test(name))?.[0] ?? 'Other';
