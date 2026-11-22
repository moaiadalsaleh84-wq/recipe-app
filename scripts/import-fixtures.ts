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

/*
 * Simulated TikTok / YouTube / recipe-site answers for FIXTURES mode, so the whole import (short
 * link → full link → oEmbed → picture → credit) can be tested without reaching those sites.
 * Pictures are free Unsplash photos shaped like real thumbnails (TikTok 9:16, YouTube 16:9).
 */
const TIKTOK_FULL = 'https://www.tiktok.com/@pastaqueen/video/7400000000000000001';
const TIKTOK_CAPTION =
  'Viral baked feta pasta 🍝 200g feta, 500g cherry tomatoes, 3 tbsp olive oil, 2 garlic cloves, 300g penne, fresh basil. Bake the feta and tomatoes 30 min at 200C, smash, stir in the cooked pasta and basil #feta #pasta #fyp';
const YT_ID = 'tacoNight01';
const YT_DESCRIPTION =
  'Crispy beef tacos at home!\n\nIngredients\n500 g ground beef\n1 onion\n2 cloves garlic\n2 tsp chili powder\n8 small tortillas\n150 g cheddar\n\nMethod\nBrown the beef with the onion and garlic.\nStir in the spices.\nFill the tortillas with beef and cheese and fry until crisp.';
const json = (body: unknown) => ({ status: 200, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const page = (body: string) => ({ status: 200, body, headers: { 'content-type': 'text/html' } });
const sitePage = (image: string | null) =>
  page(`<!doctype html><html><head><title>Smash Falafel Pita</title><meta property="og:site_name" content="Falafel Friday">${image ? `<meta property="og:image" content="${image}">` : ''}
<script type="application/ld+json">{"@type":"Recipe","name":"Smash Falafel Pita","recipeYield":"4","totalTime":"PT25M","recipeIngredient":["400 g chickpeas","1 onion","2 cloves garlic","4 pita breads","4 tbsp tahini"],"recipeInstructions":["Blitz the chickpeas, onion and garlic.","Smash the mix onto the pitas and fry until crisp.","Drizzle with tahini."]}</script></head><body></body></html>`);

export const FIXTURE_ROUTES: Record<string, { status: number; body: string; headers: Record<string, string> }> = {
  // A vm.tiktok.com share link redirects to the full video; TikTok refuses the page itself.
  'https://vm.tiktok.com/ZMfeta123/': { status: 301, body: '', headers: { location: `${TIKTOK_FULL}?_r=1` } },
  [TIKTOK_FULL]: { status: 403, body: 'blocked', headers: { 'content-type': 'text/html' } },
  [`https://www.tiktok.com/oembed?url=${encodeURIComponent(TIKTOK_FULL)}`]: json({
    title: TIKTOK_CAPTION,
    author_name: 'Pasta Queen 🍝',
    author_url: 'https://www.tiktok.com/@pastaqueen',
    thumbnail_url: 'https://images.unsplash.com/photo-1565805403925-fe49242d1892?w=720&h=1280&fit=crop',
  }),
  // A YouTube video and the same video as a Short.
  'https://www.youtube.com/oembed': json({
    title: 'Crispy Beef Tacos at Home',
    author_name: 'Taco Tuesday Kitchen',
    author_url: 'https://www.youtube.com/@tacotuesday',
    thumbnail_url: 'https://images.unsplash.com/photo-1648437595587-e6a8b0cdf1f9?w=1280&h=720&fit=crop',
  }),
  [`https://www.youtube.com/watch?v=${YT_ID}`]: page(`<html><script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":${JSON.stringify(YT_DESCRIPTION)}}};</script></html>`),
  // A recipe website, with and without a picture.
  'https://falafel.example.com/smash-falafel': sitePage('https://images.unsplash.com/photo-1788795567489-22430aa94402?w=1600'),
  'https://falafel.example.com/no-picture': sitePage(null),
};
