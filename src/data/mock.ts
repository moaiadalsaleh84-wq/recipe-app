export type Aisle = 'Produce' | 'Bakery' | 'Meat & Fish' | 'Dairy & Eggs' | 'Pantry' | 'Other';

export type Ingredient = {
  id: string;
  name: string;
  /** null = "a pinch" / "to taste": never scaled, no number shown. */
  quantity: number | null;
  unit: string; // '' for countable items, e.g. "2 eggs"
  aisle: Aisle;
  /** "minced", "for the crema"… shown next to the name, never scaled. */
  note?: string;
  /** Imported recipes: the amount (or the ingredient, for basics like oil) was suggested, not in the source. Shown as "est.". */
  estimated?: boolean;
};

/** Diet flags as checked by hand in the recipe data (used as-is, never recalculated). */
export type DietFlags = { vegetarian: boolean; vegan: boolean; glutenFree: boolean; dairyFree: boolean; porkFree: boolean };

/** Per-step data from a checked recipe file: which ingredients the step uses, and its timer. */
export type StepMeta = {
  ingredientIds: string[];
  timerSeconds: number | null;
  /** Imported recipes: the step was written by the AI (the source had no method). Shown as "est.". */
  estimated?: boolean;
};

export const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'] as const;
export type Category = (typeof categories)[number];

/** Recipe tags. 'Comfort food' marks the warm, hearty dishes shown by Home's "Cozy" tile. */
export const dietTags = ['Vegetarian', 'Vegan', 'One pan', 'High protein', 'Gluten free', 'Kid friendly', 'Comfort food'] as const;
export type DietTag = (typeof dietTags)[number];

/** Filters shown on the Recipes screen. "Under 30 min" is computed from cook time. */
export const QUICK_FILTER = 'Under 30 min';
export type FilterTag = DietTag | typeof QUICK_FILTER;
export const filterTags: FilterTag[] = [QUICK_FILTER, ...dietTags];

/** Where an imported recipe came from. */
export type ImportSource = 'tiktok' | 'youtube' | 'web';

/**
 * An imported recipe's picture, stored on the phone: the original as downloaded, a 4:3 crop for
 * cards and a 1:1 crop for thumbnails (WebP, centered), and a blurhash shown while they load.
 * `card` and `square` fall back to the original when cropping wasn't possible.
 */
export type ImportedPicture = { original: string; card: string; square: string; blurhash?: string };

/** A bundled photo (require), a picked photo ({ uri }), or none. */
export type RecipeImage = number | { uri: string } | null;

export type Recipe = {
  id: string;
  title: string;
  image: RecipeImage;
  description: string;
  category: Category;
  minutes: number;
  servings: number;
  calories: number;
  /**
   * Grams per serving. ALL nutrition in the app is an estimate: for the sample recipes it was
   * worked out from the listed ingredients with standard food values (audited Nov 2026); for
   * imports it comes from the source or an AI estimate. Shown as "estimated per serving".
   */
  nutrition: { protein: number; carbs: number; fat: number };
  difficulty: 'Easy' | 'Medium' | 'Hard';
  /** Recipe tags. 'Quick' only comes from checked recipe data (see isQuick). */
  tags: (DietTag | 'Quick')[];
  ingredients: Ingredient[];
  steps: string[];
  /** Checked recipe data (data/pantry-pop-recipes.json) adds these. Older recipes don't have them. */
  stepMeta?: StepMeta[];
  mealType?: string;
  cuisine?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  diet?: DietFlags;
  /**
   * Where the recipe came from: 'pantry-pop' = data/pantry-pop-recipes.json; 'tiktok' / 'youtube' /
   * 'web' = imported from a link by this user.
   */
  source?: 'pantry-pop' | ImportSource;
  /** Link to where the recipe came from: the original video or page. */
  sourceUrl?: string;
  /**
   * Imported recipes only, and only on this user's phone. The credit is always shown and can't be
   * removed; the picture is never used for built-in recipes, marketing, notifications or the paywall.
   */
  creatorHandle?: string;
  /** The creator's profile page (videos). */
  creatorUrl?: string;
  /** "From TikTok", "From YouTube" or the site's name: the sticker on the picture. */
  imageCreditText?: string;
  /** The imported picture, downloaded once (links expire): kept so the user can switch back to it. */
  importedImage?: ImportedPicture;
  /** Imported recipes: servings / time the source didn't give, estimated (shown as "est."). */
  estimated?: { servings?: boolean; time?: boolean };
  /** True for recipes the user created. */
  custom?: boolean;
  /** When a recipe of yours was saved (ISO). Older ones carry the time in their id. */
  addedAt?: string;
  /** How a custom recipe got here. Older saved recipes have none: treat as 'manual'. */
  origin?: 'manual' | 'import';
};

/**
 * Placeholder photos are bundled in assets/recipes (from the MIT-licensed Foodish project).
 * Replace them with your own photography before release.
 */
export const recipes: Recipe[] = [
  {
    id: 'pepper-feta-penne',
    title: 'Roasted Pepper & Feta Penne',
    image: require('../../assets/recipes/pepper-feta-penne.webp'),
    description: 'Sweet roasted peppers, salty feta and basil tossed through penne. Weeknight dinner in 25 minutes.',
    category: 'Dinner',
    minutes: 25,
    servings: 4,
    calories: 580,
    nutrition: { protein: 19, carbs: 81, fat: 20 },
    difficulty: 'Easy',
    tags: ['Vegetarian', 'Kid friendly'],
    ingredients: [
      { id: 'penne', name: 'Penne', quantity: 400, unit: 'g', aisle: 'Pantry' },
      { id: 'red-pepper', name: 'Red peppers', quantity: 3, unit: '', aisle: 'Produce' },
      { id: 'feta', name: 'Feta', quantity: 150, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'garlic', name: 'Garlic cloves', quantity: 2, unit: '', aisle: 'Produce' },
      { id: 'basil', name: 'Basil', quantity: 1, unit: 'bunch', aisle: 'Produce' },
      { id: 'olive-oil', name: 'Olive oil', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Turn the oven on to 220°C. Cut the peppers into strips, mix them with a little oil and bake for 18 minutes.',
      'Boil the penne in salted water for 10 minutes. Keep one cup of the pasta water.',
      'Slice the garlic and fry it in olive oil for 1 minute. Add the peppers.',
      'Add the pasta and a little pasta water and stir. Top with crumbled feta and basil leaves.',
    ],
  },
  {
    id: 'masala-dosa',
    title: 'Crispy Masala Dosa',
    image: require('../../assets/recipes/masala-dosa.webp'),
    description: 'Golden, paper-thin crêpes filled with spiced potato, served with tomato chutney.',
    category: 'Breakfast',
    minutes: 40,
    servings: 4,
    calories: 410,
    nutrition: { protein: 10, carbs: 74, fat: 8 },
    difficulty: 'Medium',
    tags: ['Vegan', 'Gluten free'],
    ingredients: [
      { id: 'dosa-batter', name: 'Dosa batter', quantity: 500, unit: 'g', aisle: 'Other' },
      { id: 'potato', name: 'Potatoes', quantity: 4, unit: '', aisle: 'Produce' },
      { id: 'onion', name: 'Onion', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'mustard-seeds', name: 'Mustard seeds', quantity: 1, unit: 'tsp', aisle: 'Pantry' },
      { id: 'turmeric', name: 'Turmeric', quantity: 0.5, unit: 'tsp', aisle: 'Pantry' },
      { id: 'tomato', name: 'Tomatoes', quantity: 3, unit: '', aisle: 'Produce' },
      { id: 'vegetable-oil', name: 'Vegetable oil', quantity: 2, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Boil the potatoes for 20 minutes until soft. Peel them and mash them roughly.',
      'Heat the oil and add the mustard seeds. Wait until they pop. Add the onion and turmeric, then stir in the potato.',
      'Pour a spoonful of batter into a hot pan and spread it thin. Add a few drops of oil and cook until crispy.',
      'Put the potato in the middle, fold the dosa over and serve with tomato chutney.',
    ],
  },
  {
    id: 'chicken-fried-rice',
    title: 'Chicken Fried Rice',
    image: require('../../assets/recipes/chicken-fried-rice.webp'),
    description: 'Smoky, savory and packed with peas and egg. Better than takeaway and done in 20.',
    category: 'Lunch',
    minutes: 20,
    servings: 2,
    calories: 610,
    nutrition: { protein: 50, carbs: 65, fat: 17 },
    difficulty: 'Easy',
    tags: ['One pan', 'High protein'],
    ingredients: [
      { id: 'cooked-rice', name: 'Cooked rice', quantity: 400, unit: 'g', aisle: 'Pantry' },
      { id: 'chicken-breast', name: 'Chicken breast', quantity: 300, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'egg', name: 'Eggs', quantity: 2, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'peas-carrots', name: 'Peas & carrots', quantity: 150, unit: 'g', aisle: 'Produce' },
      { id: 'soy-sauce', name: 'Soy sauce', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
      { id: 'vegetable-oil', name: 'Vegetable oil', quantity: 1, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Cut the chicken into small pieces. Heat the oil in a pan until very hot, then fry the chicken until golden and move it to one side.',
      'Crack the eggs into the empty side of the pan and stir until cooked.',
      'Add the peas, carrots and cold rice. Fry for 4 minutes and stir only now and then.',
      'Add the soy sauce and a pinch of pepper. Stir and serve.',
    ],
  },
  {
    id: 'butter-chicken',
    title: 'Butter Chicken',
    image: require('../../assets/recipes/butter-chicken.webp'),
    description: 'Tender chicken in a silky, gently spiced tomato and butter sauce.',
    category: 'Dinner',
    minutes: 45,
    servings: 4,
    calories: 520,
    nutrition: { protein: 40, carbs: 10, fat: 36 },
    difficulty: 'Medium',
    tags: ['High protein', 'Gluten free', 'Comfort food'],
    ingredients: [
      { id: 'chicken-thigh', name: 'Chicken thighs', quantity: 700, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'yogurt', name: 'Greek yogurt', quantity: 150, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'butter', name: 'Butter', quantity: 60, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'passata', name: 'Passata', quantity: 500, unit: 'g', aisle: 'Pantry' },
      { id: 'garam-masala', name: 'Garam masala', quantity: 2, unit: 'tsp', aisle: 'Pantry' },
      { id: 'cream', name: 'Double cream', quantity: 100, unit: 'ml', aisle: 'Dairy & Eggs' },
    ],
    steps: [
      'Mix the chicken with the yogurt, garam masala and a little salt. Leave it for 15 minutes.',
      'Fry the chicken in a hot pan until the edges turn dark brown. Put it on a plate.',
      'Melt the butter in the pan. Add the tomato sauce and cook gently for 10 minutes until thick.',
      'Stir in the cream and the chicken. Cook gently for 10 more minutes. Serve with rice.',
    ],
  },
  {
    id: 'crispy-chicken-burger',
    title: 'Crunchy Chicken Burger',
    image: require('../../assets/recipes/crispy-chicken-burger.webp'),
    description: 'Juicy chicken patties, melted cheese and a crisp, tangy slaw in a toasted bun.',
    category: 'Lunch',
    minutes: 35,
    servings: 4,
    calories: 630,
    nutrition: { protein: 37, carbs: 50, fat: 31 },
    difficulty: 'Easy',
    tags: ['High protein', 'Kid friendly'],
    ingredients: [
      { id: 'chicken-mince', name: 'Chicken mince', quantity: 500, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'burger-buns', name: 'Brioche buns', quantity: 4, unit: '', aisle: 'Bakery' },
      { id: 'cheddar', name: 'Cheddar slices', quantity: 4, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'cabbage', name: 'Red cabbage', quantity: 0.25, unit: '', aisle: 'Produce' },
      { id: 'red-onion', name: 'Red onion', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'mayo', name: 'Mayonnaise', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Add salt and pepper to the mince. Shape it into 4 flat patties, a little wider than the buns.',
      'Cut the cabbage and onion very thin. Mix them with mayo and a little lemon juice.',
      'Fry the patties for 5 minutes on each side. Put the cheese on top for the last minute.',
      'Toast the buns. Build each burger: cabbage mix, patty, then more cabbage mix.',
    ],
  },
  {
    id: 'apple-turnovers',
    title: 'Flaky Apple Turnovers',
    image: require('../../assets/recipes/apple-turnovers.webp'),
    description: 'Buttery puff pastry wrapped around cinnamon apples. A weekend breakfast treat.',
    category: 'Breakfast',
    minutes: 35,
    servings: 6,
    calories: 310,
    nutrition: { protein: 4, carbs: 38, fat: 16 },
    difficulty: 'Easy',
    tags: ['Vegetarian', 'Kid friendly'],
    ingredients: [
      { id: 'puff-pastry', name: 'Puff pastry', quantity: 1, unit: 'sheet', aisle: 'Bakery' },
      { id: 'apple', name: 'Apples', quantity: 3, unit: '', aisle: 'Produce' },
      { id: 'brown-sugar', name: 'Brown sugar', quantity: 50, unit: 'g', aisle: 'Pantry' },
      { id: 'cinnamon', name: 'Cinnamon', quantity: 1, unit: 'tsp', aisle: 'Pantry' },
      { id: 'egg', name: 'Eggs', quantity: 1, unit: '', aisle: 'Dairy & Eggs' },
    ],
    steps: [
      'Cut the apples into small cubes. Cook them with the sugar and cinnamon for 6 minutes, then let them cool.',
      'Cut the pastry into 6 squares. Put some apple on one half of each square.',
      'Fold each square into a triangle and press the edges shut. Brush the tops with beaten egg.',
      'Bake at 200°C for 18 minutes until puffy and golden. Sprinkle with sugar.',
    ],
  },
  {
    id: 'mushroom-spaghetti',
    title: 'Creamy Mushroom Spaghetti',
    image: require('../../assets/recipes/mushroom-spaghetti.webp'),
    description: 'Garlicky mushrooms and parmesan in a glossy sauce that clings to every strand.',
    category: 'Dinner',
    minutes: 30,
    servings: 2,
    calories: 740,
    nutrition: { protein: 25, carbs: 75, fat: 38 },
    difficulty: 'Easy',
    tags: ['Vegetarian', 'Comfort food'],
    ingredients: [
      { id: 'spaghetti', name: 'Spaghetti', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'mushrooms', name: 'Chestnut mushrooms', quantity: 250, unit: 'g', aisle: 'Produce' },
      { id: 'garlic', name: 'Garlic cloves', quantity: 2, unit: '', aisle: 'Produce' },
      { id: 'cream', name: 'Double cream', quantity: 100, unit: 'ml', aisle: 'Dairy & Eggs' },
      { id: 'parmesan', name: 'Parmesan', quantity: 40, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'olive-oil', name: 'Olive oil', quantity: 1, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Boil the spaghetti in salted water for 8 minutes. It should still be a little firm.',
      'Heat the oil in a pan. Slice the mushrooms and fry them until brown. Add the garlic.',
      'Pour in the cream and a little pasta water. Let it bubble for 2 minutes.',
      'Add the spaghetti and parmesan and stir until creamy. Add black pepper and serve.',
    ],
  },
  {
    id: 'margherita-pizza',
    title: 'Margherita Pizza',
    image: require('../../assets/recipes/margherita-pizza.webp'),
    description: 'A blistered, chewy crust with bright tomato, creamy mozzarella and fresh basil.',
    category: 'Dinner',
    minutes: 50,
    servings: 2,
    calories: 910,
    nutrition: { protein: 39, carbs: 105, fat: 37 },
    difficulty: 'Medium',
    tags: ['Vegetarian', 'Kid friendly', 'Comfort food'],
    ingredients: [
      { id: 'pizza-dough', name: 'Pizza dough balls', quantity: 2, unit: 'piece', aisle: 'Bakery', note: '200 g each' },
      { id: 'passata', name: 'Passata', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'mozzarella', name: 'Mozzarella', quantity: 250, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'cherry-tomato', name: 'Cherry tomatoes', quantity: 200, unit: 'g', aisle: 'Produce' },
      { id: 'basil', name: 'Basil', quantity: 1, unit: 'bunch', aisle: 'Produce' },
      { id: 'olive-oil', name: 'Olive oil', quantity: 1, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Put a baking tray in the oven. Turn the oven to its highest setting and heat it for 20 minutes.',
      'Dust the table with flour. Press and stretch each dough ball into a thin circle.',
      'Spread tomato sauce on the dough. Add torn mozzarella and the cherry tomatoes, cut in half.',
      'Bake for 8 to 10 minutes until the edges are brown. Add basil and a little olive oil.',
    ],
  },
  {
    id: 'crispy-samosas',
    title: 'Crispy Vegetable Samosas',
    image: require('../../assets/recipes/crispy-samosas.webp'),
    description: 'Shatteringly crisp pastry around a spiced potato and pea filling.',
    category: 'Snacks',
    minutes: 60,
    servings: 12,
    calories: 180,
    nutrition: { protein: 4, carbs: 22, fat: 9 },
    difficulty: 'Medium',
    tags: ['Vegan'],
    ingredients: [
      { id: 'flour', name: 'Plain flour', quantity: 250, unit: 'g', aisle: 'Pantry' },
      { id: 'potato', name: 'Potatoes', quantity: 3, unit: '', aisle: 'Produce' },
      { id: 'peas', name: 'Frozen peas', quantity: 100, unit: 'g', aisle: 'Produce' },
      { id: 'cumin', name: 'Cumin seeds', quantity: 1, unit: 'tsp', aisle: 'Pantry' },
      { id: 'veg-oil', name: 'Vegetable oil', quantity: 500, unit: 'ml', aisle: 'Pantry' },
    ],
    steps: [
      'Mix the flour with 4 tbsp oil. Add water bit by bit until you have a firm dough. Leave it for 20 minutes.',
      'Boil the potatoes and mash them. Fry them with the cumin and peas.',
      'Roll the dough into ovals and cut each in half. Fold each half into a cone, fill it and press the edges shut.',
      'Fry in oil at 160°C for 8 minutes until golden brown. Let them drain on paper towels.',
    ],
  },
  {
    id: 'chicken-biryani',
    title: 'Chicken Biryani',
    image: require('../../assets/recipes/chicken-biryani.webp'),
    description: 'Fragrant layered rice and spiced chicken, slow-cooked in one pot.',
    category: 'Dinner',
    minutes: 75,
    servings: 6,
    calories: 570,
    nutrition: { protein: 36, carbs: 67, fat: 17 },
    difficulty: 'Hard',
    tags: ['One pan', 'High protein', 'Gluten free', 'Comfort food'],
    ingredients: [
      { id: 'basmati', name: 'Basmati rice', quantity: 450, unit: 'g', aisle: 'Pantry' },
      { id: 'chicken-thigh', name: 'Chicken thighs', quantity: 800, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'yogurt', name: 'Greek yogurt', quantity: 200, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'onion', name: 'Onion', quantity: 3, unit: '', aisle: 'Produce' },
      { id: 'biryani-masala', name: 'Biryani masala', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
      { id: 'saffron', name: 'Saffron', quantity: 1, unit: 'pinch', aisle: 'Pantry' },
      { id: 'vegetable-oil', name: 'Vegetable oil', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Mix the chicken with the yogurt and biryani spices. Leave it for 30 minutes.',
      'Heat the oil and fry the sliced onions slowly until brown and crispy. Keep half for the top.',
      'Boil the rice for 5 minutes and drain it. In a heavy pot, add layers of chicken, onions and rice.',
      'Pour the saffron milk on top. Put the lid on and cook on low heat for 35 minutes.',
    ],
  },
  {
    id: 'chocolate-raspberry-cake',
    title: 'Chocolate Raspberry Cake',
    image: require('../../assets/recipes/chocolate-raspberry-cake.webp'),
    description: 'A deep, fudgy bundt cake finished with fresh raspberries and a dusting of sugar.',
    category: 'Dessert',
    minutes: 70,
    servings: 10,
    calories: 420,
    nutrition: { protein: 6, carbs: 54, fat: 21 },
    difficulty: 'Medium',
    tags: ['Vegetarian'],
    ingredients: [
      { id: 'flour', name: 'Plain flour', quantity: 250, unit: 'g', aisle: 'Pantry' },
      { id: 'cocoa', name: 'Cocoa powder', quantity: 75, unit: 'g', aisle: 'Pantry' },
      { id: 'caster-sugar', name: 'Caster sugar', quantity: 300, unit: 'g', aisle: 'Pantry' },
      { id: 'egg', name: 'Eggs', quantity: 3, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'butter', name: 'Butter', quantity: 200, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'raspberries', name: 'Raspberries', quantity: 150, unit: 'g', aisle: 'Produce' },
    ],
    steps: [
      'Turn the oven on to 180°C. Rub butter all over the inside of the cake tin.',
      'Melt the butter with the cocoa. Then mix in the sugar and eggs.',
      'Gently stir in the flour and pour it into the tin. Bake for 45 minutes.',
      'Let it cool for 15 minutes, then turn it out of the tin. Top with the raspberries.',
    ],
  },
  {
    id: 'strawberry-cream-squares',
    title: 'Strawberry Cream Squares',
    image: require('../../assets/recipes/strawberry-cream-squares.webp'),
    description: 'Light sponge layered with vanilla cream and summer strawberries.',
    category: 'Dessert',
    minutes: 30,
    servings: 9,
    calories: 300,
    nutrition: { protein: 3, carbs: 28, fat: 19 },
    difficulty: 'Easy',
    tags: ['Vegetarian', 'Kid friendly'],
    ingredients: [
      { id: 'sponge', name: 'Sponge cake', quantity: 1, unit: '', aisle: 'Bakery' },
      { id: 'cream', name: 'Double cream', quantity: 300, unit: 'ml', aisle: 'Dairy & Eggs' },
      { id: 'strawberries', name: 'Strawberries', quantity: 400, unit: 'g', aisle: 'Produce' },
      { id: 'vanilla', name: 'Vanilla extract', quantity: 1, unit: 'tsp', aisle: 'Pantry' },
      { id: 'icing-sugar', name: 'Icing sugar', quantity: 2, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Beat the cream with the vanilla and icing sugar until thick and soft.',
      'Cut the cake in half to make a top and a bottom layer. Spread cream on the bottom layer.',
      'Add sliced strawberries, then the top layer and more cream.',
      'Put it in the fridge for 20 minutes. Cut it into squares and add a strawberry on each.',
    ],
  },
];

export const getRecipe = (id: string | undefined) => recipes.find((r) => r.id === id);

export const matchesFilter = (recipe: Recipe, tag: FilterTag) => {
  // Checked recipe data says itself what's quick and what fits a diet: used as given.
  if (recipe.source === 'pantry-pop') {
    if (tag === QUICK_FILTER) return recipe.tags.includes('Quick');
    if (tag === 'Vegetarian') return !!recipe.diet?.vegetarian;
    if (tag === 'Vegan') return !!recipe.diet?.vegan;
    if (tag === 'Gluten free') return !!recipe.diet?.glutenFree;
    return recipe.tags.includes(tag);
  }
  if (tag === QUICK_FILTER) return recipe.minutes <= 30;
  // Vegan recipes are vegetarian too.
  if (tag === 'Vegetarian') return recipe.tags.includes('Vegetarian') || recipe.tags.includes('Vegan');
  return recipe.tags.includes(tag);
};

export type GroceryItem = {
  key: string; // ingredient id + unit, so "200 g flour" and "2 flour" stay separate
  name: string;
  quantity: number;
  unit: string;
  aisle: Aisle;
  recipeIds: string[];
  checked: boolean;
  /** Two lines of one recipe added up: shown as "1½ tsp total". */
  total?: boolean;
};

export const initialGroceries: GroceryItem[] = [
  { key: 'egg|', name: 'Eggs', quantity: 6, unit: '', aisle: 'Dairy & Eggs', recipeIds: ['chicken-fried-rice', 'apple-turnovers'], checked: false },
  { key: 'red-pepper|', name: 'Red peppers', quantity: 3, unit: '', aisle: 'Produce', recipeIds: ['pepper-feta-penne'], checked: true },
  { key: 'basil|bunch', name: 'Basil', quantity: 1, unit: 'bunch', aisle: 'Produce', recipeIds: ['pepper-feta-penne'], checked: false },
  { key: 'feta|g', name: 'Feta', quantity: 150, unit: 'g', aisle: 'Dairy & Eggs', recipeIds: ['pepper-feta-penne'], checked: false },
  { key: 'puff-pastry|sheet', name: 'Puff pastry', quantity: 1, unit: 'sheet', aisle: 'Bakery', recipeIds: ['apple-turnovers'], checked: false },
  { key: 'custom-coffee|', name: 'Coffee beans', quantity: 1, unit: '', aisle: 'Other', recipeIds: [], checked: false },
];

export const aisleOrder: Aisle[] = ['Produce', 'Bakery', 'Meat & Fish', 'Dairy & Eggs', 'Pantry', 'Other'];

export const meals = ['Breakfast', 'Lunch', 'Dinner'] as const;
export type Meal = (typeof meals)[number];
export type DayPlan = Partial<Record<Meal, string>>;
/** Keyed by weekday index, 0 = Monday. */
export type WeekPlan = Record<number, DayPlan>;

export const initialPlan: WeekPlan = {
  0: { Breakfast: 'apple-turnovers', Dinner: 'butter-chicken' },
  1: { Lunch: 'chicken-fried-rice' },
  2: { Breakfast: 'masala-dosa', Dinner: 'pepper-feta-penne' },
  4: { Dinner: 'margherita-pizza' },
  5: { Lunch: 'crispy-chicken-burger', Dinner: 'chicken-biryani' },
};

export const initialFavorites = ['butter-chicken', 'masala-dosa'];

export type Cookbook = { id: string; name: string; recipeIds: string[] };
export const FAVORITES_ID = 'favorites';
export const initialCookbooks: Cookbook[] = [
  { id: 'cb-gains', name: 'Gains', recipeIds: ['butter-chicken', 'chicken-biryani', 'chicken-fried-rice', 'crispy-chicken-burger'] },
  { id: 'cb-cozy', name: 'Cozy nights', recipeIds: ['mushroom-spaghetti', 'margherita-pizza', 'apple-turnovers'] },
];

/** How a cooked meal tasted, picked on the Finish screen. */
export type Rating = 'meh' | 'yum' | 'amazing';
/** One cooked meal. `date` (an ISO time) also identifies the entry. Rating and photo are optional. */
export type CookedEntry = { recipeId: string; date: string; servings: number; rating?: Rating; photo?: string };
export type Goals = { calories: number; protein: number };
export const defaultGoals: Goals = { calories: 2200, protein: 140 };
export type Units = 'metric' | 'us';

/** How the buddy should talk about a recipe. */
export const recipeKind = (r: Recipe) =>
  r.category === 'Dessert' ? 'recipeTreat' : r.nutrition.protein >= 30 ? 'recipeHighProtein' : r.calories < 400 ? 'recipeLight' : 'recipeComfort';
