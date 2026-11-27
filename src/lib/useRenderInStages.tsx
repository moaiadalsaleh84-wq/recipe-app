import { startTransition, useEffect, useState, type ReactNode } from 'react';

/**
 * Long grids open fast: the first `first` items render with the screen, the rest right after the
 * first frame, in a background (interruptible) render, so a tap during it is never blocked.
 *   const shown = useRenderInStages(recipes.length, 6);  →  recipes.slice(0, shown)
 */
export function useRenderInStages(total: number, first = 6) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => startTransition(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready ? total : Math.min(total, first);
}

/**
 * A list that renders in stages each time it appears (e.g. a mood's recipes, or the grid coming
 * back): the first `first` items at once, the rest right after in a background render.
 */
export function StagedList<T>({ items, first = 4, render }: { items: T[]; first?: number; render: (item: T, index: number) => ReactNode }) {
  const shown = useRenderInStages(items.length, first);
  return items.slice(0, shown).map(render);
}
