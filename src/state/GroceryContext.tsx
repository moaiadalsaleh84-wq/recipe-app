import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { initialGroceries, type GroceryItem, type Ingredient } from '../data/mock';

type GroceryContextValue = {
  items: GroceryItem[];
  toggle: (key: string) => void;
  addIngredients: (recipeId: string, ingredients: Ingredient[], scale?: number) => number;
  clearChecked: () => void;
};

const GroceryContext = createContext<GroceryContextValue | null>(null);

/** In-memory grocery list. Swap for a persisted store or API later. */
export function GroceryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<GroceryItem[]>(initialGroceries);

  const toggle = useCallback((key: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i)));
  }, []);

  const addIngredients = useCallback((recipeId: string, ingredients: Ingredient[], scale = 1) => {
    setItems((prev) => {
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
            recipeIds: existing.recipeIds.includes(recipeId)
              ? existing.recipeIds
              : [...existing.recipeIds, recipeId],
          };
        } else {
          next.push({ key, name: ing.name, quantity: qty, unit: ing.unit, aisle: ing.aisle, recipeIds: [recipeId], checked: false });
        }
      }
      return next;
    });
    return ingredients.length;
  }, []);

  const clearChecked = useCallback(() => {
    setItems((prev) => prev.filter((i) => !i.checked));
  }, []);

  const value = useMemo(
    () => ({ items, toggle, addIngredients, clearChecked }),
    [items, toggle, addIngredients, clearChecked],
  );
  return <GroceryContext.Provider value={value}>{children}</GroceryContext.Provider>;
}

export function useGroceries() {
  const ctx = useContext(GroceryContext);
  if (!ctx) throw new Error('useGroceries must be used inside <GroceryProvider>');
  return ctx;
}

export const roundQty = (n: number) => Math.round(n * 10) / 10;

export const formatQty = (quantity: number, unit: string) =>
  unit ? `${quantity} ${unit}` : `${quantity}`;
