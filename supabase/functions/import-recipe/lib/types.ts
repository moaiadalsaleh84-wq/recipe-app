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

export type ImportedIngredient = {
  /** null when the source gives no amount ("salt to taste"). */
  amount: number | null;
  /** "" for countable items ("2 eggs"). */
  unit: string;
  name: string;
  /** The ingredient line as written in the source, for the review screen. */
  original: string;
};

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
  nutrition: { calories: number; protein: number; carbs: number; fat: number; estimated: true; basis: 'source' | 'ai' } | null;
  /** Photo URL from the source page, if it had one. */
  imageUrl: string | null;
  sourceUrl: string | null;
};

export type ImportSuccess = {
  ok: true;
  /** "complete": everything needed to cook. "partial": the app opens the edit form. */
  status: 'complete' | 'partial';
  recipe: ImportedRecipe;
  missing: MissingField[];
  /** Plain-language notes for the user, e.g. "2 ingredients were left out because they weren't in the source". */
  warnings: string[];
  source: { kind: SourceKind; host: string | null; usedStructuredData: boolean; usedAi: boolean };
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
  partial?: { title?: string; sourceUrl?: string; text?: string; imageUrl?: string };
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
