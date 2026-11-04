import type { RecipeColor } from '../theme';

export type Aisle = 'Produce' | 'Dairy & Eggs' | 'Meat & Fish' | 'Pantry' | 'Bakery';

export type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string; // '' for countable items, e.g. "2 eggs"
  aisle: Aisle;
};

export type Recipe = {
  id: string;
  title: string;
  emoji: string; // stand-in for a photo until we have real images
  color: RecipeColor;
  tagline: string;
  category: Category;
  minutes: number;
  servings: number;
  calories: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
};

export const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'] as const;
export type Category = Exclude<(typeof categories)[number], 'All'>;

export const recipes: Recipe[] = [
  {
    id: 'shakshuka',
    title: 'Smoky Shakshuka',
    emoji: '🍳',
    color: 'coral',
    tagline: 'Eggs poached in a spiced tomato and pepper sauce. One pan, zero fuss.',
    category: 'Breakfast',
    minutes: 25,
    servings: 2,
    calories: 380,
    difficulty: 'Easy',
    tags: ['Vegetarian', 'One pan'],
    ingredients: [
      { id: 'egg', name: 'Eggs', quantity: 4, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'tomato-can', name: 'Chopped tomatoes', quantity: 400, unit: 'g', aisle: 'Pantry' },
      { id: 'pepper-red', name: 'Red pepper', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'onion', name: 'Onion', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'paprika', name: 'Smoked paprika', quantity: 1, unit: 'tsp', aisle: 'Pantry' },
      { id: 'feta', name: 'Feta', quantity: 60, unit: 'g', aisle: 'Dairy & Eggs' },
    ],
    steps: [
      'Soften the sliced onion and pepper in olive oil over medium heat for 8 minutes.',
      'Stir in the paprika for 30 seconds, then add the tomatoes. Simmer for 10 minutes.',
      'Make four wells and crack in the eggs. Cover and cook for 5 to 6 minutes.',
      'Crumble over the feta and serve straight from the pan with bread.',
    ],
  },
  {
    id: 'green-curry',
    title: 'Weeknight Green Curry',
    emoji: '🍛',
    color: 'green',
    tagline: 'Fragrant coconut curry loaded with veg. Faster than takeaway.',
    category: 'Dinner',
    minutes: 30,
    servings: 4,
    calories: 520,
    difficulty: 'Medium',
    tags: ['Dairy free', 'Spicy'],
    ingredients: [
      { id: 'chicken-thigh', name: 'Chicken thighs', quantity: 500, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'coconut-milk', name: 'Coconut milk', quantity: 400, unit: 'ml', aisle: 'Pantry' },
      { id: 'curry-paste', name: 'Green curry paste', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
      { id: 'green-beans', name: 'Green beans', quantity: 150, unit: 'g', aisle: 'Produce' },
      { id: 'basil', name: 'Thai basil', quantity: 1, unit: 'bunch', aisle: 'Produce' },
      { id: 'rice', name: 'Jasmine rice', quantity: 300, unit: 'g', aisle: 'Pantry' },
    ],
    steps: [
      'Start the rice. Fry the curry paste in a splash of coconut milk until fragrant.',
      'Add the sliced chicken and cook for 5 minutes until sealed.',
      'Pour in the rest of the coconut milk and the beans. Simmer for 12 minutes.',
      'Tear in the basil, season with lime and fish sauce, and serve over rice.',
    ],
  },
  {
    id: 'pancakes',
    title: 'Fluffy Lemon Pancakes',
    emoji: '🥞',
    color: 'yellow',
    tagline: 'Tall, tangy and golden. Sunday morning in a stack.',
    category: 'Breakfast',
    minutes: 20,
    servings: 3,
    calories: 410,
    difficulty: 'Easy',
    tags: ['Vegetarian', 'Kid friendly'],
    ingredients: [
      { id: 'flour', name: 'Plain flour', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'milk', name: 'Milk', quantity: 250, unit: 'ml', aisle: 'Dairy & Eggs' },
      { id: 'egg', name: 'Eggs', quantity: 2, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'lemon', name: 'Lemon', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'baking-powder', name: 'Baking powder', quantity: 2, unit: 'tsp', aisle: 'Pantry' },
    ],
    steps: [
      'Whisk the flour, baking powder, a pinch of salt and the lemon zest.',
      'Beat in the milk and eggs until just combined. A few lumps are fine.',
      'Cook ladlefuls in a buttered pan until bubbles appear, then flip.',
      'Serve with a squeeze of lemon and a drizzle of honey.',
    ],
  },
  {
    id: 'salmon-bowl',
    title: 'Crispy Salmon Rice Bowl',
    emoji: '🍣',
    color: 'indigo',
    tagline: 'Sticky glazed salmon, crunchy veg and a quick chilli mayo.',
    category: 'Lunch',
    minutes: 25,
    servings: 2,
    calories: 610,
    difficulty: 'Easy',
    tags: ['High protein'],
    ingredients: [
      { id: 'salmon', name: 'Salmon fillets', quantity: 2, unit: '', aisle: 'Meat & Fish' },
      { id: 'rice', name: 'Jasmine rice', quantity: 150, unit: 'g', aisle: 'Pantry' },
      { id: 'cucumber', name: 'Cucumber', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'avocado', name: 'Avocado', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'soy', name: 'Soy sauce', quantity: 2, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Cook the rice. Cube the salmon and toss with soy sauce and honey.',
      'Air fry or pan fry the salmon cubes until crisp at the edges, about 8 minutes.',
      'Slice the cucumber and avocado. Mix mayo with sriracha.',
      'Build bowls: rice, salmon, veg, then a zigzag of chilli mayo.',
    ],
  },
  {
    id: 'brownies',
    title: 'Gooey Tahini Brownies',
    emoji: '🍫',
    color: 'purple',
    tagline: 'Fudgy middles, crackly tops, and a nutty tahini swirl.',
    category: 'Dessert',
    minutes: 45,
    servings: 12,
    calories: 290,
    difficulty: 'Medium',
    tags: ['Bake ahead'],
    ingredients: [
      { id: 'chocolate', name: 'Dark chocolate', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'butter', name: 'Butter', quantity: 150, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'egg', name: 'Eggs', quantity: 3, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'sugar', name: 'Caster sugar', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'tahini', name: 'Tahini', quantity: 4, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Melt the chocolate and butter together. Let cool slightly.',
      'Whisk the eggs and sugar until pale and thick, about 4 minutes.',
      'Fold in the chocolate, then the flour. Pour into a lined tin.',
      'Swirl through the tahini and bake at 180°C for 22 to 25 minutes.',
    ],
  },
  {
    id: 'hummus-plate',
    title: 'Loaded Hummus Plate',
    emoji: '🥙',
    color: 'sky',
    tagline: 'Silky hummus, spiced chickpeas and warm flatbread for dipping.',
    category: 'Snacks',
    minutes: 15,
    servings: 4,
    calories: 330,
    difficulty: 'Easy',
    tags: ['Vegan', 'No cook'],
    ingredients: [
      { id: 'chickpeas', name: 'Chickpeas', quantity: 2, unit: 'cans', aisle: 'Pantry' },
      { id: 'tahini', name: 'Tahini', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
      { id: 'lemon', name: 'Lemon', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'flatbread', name: 'Flatbreads', quantity: 4, unit: '', aisle: 'Bakery' },
      { id: 'parsley', name: 'Parsley', quantity: 1, unit: 'bunch', aisle: 'Produce' },
    ],
    steps: [
      'Blend one can of chickpeas with tahini, lemon, garlic and ice water until silky.',
      'Fry the second can of chickpeas with cumin until crisp.',
      'Swoosh the hummus onto a plate and pile on the chickpeas and parsley.',
      'Finish with olive oil and serve with warm flatbreads.',
    ],
  },
];

export const getRecipe = (id: string) => recipes.find((r) => r.id === id);

/** Items already on the grocery list when the app opens. */
export type GroceryItem = {
  key: string; // ingredient id + unit, so "200 g flour" and "2 flour" stay separate
  name: string;
  quantity: number;
  unit: string;
  aisle: Aisle;
  recipeIds: string[];
  checked: boolean;
};

export const initialGroceries: GroceryItem[] = [
  { key: 'egg|', name: 'Eggs', quantity: 6, unit: '', aisle: 'Dairy & Eggs', recipeIds: ['shakshuka', 'pancakes'], checked: false },
  { key: 'lemon|', name: 'Lemon', quantity: 2, unit: '', aisle: 'Produce', recipeIds: ['pancakes', 'hummus-plate'], checked: true },
  { key: 'pepper-red|', name: 'Red pepper', quantity: 1, unit: '', aisle: 'Produce', recipeIds: ['shakshuka'], checked: false },
  { key: 'feta|g', name: 'Feta', quantity: 60, unit: 'g', aisle: 'Dairy & Eggs', recipeIds: ['shakshuka'], checked: false },
  { key: 'flatbread|', name: 'Flatbreads', quantity: 4, unit: '', aisle: 'Bakery', recipeIds: ['hummus-plate'], checked: false },
  { key: 'coffee|', name: 'Coffee beans', quantity: 1, unit: 'bag', aisle: 'Pantry', recipeIds: [], checked: false },
];

export const aisleOrder: Aisle[] = ['Produce', 'Bakery', 'Meat & Fish', 'Dairy & Eggs', 'Pantry'];

export const aisleEmoji: Record<Aisle, string> = {
  Produce: '🥕',
  Bakery: '🥖',
  'Meat & Fish': '🐟',
  'Dairy & Eggs': '🧀',
  Pantry: '🫙',
};
