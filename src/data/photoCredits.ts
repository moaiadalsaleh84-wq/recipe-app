/**
 * Where every recipe photo came from. Rules: only Unsplash or Pexels (free for commercial use),
 * never TikTok, YouTube, Instagram, Google Images or recipe blogs. One entry per photo you pick
 * from docs/photo-picks.md; the Photo credits screen (Settings) lists them all.
 */
export type PhotoCredit = {
  recipeId: string;
  /** The photo's page on Unsplash or Pexels. */
  url: string;
  photographer: string;
  site: 'Unsplash' | 'Pexels';
  license: 'Unsplash License' | 'Pexels License';
};

export const photoCredits: PhotoCredit[] = [
  { recipeId: 'crispy-beef-tacos', url: 'https://unsplash.com/photos/a-wooden-plate-topped-with-three-tacos-and-a-lime-_j4S4V2C8ew', photographer: 'Frankie Lopez', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'hot-honey-chicken-burger', url: 'https://unsplash.com/photos/a-chicken-sandwich-with-lettuce-and-tomato-on-a-bun-n3HKmHpCDpQ', photographer: 'Pablo Escobar', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'baked-feta-pasta', url: 'https://unsplash.com/photos/a-plate-of-tomatoes-and-a-cupcake-on-a-table-iM4pw-3hR74', photographer: 'Helgi Olgeirsson', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'marry-me-chicken', url: 'https://unsplash.com/photos/cooked-dish-Pv8-5BugPi8', photographer: 'Fatema Enayath', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'smash-burger-tacos', url: 'https://unsplash.com/photos/a-hamburger-sitting-on-top-of-a-wooden-cutting-board-MNHQqLNEvow', photographer: 'amirali mirhashemian', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'crispy-rice-salmon-bites', url: 'https://unsplash.com/photos/a-white-plate-topped-with-sushi-covered-in-sauce-EOSVTJIbtLo', photographer: 'Ahtziri Lagarde', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'gochujang-butter-noodles', url: 'https://unsplash.com/photos/spaghetti-with-sauce-on-black-plate-YAXnpznjw_I', photographer: 'Behnam Norouzi', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'hot-honey-salmon-bowl', url: 'https://unsplash.com/photos/sliced-cucumber-and-sliced-lemon-on-white-ceramic-bowl-pO9851jklaE', photographer: 'Miu Sua', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'garlic-parmesan-smashed-potatoes', url: 'https://unsplash.com/photos/crispy-smashed-potatoes-with-herbs-and-spices-tO3eaZL2Ns0', photographer: 'Alpha Perspective', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'oven-doner-kebab-wraps', url: 'https://unsplash.com/photos/two-wraps-with-french-fries-on-a-wooden-board-APbsVh624WA', photographer: 'Omar Hakeem', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'red-curry-dumpling-bake', url: 'https://unsplash.com/photos/a-bowl-of-delicious-curry-with-tofu-QXa2hmeb7Mg', photographer: 'Khanh Nguyen', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'greek-chicken-bowls', url: 'https://unsplash.com/photos/pasta-with-meat-on-white-ceramic-plate-CzD0EHabuzE', photographer: 'James Frewin', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'cottage-cheese-flatbread', url: 'https://unsplash.com/photos/a-close-up-of-a-plate-of-food-on-a-table-jZkoFQAt4cw', photographer: 'Dreamer Dude', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'smash-falafel-pita', url: 'https://unsplash.com/photos/a-white-plate-topped-with-meatballs-and-a-salad-WVoLfiKbYBQ', photographer: 'Zoshua Colah', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'pesto-eggs-toast', url: 'https://unsplash.com/photos/bread-with-egg-and-vegetable-on-white-ceramic-plate-IQSDSFO9UuI', photographer: 'David B Townsend', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'creamy-tuscan-gnocchi', url: 'https://unsplash.com/photos/creamy-gnocchi-with-chicken-and-herbs-JQMGHY9KLFU', photographer: 'Nafsika G.', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'korean-beef-bowls', url: 'https://unsplash.com/photos/egg-dish-on-stainless-steel-round-plate-pmTMvAd8akU', photographer: 'Delaney Van', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'chicken-birria-quesadillas', url: 'https://unsplash.com/photos/sliced-pizza-on-brown-wooden-table-pvTgyioFSTY', photographer: 'Lottie Griffiths', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'protein-baked-oats', url: 'https://unsplash.com/photos/desert-with-sliced-apple-BCOOGQJlkhU', photographer: 'Semi O', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'garlic-butter-steak-bites', url: 'https://unsplash.com/photos/beef-and-broccoli-stir-fry-with-vegetables-on-a-red-plate-qKPKDb4_W24', photographer: 'Davis Dai', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'pepper-feta-penne', url: 'https://unsplash.com/photos/pasta-dish-on-white-ceramic-bowl-dHS6ftEzzJA', photographer: 'Vitalii S.', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'masala-dosa', url: 'https://unsplash.com/photos/dosa-with-masala-and-chutney-breakfast-5oF7d_hPJG4', photographer: 'Paul', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'chicken-fried-rice', url: 'https://unsplash.com/photos/fried-rice-with-tofu-and-vegetables-in-a-bowl--4V4SjHPPDk', photographer: 'Pavan Reddy', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'butter-chicken', url: 'https://unsplash.com/photos/a-bowl-of-food-on-a-table-next-to-some-green-beans-Kv-3EtUcUC4', photographer: 'Rimsha Noor', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'crispy-chicken-burger', url: 'https://unsplash.com/photos/a-chicken-sandwich-with-lettuce-and-mayonnaise-on-a-black-background-VFVnZfogE7s', photographer: 'David Foodphototasty', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'apple-turnovers', url: 'https://unsplash.com/photos/a-black-plate-topped-with-pastries-covered-in-powdered-sugar--tt3ZuPNe8Q', photographer: 'Jon Handley', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'mushroom-spaghetti', url: 'https://unsplash.com/photos/creamy-mushroom-spaghetti-pasta-dish-tZPP-habQcQ', photographer: 'Zoshua Colah', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'margherita-pizza', url: 'https://unsplash.com/photos/cooked-food-on-round-white-ceramic-plate-cC0_UO1Obg4', photographer: 'Louis Hansel', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'crispy-samosas', url: 'https://unsplash.com/photos/samosas-with-green-chili-and-pomegranate-8T9AVksyt7s', photographer: 'kabir cheema', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'chicken-biryani', url: 'https://unsplash.com/photos/a-white-bowl-filled-with-rice-and-meat-ysmeQt1dzcw', photographer: 'Mario Raj', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'chocolate-raspberry-cake', url: 'https://unsplash.com/photos/round-baked-cake-close-up-photography-ySxSlqeC0YM', photographer: 'Uliana Kopanytsia', site: 'Unsplash', license: 'Unsplash License' },
  { recipeId: 'strawberry-cream-squares', url: 'https://unsplash.com/photos/sliced-strawberry-on-white-cake-B9U3ZQPSWA0', photographer: 'Martin Wettstein', site: 'Unsplash', license: 'Unsplash License' },
];
