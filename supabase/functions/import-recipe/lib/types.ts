/**
 * The contract between the Pantry Pop app and the import backend.
 * The app has a copy of these shapes in src/lib/importApi.ts. Keep them in sync.
 */

export const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'] as const;
export const TAGS = ['Vegetarian', 'Vegan', 'One pan', 'High protein', 'Gluten free', 'Kid friendly'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Tag = (typeof TAGS)[number];

/** What can be missing from an import. The app turns these into a message and opens the edit form. */
export const MISSING_FIELDS = ['title', 'ingredients', 'steps', 'amounts', 'servings', 'minutes'] as const;
export type MissingField = (typeof MISSING_FIELDS)[number];

export type SourceKind = 'website' | 'tiktok' | 'instagram' | 'youtube' | 'text';

/**
 * Who made the recipe, so the app can always credit them. From TikTok's / YouTube's oEmbed
 * (author_name, author_url) or a website's og:site_name. Never a scraped profile picture.
 */
export type SourceCredit = {
  /** "@pastaqueen" for videos (from the profile link, else the author name). */
  handle: string | null;
  /** The creator's profile page. */
  profileUrl: string | null;
  /** "BBC Good Food" for websites (og:site_name, else the host). */
  siteName: string | null;
};

export type ImportedIngredient = {
  /** null when the source gives no amount ("salt to taste"). */
  amount: number | null;
  /** "" for countable items ("2 eggs"). */
  unit: string;
  name: string;
  /** The ingredient line as written in the source, for the review screen. */
  original: string;
  /** Stable id within the recipe ("i1"), used by steps. */
  id?: string;
  /** "finely chopped", "drained". No amounts (they wouldn't scale). */
  note?: string;
  /** The amount (or the whole ingredient, for basics like oil and salt) was suggested, not in the source. */
  estimated?: boolean;
};

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Per step: which ingredients it uses, its timer, and whether the step was written by the AI. */
export type ImportedStepMeta = { ingredientIds: string[]; timerSeconds: number | null; estimated: boolean };

export type DietFlags = { vegetarian: boolean; vegan: boolean; glutenFree: boolean; dairyFree: boolean; porkFree: boolean };

/** What the AI had to suggest because the source didn't say. The app marks these "est.". */
export type EstimatedParts = { servings: boolean; time: boolean; steps: boolean; amounts: boolean; ingredients: boolean };

export type ImportedRecipe = {
  title: string;
  /** null when the source doesn't say. */
  servings: number | null;
  minutes: number | null;
  ingredients: ImportedIngredient[];
  steps: string[];
  category: Category | null;
  tags: Tag[];
  /** Always an estimate. null if it couldn't be estimated. */
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    estimated: true;
    basis: 'source' | 'ai';
    /** What one serving is, when the source says it: "3 tenders". */
    servingSize?: string;
    /** Dips, sauces and absorbed frying oil, with their calories per serving (already in the total). */
    breakdown?: { name: string; calories: number }[];
  } | null;
  /** Photo URL from the source page, if it had one. */
  imageUrl: string | null;
  sourceUrl: string | null;
  /* Added in import v2 (older apps ignore them). */
  description?: string;
  mealType?: MealType | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  /** One entry per step, same order as `steps`. */
  stepMeta?: ImportedStepMeta[];
  diet?: DietFlags | null;
  estimated?: EstimatedParts;
};

export type ImportSuccess = {
  ok: true;
  /** "complete": everything needed to cook. "partial": the app opens the edit form. */
  status: 'complete' | 'partial';
  recipe: ImportedRecipe;
  missing: MissingField[];
  /** Plain-language notes for the user, e.g. "2 ingredients were left out because they weren't in the source". */
  warnings: string[];
  source: { kind: SourceKind; host: string | null; usedStructuredData: boolean; usedAi: boolean; credit: SourceCredit | null };
  /** What the recipe checks fixed or couldn't fix (for logs and tests; not shown to people). */
  checks?: string[];
};

export type ImportErrorCode =
  | 'invalid_input' // not a link or text we can use
  | 'rate_limited'
  | 'daily_cap' // the server-wide safety cap for the day was reached
  | 'fetch_failed' // the page couldn't be loaded
  | 'blocked' // the site refused automated access (common for Instagram)
  | 'no_text' // e.g. a video whose caption has no recipe in it
  | 'not_a_recipe'
  | 'ai_unavailable' // no API key configured, or the AI call failed
  | 'server_error';

export type ImportFailure = {
  ok: false;
  code: ImportErrorCode;
  /** Shown to the user as is. */
  message: string;
  /** Seconds until trying again makes sense (rate limits). */
  retryAfter?: number;
  /** Whatever we did find (a video title, the link), so the app can still pre-fill the form. */
  partial?: { title?: string; sourceUrl?: string; text?: string; imageUrl?: string; credit?: SourceCredit };
  source?: { kind: SourceKind; host: string | null };
};

export type ImportResponse = ImportSuccess | ImportFailure;

export type ImportRequest = { url?: string; text?: string };

/** Everything we gathered about a source before asking the AI. */
export type SourceMaterial = {
  kind: SourceKind;
  url: string | null;
  host: string | null;
  title: string | null;
  /** The text we have: structured data rendered as text, a caption, or page text. */
  text: string;
  imageUrl: string | null;
  /** Who to credit (videos: the creator; websites: the site). */
  credit?: SourceCredit | null;
  /** A schema.org Recipe found on the page, already normalized. */
  structured: StructuredRecipe | null;
};

export type StructuredRecipe = {
  title: string | null;
  servings: number | null;
  minutes: number | null;
  ingredients: string[];
  steps: string[];
  imageUrl: string | null;
  category: string | null;
  keywords: string[];
  nutrition: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null } | null;
};
