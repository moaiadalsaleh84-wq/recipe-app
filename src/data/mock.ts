export type Aisle = 'Produce' | 'Bakery' | 'Meat & Fish' | 'Dairy & Eggs' | 'Pantry' | 'Other';

export type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string; // '' for countable items, e.g. "2 eggs"
  aisle: Aisle;
};

export const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'] as const;
export type Category = (typeof categories)[number];

export const dietTags = ['Vegetarian', 'Vegan', 'One pan', 'High protein', 'Gluten free', 'Kid friendly'] as const;
export type DietTag = (typeof dietTags)[number];

/** Filters shown on the Recipes screen. "Under 30 min" is computed from cook time. */
export const QUICK_FILTER = 'Under 30 min';
export type FilterTag = DietTag | typeof QUICK_FILTER;
export const filterTags: FilterTag[] = [QUICK_FILTER, ...dietTags];

export type Recipe = {
  id: string;
  title: string;
  image: number; // a bundled require('...jpg')
  description: string;
  category: Category;
  minutes: number;
  servings: number;
  calories: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: DietTag[];
  ingredients: Ingredient[];
  steps: string[];
};

/**
 * Placeholder photos are bundled in assets/recipes (from the MIT-licensed Foodish project).
 * Replace them with your own photography before release.
 */
export const recipes: Recipe[] = [
  {
    id: 'pepper-feta-penne',
    title: 'Roasted Pepper & Feta Penne',
    image: require('../../assets/recipes/pepper-feta-penne.jpg'),
    description: 'Sweet roasted peppers, salty feta and basil tossed through penne. Weeknight dinner in 25 minutes.',
    category: 'Dinner',
    minutes: 25,
    servings: 4,
    calories: 520,
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
      'Heat the oven to 220°C. Slice the peppers, toss with oil and roast for 18 minutes.',
      'Cook the penne in well-salted water until al dente. Save a mug of pasta water.',
      'Fry the sliced garlic in olive oil for 1 minute, then add the roasted peppers.',
      'Toss in the pasta with a splash of pasta water. Crumble over feta and tear in basil.',
    ],
  },
  {
    id: 'masala-dosa',
    title: 'Crispy Masala Dosa',
    image: require('../../assets/recipes/masala-dosa.jpg'),
    description: 'Golden, paper-thin crêpes filled with spiced potato, served with tomato chutney.',
    category: 'Breakfast',
    minutes: 40,
    servings: 4,
    calories: 360,
    difficulty: 'Medium',
    tags: ['Vegan', 'Gluten free'],
    ingredients: [
      { id: 'dosa-batter', name: 'Dosa batter', quantity: 500, unit: 'g', aisle: 'Other' },
      { id: 'potato', name: 'Potatoes', quantity: 4, unit: '', aisle: 'Produce' },
      { id: 'onion', name: 'Onion', quantity: 1, unit: '', aisle: 'Produce' },
      { id: 'mustard-seeds', name: 'Mustard seeds', quantity: 1, unit: 'tsp', aisle: 'Pantry' },
      { id: 'turmeric', name: 'Turmeric', quantity: 0.5, unit: 'tsp', aisle: 'Pantry' },
      { id: 'tomato', name: 'Tomatoes', quantity: 3, unit: '', aisle: 'Produce' },
    ],
    steps: [
      'Boil the potatoes until tender, then peel and roughly crush.',
      'Pop the mustard seeds in hot oil, add the onion and turmeric, then fold in the potato.',
      'Spread a ladle of batter thinly on a hot pan. Drizzle with oil and cook until crisp.',
      'Spoon the potato down the middle, fold and serve with tomato chutney.',
    ],
  },
  {
    id: 'chicken-fried-rice',
    title: 'Chicken Fried Rice',
    image: require('../../assets/recipes/chicken-fried-rice.jpg'),
    description: 'Smoky, savory and packed with peas and egg. Better than takeaway and done in 20.',
    category: 'Lunch',
    minutes: 20,
    servings: 2,
    calories: 590,
    difficulty: 'Easy',
    tags: ['One pan', 'High protein'],
    ingredients: [
      { id: 'cooked-rice', name: 'Cooked rice', quantity: 400, unit: 'g', aisle: 'Pantry' },
      { id: 'chicken-breast', name: 'Chicken breast', quantity: 300, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'egg', name: 'Eggs', quantity: 2, unit: '', aisle: 'Dairy & Eggs' },
      { id: 'peas-carrots', name: 'Peas & carrots', quantity: 150, unit: 'g', aisle: 'Produce' },
      { id: 'soy-sauce', name: 'Soy sauce', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
    ],
    steps: [
      'Dice the chicken and stir-fry in a very hot pan until golden. Push to one side.',
      'Scramble the eggs in the empty side of the pan.',
      'Add the peas, carrots and cold rice. Fry for 4 minutes without stirring too often.',
      'Season with soy sauce and a pinch of white pepper.',
    ],
  },
  {
    id: 'butter-chicken',
    title: 'Butter Chicken',
    image: require('../../assets/recipes/butter-chicken.jpg'),
    description: 'Tender chicken in a silky, gently spiced tomato and butter sauce.',
    category: 'Dinner',
    minutes: 45,
    servings: 4,
    calories: 640,
    difficulty: 'Medium',
    tags: ['High protein', 'Gluten free'],
    ingredients: [
      { id: 'chicken-thigh', name: 'Chicken thighs', quantity: 700, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'yogurt', name: 'Greek yogurt', quantity: 150, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'butter', name: 'Butter', quantity: 60, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'passata', name: 'Passata', quantity: 500, unit: 'g', aisle: 'Pantry' },
      { id: 'garam-masala', name: 'Garam masala', quantity: 2, unit: 'tsp', aisle: 'Pantry' },
      { id: 'cream', name: 'Double cream', quantity: 100, unit: 'ml', aisle: 'Dairy & Eggs' },
    ],
    steps: [
      'Marinate the chicken in yogurt, garam masala and salt for at least 15 minutes.',
      'Sear the chicken in a hot pan until charred at the edges. Set aside.',
      'Melt the butter, add the passata and simmer for 10 minutes until thick.',
      'Stir in the cream and chicken. Simmer 10 minutes more and serve with rice.',
    ],
  },
  {
    id: 'crispy-chicken-burger',
    title: 'Crunchy Chicken Burger',
    image: require('../../assets/recipes/crispy-chicken-burger.jpg'),
    description: 'Juicy chicken patties, melted cheese and a crisp, tangy slaw in a toasted bun.',
    category: 'Lunch',
    minutes: 35,
    servings: 4,
    calories: 690,
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
      'Season the mince well and shape into 4 patties slightly wider than the buns.',
      'Shred the cabbage and onion, then mix with mayo and a squeeze of lemon.',
      'Cook the patties for 5 minutes per side. Add the cheese for the final minute.',
      'Toast the buns and stack: slaw, patty, more slaw.',
    ],
  },
  {
    id: 'apple-turnovers',
    title: 'Flaky Apple Turnovers',
    image: require('../../assets/recipes/apple-turnovers.jpg'),
    description: 'Buttery puff pastry wrapped around cinnamon apples. A weekend breakfast treat.',
    category: 'Breakfast',
    minutes: 35,
    servings: 6,
    calories: 310,
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
      'Dice the apples and cook with sugar and cinnamon for 6 minutes. Let cool.',
      'Cut the pastry into 6 squares and spoon filling onto one half of each.',
      'Fold into triangles, press the edges and brush with beaten egg.',
      'Bake at 200°C for 18 minutes until puffed and golden. Dust with sugar.',
    ],
  },
  {
    id: 'mushroom-spaghetti',
    title: 'Creamy Mushroom Spaghetti',
    image: require('../../assets/recipes/mushroom-spaghetti.jpg'),
    description: 'Garlicky mushrooms and parmesan in a glossy sauce that clings to every strand.',
    category: 'Dinner',
    minutes: 30,
    servings: 2,
    calories: 610,
    difficulty: 'Easy',
    tags: ['Vegetarian'],
    ingredients: [
      { id: 'spaghetti', name: 'Spaghetti', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'mushrooms', name: 'Chestnut mushrooms', quantity: 250, unit: 'g', aisle: 'Produce' },
      { id: 'garlic', name: 'Garlic cloves', quantity: 2, unit: '', aisle: 'Produce' },
      { id: 'cream', name: 'Double cream', quantity: 100, unit: 'ml', aisle: 'Dairy & Eggs' },
      { id: 'parmesan', name: 'Parmesan', quantity: 40, unit: 'g', aisle: 'Dairy & Eggs' },
    ],
    steps: [
      'Cook the spaghetti until 1 minute short of al dente.',
      'Fry the sliced mushrooms in a hot pan until deeply browned, then add the garlic.',
      'Pour in the cream and a ladle of pasta water. Bubble for 2 minutes.',
      'Toss in the pasta and parmesan until glossy. Finish with black pepper.',
    ],
  },
  {
    id: 'margherita-pizza',
    title: 'Margherita Pizza',
    image: require('../../assets/recipes/margherita-pizza.jpg'),
    description: 'A blistered, chewy crust with bright tomato, creamy mozzarella and fresh basil.',
    category: 'Dinner',
    minutes: 50,
    servings: 2,
    calories: 780,
    difficulty: 'Medium',
    tags: ['Vegetarian', 'Kid friendly'],
    ingredients: [
      { id: 'pizza-dough', name: 'Pizza dough', quantity: 2, unit: 'balls', aisle: 'Bakery' },
      { id: 'passata', name: 'Passata', quantity: 200, unit: 'g', aisle: 'Pantry' },
      { id: 'mozzarella', name: 'Mozzarella', quantity: 250, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'cherry-tomato', name: 'Cherry tomatoes', quantity: 200, unit: 'g', aisle: 'Produce' },
      { id: 'basil', name: 'Basil', quantity: 1, unit: 'bunch', aisle: 'Produce' },
    ],
    steps: [
      'Heat the oven to its highest setting with a tray inside for 20 minutes.',
      'Stretch each dough ball into a thin round on a floured surface.',
      'Spread with passata, tear over mozzarella and scatter the halved tomatoes.',
      'Bake for 8 to 10 minutes until blistered. Top with basil and olive oil.',
    ],
  },
  {
    id: 'crispy-samosas',
    title: 'Crispy Vegetable Samosas',
    image: require('../../assets/recipes/crispy-samosas.jpg'),
    description: 'Shatteringly crisp pastry around a spiced potato and pea filling.',
    category: 'Snacks',
    minutes: 60,
    servings: 12,
    calories: 180,
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
      'Rub 4 tbsp oil into the flour, add water to form a firm dough and rest 20 minutes.',
      'Boil and crush the potatoes, then fry with cumin and peas.',
      'Roll the dough into ovals, halve, shape into cones and fill. Seal the edges.',
      'Fry at 160°C for 8 minutes until deep golden. Drain well.',
    ],
  },
  {
    id: 'chicken-biryani',
    title: 'Chicken Biryani',
    image: require('../../assets/recipes/chicken-biryani.jpg'),
    description: 'Fragrant layered rice and spiced chicken, slow-cooked in one pot.',
    category: 'Dinner',
    minutes: 75,
    servings: 6,
    calories: 670,
    difficulty: 'Hard',
    tags: ['One pan', 'High protein', 'Gluten free'],
    ingredients: [
      { id: 'basmati', name: 'Basmati rice', quantity: 450, unit: 'g', aisle: 'Pantry' },
      { id: 'chicken-thigh', name: 'Chicken thighs', quantity: 800, unit: 'g', aisle: 'Meat & Fish' },
      { id: 'yogurt', name: 'Greek yogurt', quantity: 200, unit: 'g', aisle: 'Dairy & Eggs' },
      { id: 'onion', name: 'Onion', quantity: 3, unit: '', aisle: 'Produce' },
      { id: 'biryani-masala', name: 'Biryani masala', quantity: 3, unit: 'tbsp', aisle: 'Pantry' },
      { id: 'saffron', name: 'Saffron', quantity: 1, unit: 'pinch', aisle: 'Pantry' },
    ],
    steps: [
      'Marinate the chicken in yogurt and masala for 30 minutes.',
      'Fry the sliced onions slowly until deep brown and crisp. Set half aside.',
      'Par-boil the rice for 5 minutes. Layer chicken, onions and rice in a heavy pot.',
      'Drizzle saffron milk on top, seal and cook on low heat for 35 minutes.',
    ],
  },
  {
    id: 'chocolate-raspberry-cake',
    title: 'Chocolate Raspberry Cake',
    image: require('../../assets/recipes/chocolate-raspberry-cake.jpg'),
    description: 'A deep, fudgy bundt cake finished with fresh raspberries and a dusting of sugar.',
    category: 'Dessert',
    minutes: 70,
    servings: 10,
    calories: 420,
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
      'Heat the oven to 180°C and grease a bundt tin well.',
      'Melt the butter with the cocoa, then whisk in the sugar and eggs.',
      'Fold in the flour and pour into the tin. Bake for 45 minutes.',
      'Cool for 15 minutes, turn out and top with raspberries and icing sugar.',
    ],
  },
  {
    id: 'strawberry-cream-squares',
    title: 'Strawberry Cream Squares',
    image: require('../../assets/recipes/strawberry-cream-squares.jpg'),
    description: 'Light sponge layered with vanilla cream and summer strawberries.',
    category: 'Dessert',
    minutes: 30,
    servings: 9,
    calories: 260,
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
      'Whip the cream with vanilla and icing sugar to soft peaks.',
      'Slice the sponge in half horizontally and spread the bottom with cream.',
      'Add a layer of sliced strawberries, then the top sponge and more cream.',
      'Chill for 20 minutes, cut into squares and top with whole strawberries.',
    ],
  },
];

export const getRecipe = (id: string | undefined) => recipes.find((r) => r.id === id);

export const matchesFilter = (recipe: Recipe, tag: FilterTag) => {
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
