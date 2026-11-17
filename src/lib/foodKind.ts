/**
 * Which picture an ingredient gets (see components/FoodIcon). Kept free of app imports so it can
 * be tested with plain Node (scripts/foodKind.test.ts).
 */
export type FoodKind =
  | 'tomato' | 'pepper' | 'carrot' | 'onion' | 'garlic' | 'potato' | 'mushroom' | 'lemon' | 'apple' | 'strawberry' | 'raspberry'
  | 'herb' | 'cabbage' | 'peas' | 'egg' | 'milk' | 'cream' | 'yogurt' | 'butter' | 'cheese' | 'chicken' | 'mince' | 'fish'
  | 'penne' | 'spaghetti' | 'rice' | 'flour' | 'sugar' | 'cocoa' | 'oil' | 'soy' | 'passata' | 'spice' | 'cinnamon' | 'vanilla'
  | 'bread' | 'bun' | 'pastry' | 'cake' | 'dough' | 'batter' | 'coffee' | 'mayo' | 'honey'
  // Neutral pictures for a whole aisle
  | 'produce' | 'dairy' | 'meat' | 'bakery' | 'pantry' | 'basket';

/** Most specific first. Words are matched as whole words or word starts. */
const words: [RegExp, FoodKind][] = [
  [/\bmince\b|\bground (beef|turkey|chicken)/i, 'mince'],
  [/\bchicken\b|\bturkey\b|\bdrumstick/i, 'chicken'],
  [/\bsalmon\b|\bfish\b|\bcod\b|\btuna\b|\bprawn/i, 'fish'],
  [/\bpassata\b|\btomato (sauce|puree|paste)\b|\bpasta sauce\b/i, 'passata'],
  [/\bpeppers?\b|\bpaprika\b|\bcapsicum/i, 'pepper'],
  [/\btomato/i, 'tomato'],
  [/\bpeas\b/i, 'peas'],
  [/\bcarrot/i, 'carrot'],
  [/\bgarlic\b/i, 'garlic'],
  [/\bonions?\b|\bshallot|\bspring onion/i, 'onion'],
  [/\bpotato/i, 'potato'],
  [/\bmushroom/i, 'mushroom'],
  [/\blemon|\blime\b/i, 'lemon'],
  [/\bapple/i, 'apple'],
  [/\bstrawberr/i, 'strawberry'],
  [/\braspberr|\bberries\b|\bblueberr/i, 'raspberry'],
  [/\bcabbage|\blettuce|\bspinach|\bkale\b/i, 'cabbage'],
  [/\bbasil|\bparsley|\bcoriander|\bcilantro|\bmint\b|\bherbs?\b|\bdill\b/i, 'herb'],
  [/\beggs?\b/i, 'egg'],
  [/\bbutter\b/i, 'butter'],
  [/\byogh?urt/i, 'yogurt'],
  [/\bcream\b/i, 'cream'],
  [/\bmilk\b/i, 'milk'],
  [/\bcheese|\bfeta\b|\bmozzarella|\bparmesan|\bcheddar|\bhalloumi|\bricotta/i, 'cheese'],
  [/\bmayo/i, 'mayo'],
  [/\bpenne\b|\bpasta\b|\bmacaroni|\bfusilli|\brigatoni/i, 'penne'],
  [/\bspaghetti|\bnoodle|\blinguine|\btagliatelle/i, 'spaghetti'],
  [/\brice\b/i, 'rice'],
  [/\bbatter\b/i, 'batter'],
  [/\bdough\b/i, 'dough'],
  [/\bflour\b/i, 'flour'],
  [/\bcocoa|\bchocolate/i, 'cocoa'],
  [/\bsugar\b/i, 'sugar'],
  [/\bhoney|\bsyrup/i, 'honey'],
  [/\bsoy\b|\bfish sauce|\bworcester/i, 'soy'],
  [/\boil\b/i, 'oil'],
  [/\bvanilla/i, 'vanilla'],
  [/\bcinnamon/i, 'cinnamon'],
  [/\bmasala|\bturmeric|\bcumin|\bmustard seed|\bsaffron|\bspice|\bchilli|\bchili|\bpaprika|\bcurry powder|\bseeds?\b|\bpepper(corns)?\b/i, 'spice'],
  [/\bbuns?\b|\brolls?\b|\bbrioche/i, 'bun'],
  [/\bpastry|\bcroissant/i, 'pastry'],
  [/\bcake\b|\bsponge\b/i, 'cake'],
  [/\bbread\b|\bloaf|\btoast|\bbaguette/i, 'bread'],
  [/\bcoffee/i, 'coffee'],
];
const byAisle: Record<string, FoodKind> = { Produce: 'produce', Bakery: 'bakery', 'Meat & Fish': 'meat', 'Dairy & Eggs': 'dairy', Pantry: 'pantry', Other: 'basket' };

export function foodKind(name: string, aisle?: string): FoodKind {
  for (const [re, kind] of words) if (re.test(name)) return kind;
  return (aisle && byAisle[aisle]) || 'basket';
}

