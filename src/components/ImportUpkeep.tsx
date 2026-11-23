/**
 * One-time fixes for imports saved before a fix existed. Each job runs once per install, in the
 * background after the app opens, and is then remembered (fun.upkeep).
 * - photo-retry-1: imported recipes without a picture (or a TikTok creator) ask for them again.
 * - nutrition-rules-2: imported recipes get their nutrition counted again with the current rules
 *   (frying oil only what's absorbed, dips counted and listed, what one serving is).
 */
import { useEffect, useRef } from 'react';
import { recountNutrition } from '../lib/importApi';
import { needsPhotoRetry, retryImportDetails } from '../lib/importRetry';
import type { Recipe } from '../data/mock';
import { useStore } from '../state/store';

const PHOTO_RETRY = 'photo-retry-1';
const NUTRITION = 'nutrition-rules-2';

const imported = (r: Recipe) => !!r.custom && (r.origin === 'import' || r.source === 'tiktok' || r.source === 'youtube' || r.source === 'web');

/** Each job: which saved recipes it touches, and what to change on one (null = nothing). */
/** `untilDone`: a recipe that gets nothing back is tried again next time the app opens (e.g. the server wasn't updated yet). */
const JOBS: { id: string; wants: (r: Recipe) => boolean; run: (r: Recipe) => Promise<Partial<Recipe> | null>; untilDone?: boolean }[] = [
  { id: PHOTO_RETRY, wants: (r) => needsPhotoRetry(r) || (r.source === 'tiktok' && !r.creatorHandle?.trim()), run: retryImportDetails },
  { id: NUTRITION, wants: imported, run: (r) => recountNutrition(r), untilDone: true },
];

export function ImportUpkeep() {
  const { hydrated, customRecipes, fun, updateRecipe, markUpkeepDone } = useStore();
  const started = useRef(false);
  useEffect(() => {
    if (!hydrated || started.current) return;
    const jobs = JOBS.filter((j) => !fun.upkeep?.includes(j.id));
    if (!jobs.length) return;
    started.current = true;
    void (async () => {
      for (const job of jobs) {
        let missed = 0;
        for (const r of customRecipes.filter(job.wants)) {
          const patch = await job.run(r).catch(() => null);
          if (patch) updateRecipe(r.id, patch);
          else missed += 1;
        }
        if (!job.untilDone || missed === 0) markUpkeepDone(job.id);
      }
    })();
  }, [hydrated, customRecipes, fun.upkeep, updateRecipe, markUpkeepDone]);
  return null;
}
