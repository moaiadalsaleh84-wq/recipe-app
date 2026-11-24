import { addWeekToList, mergeIngredients, weekId } from '../lib/groceries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BuddyId } from '../components/cats/types';
import { emptyProfile, type Profile } from '../data/onboarding';
import type { RecipeDraft } from '../lib/importApi';
import type { Entitlement } from '../lib/purchases';
import {
  FAVORITES_ID,
  defaultGoals,
  recipes as builtInRecipes,
  type Aisle,
  type Category,
  type Cookbook,
  type CookedEntry,
  type Rating,
  type FilterTag,
  type Goals,
  type GroceryItem,
  type Ingredient,
  type Meal,
  type Recipe,
  type Units,
  type WeekPlan,
} from '../data/mock';
import { pantryPopRecipes } from '../data/pantryPop';
import { withoutDuplicates } from '../lib/pantryPopImport';
import { normalizeSourceUrl, removeDuplicateImports } from '../lib/sourceLink';

/** Everything that survives an app restart. */
type Saved = {
  buddy: BuddyId | null;
  favorites: string[];
  plan: WeekPlan;
  groceries: GroceryItem[];
  cookbooks: Cookbook[];
  customRecipes: Recipe[];
  notes: Record<string, string>;
  cooked: CookedEntry[];
  units: Units;
  goals: Goals;
  /** Finished the welcome quiz. */
  onboarded: boolean;
  /** Answers from onboarding. */
  profile: Profile;
  /** Active Pro subscription (or trial), if any. */
  pro: Entitlement | null;
  /** Fun stuff: counters behind XP, levels and badges. */
  /** bonusXp and stickers are newer, optional fields (older saves don't have them). */
  fun: { pets: number; listsDone: number; badges: string[]; lastLevel: number; bonusXp?: number; stickers?: string[]; /** The "Tap to watch the original video" hint was shown once. */ seenImportHint?: boolean; /** One-time fixes already run on saved imports (see ImportUpkeep). */ upkeep?: string[] };
  /** Successful imports so far (the free version includes FREE_LIMITS.imports). */
  importsUsed: number;
  /** Ingredients the user has at home, as typed. */
  pantry: string[];
  /** Planned meals already added to groceries this week (see addWeekToList), so adding the week twice adds nothing. */
  planAdded: string[];
};

const STORAGE_KEY = 'recipe-app-state-v1';

export { groceryName } from '../lib/groceries';

const initialSaved: Saved = {
  buddy: null,
  // A new user starts empty: no pretend favorites, plans or shopping lists.
  favorites: [],
  plan: {},
  groceries: [],
  cookbooks: [],
  customRecipes: [],
  notes: {},
  cooked: [],
  units: 'metric',
  goals: defaultGoals,
  onboarded: false,
  profile: emptyProfile,
  pro: null,
  fun: { pets: 0, listsDone: 0, badges: [], lastLevel: 1, bonusXp: 0, stickers: [] },
  importsUsed: 0,
  pantry: [],
  planAdded: [],
};

/** What the free version includes. `customRecipes` counts recipes written by hand, not imports. */
export const FREE_LIMITS = { customRecipes: 5, cookbooks: 3, imports: 3, pantry: 10 };

/**
 * App state, saved on the device. Screens only use the functions exposed here,
 * so swapping AsyncStorage for a backend later won't touch the UI.
 */
type Store = Saved & {
  hydrated: boolean;
  setBuddy: (b: BuddyId) => void;
  setProfile: (p: Partial<Profile>) => void;
  completeOnboarding: () => void;
  setPro: (e: Entitlement | null) => void;
  /** Fun counters */
  addPet: () => void;
  /** The after-cook surprise: extra XP (Lucky pan) or a sticker for the Sticker book. */
  claimBonus: (b: { xp?: number; sticker?: string }) => void;
  addListDone: () => void;
  unlockBadges: (ids: string[]) => void;
  setLastLevel: (n: number) => void;
  markImportHintSeen: () => void;
  /** Remembers that a one-time fix for saved imports has run. */
  markUpkeepDone: (job: string) => void;
  isPro: boolean;

  // Import
  countImport: () => void;
  /** Pre-fill for the recipe form (not saved across restarts). */
  draft: RecipeDraft | null;
  setDraft: (d: RecipeDraft | null) => void;

  // Pantry
  addPantry: (name: string) => boolean;
  removePantry: (name: string) => void;
  restorePantry: (items: string[]) => void;

  // Recipes
  allRecipes: Recipe[];
  getRecipe: (id: string | undefined) => Recipe | undefined;
  addRecipe: (r: Omit<Recipe, 'id' | 'custom'>) => string;
  updateRecipe: (id: string, patch: Partial<Omit<Recipe, 'id' | 'custom'>>) => void;
  /** Your recipe saved from this link already (any form of the same link), if any. */
  findBySource: (url: string | null | undefined) => Recipe | undefined;
  /** Hand-written recipes, the ones the free limit counts. */
  manualRecipeCount: number;
  deleteRecipe: (id: string) => void;
  /** Your own recipes only. */
  setRecipeImage: (id: string, image: Recipe['image']) => void;
  setNote: (id: string, text: string) => void;
  setUnits: (u: Units) => void;
  setGoals: (g: Goals) => void;
  /** Logs a cooked meal and returns its id (its date), for the rating and photo. */
  logCooked: (recipeId: string, servings: number) => string;
  /** "How'd it taste?" on the Finish screen. */
  rateCooked: (date: string, rating: Rating) => void;
  /** "Snap your plate": a photo of what you cooked. */
  setCookedPhoto: (date: string, photo: string) => void;

  // Filters (shared so recipe tags can apply a filter on the Recipes tab)
  category: Category | null;
  tags: FilterTag[];
  setCategory: (c: Category | null) => void;
  toggleTag: (t: FilterTag) => void;
  showOnlyTag: (t: FilterTag) => void;
  clearFilters: () => void;

  // Favorites and cookbooks
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => boolean; // returns new state
  addCookbook: (name: string) => string;
  renameCookbook: (id: string, name: string) => void;
  deleteCookbook: (id: string) => Cookbook | undefined;
  restoreCookbook: (cb: Cookbook) => void;
  toggleInCookbook: (cookbookId: string, recipeId: string) => boolean; // returns new membership

  // Plan
  setMeal: (day: number, meal: Meal, recipeId: string | null) => void;

  // Groceries
  toggleGrocery: (key: string) => void;
  addIngredients: (recipeId: string, ingredients: Ingredient[], scale?: number) => number;
  /** Adds every planned meal of this week that isn't on the list yet. Returns what was new. */
  addWeekToGroceries: () => { meals: number; items: number };
  addCustomItem: (name: string) => void;
  removeGrocery: (key: string) => void;
  clearCompleted: () => number;
  /** Restores the grocery list as it was before the last change. */
  undoGroceries: () => void;
};

const StoreContext = createContext<Store | null>(null);

export { formatQty, nameFor, roundQty } from '../lib/qty';

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(initialSaved);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState<FilterTag[]>([]);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const lastGroceries = useRef<GroceryItem[] | null>(null);

  /* ---------- persistence ---------- */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Saved>;
          const loaded: Saved = { ...initialSaved, ...parsed, fun: { ...initialSaved.fun, ...parsed.fun }, profile: { ...initialSaved.profile, ...parsed.profile } };
          // The same link imported twice (before imports checked for it): keep the newest copy.
          setSaved(removeDuplicateImports(loaded).saved);
        }
      })
      .catch(() => {
        // Corrupt or unavailable storage: start fresh rather than crash.
      })
      .finally(() => setHydrated(true));
  }, []);

  // Saves a moment after each change (so a burst of taps is one write), and right away when the
  // app goes to the background or the page closes, so the last change is never lost.
  const pending = useRef<string | null>(null);
  const flush = useCallback(() => {
    if (pending.current === null) return;
    AsyncStorage.setItem(STORAGE_KEY, pending.current).catch(() => {});
    pending.current = null;
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    pending.current = JSON.stringify(saved);
    const id = setTimeout(flush, 300);
    return () => clearTimeout(id);
  }, [saved, hydrated, flush]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) window.addEventListener('pagehide', flush);
    return () => {
      sub.remove();
      if (web) window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  const update = useCallback((fn: (s: Saved) => Partial<Saved>) => setSaved((s) => ({ ...s, ...fn(s) })), []);

  /** Every grocery mutation goes through here so it can be undone. */
  const setGroceries = useCallback(
    (fn: (prev: GroceryItem[]) => GroceryItem[]) =>
      setSaved((s) => {
        lastGroceries.current = s.groceries;
        return { ...s, groceries: fn(s.groceries) };
      }),
    [],
  );

  /* ---------- recipes ---------- */
  // Built-in recipes, then the checked recipes from data/pantry-pop-recipes.json. An imported recipe
  // whose title is already used is skipped: the existing one wins.
  const allRecipes = useMemo(() => {
    const existing = [...saved.customRecipes, ...builtInRecipes];
    return [...existing, ...withoutDuplicates(pantryPopRecipes, existing).kept];
  }, [saved.customRecipes]);
  const getRecipe = useCallback((id: string | undefined) => allRecipes.find((r) => r.id === id), [allRecipes]);

  const addRecipe = useCallback(
    (r: Omit<Recipe, 'id' | 'custom'>) => {
      const id = uid('my');
      update((s) => ({ customRecipes: [{ ...r, origin: r.origin ?? 'manual', id, custom: true, addedAt: new Date().toISOString() }, ...s.customRecipes] }));
      return id;
    },
    [update],
  );
  /** Your recipe imported from this link already (any form of the same link), if any. */
  const findBySource = useCallback(
    (url: string | null | undefined) => {
      const key = normalizeSourceUrl(url);
      return key ? saved.customRecipes.find((r) => normalizeSourceUrl(r.sourceUrl) === key) : undefined;
    },
    [saved.customRecipes],
  );
  const manualRecipeCount = useMemo(() => saved.customRecipes.filter((r) => r.origin !== 'import').length, [saved.customRecipes]);
  const countImport = useCallback(() => update((s) => ({ importsUsed: s.importsUsed + 1 })), [update]);

  /* ---------- pantry ---------- */
  const addPantry = useCallback(
    (name: string) => {
      const clean = name.trim().replace(/\s+/g, ' ');
      if (!clean || saved.pantry.some((p) => p.toLowerCase() === clean.toLowerCase())) return false;
      update((s) => ({ pantry: [clean.charAt(0).toUpperCase() + clean.slice(1), ...s.pantry] }));
      return true;
    },
    [saved.pantry, update],
  );
  const removePantry = useCallback((name: string) => update((s) => ({ pantry: s.pantry.filter((p) => p !== name) })), [update]);
  const restorePantry = useCallback((items: string[]) => update(() => ({ pantry: items })), [update]);

  const deleteRecipe = useCallback(
    (id: string) =>
      update((s) => {
        const plan: WeekPlan = {};
        for (const [day, p] of Object.entries(s.plan)) {
          plan[Number(day)] = Object.fromEntries(Object.entries(p).filter(([, rid]) => rid !== id));
        }
        return {
          customRecipes: s.customRecipes.filter((r) => r.id !== id),
          favorites: s.favorites.filter((x) => x !== id),
          cookbooks: s.cookbooks.map((c) => ({ ...c, recipeIds: c.recipeIds.filter((x) => x !== id) })),
          plan,
        };
      }),
    [update],
  );

  /** Saves edits to one of your own recipes (imported or written). */
  const updateRecipe = useCallback(
    (id: string, patch: Partial<Omit<Recipe, 'id' | 'custom'>>) => update((s) => ({ customRecipes: s.customRecipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    [update],
  );
  const setRecipeImage = useCallback(
    (id: string, image: Recipe['image']) => update((s) => ({ customRecipes: s.customRecipes.map((r) => (r.id === id ? { ...r, image } : r)) })),
    [update],
  );

  const setNote = useCallback((id: string, text: string) => update((s) => ({ notes: { ...s.notes, [id]: text } })), [update]);
  const setUnits = useCallback((units: Units) => update(() => ({ units })), [update]);
  const setGoals = useCallback((goals: Goals) => update(() => ({ goals })), [update]);
  const setBuddy = useCallback((buddy: BuddyId) => update(() => ({ buddy })), [update]);
  const setProfile = useCallback((p: Partial<Profile>) => update((s) => ({ profile: { ...s.profile, ...p } })), [update]);
  const completeOnboarding = useCallback(() => update(() => ({ onboarded: true })), [update]);
  const setPro = useCallback((pro: Entitlement | null) => update(() => ({ pro })), [update]);
  const addPet = useCallback(() => update((s) => ({ fun: { ...s.fun, pets: s.fun.pets + 1 } })), [update]);
  const claimBonus = useCallback(
    (b: { xp?: number; sticker?: string }) =>
      update((s) => {
        const have = s.fun.stickers ?? [];
        return { fun: { ...s.fun, bonusXp: (s.fun.bonusXp ?? 0) + (b.xp ?? 0), stickers: b.sticker && !have.includes(b.sticker) ? [...have, b.sticker] : have } };
      }),
    [update],
  );
  const addListDone = useCallback(() => update((s) => ({ fun: { ...s.fun, listsDone: s.fun.listsDone + 1 } })), [update]);
  const unlockBadges = useCallback(
    (ids: string[]) => update((s) => ({ fun: { ...s.fun, badges: [...s.fun.badges, ...ids.filter((id) => !s.fun.badges.includes(id))] } })),
    [update],
  );
  const setLastLevel = useCallback((n: number) => update((s) => ({ fun: { ...s.fun, lastLevel: n } })), [update]);
  const markImportHintSeen = useCallback(() => update((s) => (s.fun.seenImportHint ? {} : { fun: { ...s.fun, seenImportHint: true } })), [update]);
  const markUpkeepDone = useCallback(
    (job: string) => update((s) => (s.fun.upkeep?.includes(job) ? {} : { fun: { ...s.fun, upkeep: [...(s.fun.upkeep ?? []), job] } })),
    [update],
  );
  const logCooked = useCallback(
    (recipeId: string, servings: number) => {
      const date = new Date().toISOString();
      update((s) => ({ cooked: [{ recipeId, servings, date }, ...s.cooked] }));
      return date;
    },
    [update],
  );
  const rateCooked = useCallback(
    (date: string, rating: Rating) => update((s) => ({ cooked: s.cooked.map((c) => (c.date === date ? { ...c, rating } : c)) })),
    [update],
  );
  const setCookedPhoto = useCallback(
    (date: string, photo: string) => update((s) => ({ cooked: s.cooked.map((c) => (c.date === date ? { ...c, photo } : c)) })),
    [update],
  );

  /* ---------- filters ---------- */
  const toggleTag = useCallback((t: FilterTag) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])), []);
  const showOnlyTag = useCallback((t: FilterTag) => {
    setCategory(null);
    setTags([t]);
  }, []);
  const clearFilters = useCallback(() => {
    setCategory(null);
    setTags([]);
  }, []);

  /* ---------- favorites & cookbooks ---------- */
  const isFavorite = useCallback((id: string) => saved.favorites.includes(id), [saved.favorites]);
  const toggleFavorite = useCallback(
    (id: string) => {
      const next = !saved.favorites.includes(id);
      update((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites] }));
      return next;
    },
    [saved.favorites, update],
  );

  const addCookbook = useCallback(
    (name: string) => {
      const id = uid('cb');
      update((s) => ({ cookbooks: [...s.cookbooks, { id, name: name.trim() || 'New cookbook', recipeIds: [] }] }));
      return id;
    },
    [update],
  );
  const renameCookbook = useCallback(
    (id: string, name: string) => update((s) => ({ cookbooks: s.cookbooks.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)) })),
    [update],
  );
  const deleteCookbook = useCallback(
    (id: string) => {
      const cb = saved.cookbooks.find((c) => c.id === id);
      update((s) => ({ cookbooks: s.cookbooks.filter((c) => c.id !== id) }));
      return cb;
    },
    [saved.cookbooks, update],
  );
  const restoreCookbook = useCallback((cb: Cookbook) => update((s) => ({ cookbooks: [...s.cookbooks, cb] })), [update]);
  const toggleInCookbook = useCallback(
    (cookbookId: string, recipeId: string) => {
      if (cookbookId === FAVORITES_ID) return toggleFavorite(recipeId);
      const cb = saved.cookbooks.find((c) => c.id === cookbookId);
      const next = !cb?.recipeIds.includes(recipeId);
      update((s) => ({
        cookbooks: s.cookbooks.map((c) =>
          c.id !== cookbookId ? c : { ...c, recipeIds: c.recipeIds.includes(recipeId) ? c.recipeIds.filter((x) => x !== recipeId) : [recipeId, ...c.recipeIds] },
        ),
      }));
      return next;
    },
    [saved.cookbooks, toggleFavorite, update],
  );

  /* ---------- plan ---------- */
  const setMeal = useCallback(
    (day: number, meal: Meal, recipeId: string | null) =>
      update((s) => {
        const dayPlan = { ...s.plan[day] };
        if (recipeId) dayPlan[meal] = recipeId;
        else delete dayPlan[meal];
        return { plan: { ...s.plan, [day]: dayPlan } };
      }),
    [update],
  );

  /* ---------- groceries ---------- */
  const toggleGrocery = useCallback(
    (key: string) => setGroceries((prev) => prev.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i))),
    [setGroceries],
  );

  const addIngredients = useCallback(
    (recipeId: string, ingredients: Ingredient[], scale = 1) => {
      setGroceries((prev) => mergeIngredients(prev, recipeId, ingredients, scale));
      return ingredients.length;
    },
    [setGroceries],
  );

  /** "Add this week to groceries": safe to repeat. Each planned meal is added once per week. */
  const addWeekToGroceries = useCallback(() => {
    let result = { meals: 0, items: 0 };
    setSaved((s) => {
      const all = [...s.customRecipes, ...builtInRecipes, ...pantryPopRecipes];
      const out = addWeekToList(s.groceries, s.plan, s.planAdded ?? [], (id) => all.find((r) => r.id === id)?.ingredients, weekId());
      result = { meals: out.meals, items: out.items };
      if (out.meals === 0) return s;
      lastGroceries.current = s.groceries;
      return { ...s, groceries: out.list, planAdded: out.added };
    });
    return result;
  }, []);

  const addCustomItem = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const aisle: Aisle = 'Other';
      setGroceries((prev) => [{ key: `${uid('item')}|`, name: clean, quantity: 1, unit: '', aisle, recipeIds: [], checked: false }, ...prev]);
    },
    [setGroceries],
  );

  const removeGrocery = useCallback((key: string) => setGroceries((prev) => prev.filter((i) => i.key !== key)), [setGroceries]);

  const clearCompleted = useCallback(() => {
    const count = saved.groceries.filter((i) => i.checked).length;
    setGroceries((prev) => prev.filter((i) => !i.checked));
    return count;
  }, [saved.groceries, setGroceries]);

  const undoGroceries = useCallback(() => {
    if (lastGroceries.current) {
      const previous = lastGroceries.current;
      lastGroceries.current = null;
      setSaved((s) => ({ ...s, groceries: previous }));
    }
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...saved,
      hydrated,
      setBuddy,
      setProfile,
      completeOnboarding,
      setPro,
      addPet,
      claimBonus,
      addListDone,
      unlockBadges,
      setLastLevel,
      markImportHintSeen,
      markUpkeepDone,
      isPro: !!saved.pro,
      countImport,
      draft,
      setDraft,
      addPantry,
      removePantry,
      restorePantry,
      allRecipes,
      getRecipe,
      addRecipe,
      updateRecipe,
      findBySource,
      manualRecipeCount,
      deleteRecipe,
      setRecipeImage,
      setNote,
      setUnits,
      setGoals,
      logCooked,
      rateCooked,
      setCookedPhoto,
      category,
      tags,
      setCategory,
      toggleTag,
      showOnlyTag,
      clearFilters,
      isFavorite,
      toggleFavorite,
      addCookbook,
      renameCookbook,
      deleteCookbook,
      restoreCookbook,
      toggleInCookbook,
      setMeal,
      toggleGrocery,
      addIngredients,
      addWeekToGroceries,
      addCustomItem,
      removeGrocery,
      clearCompleted,
      undoGroceries,
    }),
    [
      saved, hydrated, setBuddy, setProfile, completeOnboarding, setPro, addPet, claimBonus, addListDone, unlockBadges, setLastLevel, markImportHintSeen, markUpkeepDone, countImport, draft, addPantry, removePantry, restorePantry, allRecipes, getRecipe, addRecipe, updateRecipe, findBySource, manualRecipeCount, deleteRecipe, setRecipeImage, setNote, setUnits, setGoals, logCooked, rateCooked, setCookedPhoto,
      category, tags, toggleTag, showOnlyTag, clearFilters, isFavorite, toggleFavorite, addCookbook, renameCookbook,
      deleteCookbook, restoreCookbook, toggleInCookbook, setMeal, toggleGrocery, addIngredients, addWeekToGroceries, addCustomItem,
      removeGrocery, clearCompleted, undoGroceries,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}


/** Nutrition totals for a list of recipe ids (one serving each). */
export function totalsFor(ids: (string | undefined)[], getRecipe: (id: string | undefined) => Recipe | undefined) {
  return ids.reduce(
    (acc, id) => {
      const r = getRecipe(id);
      if (!r) return acc;
      return {
        calories: acc.calories + r.calories,
        protein: acc.protein + r.nutrition.protein,
        carbs: acc.carbs + r.nutrition.carbs,
        fat: acc.fat + r.nutrition.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
