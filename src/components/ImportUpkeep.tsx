/**
 * One-time fixes for imports saved before a fix existed. Each job runs once per install, in the
 * background after the app opens, and is then remembered (fun.upkeep).
 * - photo-retry-1: imported recipes without a picture (or a TikTok creator) ask for them again.
 */
import { useEffect, useRef } from 'react';
import { needsPhotoRetry, retryImportDetails } from '../lib/importRetry';
import { useStore } from '../state/store';

const PHOTO_RETRY = 'photo-retry-1';

export function ImportUpkeep() {
  const { hydrated, customRecipes, fun, updateRecipe, markUpkeepDone } = useStore();
  const started = useRef(false);
  useEffect(() => {
    if (!hydrated || started.current || fun.upkeep?.includes(PHOTO_RETRY)) return;
    started.current = true;
    const todo = customRecipes.filter((r) => needsPhotoRetry(r) || (r.source === 'tiktok' && !r.creatorHandle?.trim()));
    void (async () => {
      for (const r of todo) {
        const patch = await retryImportDetails(r).catch(() => null);
        if (patch) updateRecipe(r.id, patch);
      }
      markUpkeepDone(PHOTO_RETRY);
    })();
  }, [hydrated, customRecipes, fun.upkeep, updateRecipe, markUpkeepDone]);
  return null;
}
