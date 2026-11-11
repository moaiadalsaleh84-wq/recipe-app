import AsyncStorage from '@react-native-async-storage/async-storage';
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
  type FilterTag,
  type Goals,
  type GroceryItem,
  type Ingredient,
  type Meal,
  type Recipe,
  type Units,
  type WeekPlan,
} from '../data/mock';

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
  fun: { pets: number; listsDone: number; badges: string[]; lastLevel: number };
  /** Successful imports so far (the free version includes FREE_LIMITS.imports). */
  importsUsed: number;
  /** Ingredients the user has at home, as typed. */
  pantry: string[];
};

const STORAGE_KEY = 'recipe-app-state-v1';

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
  fun: { pets: 0, listsDone: 0, badges: [], lastLevel: 1 },
  importsUsed: 0,
  pantry: [],
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
  addListDone: () => void;
  unlockBadges: (ids: string[]) => void;
  setLastLevel: (n: number) => void;
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
  /** Hand-written recipes, the ones the free limit counts. */
  manualRecipeCount: number;
  deleteRecipe: (id: string) => void;
  /** Your own recipes only. */
  setRecipeImage: (id: string, image: Recipe['image']) => void;
  setNote: (id: string, text: string) => void;
  setUnits: (u: Units) => void;
  setGoals: (g: Goals) => void;
  logCooked: (recipeId: string, servings: number) => void;

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
  addCustomItem: (name: string) => void;
  removeGrocery: (key: string) => void;
  clearCompleted: () => number;
  /** Restores the grocery list as it was before the last change. */
  undoGroceries: () => void;
};

const StoreContext = createContext<Store | null>(null);

export const roundQty = (n: number) => Math.round(n * 10) / 10;
const FRACTIONS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const METRIC = ['g', 'ml'];

/**
 * Kitchen-friendly display: grams and millilitres round to a sensible step,
 * everything else (spoons, counts, cups, oz) to the nearest quarter, shown as a fraction.
 */
export const formatQty = (quantity: number, unit: string) => {
  // 0 means the recipe gives no amount ("salt to taste").
  if (!(quantity > 0)) return '';
  let text: string;
  if (METRIC.includes(unit)) {
    const step = quantity >= 100 ? 5 : 1;
    text = String(Math.max(step, Math.round(quantity / step) * step));
  } else {
    const quarters = Math.max(1, Math.round(quantity * 4)); // never show 0
    const whole = Math.floor(quarters / 4);
    const frac = FRACTIONS[(quarters % 4) / 4] ?? '';
    text = whole ? `${whole}${frac}` : frac;
  }
  return unit ? `${text} ${unit}` : text;
};

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
          setSaved({ ...initialSaved, ...parsed, fun: { ...initialSaved.fun, ...parsed.fun }, profile: { ...initialSaved.profile, ...parsed.profile } });
        }
      })
      .catch(() => {
        // Corrupt or unavailable storage: start fresh rather than crash.
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [saved, hydrated]);

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
  const allRecipes = useMemo(() => [...saved.customRecipes, ...builtInRecipes], [saved.customRecipes]);
  const getRecipe = useCallback((id: string | undefined) => allRecipes.find((r) => r.id === id), [allRecipes]);

  const addRecipe = useCallback(
    (r: Omit<Recipe, 'id' | 'custom'>) => {
      const id = uid('my');
      update((s) => ({ customRecipes: [{ ...r, origin: r.origin ?? 'manual', id, custom: true }, ...s.customRecipes] }));
      return id;
    },
    [update],
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
  const addListDone = useCallback(() => update((s) => ({ fun: { ...s.fun, listsDone: s.fun.listsDone + 1 } })), [update]);
  const unlockBadges = useCallback(
    (ids: string[]) => update((s) => ({ fun: { ...s.fun, badges: [...s.fun.badges, ...ids.filter((id) => !s.fun.badges.includes(id))] } })),
    [update],
  );
  const setLastLevel = useCallback((n: number) => update((s) => ({ fun: { ...s.fun, lastLevel: n } })), [update]);
  const logCooked = useCallback(
    (recipeId: string, servings: number) => update((s) => ({ cooked: [{ recipeId, servings, date: new Date().toISOString() }, ...s.cooked] })),
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
      setGroceries((prev) => {
        const next = [...prev];
        for (const ing of ingredients) {
          const key = `${ing.id}|${ing.unit}`;
          const qty = roundQty(ing.quantity * scale);
          const idx = next.findIndex((i) => i.key === key);
          if (idx >= 0) {
            const existing = next[idx];
            next[idx] = {
              ...existing,
              quantity: roundQty(existing.quantity + qty),
              checked: false,
              recipeIds: existing.recipeIds.includes(recipeId) ? existing.recipeIds : [...existing.recipeIds, recipeId],
            };
          } else {
            next.push({ key, name: ing.name, quantity: qty, unit: ing.unit, aisle: ing.aisle, recipeIds: [recipeId], checked: false });
          }
        }
        return next;
      });
      return ingredients.length;
    },
    [setGroceries],
  );

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
      addListDone,
      unlockBadges,
      setLastLevel,
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
      manualRecipeCount,
      deleteRecipe,
      setRecipeImage,
      setNote,
      setUnits,
      setGoals,
      logCooked,
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
      addCustomItem,
      removeGrocery,
      clearCompleted,
      undoGroceries,
    }),
    [
      saved, hydrated, setBuddy, setProfile, completeOnboarding, setPro, addPet, addListDone, unlockBadges, setLastLevel, countImport, draft, addPantry, removePantry, restorePantry, allRecipes, getRecipe, addRecipe, manualRecipeCount, deleteRecipe, setRecipeImage, setNote, setUnits, setGoals, logCooked,
      category, tags, toggleTag, showOnlyTag, clearFilters, isFavorite, toggleFavorite, addCookbook, renameCookbook,
      deleteCookbook, restoreCookbook, toggleInCookbook, setMeal, toggleGrocery, addIngredients, addCustomItem,
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

/** The user's chosen buddy (defaults to Biscuit before onboarding finishes). */
export const useBuddy = (): BuddyId => useStore().buddy ?? 'biscuit';

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
