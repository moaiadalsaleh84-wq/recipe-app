import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  initialFavorites,
  initialGroceries,
  initialPlan,
  type Aisle,
  type Category,
  type FilterTag,
  type GroceryItem,
  type Ingredient,
  type Meal,
  type WeekPlan,
} from '../data/mock';

/**
 * In-memory app state. Swap the internals for persistence or an API later;
 * screens only use the functions exposed here.
 */
type Store = {
  // Recipe filters (shared so recipe tags can apply a filter on the Recipes tab)
  category: Category | null;
  tags: FilterTag[];
  setCategory: (c: Category | null) => void;
  toggleTag: (t: FilterTag) => void;
  showOnlyTag: (t: FilterTag) => void;
  clearFilters: () => void;

  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => boolean; // returns new state

  plan: WeekPlan;
  setMeal: (day: number, meal: Meal, recipeId: string | null) => void;

  groceries: GroceryItem[];
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
 * everything else (spoons, counts, bunches) to the nearest quarter, shown as a fraction.
 */
export const formatQty = (quantity: number, unit: string) => {
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState<FilterTag[]>([]);
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const [plan, setPlan] = useState<WeekPlan>(initialPlan);
  const [groceries, setGroceriesState] = useState<GroceryItem[]>(initialGroceries);
  const lastGroceries = useRef<GroceryItem[] | null>(null);

  /** Every grocery mutation goes through here so it can be undone. */
  const setGroceries = useCallback((update: (prev: GroceryItem[]) => GroceryItem[]) => {
    setGroceriesState((prev) => {
      lastGroceries.current = prev;
      return update(prev);
    });
  }, []);

  const toggleTag = useCallback((t: FilterTag) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }, []);
  const showOnlyTag = useCallback((t: FilterTag) => {
    setCategory(null);
    setTags([t]);
  }, []);
  const clearFilters = useCallback(() => {
    setCategory(null);
    setTags([]);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  const toggleFavorite = useCallback(
    (id: string) => {
      const next = !favorites.includes(id);
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
      return next;
    },
    [favorites],
  );

  const setMeal = useCallback((day: number, meal: Meal, recipeId: string | null) => {
    setPlan((prev) => {
      const dayPlan = { ...prev[day] };
      if (recipeId) dayPlan[meal] = recipeId;
      else delete dayPlan[meal];
      return { ...prev, [day]: dayPlan };
    });
  }, []);

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
      setGroceries((prev) => [
        { key: `custom-${Date.now()}|`, name: clean, quantity: 1, unit: '', aisle, recipeIds: [], checked: false },
        ...prev,
      ]);
    },
    [setGroceries],
  );

  const removeGrocery = useCallback(
    (key: string) => setGroceries((prev) => prev.filter((i) => i.key !== key)),
    [setGroceries],
  );

  const clearCompleted = useCallback(() => {
    const count = groceries.filter((i) => i.checked).length;
    setGroceries((prev) => prev.filter((i) => !i.checked));
    return count;
  }, [groceries, setGroceries]);

  const undoGroceries = useCallback(() => {
    if (lastGroceries.current) {
      const previous = lastGroceries.current;
      lastGroceries.current = null;
      setGroceriesState(previous);
    }
  }, []);

  const value = useMemo<Store>(
    () => ({
      category,
      tags,
      setCategory,
      toggleTag,
      showOnlyTag,
      clearFilters,
      favorites,
      isFavorite,
      toggleFavorite,
      plan,
      setMeal,
      groceries,
      toggleGrocery,
      addIngredients,
      addCustomItem,
      removeGrocery,
      clearCompleted,
      undoGroceries,
    }),
    [category, tags, toggleTag, showOnlyTag, clearFilters, favorites, isFavorite, toggleFavorite, plan, setMeal, groceries, toggleGrocery, addIngredients, addCustomItem, removeGrocery, clearCompleted, undoGroceries],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
