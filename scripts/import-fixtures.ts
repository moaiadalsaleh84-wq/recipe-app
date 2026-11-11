/** Sample pages for the dev server's FIXTURES mode (the app's automated tests use these). */
export const FIXTURE_PAGES: Record<string, string> = {
  'https://recipes.example.com/lemon-pasta': `<!doctype html><html><head><title>Lemon Garlic Pasta</title>
<meta property="og:image" content="https://recipes.example.com/pasta.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Example"},{"@type":"Recipe","name":"Lemon Garlic Pasta",
"recipeYield":["4","4 servings"],"totalTime":"PT25M","recipeCategory":"Dinner","keywords":"pasta, vegetarian",
"recipeIngredient":["400 g spaghetti","3 tablespoons olive oil","4 cloves garlic, thinly sliced","1 lemon, zest and juice","50 g parmesan, grated","Salt to taste"],
"recipeInstructions":[{"@type":"HowToStep","text":"Cook the spaghetti in salted water for 10 minutes."},{"@type":"HowToStep","text":"Fry the garlic in olive oil for 1 minute."},{"@type":"HowToStep","text":"Toss the pasta with the garlic oil, lemon and parmesan."}],
"nutrition":{"@type":"NutritionInformation","calories":"560 kcal","proteinContent":"18 g","carbohydrateContent":"78 g","fatContent":"18 g"}}]}</script>
</head><body><article>Story…</article></body></html>`,
  'https://recipes.example.com/no-method': `<!doctype html><html><head><title>Nan's Stew</title></head><body><main><h1>Nan's Stew</h1>
<p>My nan's stew. You need 500 g beef, 3 carrots, 2 onions and 1 l beef stock. She never wrote down how she made it!</p></main></body></html>`,
  'https://recipes.example.com/about-us': `<!doctype html><html><head><title>About us</title></head><body><main><h1>About us</h1><p>We are a small team of food lovers who started this blog in 2015 to share stories from our travels around the world.</p></main></body></html>`,
};
